/**
 * Customer Domain Routes
 * File: /customer-service/customer.routes.js
 * Version: 1.1.0 - Account Management Added
 * 
 * Purpose: Complete customer domain API endpoint definitions
 *          ✅ PRESERVES: All existing routes (createCustomer, field variants, etc.)
 *          ✅ ADDS: Account management routes from TypeScript controller
 */

const express = require('express');
const CustomerController = require('./customer.controller');
const { getLogger, debugSafe } = require('../../2-common-base/common/services/logger.service');

class CustomerRoutes {
  constructor() {
    this.router = express.Router();
    this.controller = new CustomerController();
    this.logger = getLogger('customer-routes');
    this._initializeRoutes();
  }

  /**
   * Initialize all customer domain routes including account management
   * @private
   */
  _initializeRoutes() {
    // ========================================
    // EXISTING ROUTES - PRESERVED EXACTLY AS THEY ARE ✅
    // ========================================

    // Core Customer CRUD Routes ✅ EXISTING - UNCHANGED
    this.router.get('/customers', this._placeholder('List customers'));
    this.router.get('/customers/:id', this._placeholder('Get customer by ID'));
    this.router.post('/customers', this.controller.createCustomer.bind(this.controller));           // ✅ IMPLEMENTED
    this.router.put('/customers/:id', this._placeholder('Update customer'));
    this.router.delete('/customers/:id', this._placeholder('Soft delete customer'));

    // Account Management Routes ✅ EXISTING - UNCHANGED
    this.router.get('/customers/:id/accounts', this._placeholder('Get customer accounts'));
    this.router.get('/accounts/:id', this._placeholder('Get account by ID'));
    this.router.post('/accounts', this._placeholder('Create account'));
    this.router.put('/accounts/:id', this._placeholder('Update account'));
    this.router.delete('/accounts/:id', this._placeholder('Soft delete account'));

    // Custom API #1: Users by Account with Field Variants ✅ EXISTING - UNCHANGED
    this.router.get('/accounts/:id/users/header', this.controller.getUsersByAccountHeader.bind(this.controller));
    this.router.get('/accounts/:id/users/summary', this.controller.getUsersByAccountSummary.bind(this.controller));
    this.router.get('/accounts/:id/users/detail', this.controller.getUsersByAccountDetail.bind(this.controller));

    // Custom API #2: Users by Customer with Field Variants ✅ EXISTING - UNCHANGED
    this.router.get('/customers/:id/users/header', this.controller.getUsersByCustomerHeader.bind(this.controller));
    this.router.get('/customers/:id/users/summary', this.controller.getUsersByCustomerSummary.bind(this.controller));
    this.router.get('/customers/:id/users/detail', this.controller.getUsersByCustomerDetail.bind(this.controller));

    // User CRUD Routes ✅ EXISTING - UNCHANGED
    this.router.get('/users/:id', this._placeholder('Get user by ID'));
    this.router.post('/users', this._placeholder('Create user'));
    this.router.put('/users/:id', this._placeholder('Update user'));
    this.router.delete('/users/:id', this._placeholder('Soft delete user'));

    // User-Account Assignment Routes ✅ EXISTING - UNCHANGED
    this.router.post('/users/:userId/accounts/:accountId', this._placeholder('Assign user to account'));
    this.router.delete('/users/:userId/accounts/:accountId', this._placeholder('Remove user from account'));

    // Health Check Route ✅ EXISTING - UNCHANGED
    this.router.get('/health', this.controller.healthCheck.bind(this.controller));

    // ========================================
    // NEW ACCOUNT MANAGEMENT ROUTES - ADDED FROM TYPESCRIPT ✅
    // ========================================

    // Account-User Relationship Routes (converted from TypeScript account.routes.ts)
    // Exactly matching your TypeScript route paths:
    this.router.get('/customerUserAccounts/:userId', this.controller.getAccountsByUserId.bind(this.controller));
    this.router.get('/userAccounts/:userId', this.controller.getUserAccountsMinimal.bind(this.controller));
    this.router.get('/accountLinkedUsers/:accountId', this.controller.getSecondaryContacts.bind(this.controller));
    this.router.get('/accountPrimaryContactAndRelated/:accountId', this.controller.getAccountPrimaryContactAndRelated.bind(this.controller));

    // Excel Export Routes (converted from TypeScript account.routes.ts)
    // Exactly matching your TypeScript route paths:
    this.router.get('/downloadAccountsByUserId/:userId', this.controller.downloadAccountsByUserId.bind(this.controller));
    this.router.get('/downloadSecondaryContacts/:accountId', this.controller.downloadSecondaryContacts.bind(this.controller));

    // Log route initialization summary (updated counts)
    this.logger.info('Customer domain routes initialized with account management', {
      implementedRoutes: 13,  // 1 create + 6 field variants + 6 account management
      placeholderRoutes: 12,  // Existing placeholders unchanged
      totalRoutes: 25,        // Updated total
      newAccountRoutes: [
        'customerUserAccounts/:userId (with filtering & pagination)',
        'userAccounts/:userId (minimal)',
        'accountLinkedUsers/:accountId (secondary contacts)',
        'accountPrimaryContactAndRelated/:accountId (hierarchy)',
        'downloadAccountsByUserId/:userId (CSV export)',
        'downloadSecondaryContacts/:accountId (CSV export)'
      ],
      existingRoutes: [
        'createCustomer (with transaction)',
        'field variants (header/summary/detail)',
        'users by account variants',
        'users by customer variants',
        'health check'
      ]
    });
  }

  /**
   * Create placeholder route handler for future implementation ✅ EXISTING - UNCHANGED
   * @private
   */
  _placeholder(description) {
    return (req, res) => {
      const requestId = req.requestId || req.headers['x-request-id'] || 'unknown';
      
      debugSafe('Placeholder route accessed', {
        method: req.method,
        url: req.originalUrl,
        description,
        requestId
      }, 'customer-routes');

      res.status(501).json({
        error: {
          message: `${description} - Not implemented yet`,
          code: 'NOT_IMPLEMENTED',
          statusCode: 501,
          timestamp: new Date().toISOString(),
          requestId
        },
        implementation: 'TODO: Next iteration'
      });
    };
  }

  /**
   * Get Express router instance ✅ EXISTING - UNCHANGED
   * @returns {express.Router} Configured router
   */
  getRouter() {
    return this.router;
  }
}

module.exports = CustomerRoutes;