/**
 * Business Configuration Module
 * File: /common/config/business.config.js
 * Version: 1.0.0 (Minimal)
 * 
 * Purpose: Business rules and validation patterns
 *          Add business logic parameters as requirements emerge
 */

module.exports = {
  
  /**
   * Validation Rules
   * Common data validation patterns used across services
   */
  validation: {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^\+?[\d\s\-\(\)]{10,}$/,
    vinNumber: /^[A-HJ-NPR-Z0-9]{17}$/,
    maxFileUploadMB: 25,
    allowedImageTypes: ['jpeg', 'jpg', 'png', 'pdf']
  }
};
