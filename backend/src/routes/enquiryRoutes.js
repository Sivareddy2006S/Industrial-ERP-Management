const express = require('express');
const router = express.Router();
const { createEnquiry, listEnquiries, getEnquiry } = require('../controllers/enquiryController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * /api/enquiries:
 *   get:
 *     summary: List all enquiries
 *     tags: [Enquiries]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [NEW, QUOTED, WON, LOST]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of enquiries
 *   post:
 *     summary: Create a new enquiry (SALES only)
 *     tags: [Enquiries]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customerId, requiredDate, items]
 *             properties:
 *               customerId:
 *                 type: integer
 *               requiredDate:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, quantity]
 *                   properties:
 *                     productId:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Enquiry created
 */
router.get('/', authenticate, listEnquiries);
router.post('/', authenticate, authorize('SALES', 'ADMIN'), createEnquiry);

/**
 * @swagger
 * /api/enquiries/{id}:
 *   get:
 *     summary: Get enquiry details
 *     tags: [Enquiries]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Enquiry details
 *       404:
 *         description: Enquiry not found
 */
router.get('/:id', authenticate, getEnquiry);

module.exports = router;
