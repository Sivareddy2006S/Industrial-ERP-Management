const express = require('express');
const router = express.Router();
const { login, getMe } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@example.com
 *               password:
 *                 type: string
 *                 example: Admin@123
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Current user info
 *       401:
 *         description: Not authenticated
 */
router.get('/me', authenticate, getMe);

module.exports = router;
