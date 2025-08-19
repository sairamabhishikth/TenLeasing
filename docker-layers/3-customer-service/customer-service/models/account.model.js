/**
 * Account Domain Model
 * File: /customer-service/models/account.model.js
 * Version: 1.0.0
 * 
 * Purpose: Account domain data access layer
 *          All CRUD operations provided by repository factory pattern
 *          No custom methods currently - pure factory delegation
 */

const { getLogger } = require('../../common/services/logger.service');

class AccountModel {
  constructor() {
    this.logger = getLogger('account-model');
    this.entityName = 'account';
  }

  /**
   * Get entity name for repository factory
   * @returns {string} Prisma entity name
   */
  getEntityName() {
    return this.entityName;
  }
}

module.exports = AccountModel;
