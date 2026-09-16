const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const { updateInventorySchema } = require('../validators/inventoryValidator');

/**
 * GET /api/inventory
 */
async function listInventory(req, res, next) {
  try {
    const inventory = await prisma.inventory.findMany({
      include: {
        product: {
          select: {
            id: true,
            productCode: true,
            productName: true,
            category: true,
            unit: true,
          },
        },
      },
      orderBy: { product: { productCode: 'asc' } },
    });

    const result = inventory.map((inv) => ({
      ...inv,
      availableQuantity: inv.physicalQuantity - inv.reservedQuantity,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/inventory/:productId
 * Update physical quantity (ADMIN only).
 */
async function updateInventory(req, res, next) {
  try {
    const productId = parseInt(req.params.productId);
    const data = updateInventorySchema.parse(req.body);

    const inventory = await prisma.inventory.findUnique({
      where: { productId },
    });

    if (!inventory) {
      throw new AppError('Inventory not found for this product', 404, 'NOT_FOUND');
    }

    // Ensure new physicalQuantity >= reservedQuantity
    if (data.physicalQuantity < inventory.reservedQuantity) {
      throw new AppError(
        `Physical quantity cannot be less than reserved quantity (${inventory.reservedQuantity})`,
        400,
        'INVALID_QUANTITY'
      );
    }

    const updated = await prisma.inventory.update({
      where: { productId },
      data: { physicalQuantity: data.physicalQuantity },
      include: {
        product: {
          select: { productCode: true, productName: true },
        },
      },
    });

    res.json({
      success: true,
      data: {
        ...updated,
        availableQuantity: updated.physicalQuantity - updated.reservedQuantity,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { listInventory, updateInventory };
