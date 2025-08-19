/**
 * Winston Logger Service
 * File: /common/services/logger.service.js
 * Version: 1.1.0
 * 
 * Purpose: Centralized logging service with Winston for structured logging,
 *          request tracing, environment-aware log levels, and performance-optimized debug logging
 */

const winston = require('winston');
const path = require('path');
const techConfig = require('../config/technical.config');

class LoggerService {
  constructor() {
    this.logger = null;
    this.loggers = new Map(); // Named loggers cache
  }

  /**
   * Initialize and get the default logger instance
   * @returns {winston.Logger} Configured Winston logger
   */
  getLogger(serviceName = 'app') {
    if (!this.loggers.has(serviceName)) {
      this.loggers.set(serviceName, this._createLogger(serviceName));
    }
    return this.loggers.get(serviceName);
  }

  /**
   * Create a new Winston logger with enterprise configuration
   * @private
   * @param {string} serviceName - Service identifier for logs
   * @returns {winston.Logger} Configured logger instance
   */
  _createLogger(serviceName) {
    const logConfig = techConfig.logging;
    const transports = [];

    // Console transport
    if (logConfig.console.enabled) {
      transports.push(new winston.transports.Console({
        level: logConfig.console.level,
        format: this._getConsoleFormat()
      }));
    }

    // File transports (production only)
    if (logConfig.file.enabled) {
      // Error file transport
      transports.push(new winston.transports.File({
        filename: logConfig.file.errorFile,
        level: 'error',
        format: this._getFileFormat(),
        maxsize: this._parseSize(logConfig.maxSize),
        maxFiles: logConfig.maxFiles
      }));

      // Combined file transport
      transports.push(new winston.transports.File({
        filename: logConfig.file.combinedFile,
        format: this._getFileFormat(),
        maxsize: this._parseSize(logConfig.maxSize),
        maxFiles: logConfig.maxFiles
      }));
    }

    return winston.createLogger({
      level: logConfig.level,
      defaultMeta: { 
        service: serviceName,
        environment: process.env.NODE_ENV || 'development'
      },
      transports,
      exitOnError: false
    });
  }

  /**
   * Get console log format (colorized for development)
   * @private
   * @returns {winston.Logform.Format} Console format
   */
  _getConsoleFormat() {
    const logConfig = techConfig.logging;
    
    const baseFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.printf(this._consoleFormatter)
    );

    return logConfig.colorize 
      ? winston.format.combine(winston.format.colorize(), baseFormat)
      : baseFormat;
  }

  /**
   * Get file log format (structured JSON)
   * @private
   * @returns {winston.Logform.Format} File format
   */
  _getFileFormat() {
    return winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );
  }

  /**
   * Custom console log formatter
   * @private
   * @param {Object} info - Log information object
   * @returns {string} Formatted log message
   */
  _consoleFormatter(info) {
    const { timestamp, level, message, service, requestId, ...meta } = info;
    
    let logLine = `${timestamp} [${level.toUpperCase()}] [${service}]`;
    
    if (requestId) {
      logLine += ` [${requestId}]`;
    }
    
    logLine += `: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      logLine += ` ${JSON.stringify(meta)}`;
    }
    
    return logLine;
  }

  /**
   * Parse size string to bytes
   * @private
   * @param {string} sizeStr - Size string (e.g., '20m', '1g')
   * @returns {number} Size in bytes
   */
  _parseSize(sizeStr) {
    const units = { k: 1024, m: 1024 * 1024, g: 1024 * 1024 * 1024 };
    const match = sizeStr.match(/^(\d+)([kmg]?)$/i);
    
    if (!match) return 10 * 1024 * 1024; // Default 10MB
    
    const [, size, unit] = match;
    return parseInt(size) * (units[unit.toLowerCase()] || 1);
  }

  /**
   * Check if log level is enabled for performance optimization
   * @param {string} level - Log level to check
   * @param {string} serviceName - Service name
   * @returns {boolean} True if level is enabled
   */
  isLevelEnabled(level, serviceName = 'app') {
    const logger = this.getLogger(serviceName);
    return logger.isLevelEnabled(level);
  }

  /**
   * Performance-optimized debug logging
   * Only processes debug messages if debug level is enabled
   * @param {string} message - Debug message
   * @param {Object} meta - Metadata object
   * @param {string} serviceName - Service name
   */
  debugSafe(message, meta = {}, serviceName = 'app') {
    if (this.isLevelEnabled('debug', serviceName)) {
      const logger = this.getLogger(serviceName);
      logger.debug(message, meta);
    }
  }

  /**
   * Create request logger with correlation ID
   * @param {string} requestId - Unique request identifier
   * @param {string} serviceName - Service name
   * @returns {Object} Logger with request context
   */
  createRequestLogger(requestId, serviceName = 'app') {
    const logger = this.getLogger(serviceName);
    const self = this;
    
    return {
      debug: (message, meta = {}) => logger.debug(message, { requestId, ...meta }),
      debugSafe: (message, meta = {}) => self.debugSafe(message, { requestId, ...meta }, serviceName),
      info: (message, meta = {}) => logger.info(message, { requestId, ...meta }),
      warn: (message, meta = {}) => logger.warn(message, { requestId, ...meta }),
      error: (message, meta = {}) => logger.error(message, { requestId, ...meta })
    };
  }

  /**
   * Log HTTP request details
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {number} responseTime - Request processing time in ms
   * @param {string} serviceName - Service name
   */
  logHttpRequest(req, res, responseTime, serviceName = 'app') {
    const logger = this.getLogger(serviceName);
    
    const logData = {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    };

    const level = res.statusCode >= 400 ? 'error' : 'info';
    logger[level]('HTTP Request', logData);
  }

  /**
   * Log database operations (performance optimized)
   * @param {string} operation - Database operation (SELECT, INSERT, etc.)
   * @param {string} table - Database table
   * @param {number} executionTime - Query execution time in ms
   * @param {string} requestId - Request correlation ID
   * @param {string} serviceName - Service name
   */
  logDatabaseOperation(operation, table, executionTime, requestId, serviceName = 'app') {
    this.debugSafe('Database Operation', {
      requestId,
      operation,
      table,
      executionTime: `${executionTime}ms`
    }, serviceName);
  }

  /**
   * Log application errors with full context
   * @param {Error} error - Error object
   * @param {string} requestId - Request correlation ID
   * @param {Object} context - Additional context
   * @param {string} serviceName - Service name
   */
  logError(error, requestId, context = {}, serviceName = 'app') {
    const logger = this.getLogger(serviceName);
    
    logger.error('Application Error', {
      requestId,
      errorMessage: error.message,
      errorName: error.name,
      errorCode: error.code,
      stack: error.stack,
      ...context
    });
  }

  /**
   * Ensure log directories exist
   * @static
   * @returns {Promise<void>}
   */
  static async ensureLogDirectories() {
    const fs = require('fs').promises;
    const logConfig = techConfig.logging;
    
    if (logConfig.file.enabled) {
      const logDirs = [
        path.dirname(logConfig.file.errorFile),
        path.dirname(logConfig.file.combinedFile)
      ];
      
      for (const dir of logDirs) {
        try {
          await fs.access(dir);
        } catch {
          await fs.mkdir(dir, { recursive: true });
        }
      }
    }
  }
}

// Export singleton instance
const loggerService = new LoggerService();

module.exports = {
  getLogger: (serviceName) => loggerService.getLogger(serviceName),
  createRequestLogger: (requestId, serviceName) => loggerService.createRequestLogger(requestId, serviceName),
  debugSafe: (message, meta, serviceName) => loggerService.debugSafe(message, meta, serviceName),
  isLevelEnabled: (level, serviceName) => loggerService.isLevelEnabled(level, serviceName),
  logHttpRequest: (req, res, responseTime, serviceName) => loggerService.logHttpRequest(req, res, responseTime, serviceName),
  logDatabaseOperation: (operation, table, executionTime, requestId, serviceName) => loggerService.logDatabaseOperation(operation, table, executionTime, requestId, serviceName),
  logError: (error, requestId, context, serviceName) => loggerService.logError(error, requestId, context, serviceName),
  ensureLogDirectories: () => LoggerService.ensureLogDirectories()
};