const { z } = require('zod');

const createCustomerSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(200),
  contactPerson: z.string().min(1, 'Contact person is required').max(100),
  mobile: z
    .string()
    .min(10, 'Mobile must be at least 10 digits')
    .max(15)
    .regex(/^[0-9+\-\s()]+$/, 'Invalid mobile number format'),
  email: z.string().email('Invalid email format'),
  city: z.string().min(1, 'City is required').max(100),
});

module.exports = { createCustomerSchema };
