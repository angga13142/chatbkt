/**
 * Webhook Server for Xendit Payment Notifications
 * Handles automatic payment verification and product delivery
 */

const express = require("express");
const bodyParser = require("body-parser");
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

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    // Parse JSON bodies
    this.app.use(bodyParser.json());

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
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        redis: this.sessionManager.useRedis ? "connected" : "disabled",
        whatsapp: this.whatsappClient.info ? "connected" : "disconnected",
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

    // Xendit uses simple token comparison
    return callbackToken === this.webhookToken;
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

      // Find customer by invoice ID
      let customerId = null;

      // Search through all sessions to find matching invoice
      if (this.sessionManager.useRedis) {
        const redisClient = require("./lib/redisClient");
        const keys = await redisClient.getClient().keys("session:*");

        for (const key of keys) {
          const sessionData = await redisClient.getClient().get(key);
          if (sessionData) {
            const session = JSON.parse(sessionData);
            if (session.paymentInvoiceId === invoiceId) {
              customerId = session.customerId;
              break;
            }
          }
        }
      } else {
        // In-memory fallback
        for (const [id, session] of this.sessionManager.sessions.entries()) {
          if (session.paymentInvoiceId === invoiceId) {
            customerId = id;
            break;
          }
        }
      }

      if (!customerId) {
        console.error(`❌ Customer not found for invoice: ${invoiceId}`);
        return;
      }

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

      // Send delivery message via WhatsApp
      const message = this.formatDeliveryMessage(deliveryResult, orderId);
      await this.whatsappClient.sendMessage(customerId, message);

      // Log transaction
      const TransactionLogger = require("./lib/transactionLogger");
      const logger = new TransactionLogger();
      logger.logProductsDelivered(customerId, orderId, cart, "webhook_auto");

      // Update session state
      await this.sessionManager.setStep(customerId, "menu");
      await this.sessionManager.clearCart(customerId);

      console.log(`✅ Auto-delivered products to ${customerId.slice(-4)}`);
    } catch (error) {
      console.error("❌ handlePaymentSuccess error:", error.message);
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
  async handlePaymentExpired(payload) {
    const invoiceId = payload.id || payload.external_id;
    console.log(`⏰ Payment expired: ${invoiceId}`);

    // Find customer and notify
    // Implementation similar to handlePaymentSuccess
  }

  /**
   * Handle failed payment
   * @param {Object} payload
   */
  async handlePaymentFailed(payload) {
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
  async stop() {
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
