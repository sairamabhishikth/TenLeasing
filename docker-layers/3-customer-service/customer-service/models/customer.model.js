/**
 * Customer Domain Model
 * File: /customer-service/models/customer.model.js
 * Version: 1.1.0
 * 
 * Purpose: Customer domain-specific data access with optimized field variants
 *          CRUD operations provided by repository factory pattern
 */

const AppError = require('../../common/services/app-error');
const { getLogger, logDatabaseOperation, debugSafe } = require('../../common/services/logger.service');

// Performance-optimized SQL with field variants for minimal data transfer
const SQL_QUERIES = {
  // Header variant - minimal fields for dropdowns/lists (3 fields)
  FIND_USERS_BY_ACCOUNT_HEADER: `
    SELECT 
      u.user_id,
      u.first_name,
      u.last_name
    FROM "user" u
    INNER JOIN user_has_account uha ON u.user_id = uha.user_id
    INNER JOIN account a ON uha.account_id = a.account_id
    WHERE a.account_id = $1
      AND u.status = $2
      AND uha.status = $3
      AND a.status = $4
    ORDER BY u.last_name, u.first_name
  `,

  // Summary variant - common fields for cards/summaries (6 fields)
  FIND_USERS_BY_ACCOUNT_SUMMARY: `
    SELECT 
      u.user_id,
      u.first_name,
      u.last_name,
      u.email,
      u.designation,
      u.is_customer
    FROM "user" u
    INNER JOIN user_has_account uha ON u.user_id = uha.user_id
    INNER JOIN account a ON uha.account_id = a.account_id
    WHERE a.account_id = $1
      AND u.status = $2
      AND uha.status = $3
      AND a.status = $4
    ORDER BY u.last_name, u.first_name
  `,

  // Detail variant - all fields for full views (10 fields)
  FIND_USERS_BY_ACCOUNT_DETAIL: `
    SELECT 
      u.user_id,
      u.first_name,
      u.last_name,
      u.email,
      u.phone_number,
      u.designation,
      u.status,
      u.is_customer,
      c.customer_name,
      a.account_name,
      a.account_id
    FROM "user" u
    INNER JOIN customer c ON u.customer_id = c.customer_id
    INNER JOIN user_has_account uha ON u.user_id = uha.user_id
    INNER JOIN account a ON uha.account_id = a.account_id
    WHERE a.account_id = $1
      AND u.status = $2
      AND uha.status = $3
      AND c.status = $4
      AND a.status = $5
    ORDER BY u.last_name, u.first_name
  `,

  // Header variant - customer users (3 fields)
  FIND_USERS_BY_CUSTOMER_HEADER: `
    SELECT 
      u.user_id,
      u.first_name,
      u.last_name
    FROM "user" u
    INNER JOIN customer c ON u.customer_id = c.customer_id
    WHERE c.customer_id = $1
      AND u.status = $2
      AND c.status = $3
    ORDER BY u.last_name, u.first_name
  `,

  // Summary variant - customer users (6 fields)
  FIND_USERS_BY_CUSTOMER_SUMMARY: `
    SELECT 
      u.user_id,
      u.first_name,
      u.last_name,
      u.email,
      u.designation,
      u.is_customer
    FROM "user" u
    INNER JOIN customer c ON u.customer_id = c.customer_id
    WHERE c.customer_id = $1
      AND u.status = $2
      AND c.status = $3
    ORDER BY u.last_name, u.first_name
  `,

  // Detail variant - customer users with account aggregation (8+ fields)
  FIND_USERS_BY_CUSTOMER_DETAIL: `
  SELECT 
    u.user_id,
    u.first_name,
    u.last_name,
    u.email,
    u.phone_number,
    u.designation,
    u.status,
    u.is_customer,
    c.customer_name,
    c.customer_id,
    COALESCE(
      JSON_AGG(
        jsonb_build_object(
          'account_id', a.account_id,
          'account_name', a.account_name,
          'account_type', a.account_type,
          'parent_account_id', a.parent_account_id
        ) ORDER BY a.account_name
      ) FILTER (WHERE a.account_id IS NOT NULL),
      '[]'::json
    ) as accounts
  FROM "user" u
  INNER JOIN customer c ON u.customer_id = c.customer_id
  LEFT JOIN user_has_account uha ON u.user_id = uha.user_id 
    AND uha.status = $2
  LEFT JOIN account a ON uha.account_id = a.account_id 
    AND a.status = $2
  WHERE c.customer_id = $1
    AND u.status = $2
    AND c.status = $2
  GROUP BY u.user_id, u.first_name, u.last_name, u.email, 
           u.phone_number, u.designation, u.status, u.is_customer, 
           c.customer_name, c.customer_id
  ORDER BY u.last_name, u.first_name
  `
};

class CustomerModel {
  constructor() {
    this.logger = getLogger('customer-model');
  }

  /**
   * Find users by account - Header variant (3 fields)
   * Optimized for dropdowns, quick lists, minimal data transfer
   * @param {number} accountId - Account ID
   * @param {PrismaClient} client - Prisma client or transaction
   * @param {string} requestId - Request correlation ID
   * @returns {Promise<Array>} Users with minimal fields
   */
  async findUsersByAccountHeader(accountId, client, requestId = null) {
    return this._executeAccountQuery(
      SQL_QUERIES.FIND_USERS_BY_ACCOUNT_HEADER,
      accountId,
      'header',
      client,
      requestId
    );
  }

  /**
   * Find users by account - Summary variant (6 fields)
   * Optimized for user cards, summary views
   * @param {number} accountId - Account ID
   * @param {PrismaClient} client - Prisma client or transaction
   * @param {string} requestId - Request correlation ID
   * @returns {Promise<Array>} Users with summary fields
   */
  async findUsersByAccountSummary(accountId, client, requestId = null) {
    return this._executeAccountQuery(
      SQL_QUERIES.FIND_USERS_BY_ACCOUNT_SUMMARY,
      accountId,
      'summary',
      client,
      requestId
    );
  }

  /**
   * Find users by account - Detail variant (10+ fields)
   * Complete data for detailed views, user profiles
   * @param {number} accountId - Account ID
   * @param {PrismaClient} client - Prisma client or transaction
   * @param {string} requestId - Request correlation ID
   * @returns {Promise<Array>} Users with all details
   */
  async findUsersByAccountDetail(accountId, client, requestId = null) {
    return this._executeAccountQuery(
      SQL_QUERIES.FIND_USERS_BY_ACCOUNT_DETAIL,
      accountId,
      'detail',
      client,
      requestId
    );
  }

  /**
   * Find users by customer - Header variant (3 fields)
   * Minimal fields for customer user lists
   * @param {number} customerId - Customer ID
   * @param {PrismaClient} client - Prisma client or transaction
   * @param {string} requestId - Request correlation ID
   * @returns {Promise<Array>} Users with minimal fields
   */
  async findUsersByCustomerHeader(customerId, client, requestId = null) {
    return this._executeCustomerQuery(
      SQL_QUERIES.FIND_USERS_BY_CUSTOMER_HEADER,
      customerId,
      'header',
      client,
      requestId
    );
  }

  /**
   * Find users by customer - Summary variant (6 fields)
   * Summary fields for customer user management
   * @param {number} customerId - Customer ID
   * @param {PrismaClient} client - Prisma client or transaction
   * @param {string} requestId - Request correlation ID
   * @returns {Promise<Array>} Users with summary fields
   */
  async findUsersByCustomerSummary(customerId, client, requestId = null) {
    return this._executeCustomerQuery(
      SQL_QUERIES.FIND_USERS_BY_CUSTOMER_SUMMARY,
      customerId,
      'summary',
      client,
      requestId
    );
  }

  /**
   * Find users by customer - Detail variant (8+ fields with JSON accounts)
   * Complete data with account aggregation for detailed customer views
   * @param {number} customerId - Customer ID
   * @param {PrismaClient} client - Prisma client or transaction
   * @param {string} requestId - Request correlation ID
   * @returns {Promise<Array>} Users with full details and account assignments
   */
  async findUsersByCustomerDetail(customerId, client, requestId = null) {
    return this._executeCustomerQuery(
      SQL_QUERIES.FIND_USERS_BY_CUSTOMER_DETAIL,
      customerId,
      'detail',
      client,
      requestId
    );
  }

  /**
   * Execute account-based query with error handling
   * @private
   * @param {string} sqlQuery - SQL query constant
   * @param {number} accountId - Account ID
   * @param {string} variant - Query variant (header/summary/detail)
   * @param {PrismaClient} client - Prisma client
   * @param {string} requestId - Request correlation ID
   * @returns {Promise<Array>} Query results
   */
  async _executeAccountQuery(sqlQuery, accountId, variant, client, requestId) {
    if (!accountId || !client) {
      throw AppError.validationError('accountId', accountId, 'Account ID and client are required');
    }

    const startTime = Date.now();

    try {
      const parameters = variant === 'header' 
        ? [accountId, 'ACT', 'ACT', 'ACT']           // header: 4 params
        : [accountId, 'ACT', 'ACT', 'ACT', 'ACT'];   // summary/detail: 5 params

      const users = await client.$queryRawUnsafe(sqlQuery, ...parameters);

      logDatabaseOperation(`SELECT-JOIN-${variant.toUpperCase()}`, 'user+account', Date.now() - startTime, requestId, 'customer-model');
      
      debugSafe(`Found users by account (${variant})`, {
      accountId,
      userCount: users.length,
      variant,
      requestId
      }, 'customer-model');

      return users;

    } catch (error) {
      this.logger.error(`Failed to find users by account (${variant})`, {
        accountId,
        variant,
        requestId,
        errorMessage: error.message
      });
      throw AppError.databaseError(`find users by account ${variant}`, error);
    }
  }

  /**
   * Execute customer-based query with error handling
   * @private
   * @param {string} sqlQuery - SQL query constant
   * @param {number} customerId - Customer ID
   * @param {string} variant - Query variant (header/summary/detail)
   * @param {PrismaClient} client - Prisma client
   * @param {string} requestId - Request correlation ID
   * @returns {Promise<Array>} Query results
   */
  async _executeCustomerQuery(sqlQuery, customerId, variant, client, requestId) {
    if (!customerId || !client) {
      throw AppError.validationError('customerId', customerId, 'Customer ID and client are required');
    }

    const startTime = Date.now();

    try {
      const users = await client.$queryRawUnsafe(sqlQuery, customerId, 'ACT', 'ACT');

      const operationType = variant === 'detail' ? 'SELECT-JOIN-AGG' : 'SELECT-JOIN';
      logDatabaseOperation(`${operationType}-${variant.toUpperCase()}`, 'user+customer', Date.now() - startTime, requestId, 'customer-model');
      
      debugSafe(`Found users by customer (${variant})`, {
      customerId,
      userCount: users.length,
      variant,
      requestId
      }, 'customer-model');

      return users;

    } catch (error) {
      this.logger.error(`Failed to find users by customer (${variant})`, {
        customerId,
        variant,
        requestId,
        errorMessage: error.message
      });
      throw AppError.databaseError(`find users by customer ${variant}`, error);
    }
  }
}

module.exports = CustomerModel;
