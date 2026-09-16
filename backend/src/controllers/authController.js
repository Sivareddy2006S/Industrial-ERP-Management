const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const config = require('../config');
const AppError = require('../utils/AppError');
const { loginSchema } = require('../validators/authValidator');

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token.
 */
async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/me
 * Get current authenticated user.
 */
async function getMe(req, res) {
  res.json({
    success: true,
    data: req.user,
  });
}

module.exports = { login, getMe };
