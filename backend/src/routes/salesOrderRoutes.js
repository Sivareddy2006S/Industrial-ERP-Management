const express = require('express');
const router = express.Router();
const {
  listSalesOrders,
  getSalesOrder,
  confirmSalesOrder,
  dispatchSalesOrder,
} = require('../controllers/salesOrderController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * /api/sales-orders:
 *   get:
 *     summary: List all sales orders
 *     tags: [Sales Orders]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, DISPATCHED, CANCELLED]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of sales orders
 */
router.get('/', authenticate, listSalesOrders);

/**
 * @swagger
 * /api/sales-orders/{id}:
 *   get:
 *     summary: Get sales order details with inventory
 *     tags: [Sales Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sales order details
 */
router.get('/:id', authenticate, getSalesOrder);

/**
 * @swagger
 * /api/sales-orders/{id}/confirm:
 *   post:
 *     summary: Confirm sales order and reserve inventory (ADMIN only)
 *     tags: [Sales Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Order confirmed and inventory reserved
 *       409:
 *         description: Insufficient inventory or invalid status
 */
router.post('/:id/confirm', authenticate, authorize('ADMIN'), confirmSalesOrder);

/**
 * @swagger
 * /api/sales-orders/{id}/dispatch:
 *   post:
 *     summary: Dispatch confirmed order (ADMIN only)
 *     tags: [Sales Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vehicleNumber, driverName]
 *             properties:
 *               vehicleNumber:
 *                 type: string
 *               driverName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order dispatched
 *       409:
 *         description: Order not confirmed or already dispatched
 */
router.post('/:id/dispatch', authenticate, authorize('ADMIN'), dispatchSalesOrder);

module.exports = router;
