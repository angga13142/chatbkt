/**
 * Session Manager
 * Manages customer sessions and shopping carts with Redis persistence
 */

const redisClient = require("./lib/redisClient");

class SessionManager {
  constructor() {
    this.sessions = new Map(); // Fallback in-memory storage
    this.useRedis = false;
    this.sessionTTL = parseInt(process.env.SESSION_TTL) || 1800; // 30 minutes default
  }

  /**
   * Initialize session manager (connect to Redis if available)
   */
  async initialize() {
    try {
      const connected = await redisClient.connect();
      this.useRedis = connected;

      if (this.useRedis) {
        console.log("✅ SessionManager: Using Redis for persistence");
      } else {
        console.log(
          "⚠️  SessionManager: Using in-memory storage (no persistence)"
        );
      }
    } catch (error) {
      console.error("❌ SessionManager initialization error:", error.message);
      this.useRedis = false;
    }
  }

  /**
   * Get session key for Redis
   * @param {string} customerId
   * @returns {string}
   */
  _getSessionKey(customerId) {
    return `session:${customerId}`;
  }

  /**
   * Get or create a session for a customer
   * @param {string} customerId - WhatsApp number
   * @returns {Object} Session object
   */
  async getSession(customerId) {
    // Try Redis first
    if (this.useRedis && redisClient.isReady()) {
      try {
        const sessionKey = this._getSessionKey(customerId);
        const sessionData = await redisClient.getClient().get(sessionKey);

        if (sessionData) {
          const session = JSON.parse(sessionData);
          session.lastActivity = Date.now();

          // Update TTL
          await redisClient.getClient().expire(sessionKey, this.sessionTTL);

          return session;
        }
      } catch (error) {
        console.error("❌ Redis getSession error:", error.message);
        // Fall through to in-memory
      }
    }

    // Fallback to in-memory
    if (!this.sessions.has(customerId)) {
      const newSession = {
        customerId,
        cart: [],
        step: "menu",
        orderId: null,
        qrisInvoiceId: null,
        qrisAmount: 0,
        qrisDate: null,
        paymentProofPath: null,
        paymentMethod: null,
        paymentInvoiceId: null,
        lastActivity: Date.now(),
      };

      this.sessions.set(customerId, newSession);

      // Save to Redis if available
      if (this.useRedis && redisClient.isReady()) {
        try {
          await this._saveToRedis(customerId, newSession);
        } catch (error) {
          console.error("❌ Redis save error:", error.message);
        }
      }

      return newSession;
    }

    // Update last activity
    const session = this.sessions.get(customerId);
    session.lastActivity = Date.now();
    return session;
  }

  /**
   * Save session to Redis
   * @param {string} customerId
   * @param {Object} session
   */
  async _saveToRedis(customerId, session) {
    if (!this.useRedis || !redisClient.isReady()) {
      return;
    }

    try {
      const sessionKey = this._getSessionKey(customerId);
      await redisClient
        .getClient()
        .setEx(sessionKey, this.sessionTTL, JSON.stringify(session));
    } catch (error) {
      console.error("❌ Redis _saveToRedis error:", error.message);
    }
  }

  /**
   * Update session in both Redis and memory
   * @param {string} customerId
   */
  async _updateSession(customerId) {
    const session = this.sessions.get(customerId);
    if (!session) return;

    session.lastActivity = Date.now();

    // Save to Redis
    await this._saveToRedis(customerId, session);
  }

  /**
   * Add item to cart
   * @param {string} customerId
   * @param {Object} product
   */
  async addToCart(customerId, product) {
    const session = await this.getSession(customerId);
    session.cart.push(product);
    await this._updateSession(customerId);
  }

  /**
   * Clear cart
   * @param {string} customerId
   */
  async clearCart(customerId) {
    const session = await this.getSession(customerId);
    session.cart = [];
    await this._updateSession(customerId);
  }

  /**
   * Get cart items
   * @param {string} customerId
   * @returns {Array} Cart items
   */
  async getCart(customerId) {
    const session = await this.getSession(customerId);
    return session.cart;
  }

  /**
   * Set session step
   * @param {string} customerId
   * @param {string} step
   */
  async setStep(customerId, step) {
    const session = await this.getSession(customerId);
    session.step = step;
    await this._updateSession(customerId);
  }

  /**
   * Get session step
   * @param {string} customerId
   * @returns {string} Current step
   */
  async getStep(customerId) {
    const session = await this.getSession(customerId);
    return session.step;
  }

  /**
   * Set order ID
   * @param {string} customerId
   * @param {string} orderId
   */
  async setOrderId(customerId, orderId) {
    const session = await this.getSession(customerId);
    session.orderId = orderId;
    await this._updateSession(customerId);
  }

  /**
   * Set QRIS invoice data
   * @param {string} customerId
   * @param {string} invoiceId
   * @param {number} amount
   * @param {string} date
   */
  async setQRISInvoice(customerId, invoiceId, amount, date) {
    const session = await this.getSession(customerId);
    session.qrisInvoiceId = invoiceId;
    session.qrisAmount = amount;
    session.qrisDate = date;
    await this._updateSession(customerId);
  }

  /**
   * Get order ID
   * @param {string} customerId
   * @returns {string} Order ID
   */
  async getOrderId(customerId) {
    const session = await this.getSession(customerId);
    return session.orderId;
  }

  /**
   * Get QRIS invoice data
   * @param {string} customerId
   * @returns {Object} QRIS data
   */
  async getQRISInvoice(customerId) {
    const session = await this.getSession(customerId);
    return {
      invoiceId: session.qrisInvoiceId,
      amount: session.qrisAmount,
      date: session.qrisDate,
    };
  }

  /**
   * Set payment proof file path
   * @param {string} customerId
   * @param {string} filePath
   */
  async setPaymentProof(customerId, filePath) {
    const session = await this.getSession(customerId);
    session.paymentProofPath = filePath;
    await this._updateSession(customerId);
  }

  /**
   * Get payment proof file path
   * @param {string} customerId
   * @returns {string|null}
   */
  async getPaymentProof(customerId) {
    const session = await this.getSession(customerId);
    return session.paymentProofPath;
  }

  /**
   * Find customer ID by order ID
   * @param {string} orderId
   * @returns {string|null}
   */
  async findCustomerByOrderId(orderId) {
    // Try Redis first with pattern scan
    if (this.useRedis && redisClient.isReady()) {
      try {
        const client = redisClient.getClient();
        const keys = await client.keys("session:*");

        for (const key of keys) {
          const sessionData = await client.get(key);
          if (sessionData) {
            const session = JSON.parse(sessionData);
            if (session.orderId === orderId) {
              return session.customerId;
            }
          }
        }
      } catch (error) {
        console.error("❌ Redis findCustomerByOrderId error:", error.message);
        // Fall through to in-memory
      }
    }

    // Fallback to in-memory
    for (const [customerId, session] of this.sessions.entries()) {
      if (session.orderId === orderId) {
        return customerId;
      }
    }
    return null;
  }

  /**
   * Set payment method
   * @param {string} customerId
   * @param {string} method - Payment method (QRIS, OVO, DANA, GOPAY, SHOPEEPAY, VA)
   * @param {string} invoiceId - Payment invoice ID
   */
  async setPaymentMethod(customerId, method, invoiceId) {
    const session = await this.getSession(customerId);
    session.paymentMethod = method;
    session.paymentInvoiceId = invoiceId;
    await this._updateSession(customerId);
  }

  /**
   * Get payment method
   * @param {string} customerId
   * @returns {Object} Payment method and invoice ID
   */
  async getPaymentMethod(customerId) {
    const session = await this.getSession(customerId);
    return {
      method: session.paymentMethod,
      invoiceId: session.paymentInvoiceId,
    };
  }

  /**
   * Clean up inactive sessions (older than 30 minutes)
   */
  async cleanupSessions() {
    const now = Date.now();

    // Clean in-memory sessions
    for (const [customerId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.sessionTTL * 1000) {
        this.sessions.delete(customerId);
      }
    }

    // Redis sessions auto-expire via TTL, no manual cleanup needed
    console.log(`🧹 Cleaned up inactive sessions`);
  }

  /**
   * Graceful shutdown - close Redis connection
   */
  async shutdown() {
    if (this.useRedis) {
      await redisClient.disconnect();
    }
  }

  /**
   * Get count of active sessions
   * @returns {Promise<number>} Active session count
   * When Redis is enabled, returns accurate count by scanning Redis keys.
   */
  async getActiveSessionCount() {
    if (this.useRedis) {
      try {
        // Use Redis SCAN to count session keys matching "session:*"
        let cursor = "0";
        let count = 0;
        do {
          // SCAN with match pattern and reasonable count per batch
          const result = await redisClient.scan(cursor, {
            MATCH: "session:*",
            COUNT: 100,
          });
          cursor = result.cursor;
          count += result.keys.length;
        } while (cursor !== "0");
        return count;
      } catch (error) {
        // Fallback to in-memory count on error
        console.error(
          "Redis SCAN error, using in-memory count:",
          error.message
        );
        return this.sessions.size;
      }
    }
    return this.sessions.size;
  }

  /**
   * Get all active customer IDs (from both in-memory and Redis sessions)
   * @async
   * @returns {Promise<Array>} Array of customer IDs
   */
  async getAllCustomerIds() {
    if (this.useRedis) {
      try {
        // Use Redis SCAN to get all session keys
        let cursor = "0";
        const customerIds = new Set(Array.from(this.sessions.keys()));
        do {
          const result = await redisClient.scan(cursor, {
            MATCH: "session:*",
            COUNT: 100,
          });
          cursor = result.cursor;
          for (const key of result.keys) {
            // Extract customerId from "session:1234567890@c.us"
            const match = key.match(/^session:(.+)$/);
            if (match && match[1]) {
              customerIds.add(match[1]);
            }
          }
        } while (cursor !== "0");
        return Array.from(customerIds);
      } catch (error) {
        console.error(
          "Redis SCAN error in getAllCustomerIds, using in-memory keys:",
          error.message
        );
        return Array.from(this.sessions.keys());
      }
    }
    return Array.from(this.sessions.keys());
  }
}

module.exports = SessionManager;
