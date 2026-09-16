const express = require('express');
const router = express.Router();
const {
  createQuotation,
  listQuotations,
  getQuotation,
  updateStatus,
  convertToSalesOrder,
} = require('../controllers/quotationController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * /api/quotations:
 *   get:
 *     summary: List all quotations
 *     tags: [Quotations]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, SENT, ACCEPTED, REJECTED]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of quotations
 *   post:
 *     summary: Create a quotation from an enquiry (SALES only)
 *     tags: [Quotations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [enquiryId, validUntil, items]
 *             properties:
 *               enquiryId:
 *                 type: integer
 *               validUntil:
 *                 type: string
 *                 format: date
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, quantity, unitPrice]
 *                   properties:
 *                     productId:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *                     unitPrice:
 *                       type: number
 *                     discountPercent:
 *                       type: number
 *                     gstPercent:
 *                       type: number
 *     responses:
 *       201:
 *         description: Quotation created
 */
router.get('/', authenticate, listQuotations);
router.post('/', authenticate, authorize('SALES', 'ADMIN'), createQuotation);

/**
 * @swagger
 * /api/quotations/{id}:
 *   get:
 *     summary: Get quotation details
 *     tags: [Quotations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Quotation details
 */
router.get('/:id', authenticate, getQuotation);

/**
 * @swagger
 * /api/quotations/{id}/status:
 *   patch:
 *     summary: Update quotation status (DRAFT→SENT, SENT→ACCEPTED/REJECTED)
 *     tags: [Quotations]
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [SENT, ACCEPTED, REJECTED]
 *     responses:
 *       200:
 *         description: Status updated
 *       409:
 *         description: Invalid status transition
 */
router.patch('/:id/status', authenticate, authorize('SALES', 'ADMIN'), updateStatus);

/**
 * @swagger
 * /api/quotations/{id}/convert:
 *   post:
 *     summary: Convert accepted quotation to Sales Order
 *     tags: [Quotations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Sales Order created
 *       409:
 *         description: Quotation not accepted or already converted
 */
router.post('/:id/convert', authenticate, authorize('SALES', 'ADMIN'), convertToSalesOrder);

module.exports = router;
