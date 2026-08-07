const logger = require('../utils/logger');

/**
 * Wrap async route handlers so thrown errors / rejected promises are
 * automatically passed to errorHandler instead of needing try/catch
 * in every single controller function.
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * Express error-handling middleware — must be registered LAST, after all routes.
 */
function errorHandler(err, req, res, next) {
  logger.error(`${req.method} ${req.originalUrl} -> ${err.message}`);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, message: messages.join(', ') });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ success: false, message: `${field} already in use` });
  }

  // Mongoose invalid ObjectId
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error'
  });
}

function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `The URL ${req.originalUrl} was not found on this backend.`
  });
}

module.exports = { asyncHandler, errorHandler, notFound };
