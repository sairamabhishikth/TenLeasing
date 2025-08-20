/**
 * Repository Factory Model Service
 * File: /common/services/repository-factory-model.service.js
 * Version: 1.0.0
 * 
 * Purpose: Generic CRUD repository factory for all Prisma entities
 *          Eliminates duplicate CRUD code across domain models
 */

const AppError = require('./app-error');
const { getLogger, logDatabaseOperation } = require('./logger.service');

class RepositoryFactory {
  constructor() {
    this.repositories = new Map();
    this.logger = getLogger('repository-factory');
  }

  /**
   * Get repository instance for entity (singleton per entity)
   * @param {string} entityName - Prisma model name (camelCase)
   * @returns {Object} Generic repository with CRUD operations
   */
  getRepository(entityName) {
    if (!entityName) {
      throw AppError.validationError('entityName', entityName, 'Entity name is required');
    }

    if (!this.repositories.has(entityName)) {
      this.repositories.set(entityName, new GenericRepository(entityName));
    }

    return this.repositories.get(entityName);
  }

  /**
   * Clear repository cache (useful for testing)
   * @param {string} entityName - Specific entity or null for all
   */
  clearCache(entityName = null) {
    if (entityName) {
      this.repositories.delete(entityName);
    } else {
      this.repositories.clear();
    }
  }
}

class GenericRepository {
  constructor(entityName) {
    this.entityName = entityName;
    this.logger = getLogger(`repository-${entityName}`);
    this.primaryKeyField = this._getPrimaryKeyField(entityName);
  }

  /**
   * Get primary key field name for entity
   * @private
   * @param {string} entityName - Entity name
   * @returns {string} Primary key field name
   */
  // In repository-factory-model.service.js
_getPrimaryKeyField(entityName) {
  const primaryKeyMap = {
    'customer': 'customerId',     // ✅ Matches schema
    'account': 'accountId',       // ✅ Matches schema  
    'user': 'userId',             // ✅ Matches schema
    'userHasAccount': 'userHasAccountId'  // ✅ Matches schema
  };
  
  return primaryKeyMap[entityName] || 'id';
}

  /**
   * Find entity by primary key
   * @param {number|string} id - Primary key value
   * @param {PrismaClient} client - Prisma client or transaction
   * @param {string} requestId - Request correlation ID
   * @returns {Promise<Object|null>} Entity record
   */
  async findById(id, client, requestId = null) {
    if (!id || !client) {
      throw AppError.validationError('id', id, 'ID and client are required');
    }

    const startTime = Date.now();

    try {
      const whereClause = { [this.primaryKeyField]: id };
      const entity = await client[this.entityName].findUnique({ where: whereClause });

      logDatabaseOperation('SELECT', this.entityName, Date.now() - startTime, requestId, `repository-${this.entityName}`);
      return entity;

    } catch (error) {
      this.logger.error('Failed to find entity by ID', {
        entityName: this.entityName,
        id,
        requestId,
        errorMessage: error.message
      });
      throw AppError.databaseError(`find ${this.entityName} by ID`, error);
    }
  }

  /**
   * Create new entity
   * @param {Object} data - Entity data
   * @param {PrismaClient} client - Prisma client or transaction
   * @param {string} requestId - Request correlation ID
   * @returns {Promise<Object>} Created entity
   */
  async create(data, client, requestId = null) {
    if (!data || !client) {
      throw AppError.validationError('data', data, 'Data and client are required');
    }

    const startTime = Date.now();

    try {
      const entity = await client[this.entityName].create({ data });

      logDatabaseOperation('INSERT', this.entityName, Date.now() - startTime, requestId, `repository-${this.entityName}`);
      return entity;

    } catch (error) {
      this.logger.error('Failed to create entity', {
        entityName: this.entityName,
        requestId,
        errorMessage: error.message,
        errorCode: error.code
      });
      throw AppError.databaseError(`create ${this.entityName}`, error);
    }
  }

  /**
   * Update entity by primary key
   * @param {number|string} id - Primary key value
   * @param {Object} data - Update data
   * @param {PrismaClient} client - Prisma client or transaction
   * @param {string} requestId - Request correlation ID
   * @returns {Promise<Object>} Updated entity
   */
  async updateById(id, data, client, requestId = null) {
    if (!id || !data || !client) {
      throw AppError.validationError('updateData', data, 'ID, data, and client are required');
    }

    const startTime = Date.now();

    try {
      const whereClause = { [this.primaryKeyField]: id };
      const updateData = { ...data, updatedAt: new Date() };
      
      const entity = await client[this.entityName].update({
        where: whereClause,
        data: updateData
      });

      logDatabaseOperation('UPDATE', this.entityName, Date.now() - startTime, requestId, `repository-${this.entityName}`);
      return entity;

    } catch (error) {
      if (error.code === 'P2025') {
        throw AppError.notFound(this.entityName, id);
      }

      this.logger.error('Failed to update entity', {
        entityName: this.entityName,
        id,
        requestId,
        errorMessage: error.message
      });
      throw AppError.databaseError(`update ${this.entityName}`, error);
    }
  }

  /**
   * Delete entity by primary key
   * @param {number|string} id - Primary key value
   * @param {PrismaClient} client - Prisma client or transaction
   * @param {string} requestId - Request correlation ID
   * @returns {Promise<Object>} Deleted entity
   */
  async deleteById(id, client, requestId = null) {
    if (!id || !client) {
      throw AppError.validationError('id', id, 'ID and client are required');
    }

    const startTime = Date.now();

    try {
      const whereClause = { [this.primaryKeyField]: id };
      const entity = await client[this.entityName].delete({ where: whereClause });

      logDatabaseOperation('DELETE', this.entityName, Date.now() - startTime, requestId, `repository-${this.entityName}`);
      return entity;

    } catch (error) {
      if (error.code === 'P2025') {
        throw AppError.notFound(this.entityName, id);
      }

      this.logger.error('Failed to delete entity', {
        entityName: this.entityName,
        id,
        requestId,
        errorMessage: error.message
      });
      throw AppError.databaseError(`delete ${this.entityName}`, error);
    }
  }

  /**
   * Find all entities with pagination
   * @param {Object} options - Query options
   * @param {number} options.page - Page number (1-based)
   * @param {number} options.limit - Records per page
   * @param {Object} options.where - Filter conditions
   * @param {Object} options.orderBy - Sort conditions
   * @param {PrismaClient} client - Prisma client or transaction
   * @param {string} requestId - Request correlation ID
   * @returns {Promise<Object>} Paginated results with metadata
   */
  async findAll(options = {}, client, requestId = null) {
    if (!client) {
      throw AppError.validationError('client', client, 'Prisma client is required');
    }

    const { page = 1, limit = 50, where = {}, orderBy = {} } = options;
    const skip = (page - 1) * limit;
    const startTime = Date.now();

    try {
      const [entities, totalCount] = await Promise.all([
        client[this.entityName].findMany({
          where,
          skip,
          take: limit,
          orderBy
        }),
        client[this.entityName].count({ where })
      ]);

      logDatabaseOperation('SELECT-PAGINATED', this.entityName, Date.now() - startTime, requestId, `repository-${this.entityName}`);

      return {
        data: entities,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page * limit < totalCount,
          hasPrev: page > 1
        }
      };

    } catch (error) {
      this.logger.error('Failed to find all entities', {
        entityName: this.entityName,
        page,
        limit,
        requestId,
        errorMessage: error.message
      });
      throw AppError.databaseError(`find all ${this.entityName}`, error);
    }
  }

  /**
   * Count entities with optional filters
   * @param {Object} where - Filter conditions
   * @param {PrismaClient} client - Prisma client or transaction
   * @param {string} requestId - Request correlation ID
   * @returns {Promise<number>} Entity count
   */
  async count(where = {}, client, requestId = null) {
    if (!client) {
      throw AppError.validationError('client', client, 'Prisma client is required');
    }

    const startTime = Date.now();

    try {
      const count = await client[this.entityName].count({ where });

      logDatabaseOperation('COUNT', this.entityName, Date.now() - startTime, requestId, `repository-${this.entityName}`);
      return count;

    } catch (error) {
      this.logger.error('Failed to count entities', {
        entityName: this.entityName,
        requestId,
        errorMessage: error.message
      });
      throw AppError.databaseError(`count ${this.entityName}`, error);
    }
  }
}

// Export singleton factory instance
const repositoryFactory = new RepositoryFactory();

module.exports = {
  getRepository: (entityName) => repositoryFactory.getRepository(entityName),
  clearCache: (entityName) => repositoryFactory.clearCache(entityName)
};

