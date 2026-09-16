const express = require('express');
const router = express.Router();
const { listInventory, updateInventory } = require('../controllers/inventoryController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * /api/inventory:
 *   get:
 *     summary: List all inventory with available quantity
 *     tags: [Inventory]
 *     responses:
 *       200:
 *         description: List of inventory items
 */
router.get('/', authenticate, listInventory);

/**
 * @swagger
 * /api/inventory/{productId}:
 *   patch:
 *     summary: Update physical quantity (ADMIN only)
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [physicalQuantity]
 *             properties:
 *               physicalQuantity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Inventory updated
 */
router.patch('/:productId', authenticate, authorize('ADMIN'), updateInventory);

module.exports = router;
