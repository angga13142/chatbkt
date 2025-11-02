/**
 * Chatbot Logic - Modular Architecture
 * Routes messages to appropriate handlers
 */

const CustomerHandler = require("./src/handlers/CustomerHandler");
const AdminHandler = require("./src/handlers/AdminHandler");
const ProductHandler = require("./src/handlers/ProductHandler");
const MessageRouter = require("./src/core/MessageRouter");
const PaymentHandlers = require("./lib/paymentHandlers");
const InputValidator = require("./lib/inputValidator");
const TransactionLogger = require("./lib/transactionLogger");
const XenditService = require("./services/xenditService");
const { SessionSteps } = require("./src/utils/Constants");

class ChatbotLogic {
  constructor(sessionManager) {
    this.sessionManager = sessionManager;
    this.logger = new TransactionLogger();
    this.validator = new InputValidator();

    // Initialize handlers
    this.customerHandler = new CustomerHandler(sessionManager, this.logger);
    this.adminHandler = new AdminHandler(sessionManager, this.logger);
    this.productHandler = new ProductHandler(sessionManager, this.logger);
    this.paymentHandlers = new PaymentHandlers(
      XenditService,
      sessionManager,
      this.logger
    );

    // Initialize router
    this.router = new MessageRouter({
      customerHandler: this.customerHandler,
      adminHandler: this.adminHandler,
      paymentHandlers: this.paymentHandlers,
    });
  }

  /**
   * Process incoming message and generate response
   * @param {string} customerId - WhatsApp customer ID
   * @param {string} message - Raw message from customer
   * @returns {Promise<string>} Response message
   */
  async processMessage(customerId, message) {
    // Rate limiting check
    const rateLimitCheck = this.validator.canSendMessage(customerId);
    if (!rateLimitCheck.allowed) {
      this.logger.logSecurity(
        customerId,
        "rate_limit_exceeded",
        rateLimitCheck.reason,
        { limit: this.validator.MESSAGE_LIMIT }
      );
      return rateLimitCheck.message;
    }

    // Error cooldown check
    const cooldownCheck = this.validator.isInCooldown(customerId);
    if (cooldownCheck.inCooldown) {
      return cooldownCheck.message;
    }

    // Validate and sanitize input
    const sanitizedMessage = InputValidator.sanitizeMessage(message);
    if (!sanitizedMessage) {
      this.logger.logError(customerId, new Error("Invalid message"), {
        original: message,
      });
      return "❌ Pesan tidak valid. Silakan coba lagi.";
    }

    try {
      // Get current session step
      const step = await this.sessionManager.getStep(customerId);
      const normalizedMessage = sanitizedMessage.toLowerCase().trim();

      // Route message to appropriate handler
      const response = await this.router.route(
        customerId,
        normalizedMessage,
        step
      );

      // Log successful message processing
      this.logger.logMessage(customerId, "message_processed", {
        step,
        messageLength: message.length,
      });

      return response;
    } catch (error) {
      this.logger.logError(customerId, error, {
        message: sanitizedMessage,
        step: await this.sessionManager.getStep(customerId),
      });

      return (
        "❌ Maaf, terjadi kesalahan. Silakan coba lagi atau hubungi admin.\n\n" +
        "💬 Ketik *menu* untuk kembali ke menu utama."
      );
    }
  }

  /**
   * Get session statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const activeSessions = this.sessionManager.getActiveSessions();
    return {
      totalSessions: activeSessions.length,
      activeCustomers: activeSessions.map((s) => s.customerId),
    };
  }

  /**
   * Broadcast message to all active customers
   * @param {string} message
   * @param {Object} client - WhatsApp client
   * @returns {Promise<Object>} Broadcast results
   */
  async broadcast(message, client) {
    return await this.adminHandler.handleBroadcast(
      "system",
      `/broadcast ${message}`,
      client
    );
  }
}

module.exports = ChatbotLogic;
