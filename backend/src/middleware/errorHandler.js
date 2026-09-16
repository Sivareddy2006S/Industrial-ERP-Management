const AppError = require('../utils/AppError');

/**
 * Centralized error handler middleware.
 * Returns consistent JSON error responses.
 */
function errorHandler(err, req, res, next) {
  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errorCode = err.errorCode || 'INTERNAL_ERROR';

  // Prisma known errors
  if (err.code === 'P2002') {
    statusCode = 409;
    message = `Duplicate value for: ${err.meta?.target?.join(', ') || 'unique field'}`;
    errorCode = 'DUPLICATE_ENTRY';
  }
  if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Record not found';
    errorCode = 'NOT_FOUND';
  }

  // Zod validation error
  if (err.name === 'ZodError') {
    statusCode = 400;
    const issues = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    message = issues.join('; ');
    errorCode = 'VALIDATION_ERROR';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    errorCode = 'INVALID_TOKEN';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    errorCode = 'TOKEN_EXPIRED';
  }

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorCode,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
