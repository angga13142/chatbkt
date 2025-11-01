/**
 * Session Manager
 * Manages customer sessions and shopping carts
 */

class SessionManager {
  constructor() {
    this.sessions = new Map();
  }

  /**
   * Get or create a session for a customer
   * @param {string} customerId - WhatsApp number
   * @returns {Object} Session object
   */
  getSession(customerId) {
    if (!this.sessions.has(customerId)) {
      this.sessions.set(customerId, {
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
      });
    }

    // Update last activity
    const session = this.sessions.get(customerId);
    session.lastActivity = Date.now();
    return session;
  }

  /**
   * Add item to cart
   * @param {string} customerId
   * @param {Object} product
   */
  addToCart(customerId, product) {
    const session = this.getSession(customerId);
    session.cart.push(product);
  }

  /**
   * Clear cart
   * @param {string} customerId
   */
  clearCart(customerId) {
    const session = this.getSession(customerId);
    session.cart = [];
  }

  /**
   * Get cart items
   * @param {string} customerId
   * @returns {Array} Cart items
   */
  getCart(customerId) {
    const session = this.getSession(customerId);
    return session.cart;
  }

  /**
   * Set session step
   * @param {string} customerId
   * @param {string} step
   */
  setStep(customerId, step) {
    const session = this.getSession(customerId);
    session.step = step;
  }

  /**
   * Get session step
   * @param {string} customerId
   * @returns {string} Current step
   */
  getStep(customerId) {
    const session = this.getSession(customerId);
    return session.step;
  }

  /**
   * Set order ID
   * @param {string} customerId
   * @param {string} orderId
   */
  setOrderId(customerId, orderId) {
    const session = this.getSession(customerId);
    session.orderId = orderId;
  }

  /**
   * Set QRIS invoice data
   * @param {string} customerId
   * @param {string} invoiceId
   * @param {number} amount
   * @param {string} date
   */
  setQRISInvoice(customerId, invoiceId, amount, date) {
    const session = this.getSession(customerId);
    session.qrisInvoiceId = invoiceId;
    session.qrisAmount = amount;
    session.qrisDate = date;
  }

  /**
   * Get order ID
   * @param {string} customerId
   * @returns {string} Order ID
   */
  getOrderId(customerId) {
    const session = this.getSession(customerId);
    return session.orderId;
  }

  /**
   * Get QRIS invoice data
   * @param {string} customerId
   * @returns {Object} QRIS data
   */
  getQRISInvoice(customerId) {
    const session = this.getSession(customerId);
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
  setPaymentProof(customerId, filePath) {
    const session = this.getSession(customerId);
    session.paymentProofPath = filePath;
  }

  /**
   * Get payment proof file path
   * @param {string} customerId
   * @returns {string|null}
   */
  getPaymentProof(customerId) {
    const session = this.getSession(customerId);
    return session.paymentProofPath;
  }

  /**
   * Find customer ID by order ID
   * @param {string} orderId
   * @returns {string|null}
   */
  findCustomerByOrderId(orderId) {
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
  setPaymentMethod(customerId, method, invoiceId) {
    const session = this.getSession(customerId);
    session.paymentMethod = method;
    session.paymentInvoiceId = invoiceId;
  }

  /**
   * Get payment method
   * @param {string} customerId
   * @returns {Object} Payment method and invoice ID
   */
  getPaymentMethod(customerId) {
    const session = this.getSession(customerId);
    return {
      method: session.paymentMethod,
      invoiceId: session.paymentInvoiceId,
    };
  }

  /**
   * Clean up inactive sessions (older than 30 minutes)
   */
  cleanupSessions() {
    const thirtyMinutes = 30 * 60 * 1000;
    const now = Date.now();

    for (const [customerId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > thirtyMinutes) {
        this.sessions.delete(customerId);
      }
    }
  }
}

module.exports = SessionManager;
