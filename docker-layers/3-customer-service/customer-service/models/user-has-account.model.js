/**
 * User-Account Junction Domain Model
 * File: /customer-service/models/user-has-account.model.js
 * Version: 1.0.0
 * 
 * Purpose: User-Account relationship data access layer
 *          All CRUD operations provided by repository factory pattern
 *          No custom methods currently - pure factory delegation
 */

const { getLogger } = require('../../common/services/logger.service');

class UserHasAccountModel {
  constructor() {
    this.logger = getLogger('user-has-account-model');
    this.entityName = 'userHasAccount';
  }

  /**
   * Get entity name for repository factory
   * @returns {string} Prisma entity name
   */
  getEntityName() {
    return this.entityName;
  }
}

module.exports = UserHasAccountModel;
