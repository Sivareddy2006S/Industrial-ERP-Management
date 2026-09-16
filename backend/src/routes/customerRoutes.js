const express = require('express');
const router = express.Router();
const { createCustomer, listCustomers, getCustomer } = require('../controllers/customerController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: List all customers
 *     tags: [Customers]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by company name, contact person, or city
 *     responses:
 *       200:
 *         description: List of customers
 *   post:
 *     summary: Create a new customer
 *     tags: [Customers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [companyName, contactPerson, mobile, email, city]
 *             properties:
 *               companyName:
 *                 type: string
 *               contactPerson:
 *                 type: string
 *               mobile:
 *                 type: string
 *               email:
 *                 type: string
 *               city:
 *                 type: string
 *     responses:
 *       201:
 *         description: Customer created
 */
router.get('/', authenticate, listCustomers);
router.post('/', authenticate, authorize('SALES', 'ADMIN'), createCustomer);

/**
 * @swagger
 * /api/customers/{id}:
 *   get:
 *     summary: Get customer details
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Customer details
 *       404:
 *         description: Customer not found
 */
router.get('/:id', authenticate, getCustomer);

module.exports = router;
