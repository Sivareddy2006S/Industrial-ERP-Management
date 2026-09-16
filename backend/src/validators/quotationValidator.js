const { z } = require('zod');

const quotationItemSchema = z.object({
  productId: z.number().int().positive('Product ID must be a positive integer'),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
  unitPrice: z.number().positive('Unit price must be positive'),
  discountPercent: z.number().min(0, 'Discount cannot be negative').max(100, 'Discount cannot exceed 100%').default(0),
  gstPercent: z.number().min(0, 'GST cannot be negative').max(100, 'GST cannot exceed 100%').default(18),
});

const createQuotationSchema = z.object({
  enquiryId: z.number().int().positive('Enquiry ID is required'),
  validUntil: z.string().refine((d) => !isNaN(Date.parse(d)), {
    message: 'Valid until must be a valid date',
  }),
  items: z.array(quotationItemSchema).min(1, 'At least one item is required'),
});

const updateStatusSchema = z.object({
  status: z.enum(['SENT', 'ACCEPTED', 'REJECTED'], {
    errorMap: () => ({ message: 'Status must be SENT, ACCEPTED, or REJECTED' }),
  }),
});

module.exports = { createQuotationSchema, updateStatusSchema };
