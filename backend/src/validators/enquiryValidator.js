const { z } = require('zod');

const enquiryItemSchema = z.object({
  productId: z.number().int().positive('Product ID must be a positive integer'),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
});

const createEnquirySchema = z.object({
  customerId: z.number().int().positive('Customer ID is required'),
  requiredDate: z.string().refine((d) => !isNaN(Date.parse(d)), {
    message: 'Required date must be a valid date',
  }),
  notes: z.string().optional(),
  items: z.array(enquiryItemSchema).min(1, 'At least one item is required'),
});

module.exports = { createEnquirySchema };
