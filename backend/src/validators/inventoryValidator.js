const { z } = require('zod');

const updateInventorySchema = z.object({
  physicalQuantity: z
    .number()
    .int('Physical quantity must be an integer')
    .min(0, 'Physical quantity cannot be negative'),
});

module.exports = { updateInventorySchema };
