/**
 * Customer Domain Controller
 * File: /customer-service/customer.controller.js
 * Version: 1.1.0 - Account Management Added
 * 
 * Purpose: HTTP request/response handlers for customer domain
 *          ✅ PRESERVES: All existing methods (createCustomer, getUsersByAccount variants, etc.)
 *          ✅ ADDS: Account management methods from TypeScript controller
 */

const CustomerService = require('./customer.service');
const AppError = require('../common/services/app-error');
const { createRequestLogger } = require('../common/services/logger.service');

class CustomerController {
  constructor() {
    this.customerService = new CustomerService();
  }

  // ========================================
  // EXISTING METHODS - PRESERVED EXACTLY AS THEY ARE ✅
  // ========================================

  /**
   * Create new customer (Transaction Demo) ✅ EXISTING - UNCHANGED
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
   * Get users by account - Header variant ✅ EXISTING - UNCHANGED
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
   * Get users by account - Summary variant ✅ EXISTING - UNCHANGED
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
   * Get users by account - Detail variant ✅ EXISTING - UNCHANGED
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
   * Get users by customer - Header variant ✅ EXISTING - UNCHANGED
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
   * Get users by customer - Summary variant ✅ EXISTING - UNCHANGED
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
   * Get users by customer - Detail variant ✅ EXISTING - UNCHANGED
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
   * Health check endpoint ✅ EXISTING - UNCHANGED
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

  // ========================================
  // NEW ACCOUNT MANAGEMENT METHODS - ADDED FROM TYPESCRIPT ✅
  // ========================================

  /**
   * Get accounts by user ID with filtering and pagination ✅ NEW - FROM TYPESCRIPT
   * Converted from: getAccountsByUserId in account.controller.ts
   */
  async getAccountsByUserId(req, res) {
    const requestId = req.requestId || req.headers['x-request-id'] || 'unknown';
    const logger = createRequestLogger(requestId, 'customer-controller');

    try {
      const { userId } = req.params;
      
      // Validate userId
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum) || userIdNum <= 0) {
        throw AppError.validationError('userId', userId, 'Valid user ID is required');
      }

      // Extract pagination parameters (matching your TypeScript pagination utility)
      const page = parseInt(req.query.page) || 1;
      const perPage = parseInt(req.query.perPage) || 50;

      // Extract filter parameters (exactly matching your TypeScript filters)
      const filters = {
        account_name: req.query.account_name,
        account_number: req.query.account_number,
        legacy_account_number: req.query.legacy_account_number,
        account_type: req.query.account_type,
        status: req.query.status,
        country_lookup_id: req.query.country_lookup_id,
        account_manager_id: req.query.account_manager_id,
        number_of_users: req.query.number_of_users,
        is_deleted: req.query.is_deleted
      };

      logger.info('Getting accounts by user ID', {
        userId: userIdNum,
        page,
        perPage,
        hasFilters: Object.values(filters).some(filter => filter !== undefined)
      });

      // Call service layer (will create this method)
      const result = await this.customerService.getAccountsByUserId(
        userIdNum,
        { page, perPage },
        filters,
        requestId
      );

      logger.info('Accounts retrieved successfully', {
        userId: userIdNum,
        totalAccounts: result.totalCount,
        page
      });

      // Match your TypeScript response format
      res.json({
        success: true,
        data: result.data,
        pagination: {
          page,
          perPage,
          totalCount: result.totalCount,
          totalPages: Math.ceil(result.totalCount / perPage)
        },
        requestId
      });

    } catch (error) {
      this._handleError(error, res, requestId, 'get accounts by user ID');
    }
  }

  /**
   * Get secondary contacts for an account ✅ NEW - FROM TYPESCRIPT
   * Converted from: getSecondaryContacts in account.controller.ts
   */
  async getSecondaryContacts(req, res) {
    const requestId = req.requestId || req.headers['x-request-id'] || 'unknown';
    const logger = createRequestLogger(requestId, 'customer-controller');

    try {
      const { accountId } = req.params;
      
      // Validate accountId
      const accountIdNum = parseInt(accountId);
      if (isNaN(accountIdNum) || accountIdNum <= 0) {
        throw AppError.validationError('accountId', accountId, 'Valid account ID is required');
      }

      // Extract pagination parameters
      const page = parseInt(req.query.page) || 1;
      const perPage = parseInt(req.query.perPage) || 50;

      // Extract filter parameters (exactly matching your TypeScript filters)
      const filters = {
        first_name: req.query.first_name,
        last_name: req.query.last_name,
        email: req.query.email,
        designation: req.query.designation,
        status: req.query.status,
        phone_number: req.query.phone_number
      };

      logger.info('Getting secondary contacts for account', {
        accountId: accountIdNum,
        page,
        perPage
      });

      // Call service layer (will create this method)
      const result = await this.customerService.getSecondaryContacts(
        accountIdNum,
        { page, perPage },
        filters,
        requestId
      );

      logger.info('Secondary contacts retrieved successfully', {
        accountId: accountIdNum,
        totalContacts: result.totalCount
      });

      // Match your TypeScript response format
      res.json({
        success: true,
        data: result.data,
        pagination: {
          page,
          perPage,
          totalCount: result.totalCount,
          totalPages: Math.ceil(result.totalCount / perPage)
        },
        requestId
      });

    } catch (error) {
      this._handleError(error, res, requestId, 'get secondary contacts');
    }
  }

  /**
   * Get account primary contact and related accounts ✅ NEW - FROM TYPESCRIPT
   * Converted from: getAccountPrimaryContactAndRelated in account.controller.ts
   */
  async getAccountPrimaryContactAndRelated(req, res) {
    const requestId = req.requestId || req.headers['x-request-id'] || 'unknown';
    const logger = createRequestLogger(requestId, 'customer-controller');

    try {
      const { accountId } = req.params;
      
      // Validate accountId
      const accountIdNum = parseInt(accountId);
      if (isNaN(accountIdNum) || accountIdNum <= 0) {
        throw AppError.validationError('accountId', accountId, 'Valid account ID is required');
      }

      logger.info('Getting account primary contact and related accounts', {
        accountId: accountIdNum
      });

      // Extract customer context from request if available (matching your TypeScript logic)
      const customerId = req.user?.customer_id ? parseInt(req.user.customer_id) : null;

      // Call service layer (will create this method)
      const result = await this.customerService.getAccountPrimaryContactAndRelated(
        accountIdNum,
        customerId,
        requestId
      );

      logger.info('Account details retrieved successfully', {
        accountId: accountIdNum,
        hasPrimaryContact: result.summary.has_primary_contact,
        relatedAccountsCount: result.summary.total_related_accounts
      });

      // Match your TypeScript response format exactly
      res.json({
        success: true,
        data: result,
        requestId
      });

    } catch (error) {
      this._handleError(error, res, requestId, 'get account primary contact and related');
    }
  }

  /**
   * Get user accounts minimal (just ID and name) ✅ NEW - FROM TYPESCRIPT
   * Converted from: getUserAccountsMinimal in account.controller.ts
   */
  async getUserAccountsMinimal(req, res) {
    const requestId = req.requestId || req.headers['x-request-id'] || 'unknown';
    const logger = createRequestLogger(requestId, 'customer-controller');

    try {
      const { userId } = req.params;
      
      // Validate userId
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum) || userIdNum <= 0) {
        throw AppError.validationError('userId', userId, 'Valid user ID is required');
      }

      logger.debugSafe('Getting minimal user accounts', {
        userId: userIdNum
      });

      // Call service layer (will create this method)
      const accounts = await this.customerService.getUserAccountsMinimal(
        userIdNum,
        requestId
      );

      logger.debugSafe('Minimal user accounts retrieved', {
        userId: userIdNum,
        accountCount: accounts.length
      });

      // Match your TypeScript response format
      res.json({
        success: true,
        data: accounts,
        requestId
      });

    } catch (error) {
      this._handleError(error, res, requestId, 'get user accounts minimal');
    }
  }

  /**
   * Download accounts by user ID as Excel file ✅ NEW - FROM TYPESCRIPT
   * Converted from: downloadAccountsByUserId in account.controller.ts
   */
  async downloadAccountsByUserId(req, res) {
    const requestId = req.requestId || req.headers['x-request-id'] || 'unknown';
    const logger = createRequestLogger(requestId, 'customer-controller');

    try {
      const { userId } = req.params;
      
      // Validate userId
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum) || userIdNum <= 0) {
        throw AppError.validationError('userId', userId, 'Valid user ID is required');
      }

      logger.info('Starting Excel download for user accounts', {
        userId: userIdNum
      });

      // Extract pagination and filters (matching your TypeScript logic)
      const page = parseInt(req.query.page) || 1;
      const perPage = parseInt(req.query.perPage) || 1000; // Higher limit for export

      const filters = {
        account_name: req.query.account_name,
        account_number: req.query.account_number,
        legacy_account_number: req.query.legacy_account_number,
        account_type: req.query.account_type,
        status: req.query.status,
        country_lookup_id: req.query.country_lookup_id,
        account_manager_id: req.query.account_manager_id,
        number_of_users: req.query.number_of_users,
        is_deleted: req.query.is_deleted
      };

      // Call service layer for Excel generation (will create this method)
      await this.customerService.downloadAccountsByUserId(
        userIdNum,
        { page, perPage },
        filters,
        res,
        requestId
      );

      logger.info('Excel download completed successfully', {
        userId: userIdNum
      });

    } catch (error) {
      // For file downloads, handle errors differently (matching your TypeScript logic)
      if (!res.headersSent) {
        logger.error('Excel download failed', {
          userId: req.params.userId,
          errorMessage: error.message
        });
        
        res.status(500).json({
          error: {
            message: 'Failed to generate Excel file',
            code: 'EXPORT_ERROR',
            statusCode: 500,
            timestamp: new Date().toISOString(),
            requestId
          }
        });
      }
    }
  }

  /**
   * Download secondary contacts as Excel file ✅ NEW - FROM TYPESCRIPT
   * Converted from: downloadSecondaryContacts in account.controller.ts
   */
  async downloadSecondaryContacts(req, res) {
    const requestId = req.requestId || req.headers['x-request-id'] || 'unknown';
    const logger = createRequestLogger(requestId, 'customer-controller');

    try {
      const { accountId } = req.params;
      
      // Validate accountId
      const accountIdNum = parseInt(accountId);
      if (isNaN(accountIdNum) || accountIdNum <= 0) {
        throw AppError.validationError('accountId', accountId, 'Valid account ID is required');
      }

      logger.info('Starting Excel download for secondary contacts', {
        accountId: accountIdNum
      });

      // Extract pagination and filters
      const page = parseInt(req.query.page) || 1;
      const perPage = parseInt(req.query.perPage) || 1000; // Higher limit for export

      const filters = {
        first_name: req.query.first_name,
        last_name: req.query.last_name,
        email: req.query.email,
        designation: req.query.designation,
        status: req.query.status,
        phone_number: req.query.phone_number
      };

      // Call service layer for Excel generation (will create this method)
      await this.customerService.downloadSecondaryContacts(
        accountIdNum,
        { page, perPage },
        filters,
        res,
        requestId
      );

      logger.info('Excel download completed successfully', {
        accountId: accountIdNum
      });

    } catch (error) {
      // For file downloads, handle errors differently
      if (!res.headersSent) {
        logger.error('Excel download failed', {
          accountId: req.params.accountId,
          errorMessage: error.message
        });
        
        res.status(500).json({
          error: {
            message: 'Failed to generate Excel file',
            code: 'EXPORT_ERROR',
            statusCode: 500,
            timestamp: new Date().toISOString(),
            requestId
          }
        });
      }
    }
  }

  // ========================================
  // EXISTING HELPER METHODS - PRESERVED EXACTLY ✅
  // ========================================

  /**
   * Placeholder handler for future route implementations ✅ EXISTING - UNCHANGED
   * @private
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
   * Centralized error handling for all controller methods ✅ EXISTING - UNCHANGED
   * @private
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