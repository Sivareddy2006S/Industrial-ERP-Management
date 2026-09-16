const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('../utils/AppError');
const prisma = require('../config/database');

/**
 * Authenticate JWT token from Authorization header.
 * Attaches user to req.user.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      throw new AppError('User not found', 401, 'USER_NOT_FOUND');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    next(new AppError('Invalid or expired token', 401, 'INVALID_TOKEN'));
  }
}

/**
 * Authorize based on user roles.
 * @param  {...string} roles - Allowed roles (e.g., 'ADMIN', 'SALES')
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN')
      );
    }
    next();
  };
}

module.exports = { authenticate, authorize };
