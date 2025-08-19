/**
 * Custom Application Error Class
 * File: /common/services/app-error.js
 * Version: 1.0.0
 * 
 * Purpose: Enterprise-grade error handling with standardized HTTP status codes,
 *          error categorization, and proper error propagation for API responses
 */

const businessConfig = require('../config/business.config');

class AppError extends Error {
  
  /**
   * Create a new application error
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {string} errorCode - Application-specific error code
   * @param {boolean} isOperational - Whether error is operational (expected) or programming bug
   * @param {Object} metadata - Additional error context
   */
  constructor(message, statusCode = 500, errorCode = null, isOperational = true, metadata = {}) {
    super(message);
    
    // Core error properties
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode || this._generateErrorCode(statusCode);
    this.isOperational = isOperational;
    this.metadata = metadata;
    
    // Timestamp and tracing
    this.timestamp = new Date().toISOString();
    this.requestId = metadata.requestId || null;
    
    // Categorize error
    this.category = this._categorizeError(statusCode);
    
    // Preserve stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Generate standardized error code based on status code
   * @private
   * @param {number} statusCode - HTTP status code
   * @returns {string} Error code
   */
  _generateErrorCode(statusCode) {
    const statusCodeMap = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED', 
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT'
    };
    
    return statusCodeMap[statusCode] || 'UNKNOWN_ERROR';
  }

  /**
   * Categorize error by status code range
   * @private
   * @param {number} statusCode - HTTP status code
   * @returns {string} Error category
   */
  _categorizeError(statusCode) {
    if (statusCode >= 400 && statusCode < 500) {
      return 'CLIENT_ERROR';
    } else if (statusCode >= 500 && statusCode < 600) {
      return 'SERVER_ERROR';
    } else {
      return 'UNKNOWN';
    }
  }

  /**
   * Convert error to JSON format for API responses
   * @param {boolean} includeStack - Include stack trace in response (dev only)
   * @returns {Object} Serialized error object
   */
  toJSON(includeStack = false) {
    const errorResponse = {
      error: {
        message: this.message,
        code: this.errorCode,
        statusCode: this.statusCode,
        category: this.category,
        timestamp: this.timestamp,
        requestId: this.requestId
      }
    };

    // Include metadata if present
    if (Object.keys(this.metadata).length > 0) {
      errorResponse.error.metadata = this.metadata;
    }

    // Include stack trace only in development
    if (includeStack && process.env.NODE_ENV !== 'production') {
      errorResponse.error.stack = this.stack;
    }

    return errorResponse;
  }

  /**
   * Create a validation error
   * @static
   * @param {string} field - Field that failed validation
   * @param {string} value - Invalid value
   * @param {string} constraint - Validation constraint that failed
   * @returns {AppError} Validation error instance
   */
  static validationError(field, value, constraint) {
    return new AppError(
      `Validation failed for field '${field}': ${constraint}`,
      422,
      'VALIDATION_ERROR',
      true,
      { field, value, constraint }
    );
  }

  /**
   * Create a not found error
   * @static
   * @param {string} resource - Resource that was not found
   * @param {string|number} identifier - Resource identifier
   * @returns {AppError} Not found error instance
   */
  static notFound(resource, identifier) {
    return new AppError(
      `${resource} with identifier '${identifier}' not found`,
      404,
      'RESOURCE_NOT_FOUND',
      true,
      { resource, identifier }
    );
  }

  /**
   * Create an unauthorized error
   * @static
   * @param {string} reason - Reason for unauthorized access
   * @returns {AppError} Unauthorized error instance
   */
  static unauthorized(reason = 'Authentication required') {
    return new AppError(
      reason,
      401,
      'UNAUTHORIZED',
      true,
      { reason }
    );
  }

  /**
   * Create a forbidden error
   * @static
   * @param {string} action - Action that was forbidden
   * @param {string} resource - Resource being accessed
   * @returns {AppError} Forbidden error instance
   */
  static forbidden(action, resource) {
    return new AppError(
      `Forbidden: Cannot ${action} ${resource}`,
      403,
      'FORBIDDEN',
      true,
      { action, resource }
    );
  }

  /**
   * Create a conflict error
   * @static
   * @param {string} resource - Resource with conflict
   * @param {string} constraint - Constraint that was violated
   * @returns {AppError} Conflict error instance
   */
  static conflict(resource, constraint) {
    return new AppError(
      `Conflict: ${resource} ${constraint}`,
      409,
      'RESOURCE_CONFLICT',
      true,
      { resource, constraint }
    );
  }

  /**
   * Create a database error
   * @static
   * @param {string} operation - Database operation that failed
   * @param {Error} originalError - Original database error
   * @returns {AppError} Database error instance
   */
  static databaseError(operation, originalError) {
    return new AppError(
      `Database error during ${operation}`,
      500,
      'DATABASE_ERROR',
      true,
      { 
        operation, 
        originalMessage: originalError?.message,
        originalCode: originalError?.code 
      }
    );
  }

  /**
   * Create an external service error
   * @static
   * @param {string} service - External service name
   * @param {string} operation - Operation that failed
   * @param {Error} originalError - Original service error
   * @returns {AppError} External service error instance
   */
  static externalServiceError(service, operation, originalError) {
    return new AppError(
      `External service error: ${service} ${operation} failed`,
      502,
      'EXTERNAL_SERVICE_ERROR',
      true,
      {
        service,
        operation,
        originalMessage: originalError?.message,
        originalCode: originalError?.code
      }
    );
  }

  /**
   * Check if error is operational (expected) vs programming bug
   * @static
   * @param {Error} error - Error to check
   * @returns {boolean} True if operational error
   */
  static isOperational(error) {
    if (error instanceof AppError) {
      return error.isOperational;
    }
    return false;
  }
}

module.exports = AppError;
