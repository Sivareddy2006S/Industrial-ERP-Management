const express = require('express');
const router = express.Router();
const { listProducts, createProduct } = require('../controllers/productController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: List all products with inventory
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of products
 *   post:
 *     summary: Create a new product (ADMIN only)
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productCode, productName, category, unit, basePrice]
 *             properties:
 *               productCode:
 *                 type: string
 *               productName:
 *                 type: string
 *               category:
 *                 type: string
 *               unit:
 *                 type: string
 *               basePrice:
 *                 type: number
 *     responses:
 *       201:
 *         description: Product created
 */
router.get('/', authenticate, listProducts);
router.post('/', authenticate, authorize('ADMIN'), createProduct);

module.exports = router;
