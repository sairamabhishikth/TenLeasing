/**
 * Customer Domain Service
 * File: /customer-service/customer.service.js
 * Version: 1.0.0
 * 
 * Purpose: Customer domain business orchestration layer
 *          Transaction management and model coordination
 */

const { getClient, executeTransaction } = require('../common/services/database.service');
const { getRepository } = require('../common/services/repository-factory-model.service');
const CustomerModel = require('./models/customer.model');
const AppError = require('../common/services/app-error');
const { createRequestLogger } = require('../common/services/logger.service');

class CustomerService {
  constructor() {
    this.customerModel = new CustomerModel();
    this.customerRepository = getRepository('customer');
  }

  /**
   * Create new customer with transaction management ✅ IMPLEMENTED
   * @param {Object} customerData - Customer data from request
   * @param {string} requestId - Request correlation ID
   * @returns {Promise<Object>} Created customer
   */
  async createCustomer(customerData, requestId = null) {
    const logger = createRequestLogger(requestId, 'customer-service');

    try {
      logger.info('Creating customer with transaction', {
        customerName: customerData.customerName
      });

      // Execute within transaction
      const customer = await executeTransaction(async (tx) => {
        return this.customerRepository.create(customerData, tx, requestId);
      }, requestId);

      logger.info('Customer created successfully', {
        customerId: customer.customerId,
        customerName: customer.customerName
      });

      return customer;

    } catch (error) {
      logger.error('Failed to create customer', {
        customerName: customerData?.customerName,
        errorMessage: error.message
      });
      throw error;
    }
  }

  /**
   * Get users by account with field variants (No Transaction) ✅ IMPLEMENTED
   * @param {number} accountId - Account ID
   * @param {string} variant - Field variant (header|summary|detail)
   * @param {string} requestId - Request correlation ID
   * @returns {Promise<Array>} Users with specified fields
   */
  async getUsersByAccount(accountId, variant, requestId = null) {
    const logger = createRequestLogger(requestId, 'customer-service');

    try {
      const client = await getClient(requestId);
      
      logger.debugSafe('Getting users by account', {
        accountId,
        variant
      });

      // Call appropriate variant method
      const methodName = `findUsersByAccount${this._capitalizeVariant(variant)}`;
      
      if (typeof this.customerModel[methodName] !== 'function') {
        throw AppError.validationError('variant', variant, 'Valid variant required: header, summary, detail');
      }

      const users = await this.customerModel[methodName](accountId, client, requestId);

      logger.debugSafe('Users by account retrieved', {
        accountId,
        variant,
        userCount: users.length
      });

      return users;

    } catch (error) {
      logger.error('Failed to get users by account', {
        accountId,
        variant,
        errorMessage: error.message
      });
      throw error;
    }
  }

  /**
   * Get users by customer with field variants (No Transaction) ✅ IMPLEMENTED
   * @param {number} customerId - Customer ID
   * @param {string} variant - Field variant (header|summary|detail)
   * @param {string} requestId - Request correlation ID
   * @returns {Promise<Array>} Users with specified fields
   */
  async getUsersByCustomer(customerId, variant, requestId = null) {
    const logger = createRequestLogger(requestId, 'customer-service');

    try {
      const client = await getClient(requestId);
      
      logger.debugSafe('Getting users by customer', {
        customerId,
        variant
      });

      // Call appropriate variant method
      const methodName = `findUsersByCustomer${this._capitalizeVariant(variant)}`;
      
      if (typeof this.customerModel[methodName] !== 'function') {
        throw AppError.validationError('variant', variant, 'Valid variant required: header, summary, detail');
      }

      const users = await this.customerModel[methodName](customerId, client, requestId);

      logger.debugSafe('Users by customer retrieved', {
        customerId,
        variant,
        userCount: users.length
      });

      return users;

    } catch (error) {
      logger.error('Failed to get users by customer', {
        customerId,
        variant,
        errorMessage: error.message
      });
      throw error;
    }
  }

  /**
   * Service health check
   * @param {string} requestId - Request correlation ID
   * @returns {Promise<Object>} Health status
   */
  async healthCheck(requestId = null) {
    const logger = createRequestLogger(requestId, 'customer-service');

    try {
      const client = await getClient(requestId);
      
      // Test basic connectivity
      await client.$queryRaw`SELECT 1 as health_check`;
      
      logger.debugSafe('Customer service health check passed');

      return {
        healthy: true,
        service: 'customer-service',
        database: 'connected',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Customer service health check failed', {
        errorMessage: error.message
      });

      return {
        healthy: false,
        service: 'customer-service',
        database: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Capitalize variant name for method lookup
   * @private
   * @param {string} variant - Variant name (header|summary|detail)
   * @returns {string} Capitalized variant (Header|Summary|Detail)
   */
  _capitalizeVariant(variant) {
    return variant.charAt(0).toUpperCase() + variant.slice(1);
  }
}

module.exports = CustomerService;
