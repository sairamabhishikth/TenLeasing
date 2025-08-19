/**
 * Express Error Handler Middleware
 * File: /common/middleware/error-handler.middleware.js
 * Version: 1.0.0
 * 
 * Purpose: Global Express error handler that catches all unhandled errors,
 *          formats them using AppError, logs them, and returns standardized HTTP responses
 */

const AppError = require('../services/app-error');
const { logError, getLogger } = require('../services/logger.service');

class ErrorHandlerMiddleware {
  constructor() {
    this.logger = getLogger('error-handler');
  }

  /**
   * Main error handler middleware for Express
   * Handles all types of errors and returns appropriate HTTP responses
   * @param {Error} error - Error object
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object  
   * @param {Function} next - Express next function
   */
  handle(error, req, res, next) {
    const requestId = req.requestId || req.headers['x-request-id'] || 'unknown';
    
    // Convert to AppError if not already
    const appError = this._normalizeError(error, requestId);
    
    // Log the error with context
    this._logErrorWithContext(appError, req, requestId);
    
    // Send HTTP response
    this._sendErrorResponse(appError, res, requestId);
  }

  /**
   * Convert any error to AppError for consistent handling
   * @private
   * @param {Error} error - Original error
   * @param {string} requestId - Request correlation ID
   * @returns {AppError} Normalized AppError instance
   */
  _normalizeError(error, requestId) {
    // Already an AppError
    if (error instanceof AppError) {
      return error;
    }

    // Prisma/Database errors
    if (this._isPrismaError(error)) {
      return this._handlePrismaError(error, requestId);
    }

    // AWS SDK errors
    if (this._isAWSError(error)) {
      return this._handleAWSError(error, requestId);
    }

    // Validation errors (Joi, express-validator, etc.)
    if (this._isValidationError(error)) {
      return this._handleValidationError(error, requestId);
    }

    // HTTP/Network errors
    if (this._isHTTPError(error)) {
      return this._handleHTTPError(error, requestId);
    }

    // Unknown/Programming errors
    return this._handleUnknownError(error, requestId);
  }

  /**
   * Check if error is from Prisma
   * @private
   * @param {Error} error - Error to check
   * @returns {boolean} True if Prisma error
   */
  _isPrismaError(error) {
    return error.code && (
      error.code.startsWith('P') || 
      error.name?.includes('Prisma') ||
      error.clientVersion
    );
  }

  /**
   * Handle Prisma database errors
   * @private
   * @param {Error} error - Prisma error
   * @param {string} requestId - Request correlation ID
   * @returns {AppError} Converted AppError
   */
  _handlePrismaError(error, requestId) {
    const errorMap = {
      'P2002': { status: 409, code: 'UNIQUE_CONSTRAINT_VIOLATION' },
      'P2025': { status: 404, code: 'RECORD_NOT_FOUND' },
      'P2003': { status: 400, code: 'FOREIGN_KEY_CONSTRAINT' },
      'P2011': { status: 400, code: 'NULL_CONSTRAINT_VIOLATION' },
      'P1001': { status: 503, code: 'DATABASE_UNREACHABLE' },
      'P1008': { status: 504, code: 'DATABASE_TIMEOUT' }
    };

    const mappedError = errorMap[error.code];
    
    if (mappedError) {
      return new AppError(
        this._sanitizeDatabaseMessage(error.message),
        mappedError.status,
        mappedError.code,
        true,
        { requestId, originalCode: error.code }
      );
    }

    return AppError.databaseError('database operation', error);
  }

  /**
   * Check if error is from AWS SDK
   * @private
   * @param {Error} error - Error to check
   * @returns {boolean} True if AWS error
   */
  _isAWSError(error) {
    return error.$metadata || error.name?.includes('AWS') || error.Code;
  }

  /**
   * Handle AWS service errors
   * @private
   * @param {Error} error - AWS error
   * @param {string} requestId - Request correlation ID
   * @returns {AppError} Converted AppError
   */
  _handleAWSError(error, requestId) {
    const errorMap = {
      'ResourceNotFoundException': { status: 404, code: 'RESOURCE_NOT_FOUND' },
      'AccessDenied': { status: 403, code: 'ACCESS_DENIED' },
      'InvalidParameterException': { status: 400, code: 'INVALID_PARAMETER' },
      'ThrottlingException': { status: 429, code: 'RATE_LIMITED' },
      'ServiceUnavailableException': { status: 503, code: 'SERVICE_UNAVAILABLE' }
    };

    const errorName = error.name || error.Code;
    const mappedError = errorMap[errorName];

    if (mappedError) {
      return new AppError(
        error.message || 'AWS service error',
        mappedError.status,
        mappedError.code,
        true,
        { requestId, service: 'AWS', originalName: errorName }
      );
    }

    return AppError.externalServiceError('AWS', 'unknown operation', error);
  }

  /**
   * Check if error is validation related
   * @private
   * @param {Error} error - Error to check
   * @returns {boolean} True if validation error
   */
  _isValidationError(error) {
    return error.name === 'ValidationError' || 
           error.details || 
           error.errors ||
           error.message?.includes('validation');
  }

  /**
   * Handle validation errors
   * @private
   * @param {Error} error - Validation error
   * @param {string} requestId - Request correlation ID
   * @returns {AppError} Converted AppError
   */
  _handleValidationError(error, requestId) {
    let field = 'unknown';
    let constraint = error.message;

    // Extract field from common validation libraries
    if (error.details && error.details[0]) {
      field = error.details[0].path?.join('.') || field;
      constraint = error.details[0].message || constraint;
    } else if (error.errors && Array.isArray(error.errors)) {
      field = error.errors[0]?.field || error.errors[0]?.param || field;
      constraint = error.errors[0]?.message || constraint;
    }

    return AppError.validationError(field, 'invalid', constraint);
  }

  /**
   * Check if error is HTTP related
   * @private
   * @param {Error} error - Error to check
   * @returns {boolean} True if HTTP error
   */
  _isHTTPError(error) {
    return error.status || error.statusCode || error.code === 'ECONNREFUSED';
  }

  /**
   * Handle HTTP/Network errors
   * @private
   * @param {Error} error - HTTP error
   * @param {string} requestId - Request correlation ID
   * @returns {AppError} Converted AppError
   */
  _handleHTTPError(error, requestId) {
    const status = error.status || error.statusCode || 500;
    
    if (error.code === 'ECONNREFUSED') {
      return new AppError(
        'External service unavailable',
        503,
        'SERVICE_UNAVAILABLE',
        true,
        { requestId, originalCode: error.code }
      );
    }

    return new AppError(
      error.message || 'HTTP error',
      status,
      null,
      true,
      { requestId }
    );
  }

  /**
   * Handle unknown/programming errors
   * @private
   * @param {Error} error - Unknown error
   * @param {string} requestId - Request correlation ID
   * @returns {AppError} Converted AppError
   */
  _handleUnknownError(error, requestId) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return new AppError(
      isDevelopment ? error.message : 'Internal server error',
      500,
      'INTERNAL_SERVER_ERROR',
      false, // Programming error, not operational
      { requestId, originalName: error.name }
    );
  }

  /**
   * Sanitize database error messages to avoid information leakage
   * @private
   * @param {string} message - Original database message
   * @returns {string} Sanitized message
   */
  _sanitizeDatabaseMessage(message) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      return message;
    }

    // Remove sensitive information in production
    return message
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]')
      .replace(/password\s*[:=]\s*["']?[^"'\s]+["']?/gi, 'password=[HIDDEN]')
      .replace(/token\s*[:=]\s*["']?[^"'\s]+["']?/gi, 'token=[HIDDEN]');
  }

  /**
   * Log error with full context
   * @private
   * @param {AppError} appError - Normalized error
   * @param {Object} req - Express request object
   * @param {string} requestId - Request correlation ID
   */
  _logErrorWithContext(appError, req, requestId) {
    const context = {
      url: req.originalUrl,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      statusCode: appError.statusCode,
      errorCode: appError.errorCode,
      category: appError.category,
      isOperational: appError.isOperational
    };

    // Add user context if available
    if (req.user) {
      context.userId = req.user.id;
    }

    logError(appError, requestId, context, 'error-handler');
  }

  /**
   * Send standardized error response
   * @private
   * @param {AppError} appError - Normalized error
   * @param {Object} res - Express response object
   * @param {string} requestId - Request correlation ID
   */
  _sendErrorResponse(appError, res, requestId) {
    // Prevent double response
    if (res.headersSent) {
      return;
    }

    const isDevelopment = process.env.NODE_ENV === 'development';
    const errorResponse = appError.toJSON(isDevelopment);

    // Set correlation header
    res.setHeader('X-Request-ID', requestId);

    // Send response
    res.status(appError.statusCode).json(errorResponse);
  }

  /**
   * Handle unhandled promise rejections
   * @param {Error} error - Unhandled promise rejection
   * @param {Object} promise - Promise that was rejected
   */
  handleUnhandledRejection(error, promise) {
    this.logger.error('Unhandled Promise Rejection', {
      errorMessage: error.message,
      errorName: error.name,
      stack: error.stack,
      promise: promise.toString()
    });

    // In production, you might want to exit gracefully
    if (process.env.NODE_ENV === 'production') {
      console.log('Shutting down due to unhandled promise rejection');
      process.exit(1);
    }
  }

  /**
   * Handle uncaught exceptions
   * @param {Error} error - Uncaught exception
   */
  handleUncaughtException(error) {
    this.logger.error('Uncaught Exception', {
      errorMessage: error.message,
      errorName: error.name,
      stack: error.stack
    });

    console.log('Shutting down due to uncaught exception');
    process.exit(1);
  }
}

// Export singleton instance and setup global handlers
const errorHandler = new ErrorHandlerMiddleware();

// Global error handlers
process.on('unhandledRejection', (error, promise) => {
  errorHandler.handleUnhandledRejection(error, promise);
});

process.on('uncaughtException', (error) => {
  errorHandler.handleUncaughtException(error);
});

module.exports = (error, req, res, next) => {
  errorHandler.handle(error, req, res, next);
};
