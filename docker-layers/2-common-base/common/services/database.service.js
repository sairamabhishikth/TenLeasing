/**
 * Database Service
 * File: /common/services/database.service.js
 * Version: 1.0.0
 * 
 * Purpose: Centralized Prisma client management with connection pooling,
 *          health monitoring, and graceful shutdown handling
 */

const { PrismaClient } = require('@prisma/client');
const techConfig = require('../config/technical.config');
const { getDatabaseUrl } = require('./secrets.service');
const AppError = require('./app-error');
const { getLogger, logDatabaseOperation, debugSafe } = require('./logger.service');

class DatabaseService {
  constructor() {
    this.prisma = null;
    this.isConnected = false;
    this.connectionPromise = null;
    this.logger = getLogger('database-service');
  }

  /**
   * Get Prisma client instance (Singleton pattern)
   * Prevents multiple connection attempts and ensures single client
   * @param {string} requestId - Request correlation ID
   * @returns {Promise<PrismaClient>} Configured Prisma client
   */
  async getClient(requestId = null) {
    if (this.prisma && this.isConnected) {
      debugSafe('Using existing database connection', { requestId }, 'database-service');
      return this.prisma;
    }

    // Prevent multiple simultaneous connection attempts
    if (this.connectionPromise) {
      debugSafe('Waiting for existing connection attempt', { requestId }, 'database-service');
      return this.connectionPromise;
    }

    this.connectionPromise = this._createConnection(requestId);
    return this.connectionPromise;
  }

  /**
   * Create new Prisma connection with optimized settings
   * @private
   * @param {string} requestId - Request correlation ID
   * @returns {Promise<PrismaClient>} Connected Prisma client
   */
  async _createConnection(requestId = null) {
    try {
      this.logger.info('Initializing database connection', { requestId });

      // Get database URL from secrets
      const databaseUrl = await this._getDatabaseUrl(requestId);
      
      // Create Prisma client with enterprise configuration
      this.prisma = new PrismaClient({
        datasources: {
          db: { url: databaseUrl }
        },
        log: this._getLogLevel(),
        errorFormat: 'minimal',
        ...this._getConnectionConfig()
      });

      // Test connection
      await this._testConnection(requestId);
      
      this.isConnected = true;
      this.connectionPromise = null;

      this.logger.info('Database connection established successfully', {
        requestId,
        engine: 'postgresql',
        poolConfig: this._getPoolConfig()
      });

      return this.prisma;

    } catch (error) {
      this.isConnected = false;
      this.connectionPromise = null;
      
      this.logger.error('Database connection failed', {
        requestId,
        errorMessage: error.message,
        errorName: error.name
      });

      throw AppError.databaseError('connection initialization', error);
    }
  }

  /**
   * Get database URL from secrets manager
   * @private
   * @param {string} requestId - Request correlation ID
   * @returns {Promise<string>} Database connection URL
   */
  async _getDatabaseUrl(requestId = null) {
    // Check environment variable first
    if (process.env.DATABASE_URL) {
      debugSafe('Using DATABASE_URL from environment', { requestId }, 'database-service');
      return process.env.DATABASE_URL;
    }

    // Get from secrets manager
    const secretName = process.env.DB_SECRET_NAME;
    if (!secretName) {
      throw AppError.validationError(
        'DB_SECRET_NAME',
        secretName,
        'Database secret name is required'
      );
    }

    return getDatabaseUrl(secretName, requestId);
  }

  /**
   * Get Prisma log configuration based on environment
   * @private
   * @returns {Array} Prisma log levels
   */
  _getLogLevel() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      return ['error', 'warn', 'info'];
    }
    return ['error'];
  }

  /**
   * Get connection pool configuration
   * @private
   * @returns {Object} Connection pool settings
   */
  _getConnectionConfig() {
    const dbConfig = techConfig.database;
    
    return {
  // Remove all - Prisma handles connection config internally
    };
  }

  /**
   * Get pool configuration for logging
   * @private
   * @returns {Object} Pool configuration summary
   */
  _getPoolConfig() {
    const pool = techConfig.database.pool;
    return {
      min: pool.min,
      max: pool.max,
      acquireTimeoutMs: pool.acquireTimeoutMs
    };
  }

  /**
   * Test database connectivity
   * @private
   * @param {string} requestId - Request correlation ID
   * @throws {AppError} When connection test fails
   */
  async _testConnection(requestId = null) {
    const startTime = Date.now();
    
    try {
      await this.prisma.$queryRaw`SELECT 1 as test`;
      
      const duration = Date.now() - startTime;
      debugSafe('Database connectivity test passed', {
      requestId,
      duration: `${duration}ms`
      }, 'database-service');
      
    } catch (error) {
      throw AppError.databaseError('connectivity test', error);
    }
  }

  /**
   * Execute database transaction with proper error handling
   * @param {Function} transactionFn - Transaction function
   * @param {string} requestId - Request correlation ID
   * @returns {Promise<any>} Transaction result
   */
  async executeTransaction(transactionFn, requestId = null) {
    const client = await this.getClient(requestId);
    const startTime = Date.now();

    try {
      debugSafe('Starting database transaction', { requestId }, 'database-service');
      
      const result = await client.$transaction(transactionFn);
      
      const duration = Date.now() - startTime;
      this.logger.info('Database transaction completed', {
        requestId,
        duration: `${duration}ms`
      });
      
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Database transaction failed', {
        requestId,
        duration: `${duration}ms`,
        errorMessage: error.message
      });

      throw AppError.databaseError('transaction execution', error);
    }
  }

  /**
   * Execute database query with logging and error handling
   * @param {string} operation - Operation description
   * @param {Function} queryFn - Query function
   * @param {string} requestId - Request correlation ID
   * @returns {Promise<any>} Query result
   */
  async executeQuery(operation, queryFn, requestId = null) {
    const client = await this.getClient(requestId);
    const startTime = Date.now();

    try {
      const result = await queryFn(client);
      
      const duration = Date.now() - startTime;
      logDatabaseOperation(operation, 'unknown', duration, requestId, 'database-service');
      
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Database query failed', {
        requestId,
        operation,
        duration: `${duration}ms`,
        errorMessage: error.message,
        errorCode: error.code
      });

      throw AppError.databaseError(operation, error);
    }
  }

  /**
   * Graceful shutdown - disconnect from database
   * @param {string} requestId - Request correlation ID
   */
  async disconnect(requestId = null) {
    if (this.prisma && this.isConnected) {
      try {
        this.logger.info('Disconnecting from database', { requestId });
        
        await this.prisma.$disconnect();
        
        this.isConnected = false;
        this.connectionPromise = null;
        this.prisma = null;
        
        this.logger.info('Database disconnected successfully', { requestId });
        
      } catch (error) {
        this.logger.error('Error during database disconnect', {
          requestId,
          errorMessage: error.message
        });
        
        throw AppError.databaseError('disconnect', error);
      }
    }
  }

  /**
   * Health check - verify database connectivity and performance
   * @param {string} requestId - Request correlation ID
   * @returns {Promise<Object>} Health check results
   */
  async healthCheck(requestId = null) {
    try {
      const client = await this.getClient(requestId);
      const startTime = Date.now();
      
      // Test basic connectivity
      await client.$queryRaw`SELECT 1 as health_check`;
      
      const responseTime = Date.now() - startTime;
      const threshold = techConfig.healthCheck.timeoutMs;
      
      const isHealthy = responseTime < threshold;
      
      const result = {
        healthy: isHealthy,
        responseTime: `${responseTime}ms`,
        threshold: `${threshold}ms`,
        connected: this.isConnected,
        timestamp: new Date().toISOString()
      };

      debugSafe('Database health check completed', {
      requestId,
      ...result
      }, 'database-service');

      return result;

    } catch (error) {
      this.logger.error('Database health check failed', {
        requestId,
        errorMessage: error.message
      });

      return {
        healthy: false,
        error: error.message,
        connected: this.isConnected,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export singleton instance
const databaseService = new DatabaseService();

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal}, closing database connection...`);
  try {
    await databaseService.disconnect();
  } catch (error) {
    console.error('Error during graceful shutdown:', error.message);
  }
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = {
  getClient: (requestId) => databaseService.getClient(requestId),
  executeTransaction: (transactionFn, requestId) => databaseService.executeTransaction(transactionFn, requestId),
  executeQuery: (operation, queryFn, requestId) => databaseService.executeQuery(operation, queryFn, requestId),
  disconnect: (requestId) => databaseService.disconnect(requestId),
  healthCheck: (requestId) => databaseService.healthCheck(requestId)
};
