/**
 * Customer Domain Service - FIXED VERSION
 * File: /customer-service/customer.service.js
 * Version: 1.2.1 - Import Paths Fixed
 * 
 * Purpose: Fixed import paths to work with actual directory structure
 */

// ✅ FIXED: Correct paths to common-base layer
const { getClient, executeTransaction } = require('../../2-common-base/common/services/database.service');
const { getRepository } = require('../../2-common-base/common/services/repository-factory-model.service');
const CustomerModel = require('./models/customer.model');
const AppError = require('../../2-common-base/common/services/app-error');
const { createRequestLogger } = require('../../2-common-base/common/services/logger.service');

class CustomerService {
  constructor() {
    this.customerModel = new CustomerModel();
    this.customerRepository = getRepository('customer');
    this.accountRepository = getRepository('account');
    this.userRepository = getRepository('user');
  }

  // ========================================
  // EXISTING METHODS 
  // ========================================

  async createCustomer(customerData, requestId = null) {
    const logger = createRequestLogger(requestId, 'customer-service');

    try {
      logger.info('Creating customer with transaction', {
        customerName: customerData.customerName
      });

      const customer = await executeTransaction(async (tx) => {
        return this.customerRepository.create(customerData, tx, requestId);
      }, requestId);

      logger.info('Customer created successfully', {
        customerId: customer.customerId,
        customerName: customer.customerName
      });

      return customer;

    } catch (error) {
      logger.error('Failed to create customer', {
        customerName: customerData?.customerName,
        errorMessage: error.message
      });
      throw error;
    }
  }

  async getUsersByAccount(accountId, variant, requestId = null) {
    const logger = createRequestLogger(requestId, 'customer-service');

    try {
      const client = await getClient(requestId);
      
      logger.debugSafe('Getting users by account', {
        accountId,
        variant
      });

      const methodName = `findUsersByAccount${this._capitalizeVariant(variant)}`;
      
      if (typeof this.customerModel[methodName] !== 'function') {
        throw AppError.validationError('variant', variant, 'Valid variant required: header, summary, detail');
      }

      const users = await this.customerModel[methodName](accountId, client, requestId);

      logger.debugSafe('Users by account retrieved', {
        accountId,
        variant,
        userCount: users.length
      });

      return users;

    } catch (error) {
      logger.error('Failed to get users by account', {
        accountId,
        variant,
        errorMessage: error.message
      });
      throw error;
    }
  }

  async getUsersByCustomer(customerId, variant, requestId = null) {
    const logger = createRequestLogger(requestId, 'customer-service');

    try {
      const client = await getClient(requestId);
      
      logger.debugSafe('Getting users by customer', {
        customerId,
        variant
      });

      const methodName = `findUsersByCustomer${this._capitalizeVariant(variant)}`;
      
      if (typeof this.customerModel[methodName] !== 'function') {
        throw AppError.validationError('variant', variant, 'Valid variant required: header, summary, detail');
      }

      const users = await this.customerModel[methodName](customerId, client, requestId);

      logger.debugSafe('Users by customer retrieved', {
        customerId,
        variant,
        userCount: users.length
      });

      return users;

    } catch (error) {
      logger.error('Failed to get users by customer', {
        customerId,
        variant,
        errorMessage: error.message
      });
      throw error;
    }
  }

  async healthCheck(requestId = null) {
    const logger = createRequestLogger(requestId, 'customer-service');

    try {
      const client = await getClient(requestId);
      await client.$queryRaw`SELECT 1 as health_check`;
      
      logger.debugSafe('Customer service health check passed');

      return {
        healthy: true,
        service: 'customer-service',
        database: 'connected',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Customer service health check failed', {
        errorMessage: error.message
      });

      return {
        healthy: false,
        service: 'customer-service',
        database: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // ========================================
  // FIXED ACCOUNT MANAGEMENT METHODS ✅
  // ========================================

  /**
   * Get accounts by user ID - FIXED to work with actual schema
   */
  async getAccountsByUserId(userId, pagination, filters, requestId = null) {
    const logger = createRequestLogger(requestId, 'customer-service');

    try {
      const client = await getClient(requestId);
      
      logger.info('Getting accounts by user ID', {
        userId,
        page: pagination.page,
        perPage: pagination.perPage
      });

      // FIXED: Use correct schema - get user with junction table
      const user = await client.user.findUnique({
        where: { userId: userId }, // Fixed: use correct field name
        select: { 
          userId: true,
          customerId: true,
          userHasAccounts: {  // Fixed: use correct relationship
            select: {
              accountId: true,
              status: true
            },
            where: {
              status: 'ACT'  // Only active relationships
            }
          }
        }
      });

      if (!user) {
        throw AppError.notFound('user', userId);
      }

      // Extract account IDs from junction table
      const accountIds = user.userHasAccounts.map(uha => uha.accountId);

      if (accountIds.length === 0) {
        return {
          data: [],
          totalCount: 0
        };
      }

      // Build where clause with correct field names
      const whereClause = {
        accountId: { in: accountIds },  // Fixed: use correct field name
        ...(user.customerId && { customerId: user.customerId }),  // Fixed: use correct field name
        ...(filters.account_name && {
          accountName: {  // Fixed: use correct field name
            contains: String(filters.account_name),
            mode: 'insensitive'
          }
        }),
        ...(filters.account_number && {
          accountNumber: {  // Fixed: use correct field name
            contains: String(filters.account_number),
            mode: 'insensitive'
          }
        }),
        ...(filters.account_type && { accountType: String(filters.account_type) }),  // Fixed
        ...(filters.status && { status: String(filters.status) })
      };

      const skip = (pagination.page - 1) * pagination.perPage;

      // Execute with correct field names
      const [totalCount, accounts] = await Promise.all([
        client.account.count({ where: whereClause }),
        client.account.findMany({
          where: whereClause,
          skip,
          take: pagination.perPage,
          orderBy: { accountId: 'asc' },  // Fixed: use correct field name
          select: {
            accountId: true,        // Fixed: all field names
            parentAccountId: true,
            customerId: true,
            accountName: true,
            accountNumber: true,
            legacyAccountNumber: true,
            accountType: true,
            accountManagerId: true,
            numberOfUsers: true,
            status: true,
            createdAt: true,
            createdBy: true,
            updatedAt: true,
            updatedBy: true,
            customer: {
              select: {
                customerName: true  // Fixed: use correct field name
              }
            }
          }
        })
      ]);

      logger.info('Accounts retrieved successfully', {
        userId,
        totalCount,
        returnedCount: accounts.length
      });

      return {
        data: accounts,
        totalCount
      };

    } catch (error) {
      logger.error('Failed to get accounts by user ID', {
        userId,
        errorMessage: error.message
      });
      throw error;
    }
  }

  /**
   * Get secondary contacts - FIXED to work with actual schema
   */
  async getSecondaryContacts(accountId, pagination, filters, requestId = null) {
    const logger = createRequestLogger(requestId, 'customer-service');

    try {
      const client = await getClient(requestId);
      
      logger.info('Getting secondary contacts for account', {
        accountId,
        page: pagination.page
      });

      // FIXED: Use junction table to find users assigned to account
      const whereClause = {
        userHasAccounts: {  // Fixed: use correct relationship
          some: {
            accountId: accountId,
            status: 'ACT'
          }
        },
        ...(filters.first_name && {
          firstName: { contains: String(filters.first_name), mode: 'insensitive' }  // Fixed
        }),
        ...(filters.last_name && {
          lastName: { contains: String(filters.last_name), mode: 'insensitive' }  // Fixed
        }),
        ...(filters.email && {
          email: { contains: String(filters.email), mode: 'insensitive' }
        }),
        ...(filters.designation && {
          designation: { contains: String(filters.designation), mode: 'insensitive' }
        }),
        ...(filters.status && {
          status: { contains: String(filters.status), mode: 'insensitive' }
        }),
        ...(filters.phone_number && {
          phoneNumber: { contains: String(filters.phone_number), mode: 'insensitive' }  // Fixed
        })
      };

      const skip = (pagination.page - 1) * pagination.perPage;

      const [totalCount, users] = await Promise.all([
        client.user.count({ where: whereClause }),
        client.user.findMany({
          where: whereClause,
          skip,
          take: pagination.perPage,
          orderBy: [{ userId: 'asc' }],  // Fixed: use correct field name
          select: {
            userId: true,         // Fixed: all field names
            firstName: true,
            lastName: true,
            email: true,
            designation: true,
            status: true,
            phoneNumber: true,
            avatar: true,
            isCustomer: true
          }
        })
      ]);

      logger.info('Secondary contacts retrieved successfully', {
        accountId,
        totalCount,
        returnedCount: users.length
      });

      return {
        data: users,
        totalCount
      };

    } catch (error) {
      logger.error('Failed to get secondary contacts', {
        accountId,
        errorMessage: error.message
      });
      throw error;
    }
  }

  /**
   * Get account primary contact and related - FIXED
   */
  async getAccountPrimaryContactAndRelated(accountId, customerId, requestId = null) {
    const logger = createRequestLogger(requestId, 'customer-service');

    try {
      const client = await getClient(requestId);
      
      logger.info('Getting account primary contact and related accounts', {
        accountId,
        customerId
      });

      // FIXED: Use correct field names
      const selectedAccount = await client.account.findFirst({
        where: {
          accountId: accountId,  // Fixed
          ...(customerId && { customerId: customerId }),  // Fixed
        },
        select: {
          accountId: true,            // Fixed: all field names
          parentAccountId: true,
          customerId: true,
          accountName: true,
          accountNumber: true,
          legacyAccountNumber: true,
          accountType: true,
          primaryContactUserId: true,  // Fixed
          status: true
        }
      });

      if (!selectedAccount) {
        throw AppError.notFound('account', accountId);
      }

      // Get primary contact user
      let primaryContactUser = null;
      if (selectedAccount.primaryContactUserId) {  // Fixed
        primaryContactUser = await client.user.findUnique({
          where: {
            userId: selectedAccount.primaryContactUserId  // Fixed
          },
          select: {
            userId: true,     // Fixed: all field names
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            designation: true,
            avatar: true,
            status: true,
            isCustomer: true
          }
        });
      }

      // Get related accounts
      let relatedAccounts = [];

      if (selectedAccount.parentAccountId === null) {
        // Parent account -> get children
        relatedAccounts = await client.account.findMany({
          where: {
            parentAccountId: selectedAccount.accountId  // Fixed
          },
          select: {
            accountId: true,          // Fixed: all field names
            accountName: true,
            accountNumber: true,
            legacyAccountNumber: true,
            accountType: true,
            status: true,
            numberOfUsers: true
          },
          orderBy: { accountId: 'asc' }  // Fixed
        });
      } else {
        // Child account -> get parent and siblings
        const [parentAccount, siblingAccounts] = await Promise.all([
          client.account.findUnique({
            where: {
              accountId: selectedAccount.parentAccountId  // Fixed
            },
            select: {
              accountId: true,        // Fixed: all field names
              accountName: true,
              accountNumber: true,
              legacyAccountNumber: true,
              accountType: true,
              status: true,
              numberOfUsers: true
            }
          }),
          client.account.findMany({
            where: {
              parentAccountId: selectedAccount.parentAccountId,  // Fixed
              accountId: { not: selectedAccount.accountId }      // Fixed
            },
            select: {
              accountId: true,      // Fixed: all field names
              accountName: true,
              accountNumber: true,
              legacyAccountNumber: true,
              accountType: true,
              status: true,
              numberOfUsers: true
            },
            orderBy: { accountId: 'asc' }  // Fixed
          })
        ]);

        relatedAccounts = [
          ...(parentAccount ? [{ ...parentAccount, relationship: 'parent' }] : []),
          ...siblingAccounts.map(account => ({
            ...account,
            relationship: 'sibling'
          }))
        ];
      }

      const result = {
        selectedAccount: {
          account_id: selectedAccount.accountId,      // Fixed: return snake_case for API
          account_name: selectedAccount.accountName,
          account_number: selectedAccount.accountNumber,
          account_type: selectedAccount.accountType,
          status: selectedAccount.status
        },
        primaryContactUser,
        relatedAccounts: relatedAccounts.length > 0 ? relatedAccounts : [],
        summary: {
          has_primary_contact: !!primaryContactUser,
          total_related_accounts: relatedAccounts.length,
          account_hierarchy_type: selectedAccount.parentAccountId ? 'child' : 'parent'
        }
      };

      logger.info('Account details retrieved successfully', {
        accountId,
        hasPrimaryContact: result.summary.has_primary_contact,
        relatedAccountsCount: result.summary.total_related_accounts
      });

      return result;

    } catch (error) {
      logger.error('Failed to get account primary contact and related', {
        accountId,
        customerId,
        errorMessage: error.message
      });
      throw error;
    }
  }

  /**
   * Get minimal user accounts - FIXED
   */
  async getUserAccountsMinimal(userId, requestId = null) {
    const logger = createRequestLogger(requestId, 'customer-service');

    try {
      const client = await getClient(requestId);
      
      logger.debugSafe('Getting minimal user accounts', {
        userId
      });

      // FIXED: Use junction table approach
      const user = await client.user.findUnique({
        where: { userId: userId },  // Fixed
        select: { 
          userId: true,
          customerId: true,
          userHasAccounts: {  // Fixed: use correct relationship
            select: {
              account: {
                select: {
                  accountId: true,    // Fixed
                  accountName: true   // Fixed
                }
              }
            },
            where: {
              status: 'ACT'
            }
          }
        }
      });

      if (!user) {
        throw AppError.notFound('user', userId);
      }

      // Extract accounts from junction table
      const accounts = user.userHasAccounts.map(uha => uha.account);

      logger.debugSafe('Minimal user accounts retrieved', {
        userId,
        accountCount: accounts.length
      });

      return accounts;

    } catch (error) {
      logger.error('Failed to get minimal user accounts', {
        userId,
        errorMessage: error.message
      });
      throw error;
    }
  }
  
  async downloadAccountsByUserId(userId, pagination, filters, res, requestId = null) {
    // Get the data
    const result = await this.getAccountsByUserId(userId, pagination, filters, requestId);
    
    // Create CSV
    const csv = this._generateAccountsCSV(result.data);
    const filename = `user_${userId}_accounts.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  }

  async downloadSecondaryContacts(accountId, pagination, filters, res, requestId = null) {
    // Get the data  
    const result = await this.getSecondaryContacts(accountId, pagination, filters, requestId);
    
    // Create CSV
    const csv = this._generateContactsCSV(result.data);
    const filename = `account_${accountId}_contacts.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  }

  // Helper methods
  _capitalizeVariant(variant) {
    return variant.charAt(0).toUpperCase() + variant.slice(1);
  }

  _generateAccountsCSV(accounts) {
    const headers = ['Account ID', 'Account Name', 'Account Number', 'Account Type', 'Status', 'Customer Name'];
    const rows = accounts.map(account => [
      account.accountId,
      account.accountName,
      account.accountNumber,
      account.accountType,
      account.status,
      account.customer?.customerName || ''
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  _generateContactsCSV(contacts) {
    const headers = ['User ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Designation', 'Status'];
    const rows = contacts.map(contact => [
      contact.userId,
      contact.firstName,
      contact.lastName,
      contact.email,
      contact.phoneNumber,
      contact.designation,
      contact.status
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

module.exports = CustomerService;