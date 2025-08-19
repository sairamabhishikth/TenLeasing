/**
 * Technical Configuration Module
 * File: /common/config/technical.config.js
 * Version: 1.1.0 - Container Optimized
 * 
 * Purpose: Infrastructure and technology-specific settings
 *          All technical parameters that services need for operation
 *          Optimized for ECS container deployment
 */

module.exports = {
  
  /**
   * Database Configuration
   * PostgreSQL and Prisma client settings
   */
  database: {
    defaultPort: 5432,
    connectionTimeoutMs: 30000,      // 30 seconds
    queryTimeoutMs: 15000,           // 15 seconds
    pool: {
      min: 2,                        // Minimum connections in pool
      max: 20,                       // Maximum connections in pool
      acquireTimeoutMs: 60000,       // Wait time for connection from pool
      createTimeoutMs: 30000,        // Wait time to create new connection
      destroyTimeoutMs: 5000,        // Wait time to destroy connection
      idleTimeoutMs: 300000,         // 5 minutes idle timeout
      reapIntervalMs: 1000,          // Pool cleanup interval
      createRetryIntervalMs: 200     // Retry interval for failed connections
    },
    ssl: {
      enabled: true,                 // Always use SSL for RDS
      rejectUnauthorized: true       // Validate SSL certificates
    }
  },

  /**
   * Express Server Configuration
   * HTTP server and middleware settings
   */
  server: {
    defaultPort: 3000,
    requestTimeoutMs: 30000,         // 30 seconds
    bodyLimit: '10mb',               // Request body size limit
    compression: true,               // Enable gzip compression
    cors: {
      enabled: true,
      maxAge: 86400                  // 24 hours preflight cache
    },
    rateLimit: {
      windowMs: 900000,              // 15 minutes
      max: 1000                      // Requests per window per IP
    }
  },

  /**
   * AWS Services Configuration
   * AWS SDK and service-specific settings
   */
  aws: {
    region: 'us-east-1',
    secretsManager: {
      cacheTtlMs: 300000,            // 5 minutes cache
      retryAttempts: 3,
      retryDelayMs: 1000
    },
    sdk: {
      maxRetries: 3,
      timeout: 30000,
      httpOptions: {
        connectTimeout: 5000,
        timeout: 30000
      }
    }
  },

  /**
   * Logging Configuration - Container Optimized
   * Winston logger settings for ECS/CloudWatch deployment
   */
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    maxFiles: 5,                     // Log rotation files (unused in containers)
    maxSize: '20m',                  // Maximum log file size (unused in containers)
    colorize: process.env.NODE_ENV !== 'production',
    timestamp: true,
    format: 'json',                  // Structured logging for CloudWatch
    console: {
      enabled: true,                 // Always enabled for container stdout
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'  // Changed from 'warn' to 'info'
    },
    file: {
      enabled: false,                // DISABLED for container environments - use CloudWatch instead
      errorFile: 'logs/error.log',
      combinedFile: 'logs/combined.log'
    }
  },

  /**
   * Health Check Configuration
   * Service monitoring and health endpoints
   */
  healthCheck: {
    intervalMs: 30000,               // Health check interval
    timeoutMs: 5000,                 // Health check timeout
    retries: 3,                      // Failed health check retries
    gracefulShutdownMs: 10000        // Graceful shutdown timeout
  },

  /**
   * Performance Configuration
   * Caching and performance settings
   */
  performance: {
    enableEtag: true,                // HTTP ETag caching
    enableLastModified: true,        // Last-Modified headers
    staticMaxAge: 86400000,          // Static file cache (24 hours)
    jsonSpaces: process.env.NODE_ENV === 'production' ? 0 : 2
  }
};