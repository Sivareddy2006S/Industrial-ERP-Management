const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const { createQuotationSchema, updateStatusSchema } = require('../validators/quotationValidator');
const { calculateQuotationTotals } = require('../services/quotationService');
const { generateNumber } = require('../utils/generateNumber');

// Valid status transitions
const VALID_TRANSITIONS = {
  DRAFT: ['SENT'],
  SENT: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: [],
  REJECTED: [],
};

/**
 * POST /api/quotations
 */
async function createQuotation(req, res, next) {
  try {
    const data = createQuotationSchema.parse(req.body);

    // Validate enquiry exists
    const enquiry = await prisma.enquiry.findUnique({
      where: { id: data.enquiryId },
      include: { customer: true },
    });
    if (!enquiry) {
      throw new AppError('Enquiry not found', 404, 'ENQUIRY_NOT_FOUND');
    }

    // Validate all products exist
    const productIds = data.items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    if (products.length !== productIds.length) {
      throw new AppError('One or more products not found', 404, 'PRODUCT_NOT_FOUND');
    }

    // Calculate totals on backend
    const calculated = calculateQuotationTotals(data.items);
    const quotationNumber = await generateNumber('QTN', 'quotation', 'quotationNumber');

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        enquiryId: data.enquiryId,
        customerId: enquiry.customerId,
        validUntil: new Date(data.validUntil),
        status: 'DRAFT',
        subtotal: calculated.subtotal,
        discountAmount: calculated.discountAmount,
        gstAmount: calculated.gstAmount,
        grandTotal: calculated.grandTotal,
        createdById: req.user.id,
        items: {
          create: calculated.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent || 0,
            gstPercent: item.gstPercent || 18,
            lineAmount: item.lineAmount,
          })),
        },
      },
      include: {
        customer: true,
        enquiry: { select: { id: true, enquiryNumber: true } },
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // Update enquiry status to QUOTED
    await prisma.enquiry.update({
      where: { id: data.enquiryId },
      data: { status: 'QUOTED' },
    });

    res.status(201).json({ success: true, data: quotation });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/quotations
 */
async function listQuotations(req, res, next) {
  try {
    const { status, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { quotationNumber: { contains: search, mode: 'insensitive' } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const quotations = await prisma.quotation.findMany({
      where,
      include: {
        customer: { select: { id: true, companyName: true } },
        enquiry: { select: { id: true, enquiryNumber: true } },
        items: { include: { product: { select: { productCode: true, productName: true } } } },
        createdBy: { select: { id: true, name: true } },
        salesOrder: { select: { id: true, orderNumber: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: quotations });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/quotations/:id
 */
async function getQuotation(req, res, next) {
  try {
    const { id } = req.params;
    const quotation = await prisma.quotation.findUnique({
      where: { id: parseInt(id) },
      include: {
        customer: true,
        enquiry: { select: { id: true, enquiryNumber: true, notes: true } },
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        salesOrder: { select: { id: true, orderNumber: true, status: true } },
      },
    });

    if (!quotation) {
      throw new AppError('Quotation not found', 404, 'NOT_FOUND');
    }

    res.json({ success: true, data: quotation });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/quotations/:id/status
 * Update quotation status with strict transition rules.
 */
async function updateStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status: newStatus } = updateStatusSchema.parse(req.body);

    const quotation = await prisma.quotation.findUnique({
      where: { id: parseInt(id) },
    });

    if (!quotation) {
      throw new AppError('Quotation not found', 404, 'NOT_FOUND');
    }

    // Enforce status transition rules
    const allowedTransitions = VALID_TRANSITIONS[quotation.status];
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw new AppError(
        `Cannot change status from ${quotation.status} to ${newStatus}`,
        409,
        'INVALID_STATUS_TRANSITION'
      );
    }

    const updated = await prisma.quotation.update({
      where: { id: parseInt(id) },
      data: { status: newStatus },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });

    // If quotation is accepted, update enquiry status to WON
    if (newStatus === 'ACCEPTED') {
      await prisma.enquiry.update({
        where: { id: quotation.enquiryId },
        data: { status: 'WON' },
      });
    }

    // If quotation is rejected, update enquiry status to LOST
    if (newStatus === 'REJECTED') {
      await prisma.enquiry.update({
        where: { id: quotation.enquiryId },
        data: { status: 'LOST' },
      });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/quotations/:id/convert
 * Convert an ACCEPTED quotation into a Sales Order.
 */
async function convertToSalesOrder(req, res, next) {
  try {
    const quotationId = parseInt(req.params.id);

    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { items: true, salesOrder: true },
    });

    if (!quotation) {
      throw new AppError('Quotation not found', 404, 'NOT_FOUND');
    }

    // Only ACCEPTED quotations can be converted
    if (quotation.status !== 'ACCEPTED') {
      throw new AppError(
        `Only ACCEPTED quotations can be converted to Sales Orders. Current status: ${quotation.status}`,
        409,
        'INVALID_STATUS'
      );
    }

    // Check if quotation already has a sales order (unique constraint will also prevent this)
    if (quotation.salesOrder) {
      throw new AppError(
        'This quotation has already been converted to a Sales Order',
        409,
        'DUPLICATE_SALES_ORDER'
      );
    }

    const orderNumber = await generateNumber('SO', 'salesOrder', 'orderNumber');

    const salesOrder = await prisma.salesOrder.create({
      data: {
        orderNumber,
        customerId: quotation.customerId,
        quotationId: quotation.id,
        totalAmount: quotation.grandTotal,
        status: 'PENDING',
        createdById: req.user.id,
        items: {
          create: quotation.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineAmount: item.lineAmount,
          })),
        },
      },
      include: {
        customer: true,
        quotation: { select: { id: true, quotationNumber: true } },
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ success: true, data: salesOrder });
  } catch (error) {
    next(error);
  }
}

module.exports = { createQuotation, listQuotations, getQuotation, updateStatus, convertToSalesOrder };
