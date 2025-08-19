/**
 * Express Application Factory Service
 * File: /common/services/app-factory.service.js
 * Version: 1.0.0
 * 
 * Purpose: Generic Express application builder that creates fully configured
 *          enterprise-grade web applications for all Ten Platform microservices
 * 
 * Services Provided:
 * 
 * SECURITY LAYER:
 * - HTTP Security Headers (Helmet): XSS protection, content security policy, 
 *   HSTS, frame options, and other OWASP security headers
 * - CORS Protection: Cross-origin resource sharing with configurable origins,
 *   methods, and headers for web/mobile client access
 * - Rate Limiting: DoS protection with sliding window algorithm, configurable
 *   request limits per IP address and time window
 * 
 * PERFORMANCE LAYER:
 * - Response Compression: Gzip/deflate compression for bandwidth optimization
 * - Request Body Parsing: JSON and URL-encoded parsing with size limits
 * - HTTP Caching: ETag generation for conditional requests and cache validation
 * - Request Timeouts: Automatic timeout handling to prevent hanging requests
 * 
 * MONITORING & OBSERVABILITY:
 * - Request Correlation: Auto-generated unique request IDs for distributed tracing
 * - Request/Response Headers: X-Request-ID for end-to-end request tracking
 * - Structured Logging: Integration with Winston logger service for all operations
 * - Health Check Endpoints: Standard /health endpoint for load balancer monitoring
 * 
 * ENTERPRISE RELIABILITY:
 * - Graceful Shutdown: SIGINT/SIGTERM signal handling with connection draining
 * - Error Handling: Integration with global error handler middleware
 * - Configuration Management: Environment-aware settings from technical config
 * - Process Management: Automatic cleanup and resource management
 * 
 * DEVELOPER EXPERIENCE:
 * - Zero Configuration: Works out-of-the-box with sensible defaults
 * - Service Agnostic: Same factory works for any microservice (customer, billing, etc.)
 * - Consistent Architecture: All services get identical middleware stack
 * - Easy Integration: Simple 2-line usage pattern in service app.js files
 *
 * Usage Example:
 *   const app = await createApp('customer-service', CustomerRoutes);
 *   startServer(app, 'customer-service', 3000);
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const errorHandler = require('../middleware/error-handler.middleware');
const techConfig = require('../config/technical.config');
const { getLogger, ensureLogDirectories } = require('./logger.service');

class AppFactory {
  constructor() {
    this.logger = getLogger('app-factory');
  }

  /**
   * Create configured Express application for any microservice
   * @param {string} serviceName - Service name for logging and identification
   * @param {Class} RoutesClass - Service routes class
   * @param {Object} options - Additional service-specific options
   * @returns {Promise<express.Application>} Configured Express app
   */
  async createApp(serviceName, RoutesClass, options = {}) {
    if (!serviceName || !RoutesClass) {
      throw new Error('Service name and Routes class are required');
    }

    try {
      // Ensure logging infrastructure
      await ensureLogDirectories();

      const app = express();
      const serviceLogger = getLogger(serviceName);

      // Apply middleware stack
      this._applySecurityMiddleware(app);
      this._applyPerformanceMiddleware(app);
      this._applyRequestMiddleware(app, serviceName);

      // Initialize service routes
      const routes = new RoutesClass();
      app.use('/api', routes.getRouter());

      // Health check endpoint (standard across all services)
      app.get('/health', this._createHealthHandler(serviceName));

      // Global error handler (must be last)
      app.use(errorHandler);

      serviceLogger.info('Express application created', {
        serviceName,
        middlewareStack: 'security+performance+routing+error-handling',
        apiPrefix: '/api'
      });

      return app;

    } catch (error) {
      this.logger.error('Failed to create Express application', {
        serviceName,
        errorMessage: error.message
      });
      throw error;
    }
  }

  /**
   * Start HTTP server for any service
   * @param {express.Application} app - Express application
   * @param {string} serviceName - Service name for logging
   * @param {number} port - Port number (defaults to tech config)
   * @returns {Promise<Object>} HTTP server instance
   */
  async startServer(app, serviceName, port = null) {
    const serverPort = port || process.env.PORT || techConfig.server.defaultPort;
    const serviceLogger = getLogger(serviceName);

    return new Promise((resolve, reject) => {
      try {
        const server = app.listen(serverPort, () => {
          serviceLogger.info('HTTP server started', {
            serviceName,
            port: serverPort,
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString()
          });
          resolve(server);
        });

        // Setup graceful shutdown
        this._setupGracefulShutdown(server, serviceName, serviceLogger);

        // Handle server startup errors
        server.on('error', (error) => {
          serviceLogger.error('HTTP server startup failed', {
            serviceName,
            port: serverPort,
            errorMessage: error.message
          });
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Apply security middleware stack
   * @private
   * @param {express.Application} app - Express app
   */
  _applySecurityMiddleware(app) {
    // Security headers
    app.use(helmet());

    // CORS configuration
    app.use(cors(this._getCorsConfig()));

    // Rate limiting
    app.use(this._getRateLimitConfig());
  }

  /**
   * Apply performance middleware stack
   * @private
   * @param {express.Application} app - Express app
   */
  _applyPerformanceMiddleware(app) {
    // Response compression
    app.use(compression());

    // Body parsing with limits
    app.use(express.json({ limit: techConfig.server.bodyLimit }));
    app.use(express.urlencoded({ 
      extended: true, 
      limit: techConfig.server.bodyLimit 
    }));

    // Performance headers
    if (techConfig.performance.enableEtag) {
      app.set('etag', 'strong');
    }
  }

  /**
   * Apply request processing middleware
   * @private
   * @param {express.Application} app - Express app
   * @param {string} serviceName - Service name
   */
  _applyRequestMiddleware(app, serviceName) {
    // Request correlation ID
    app.use(this._createRequestIdMiddleware(serviceName));

    // Request timeout
    app.use(this._createTimeoutMiddleware());
  }

  /**
   * Get CORS configuration
   * @private
   * @returns {Object} CORS options
   */
  _getCorsConfig() {
    const corsConfig = techConfig.server.cors;
    
    return {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
      exposedHeaders: ['X-Request-ID'],
      maxAge: corsConfig.maxAge,
      credentials: true
    };
  }

  /**
   * Get rate limiting configuration
   * @private
   * @returns {Function} Rate limit middleware
   */
  _getRateLimitConfig() {
    const rateConfig = techConfig.server.rateLimit;
    
    return rateLimit({
      windowMs: rateConfig.windowMs,
      max: rateConfig.max,
      message: {
        error: {
          message: 'Too many requests, please try again later',
          code: 'RATE_LIMITED',
          statusCode: 429,
          timestamp: new Date().toISOString()
        }
      },
      standardHeaders: true,
      legacyHeaders: false
    });
  }

  /**
   * Create request ID middleware
   * @private
   * @param {string} serviceName - Service name
   * @returns {Function} Request ID middleware
   */
  _createRequestIdMiddleware(serviceName) {
    return (req, res, next) => {
      req.requestId = req.headers['x-request-id'] || 
        `${serviceName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      res.setHeader('X-Request-ID', req.requestId);
      next();
    };
  }

  /**
   * Create request timeout middleware
   * @private
   * @returns {Function} Timeout middleware
   */
  _createTimeoutMiddleware() {
    const timeout = techConfig.server.requestTimeoutMs;
    
    return (req, res, next) => {
      req.setTimeout(timeout, () => {
        if (!res.headersSent) {
          res.status(408).json({
            error: {
              message: 'Request timeout',
              code: 'REQUEST_TIMEOUT',
              statusCode: 408,
              timestamp: new Date().toISOString(),
              requestId: req.requestId
            }
          });
        }
      });
      next();
    };
  }

  /**
   * Create standard health check handler
   * @private
   * @param {string} serviceName - Service name
   * @returns {Function} Health check handler
   */
  _createHealthHandler(serviceName) {
    return (req, res) => {
      const requestId = req.requestId;
      
      res.json({
        success: true,
        service: serviceName,
        healthy: true,
        timestamp: new Date().toISOString(),
        requestId,
        uptime: process.uptime()
      });
    };
  }

  /**
   * Setup graceful shutdown handlers
   * @private
   * @param {Object} server - HTTP server instance
   * @param {string} serviceName - Service name
   * @param {Object} logger - Service logger
   */
  _setupGracefulShutdown(server, serviceName, logger) {
    const gracefulShutdown = (signal) => {
      logger.info(`Received ${signal}, shutting down gracefully`, {
        serviceName
      });

      server.close(() => {
        logger.info('HTTP server closed successfully', { serviceName });
        process.exit(0);
      });

      // Force shutdown after timeout
      setTimeout(() => {
        logger.error('Forced shutdown after timeout', { serviceName });
        process.exit(1);
      }, techConfig.healthCheck.gracefulShutdownMs);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  }
}

// Export singleton factory instance
const appFactory = new AppFactory();

module.exports = {
  createApp: (serviceName, RoutesClass, options) => appFactory.createApp(serviceName, RoutesClass, options),
  startServer: (app, serviceName, port) => appFactory.startServer(app, serviceName, port)
};
