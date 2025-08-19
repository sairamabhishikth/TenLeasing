/**
 * AWS Secrets Manager Service
 * File: /common/services/secrets.service.js
 * Version: 1.0.0
 * 
 * Purpose: Centralized AWS Secrets Manager integration with caching,
 *          error handling, and credential rotation support
 */

const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const techConfig = require('../config/technical.config');
const AppError = require('./app-error');
const { getLogger, debugSafe } = require('./logger.service');

class SecretsService {
  constructor() {
    this.client = null;
    this.secretCache = new Map();
    this.logger = getLogger('secrets-service');
  }

  /**
   * Get AWS Secrets Manager client (lazy initialization)
   * @private
   * @returns {SecretsManagerClient} Configured client
   */
  _getClient() {
    if (!this.client) {
      const awsConfig = techConfig.aws;
      
      this.client = new SecretsManagerClient({
        region: awsConfig.region,
        maxAttempts: awsConfig.sdk.maxRetries,
        requestTimeout: awsConfig.sdk.timeout,
        httpOptions: awsConfig.sdk.httpOptions
      });

      debugSafe('Secrets Manager client initialized', {
      region: awsConfig.region,
      maxRetries: awsConfig.sdk.maxRetries
      }, 'secrets-service');
    }
    return this.client;
  }

  /**
   * Retrieve secret value from AWS Secrets Manager
   * @param {string} secretName - Secret name or ARN
   * @param {boolean} forceRefresh - Skip cache and fetch fresh
   * @param {string} requestId - Request correlation ID
   * @returns {Promise<Object>} Parsed secret value
   * @throws {AppError} When secret retrieval fails
   */
  async getSecret(secretName, forceRefresh = false, requestId = null) {
    if (!secretName) {
      throw AppError.validationError('secretName', secretName, 'Secret name is required');
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh && this.secretCache.has(secretName)) {
      debugSafe('Retrieved secret from cache', { secretName, requestId }, 'secrets-service');
      return this.secretCache.get(secretName);
    }

    try {
      const client = this._getClient();
      const command = new GetSecretValueCommand({ SecretId: secretName });

      debugSafe('Fetching secret from AWS', { secretName, requestId }, 'secrets-service');
      
      const response = await client.send(command);
      
      if (!response.SecretString) {
        throw AppError.externalServiceError(
          'SecretsManager',
          'getSecret',
          new Error(`Secret ${secretName} has no SecretString value`)
        );
      }

      const secretValue = JSON.parse(response.SecretString);
      
      // Cache with TTL
      this._cacheSecret(secretName, secretValue);
      
      this.logger.info('Secret retrieved successfully', { 
        secretName,
        requestId,
        cached: true
      });
      
      return secretValue;

    } catch (error) {
      this.logger.error('Failed to retrieve secret', {
        secretName,
        requestId,
        errorMessage: error.message,
        errorCode: error.name
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw AppError.externalServiceError('SecretsManager', 'getSecret', error);
    }
  }

  /**
   * Get database credentials from RDS auto-generated secret
   * @param {string} secretName - RDS secret name
   * @param {string} requestId - Request correlation ID
   * @returns {Promise<Object>} Database connection details
   * @throws {AppError} When credentials are invalid
   */
  async getDatabaseCredentials(secretName, requestId = null) {
    const secret = await this.getSecret(secretName, false, requestId);
    
    const requiredFields = ['username', 'password', 'engine', 'host', 'port', 'dbname'];
    const missingFields = requiredFields.filter(field => !secret[field]);
    
    if (missingFields.length > 0) {
      throw AppError.validationError(
        'databaseSecret',
        secretName,
        `Missing required fields: ${missingFields.join(', ')}`
      );
    }

    debugSafe('Database credentials validated', {
    secretName,
    requestId,
    engine: secret.engine,
    host: secret.host,
    port: secret.port
    }, 'secrets-service');

    return {
      username: secret.username,
      password: secret.password,
      host: secret.host,
      port: secret.port,
      database: secret.dbname,
      engine: secret.engine
    };
  }

  /**
   * Build database URL from secret credentials
   * @param {string} secretName - RDS secret name
   * @param {string} requestId - Request correlation ID
   * @returns {Promise<string>} Complete database connection URL
   */
  async getDatabaseUrl(secretName, requestId = null) {
    const credentials = await this.getDatabaseCredentials(secretName, requestId);
    
    const dbUrl = `postgresql://${credentials.username}:${encodeURIComponent(credentials.password)}@${credentials.host}:${credentials.port}/${credentials.database}?schema=public`;
    
    debugSafe('Database URL generated', {
    secretName,
    requestId,
    host: credentials.host,
    database: credentials.database
    }, 'secrets-service');
    
    return dbUrl;
  }

  /**
   * Cache secret with TTL management
   * @private
   * @param {string} secretName - Secret name
   * @param {Object} secretValue - Secret value to cache
   */
  _cacheSecret(secretName, secretValue) {
    const ttl = techConfig.aws.secretsManager.cacheTtlMs;
    const expiryTime = Date.now() + ttl;
    
    this.secretCache.set(secretName, {
      value: secretValue,
      expiryTime
    });

    // Schedule cleanup
    setTimeout(() => {
      const cached = this.secretCache.get(secretName);
      if (cached && cached.expiryTime <= Date.now()) {
        this.secretCache.delete(secretName);
        debugSafe('Secret cache entry expired', { secretName }, 'secrets-service');
      }
    }, ttl);
  }

  /**
   * Clear secret cache (useful for credential rotation)
   * @param {string} secretName - Specific secret to clear, or null for all
   * @param {string} requestId - Request correlation ID
   */
  clearCache(secretName = null, requestId = null) {
    if (secretName) {
      const deleted = this.secretCache.delete(secretName);
      this.logger.info('Secret cache cleared', { 
        secretName, 
        requestId,
        wasPresent: deleted
      });
    } else {
      const count = this.secretCache.size;
      this.secretCache.clear();
      this.logger.info('All secret cache cleared', { 
        requestId,
        clearedCount: count
      });
    }
  }

  /**
   * Health check - verify Secrets Manager connectivity
   * @param {string} requestId - Request correlation ID
   * @returns {Promise<boolean>} Service availability
   */
  async healthCheck(requestId = null) {
    try {
      const client = this._getClient();
      
      // Test with non-existent secret to verify API connectivity
      await client.send(new GetSecretValueCommand({ 
        SecretId: `health-check-test-${Date.now()}` 
      }));
      
      return true;
    } catch (error) {
      // ResourceNotFoundException is expected and means API is working
      if (error.name === 'ResourceNotFoundException') {
        debugSafe('Secrets Manager health check passed', { requestId }, 'secrets-service');
        return true;
      }
      
      this.logger.error('Secrets Manager health check failed', {
        requestId,
        errorMessage: error.message,
        errorName: error.name
      });
      
      return false;
    }
  }

  /**
   * Get cache statistics for monitoring
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [, cached] of this.secretCache) {
      if (cached.expiryTime > now) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.secretCache.size,
      validEntries,
      expiredEntries,
      hitRatio: this.secretCache.size > 0 ? (validEntries / this.secretCache.size) : 0
    };
  }
}

// Export singleton instance
const secretsService = new SecretsService();

module.exports = {
  getSecret: (name, refresh, requestId) => secretsService.getSecret(name, refresh, requestId),
  getDatabaseCredentials: (name, requestId) => secretsService.getDatabaseCredentials(name, requestId),
  getDatabaseUrl: (name, requestId) => secretsService.getDatabaseUrl(name, requestId),
  clearCache: (name, requestId) => secretsService.clearCache(name, requestId),
  healthCheck: (requestId) => secretsService.healthCheck(requestId),
  getCacheStats: () => secretsService.getCacheStats()
};
