const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const { createEnquirySchema } = require('../validators/enquiryValidator');
const { generateNumber } = require('../utils/generateNumber');

/**
 * POST /api/enquiries
 */
async function createEnquiry(req, res, next) {
  try {
    const data = createEnquirySchema.parse(req.body);

    // Validate customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });
    if (!customer) {
      throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
    }

    // Validate all products exist
    const productIds = data.items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    if (products.length !== productIds.length) {
      throw new AppError('One or more products not found', 404, 'PRODUCT_NOT_FOUND');
    }

    // Generate enquiry number
    const enquiryNumber = await generateNumber('ENQ', 'enquiry', 'enquiryNumber');

    const enquiry = await prisma.enquiry.create({
      data: {
        enquiryNumber,
        customerId: data.customerId,
        requiredDate: new Date(data.requiredDate),
        notes: data.notes || null,
        status: 'NEW',
        createdById: req.user.id,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(201).json({ success: true, data: enquiry });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/enquiries
 */
async function listEnquiries(req, res, next) {
  try {
    const { status, search } = req.query;
    const where = {};

    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { enquiryNumber: { contains: search, mode: 'insensitive' } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const enquiries = await prisma.enquiry.findMany({
      where,
      include: {
        customer: {
          select: { id: true, companyName: true, contactPerson: true },
        },
        items: {
          include: { product: { select: { productCode: true, productName: true } } },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: enquiries });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/enquiries/:id
 */
async function getEnquiry(req, res, next) {
  try {
    const { id } = req.params;
    const enquiry = await prisma.enquiry.findUnique({
      where: { id: parseInt(id) },
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        quotations: {
          select: { id: true, quotationNumber: true, status: true, grandTotal: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!enquiry) {
      throw new AppError('Enquiry not found', 404, 'NOT_FOUND');
    }

    res.json({ success: true, data: enquiry });
  } catch (error) {
    next(error);
  }
}

module.exports = { createEnquiry, listEnquiries, getEnquiry };
