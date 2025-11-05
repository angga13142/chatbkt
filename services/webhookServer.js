/**
 * Webhook Server for Xendit Payment Notifications
 * Handles automatic payment verification and product delivery
 */

const express = require("express");
const bodyParser = require("body-parser");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");

class WebhookServer {
  constructor(sessionManager, chatbotLogic, whatsappClient) {
    this.sessionManager = sessionManager;
    this.chatbotLogic = chatbotLogic;
    this.whatsappClient = whatsappClient;
    this.app = express();
    this.port = process.env.WEBHOOK_PORT || 3000;
    this.server = null;

    // Xendit webhook token for signature verification
    this.webhookToken = process.env.XENDIT_WEBHOOK_TOKEN || "";

    // Retry configuration
    this.maxRetries = 5;
    this.retryDelays = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {boolean} True if strings are equal
   */
  secureCompare(a, b) {
    if (!a || !b) return false;
    if (a.length !== b.length) return false;

    try {
      return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch {
      // Fallback if crypto.timingSafeEqual fails
      return false;
    }
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    // Security headers
    this.app.use((req, res, next) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("X-XSS-Protection", "1; mode=block");
      if (req.secure || req.headers["x-forwarded-proto"] === "https") {
        res.setHeader(
          "Strict-Transport-Security",
          "max-age=31536000; includeSubDomains"
        );
      }
      next();
    });

    // Parse JSON bodies with size limit
    this.app.use(bodyParser.json({ limit: "10mb" }));
    this.app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

    // Webhook rate limiting
    const webhookLimiter = rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 100, // 100 requests per minute per IP
      message: {
        error: "Too many webhook requests",
        retry_after: "60 seconds",
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    // Apply rate limiting to webhook endpoint
    this.app.use("/webhook/", webhookLimiter);

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`📥 ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Setup webhook routes
   */
  setupRoutes() {
    // Health check endpoint
    this.app.get("/health", (req, res) => {
      const memUsage = process.memoryUsage();
      const uptimeSeconds = process.uptime();

      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: {
          seconds: Math.floor(uptimeSeconds),
          formatted: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor(
            (uptimeSeconds % 3600) / 60
          )}m`,
        },
        memory: {
          used: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          total: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
          utilization: `${(
            (memUsage.heapUsed / memUsage.heapTotal) *
            100
          ).toFixed(1)}%`,
        },
        services: {
          redis: this.sessionManager.useRedis ? "connected" : "fallback",
          whatsapp: this.whatsappClient.info ? "connected" : "initializing",
        },
        environment: process.env.NODE_ENV || "development",
      });
    });

    // Xendit webhook endpoint
    this.app.post("/webhook/xendit", async (req, res) => {
      try {
        // Verify webhook signature
        if (!this.verifyWebhookSignature(req)) {
          console.error("❌ Invalid webhook signature");
          return res.status(401).json({ error: "Invalid signature" });
        }

        const payload = req.body;
        console.log("📨 Xendit webhook received:", {
          id: payload.id,
          status: payload.status,
          type: payload.type || "invoice",
        });

        // Handle different webhook types
        if (payload.status === "PAID" || payload.status === "SUCCEEDED") {
          await this.handlePaymentSuccess(payload);
        } else if (payload.status === "EXPIRED") {
          await this.handlePaymentExpired(payload);
        } else if (payload.status === "FAILED") {
          await this.handlePaymentFailed(payload);
        }

        // Always respond with 200 to acknowledge receipt
        res.status(200).json({ received: true });
      } catch (error) {
        console.error("❌ Webhook error:", error.message);
        // Still respond with 200 to prevent retries
        res.status(200).json({ received: true, error: error.message });
      }
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ error: "Not found" });
    });
  }

  /**
   * Verify Xendit webhook signature
   * @param {Object} req - Express request
   * @returns {boolean}
   */
  /**
   * Verify webhook signature using constant-time comparison
   * @param {Object} req - Express request object
   * @returns {boolean} True if signature is valid
   */
  verifyWebhookSignature(req) {
    if (!this.webhookToken) {
      console.warn(
        "⚠️  XENDIT_WEBHOOK_TOKEN not configured, skipping signature verification"
      );
      return true; // Allow in development
    }

    const callbackToken = req.headers["x-callback-token"];

    if (!callbackToken) {
      return false;
    }

    // Use constant-time comparison to prevent timing attacks
    return this.secureCompare(callbackToken, this.webhookToken);
  }

  /**
   * Retry helper with exponential backoff
   * @param {Function} fn - Async function to retry
   * @param {string} context - Description for logging
   * @returns {Promise<any>}
   */
  async retryWithBackoff(fn, context = "operation") {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const isLastAttempt = attempt === this.maxRetries - 1;

        if (isLastAttempt) {
          console.error(
            `❌ ${context} failed after ${this.maxRetries} attempts:`,
            error.message
          );
          throw error;
        }

        const delay = this.retryDelays[attempt];
        console.warn(
          `⚠️ ${context} failed (attempt ${attempt + 1}/${
            this.maxRetries
          }), retrying in ${delay}ms...`
        );
        await this.sleep(delay);
      }
    }
  }

  /**
   * Sleep helper
   * @param {number} ms
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Handle successful payment
   * @param {Object} payload - Webhook payload
   */
  async handlePaymentSuccess(payload) {
    try {
      // Extract invoice ID (different fields for different payment types)
      const invoiceId = payload.id || payload.invoice_id || payload.external_id;

      if (!invoiceId) {
        console.error("❌ No invoice ID in webhook payload");
        return;
      }

      console.log(`✅ Payment successful: ${invoiceId}`);

      // Find customer by invoice ID (with retry)
      let customerId = null;

      customerId = await this.retryWithBackoff(async () => {
        // Search through all sessions to find matching invoice
        if (this.sessionManager.useRedis) {
          const redisClient = require("../lib/redisClient");
          const keys = await redisClient.getClient().keys("session:*");

          for (const key of keys) {
            const sessionData = await redisClient.getClient().get(key);
            if (sessionData) {
              const session = JSON.parse(sessionData);
              if (session.paymentInvoiceId === invoiceId) {
                return session.customerId;
              }
            }
          }
        } else {
          // In-memory fallback
          for (const [id, session] of this.sessionManager.sessions.entries()) {
            if (session.paymentInvoiceId === invoiceId) {
              return id;
            }
          }
        }

        throw new Error(`Customer not found for invoice: ${invoiceId}`);
      }, `Finding customer for invoice ${invoiceId}`);

      console.log(`📦 Found customer: ${customerId.slice(-4)}`);

      // Check if already in awaiting_admin_approval state
      const step = await this.sessionManager.getStep(customerId);

      if (step !== "awaiting_admin_approval") {
        console.log(
          `⚠️  Customer ${customerId.slice(-4)} not in approval state (${step})`
        );
        return;
      }

      // Get cart and order ID
      const cart = await this.sessionManager.getCart(customerId);
      const orderId = await this.sessionManager.getOrderId(customerId);

      if (!cart || cart.length === 0) {
        console.error(`❌ Empty cart for customer: ${customerId.slice(-4)}`);
        return;
      }

      // Auto-deliver products
      const ProductDelivery = require("./productDelivery");
      const productDelivery = new ProductDelivery();
      const deliveryResult = productDelivery.deliverProducts(
        customerId,
        orderId,
        cart
      );

      if (!deliveryResult.success) {
        console.error(`❌ Delivery failed for ${customerId.slice(-4)}`);
        await this.whatsappClient.sendMessage(
          customerId,
          "❌ *Pengiriman Produk Gagal*\n\nMaaf, terjadi kesalahan saat mengirim produk. Silakan hubungi admin."
        );
        return;
      }

      // Send delivery message via WhatsApp (with retry)
      const message = this.formatDeliveryMessage(deliveryResult, orderId);
      await this.retryWithBackoff(async () => {
        await this.whatsappClient.sendMessage(customerId, message);
      }, `Sending delivery message to ${customerId.slice(-4)}`);

      // Log transaction
      const TransactionLogger = require("../lib/transactionLogger");
      const logger = new TransactionLogger();
      logger.logProductsDelivered(customerId, orderId, cart, "webhook_auto");

      // Update session state (with retry)
      await this.retryWithBackoff(async () => {
        await this.sessionManager.setStep(customerId, "menu");
        await this.sessionManager.clearCart(customerId);
      }, `Updating session for ${customerId.slice(-4)}`);

      console.log(`✅ Auto-delivered products to ${customerId.slice(-4)}`);
    } catch (error) {
      console.error("❌ handlePaymentSuccess error:", error.message);

      // Notify admin on failure
      await this.notifyAdminOfFailure(
        "Payment success handling failed",
        error.message,
        { invoiceId: payload.id }
      );
    }
  }

  /**
   * Notify admin of webhook processing failure
   * @param {string} context
   * @param {string} errorMessage
   * @param {Object} details
   */
  async notifyAdminOfFailure(context, errorMessage, details = {}) {
    try {
      const adminNumbers = [
        process.env.ADMIN_NUMBER_1,
        process.env.ADMIN_NUMBER_2,
      ].filter(Boolean);

      if (adminNumbers.length === 0) return;

      const message =
        `⚠️ *Webhook Error*\n\n` +
        `Context: ${context}\n` +
        `Error: ${errorMessage}\n\n` +
        `Details: ${JSON.stringify(details, null, 2)}\n\n` +
        `Time: ${new Date().toISOString()}`;

      for (const adminNum of adminNumbers) {
        const adminId = adminNum.includes("@c.us")
          ? adminNum
          : `${adminNum}@c.us`;
        await this.whatsappClient.sendMessage(adminId, message);
      }

      console.log("✅ Notified admin of webhook failure");
    } catch (notifyError) {
      console.error("❌ Failed to notify admin:", notifyError.message);
    }
  }

  /**
   * Format delivery message
   * @param {Object} deliveryResult
   * @param {string} orderId
   * @returns {string}
   */
  formatDeliveryMessage(deliveryResult, orderId) {
    let message = `✅ *Pembayaran Berhasil!*\n\n`;
    message += `Order ID: ${orderId}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    deliveryResult.deliveredProducts.forEach((item) => {
      message += `📦 *${item.product.name}*\n`;
      if (item.credentials) {
        message += `Email: ${item.credentials.email}\n`;
        message += `Password: ${item.credentials.password}\n`;
      } else if (item.cardData) {
        message += `Card Number: ${item.cardData.number}\n`;
        message += `Expiry: ${item.cardData.expiry}\n`;
        message += `CVV: ${item.cardData.cvv}\n`;
      }
      message += `\n`;
    });

    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `⚠️ *Penting:*\n`;
    message += `• Ganti password setelah login\n`;
    message += `• Simpan data ini dengan aman\n`;
    message += `• Jangan share ke orang lain\n\n`;
    message += `Terima kasih telah berbelanja! 🎉`;

    return message;
  }

  /**
   * Handle expired payment
   * @param {Object} payload
   */
  handlePaymentExpired(payload) {
    const invoiceId = payload.id || payload.external_id;
    console.log(`⏰ Payment expired: ${invoiceId}`);

    // Find customer and notify
    // Implementation similar to handlePaymentSuccess
  }

  /**
   * Handle failed payment
   * @param {Object} payload
   */
  handlePaymentFailed(payload) {
    const invoiceId = payload.id || payload.external_id;
    console.log(`❌ Payment failed: ${invoiceId}`);

    // Find customer and notify
    // Implementation similar to handlePaymentSuccess
  }

  /**
   * Start webhook server
   */
  start() {
    this.server = this.app.listen(this.port, () => {
      console.log(`✅ Webhook server listening on port ${this.port}`);
      console.log(
        `📡 Webhook URL: ${
          process.env.WEBHOOK_URL || `http://localhost:${this.port}`
        }/webhook/xendit`
      );
    });
  }

  /**
   * Stop webhook server
   */
  stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log("✅ Webhook server stopped");
          resolve();
        });
      });
    }
  }
}

module.exports = WebhookServer;
