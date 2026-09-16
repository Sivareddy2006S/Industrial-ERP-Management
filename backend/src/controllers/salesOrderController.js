const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const { dispatchSchema } = require('../validators/dispatchValidator');
const { generateNumber } = require('../utils/generateNumber');

/**
 * GET /api/sales-orders
 */
async function listSalesOrders(req, res, next) {
  try {
    const { status, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const salesOrders = await prisma.salesOrder.findMany({
      where,
      include: {
        customer: { select: { id: true, companyName: true, contactPerson: true } },
        quotation: { select: { id: true, quotationNumber: true } },
        items: {
          include: {
            product: {
              select: { productCode: true, productName: true, unit: true },
            },
          },
        },
        createdBy: { select: { id: true, name: true } },
        dispatch: { select: { id: true, dispatchNumber: true, dispatchDate: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: salesOrders });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/sales-orders/:id
 */
async function getSalesOrder(req, res, next) {
  try {
    const { id } = req.params;
    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id: parseInt(id) },
      include: {
        customer: true,
        quotation: {
          select: { 
            id: true, 
            quotationNumber: true, 
            enquiryId: true,
            enquiry: { select: { id: true, enquiryNumber: true } }
          },
        },
        items: {
          include: {
            product: {
              include: {
                inventory: {
                  select: { physicalQuantity: true, reservedQuantity: true },
                },
              },
            },
          },
        },
        createdBy: { select: { id: true, name: true, email: true } },
        dispatch: {
          include: {
            items: { include: { product: { select: { productCode: true, productName: true } } } },
            processedBy: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!salesOrder) {
      throw new AppError('Sales Order not found', 404, 'NOT_FOUND');
    }

    // Add computed availableQuantity to product inventory
    const result = {
      ...salesOrder,
      items: salesOrder.items.map((item) => ({
        ...item,
        product: {
          ...item.product,
          inventory: item.product.inventory
            ? {
                ...item.product.inventory,
                availableQuantity:
                  item.product.inventory.physicalQuantity -
                  item.product.inventory.reservedQuantity,
              }
            : null,
        },
      })),
    };

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/sales-orders/:id/confirm
 * ADMIN only. Confirms a PENDING sales order and reserves inventory.
 * Uses database transaction with SELECT ... FOR UPDATE for concurrency safety.
 */
async function confirmSalesOrder(req, res, next) {
  try {
    const salesOrderId = parseInt(req.params.id);

    // Use an interactive transaction for full control
    const result = await prisma.$transaction(async (tx) => {
      // 1. Load the sales order
      const salesOrder = await tx.salesOrder.findUnique({
        where: { id: salesOrderId },
        include: { items: { include: { product: true } } },
      });

      if (!salesOrder) {
        throw new AppError('Sales Order not found', 404, 'NOT_FOUND');
      }

      if (salesOrder.status !== 'PENDING') {
        throw new AppError(
          `Only PENDING orders can be confirmed. Current status: ${salesOrder.status}`,
          409,
          'INVALID_STATUS'
        );
      }

      // 2. Lock inventory rows using SELECT ... FOR UPDATE (concurrency-safe)
      const productIds = salesOrder.items.map((item) => item.productId);
      const inventoryRows = await tx.$queryRaw`
        SELECT id, "productId", "physicalQuantity", "reservedQuantity"
        FROM inventory
        WHERE "productId" = ANY(${productIds}::int[])
        FOR UPDATE
      `;

      // Create a lookup map
      const inventoryMap = new Map();
      for (const row of inventoryRows) {
        inventoryMap.set(row.productId, row);
      }

      // 3. Check availability for each item
      const insufficientItems = [];
      for (const item of salesOrder.items) {
        const inv = inventoryMap.get(item.productId);
        if (!inv) {
          throw new AppError(
            `Inventory not found for ${item.product.productName}`,
            404,
            'INVENTORY_NOT_FOUND'
          );
        }
        const available = inv.physicalQuantity - inv.reservedQuantity;
        if (available < item.quantity) {
          insufficientItems.push({
            productName: item.product.productName,
            requested: item.quantity,
            available,
          });
        }
      }

      if (insufficientItems.length > 0) {
        const details = insufficientItems
          .map((i) => `Insufficient inventory for ${i.productName}. Available: ${i.available}, Required: ${i.requested}`)
          .join('\n');
        throw new AppError(
          details,
          409,
          'INSUFFICIENT_INVENTORY'
        );
      }

      // 4. Reserve inventory (increase reservedQuantity, keep physicalQuantity unchanged)
      for (const item of salesOrder.items) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            reservedQuantity: { increment: item.quantity },
          },
        });
      }

      // 5. Update order status to CONFIRMED
      const confirmedOrder = await tx.salesOrder.update({
        where: { id: salesOrderId },
        data: { status: 'CONFIRMED' },
        include: {
          customer: true,
          items: { include: { product: true } },
          quotation: { select: { id: true, quotationNumber: true } },
        },
      });

      return confirmedOrder;
    });

    res.json({ success: true, data: result, message: 'Sales Order confirmed and inventory reserved' });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/sales-orders/:id/dispatch
 * ADMIN only. Dispatches a CONFIRMED sales order.
 * Decreases both physicalQuantity and reservedQuantity.
 */
async function dispatchSalesOrder(req, res, next) {
  try {
    const salesOrderId = parseInt(req.params.id);
    const dispatchData = dispatchSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Load the sales order
      const salesOrder = await tx.salesOrder.findUnique({
        where: { id: salesOrderId },
        include: { items: true, dispatch: true },
      });

      if (!salesOrder) {
        throw new AppError('Sales Order not found', 404, 'NOT_FOUND');
      }

      if (salesOrder.status === 'CANCELLED') {
        throw new AppError('Cannot dispatch a cancelled order', 409, 'ORDER_CANCELLED');
      }

      if (salesOrder.status !== 'CONFIRMED') {
        throw new AppError(
          `Only CONFIRMED orders can be dispatched. Current status: ${salesOrder.status}`,
          409,
          'INVALID_STATUS'
        );
      }

      // Check for duplicate dispatch (unique constraint also prevents this)
      if (salesOrder.dispatch) {
        throw new AppError('This order has already been dispatched', 409, 'DUPLICATE_DISPATCH');
      }

      // 2. Lock inventory rows
      const productIds = salesOrder.items.map((item) => item.productId);
      const inventoryRows = await tx.$queryRaw`
        SELECT id, "productId", "physicalQuantity", "reservedQuantity"
        FROM inventory
        WHERE "productId" = ANY(${productIds}::int[])
        FOR UPDATE
      `;

      const inventoryMap = new Map();
      for (const row of inventoryRows) {
        inventoryMap.set(row.productId, row);
      }

      // 3. Validate dispatch quantities don't exceed reserved
      for (const item of salesOrder.items) {
        const inv = inventoryMap.get(item.productId);
        if (!inv) {
          throw new AppError(
            `Inventory not found for product ID ${item.productId}`,
            404,
            'INVENTORY_NOT_FOUND'
          );
        }
        if (item.quantity > inv.reservedQuantity) {
          throw new AppError(
            `Cannot dispatch ${item.quantity} of product ${item.productId}. Only ${inv.reservedQuantity} reserved.`,
            409,
            'DISPATCH_EXCEEDS_RESERVED'
          );
        }
      }

      // 4. Decrease both physical and reserved quantities
      for (const item of salesOrder.items) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            physicalQuantity: { decrement: item.quantity },
            reservedQuantity: { decrement: item.quantity },
          },
        });
      }

      // 5. Create dispatch record
      const dispatchNumber = await generateNumber('DSP', 'dispatch', 'dispatchNumber');

      const dispatch = await tx.dispatch.create({
        data: {
          dispatchNumber,
          salesOrderId,
          dispatchDate: new Date(),
          vehicleNumber: dispatchData.vehicleNumber,
          driverName: dispatchData.driverName,
          processedById: req.user.id,
          items: {
            create: salesOrder.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          items: { include: { product: { select: { productCode: true, productName: true } } } },
          processedBy: { select: { id: true, name: true } },
        },
      });

      // 6. Update order status to DISPATCHED
      await tx.salesOrder.update({
        where: { id: salesOrderId },
        data: { status: 'DISPATCHED' },
      });

      return dispatch;
    });

    res.json({ success: true, data: result, message: 'Order dispatched successfully' });
  } catch (error) {
    next(error);
  }
}

module.exports = { listSalesOrders, getSalesOrder, confirmSalesOrder, dispatchSalesOrder };
