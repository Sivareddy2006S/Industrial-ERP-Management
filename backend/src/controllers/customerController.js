const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const { createCustomerSchema } = require('../validators/customerValidator');

/**
 * POST /api/customers
 */
async function createCustomer(req, res, next) {
  try {
    const data = createCustomerSchema.parse(req.body);
    const customer = await prisma.customer.create({ data });
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/customers
 */
async function listCustomers(req, res, next) {
  try {
    const { search } = req.query;
    const where = search
      ? {
          OR: [
            { companyName: { contains: search, mode: 'insensitive' } },
            { contactPerson: { contains: search, mode: 'insensitive' } },
            { city: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: customers });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/customers/:id
 */
async function getCustomer(req, res, next) {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(id) },
      include: {
        enquiries: { orderBy: { createdAt: 'desc' }, take: 10 },
        quotations: { orderBy: { createdAt: 'desc' }, take: 10 },
        salesOrders: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!customer) {
      throw new AppError('Customer not found', 404, 'NOT_FOUND');
    }

    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
}

module.exports = { createCustomer, listCustomers, getCustomer };
