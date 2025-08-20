/**
 * Customer Service Application
 * File: /customer-service/app.js
 * Version: 1.0.0
 * 
 * Purpose: Customer service entry point using app factory pattern
 *          Minimal glue code - all functionality provided by Layer 2
 */

const { createApp, startServer } = require('../../2-common-base/common/services/app-factory.service');
const CustomerRoutes = require('./customer.routes');
const { getLogger } = require('../../2-common-base/common/services/logger.service');

class CustomerServiceApplication {
  constructor() {
    this.logger = getLogger('customer-service-app');
    this.serviceName = 'customer-service';
  }

  /**
   * Initialize and start customer service
   * @returns {Promise<void>}
   */
  async start() {
    try {
      this.logger.info('Starting customer service application');

      // Create Express app using factory
      const app = await createApp(this.serviceName, CustomerRoutes);

      // Start HTTP server
      await startServer(app, this.serviceName);

      this.logger.info('Customer service application started successfully');

    } catch (error) {
      this.logger.error('Failed to start customer service application', {
        errorMessage: error.message,
        errorName: error.name
      });
      process.exit(1);
    }
  }
}

// Start service if this file is run directly
if (require.main === module) {
  const customerApp = new CustomerServiceApplication();
  customerApp.start();
}

module.exports = CustomerServiceApplication;