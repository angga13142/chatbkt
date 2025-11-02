/**
 * Base Handler Class
 * Abstract base class for all handlers with common functionality
 */

class BaseHandler {
  constructor(sessionManager, logger = null) {
    this.sessionManager = sessionManager;
    this.logger = logger;
  }

  /**
   * Main handler method - must be implemented by subclasses
   * @param {string} customerId - Customer WhatsApp ID
   * @param {string} message - Message text
   * @param {Object} context - Additional context
   * @returns {Promise<string>} Response message
   */
  async handle(customerId, message, context = {}) {
    throw new Error(`handle() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Log action with context
   * @param {string} customerId
   * @param {string} action
   * @param {Object} data
   */
  log(customerId, action, data = {}) {
    if (this.logger) {
      this.logger.log(customerId, action, {
        handler: this.constructor.name,
        ...data,
      });
    }
  }

  /**
   * Log error with context
   * @param {string} customerId
   * @param {Error} error
   * @param {Object} context
   */
  logError(customerId, error, context = {}) {
    if (this.logger) {
      this.logger.logError(customerId, error, {
        handler: this.constructor.name,
        ...context,
      });
    }
    console.error(`❌ [${this.constructor.name}] Error:`, error.message);
  }

  /**
   * Get session for customer
   * @param {string} customerId
   * @returns {Promise<Object>}
   */
  async getSession(customerId) {
    return await this.sessionManager.getSession(customerId);
  }

  /**
   * Update session step
   * @param {string} customerId
   * @param {string} step
   */
  async setStep(customerId, step) {
    await this.sessionManager.setStep(customerId, step);
  }

  /**
   * Get current step
   * @param {string} customerId
   * @returns {Promise<string>}
   */
  async getStep(customerId) {
    return await this.sessionManager.getStep(customerId);
  }
}

module.exports = BaseHandler;
