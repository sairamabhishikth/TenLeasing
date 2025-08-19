/**
 * User Domain Model
 * File: /customer-service/models/user.model.js
 * Version: 1.0.0
 * 
 * Purpose: User domain data access layer
 *          All CRUD operations provided by repository factory pattern
 *          No custom methods currently - pure factory delegation
 */

const { getLogger } = require('../../common/services/logger.service');

class UserModel {
  constructor() {
    this.logger = getLogger('user-model');
    this.entityName = 'user';
  }

  /**
   * Get entity name for repository factory
   * @returns {string} Prisma entity name
   */
  getEntityName() {
    return this.entityName;
  }
}

module.exports = UserModel;
