const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const { createProductSchema } = require('../validators/productValidator');

/**
 * GET /api/products
 */
async function listProducts(req, res, next) {
  try {
    const { search } = req.query;
    const where = search
      ? {
          OR: [
            { productName: { contains: search, mode: 'insensitive' } },
            { productCode: { contains: search, mode: 'insensitive' } },
            { category: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const products = await prisma.product.findMany({
      where,
      include: {
        inventory: {
          select: {
            physicalQuantity: true,
            reservedQuantity: true,
          },
        },
      },
      orderBy: { productCode: 'asc' },
    });

    // Add computed availableQuantity
    const result = products.map((p) => ({
      ...p,
      inventory: p.inventory
        ? {
            ...p.inventory,
            availableQuantity: p.inventory.physicalQuantity - p.inventory.reservedQuantity,
          }
        : null,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/products
 */
async function createProduct(req, res, next) {
  try {
    const data = createProductSchema.parse(req.body);
    const product = await prisma.product.create({ data });

    // Auto-create inventory record
    await prisma.inventory.create({
      data: {
        productId: product.id,
        physicalQuantity: 0,
        reservedQuantity: 0,
      },
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

module.exports = { listProducts, createProduct };
