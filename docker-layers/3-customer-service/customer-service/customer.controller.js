/**
 * Customer Domain Controller
 * File: /customer-service/customer.controller.js
 * Version: 1.0.0
 * 
 * Purpose: HTTP request/response handlers for customer domain
 *          3 implemented methods + placeholders for future development
 */

const CustomerService = require('./customer.service');
const AppError = require('../common/services/app-error');
const { createRequestLogger } = require('../common/services/logger.service');

class CustomerController {
  constructor() {
    this.customerService = new CustomerService();
  }

  /**
   * Create new customer (Transaction Demo) ✅ IMPLEMENTED
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createCustomer(req, res) {
    const requestId = req.requestId || req.headers['x-request-id'] || 'unknown';
    const logger = createRequestLogger(requestId, 'customer-controller');

    try {
      logger.info('Creating customer request received', {
        bodyFields: Object.keys(req.body || {})
      });

      // Validate required fields
      const { customerName, customerClass, status, referenceNumber } = req.body || {};
      
      if (!customerName || !customerClass || !status || !referenceNumber) {
        throw AppError.validationError(
          'customerData',
          req.body,
          'Required fields: customerName, customerClass, status, referenceNumber'
        );
      }

      // Call service layer
      const customer = await this.customerService.createCustomer(req.body, requestId);

      logger.info('Customer created successfully', {
        customerId: customer.customerId,
        customerName: customer.customerName
      });

      res.status(201).json({
        success: true,
        data: customer,
        message: 'Customer created successfully',
        requestId
      });

    } catch (error) {
      this._handleError(error, res, requestId, 'create customer');
    }
  }

  /**
   * Get users by account - Header variant ✅ IMPLEMENTED
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUsersByAccountHeader(req, res) {
    const requestId = req.requestId || req.headers['x-request-id'] || 'unknown';
    const logger = createRequestLogger(requestId, 'customer-controller');

    try {
      const accountId = parseInt(req.params.id);
      
      if (!accountId || isNaN(accountId)) {
        throw AppError.validationError('accountId', req.params.id, 'Valid account ID is required');
      }

      const users = await this.customerService.getUsersByAccount(accountId, 'header', requestId);

      logger.debugSafe('Users by account (header) retrieved', {
        accountId,
        userCount: users.length
      });

      res.json({
        success: true,
        data: users,
        variant: 'header',
        requestId
      });

    } catch (error) {
      this._handleError(error, res, requestId, 'get users by account header');
    }
  }

  /**
   * Get users by account - Summary variant ✅ IMPLEMENTED
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUsersByAccountSummary(req, res) {
    const requestId = req.requestId || req.headers['x-request-id'] || 'unknown';
    const logger = createRequestLogger(requestId, 'customer-controller');

    try {
      const accountId = parseInt(req.params.id);
      
      if (!accountId || isNaN(accountId)) {
        throw AppError.validationError('accountId', req.params.id, 'Valid account ID is required');
      }

      const users = await this.customerService.getUsersByAccount(accountId, 'summary', requestId);

      logger.debugSafe('Users by account (summary) retrieved', {
        accountId,
        userCount: users.length
      });

      res.json({
        success: true,
        data: users,
        variant: 'summary',
        requestId
      });

    } catch (error) {
      this._handleError(error, res, requestId, 'get users by account summary');
    }
  }

  /**
   * Get users by account - Detail variant ✅ IMPLEMENTED
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUsersByAccountDetail(req, res) {
    const requestId = req.requestId || req.headers['x-request-id'] || 'unknown';
    const logger = createRequestLogger(requestId, 'customer-controller');

    try {
      const accountId = parseInt(req.params.id);
      
      if (!accountId || isNaN(accountId)) {
        throw AppError.validationError('accountId', req.params.id, 'Valid account ID is required');
      }

      const users = await this.customerService.getUsersByAccount(accountId, 'detail', requestId);

      logger.debugSafe('Users by account (detail) retrieved', {
        accountId,
        userCount: users.length
      });

      res.json({
        success: true,
        data: users,
        variant: 'detail',
        requestId
      });

    } catch (error) {
      this._handleError(error, res, requestId, 'get users by account detail');
    }
  }

  /**
   * Get users by customer - Header variant ✅ IMPLEMENTED
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUsersByCustomerHeader(req, res) {
    const requestId = req.requestId || req.headers['x-request-id'] || 'unknown';
    const logger = createRequestLogger(requestId, 'customer-controller');

    try {
      const customerId = parseInt(req.params.id);
      
      if (!customerId || isNaN(customerId)) {
        throw AppError.validationError('customerId', req.params.id, 'Valid customer ID is required');
      }

      const users = await this.customerService.getUsersByCustomer(customerId, 'header', requestId);

      logger.debugSafe('Users by customer (header) retrieved', {
        customerId,
        userCount: users.length
      });

      res.json({
        success: true,
        data: users,
        variant: 'header',
        requestId
      });

    } catch (error) {
      this._handleError(error, res, requestId, 'get users by customer header');
    }
  }

  /**
   * Get users by customer - Summary variant ✅ IMPLEMENTED
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUsersByCustomerSummary(req, res) {
    const requestId = req.requestId || req.headers['x-request-id'] || 'unknown';
    const logger = createRequestLogger(requestId, 'customer-controller');

    try {
      const customerId = parseInt(req.params.id);
      
      if (!customerId || isNaN(customerId)) {
        throw AppError.validationError('customerId', req.params.id, 'Valid customer ID is required');
      }

      const users = await this.customerService.getUsersByCustomer(customerId, 'summary', requestId);

      logger.debugSafe('Users by customer (summary) retrieved', {
        customerId,
        userCount: users.length
      });

      res.json({
        success: true,
        data: users,
        variant: 'summary',
        requestId
      });

    } catch (error) {
      this._handleError(error, res, requestId, 'get users by customer summary');
    }
  }

  /**
   * Get users by customer - Detail variant ✅ IMPLEMENTED
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUsersByCustomerDetail(req, res) {
    const requestId = req.requestId || req.headers['x-request-id'] || 'unknown';
    const logger = createRequestLogger(requestId, 'customer-controller');

    try {
      const customerId = parseInt(req.params.id);
      
      if (!customerId || isNaN(customerId)) {
        throw AppError.validationError('customerId', req.params.id, 'Valid customer ID is required');
      }

      const users = await this.customerService.getUsersByCustomer(customerId, 'detail', requestId);

      logger.debugSafe('Users by customer (detail) retrieved', {
        customerId,
        userCount: users.length
      });

      res.json({
        success: true,
        data: users,
        variant: 'detail',
        requestId
      });

    } catch (error) {
      this._handleError(error, res, requestId, 'get users by customer detail');
    }
  }

  /**
   * Health check endpoint
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async healthCheck(req, res) {
    const requestId = req.requestId || req.headers['x-request-id'] || 'unknown';

    try {
      const health = await this.customerService.healthCheck(requestId);
      
      res.json({
        success: true,
        service: 'customer-service',
        ...health,
        requestId
      });

    } catch (error) {
      this._handleError(error, res, requestId, 'health check');
    }
  }

  /**
   * Placeholder handler for future route implementations
   * @private
   * @param {string} description - Route description
   * @returns {Function} Express route handler
   */
  _placeholder(description) {
    return (req, res) => {
      const requestId = req.requestId || req.headers['x-request-id'] || 'unknown';
      
      res.status(501).json({
        error: {
          message: `${description} - Not implemented yet`,
          code: 'NOT_IMPLEMENTED',
          statusCode: 501,
          timestamp: new Date().toISOString(),
          requestId
        },
        implementation: 'TODO: Next iteration',
        endpoint: {
          method: req.method,
          url: req.originalUrl
        }
      });
    };
  }

  /**
   * Centralized error handling for all controller methods
   * @private
   * @param {Error} error - Error object
   * @param {Object} res - Express response object
   * @param {string} requestId - Request correlation ID
   * @param {string} operation - Operation description
   */
  _handleError(error, res, requestId, operation) {
    // Prevent double response
    if (res.headersSent) {
      return;
    }

    // AppError has proper status codes and formatting
    if (error instanceof AppError) {
      const isDevelopment = process.env.NODE_ENV === 'development';
      res.status(error.statusCode).json(error.toJSON(isDevelopment));
      return;
    }

    // Unknown errors - log and return generic 500
    const logger = createRequestLogger(requestId, 'customer-controller');
    logger.error(`Unhandled error in ${operation}`, {
      errorMessage: error.message,
      errorName: error.name
    });

    res.status(500).json({
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  }
}

module.exports = CustomerController;
