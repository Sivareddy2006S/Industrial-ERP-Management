const { z } = require('zod');

const createProductSchema = z.object({
  productCode: z.string().min(1, 'Product code is required').max(50),
  productName: z.string().min(1, 'Product name is required').max(200),
  category: z.string().min(1, 'Category is required').max(100),
  unit: z.string().min(1, 'Unit is required').max(20),
  basePrice: z.number().positive('Base price must be positive'),
});

module.exports = { createProductSchema };
