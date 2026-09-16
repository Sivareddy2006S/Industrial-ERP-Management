const { z } = require('zod');

const dispatchSchema = z.object({
  vehicleNumber: z.string().min(1, 'Vehicle number is required').max(50),
  driverName: z.string().min(1, 'Driver name is required').max(100),
});

module.exports = { dispatchSchema };
