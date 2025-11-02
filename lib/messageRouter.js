/**
 * Message Router
 * Handles message routing and media processing
 */

const fs = require("fs");

class MessageRouter {
  constructor(client, sessionManager, chatbotLogic) {
    this.client = client;
    this.sessionManager = sessionManager;
    this.chatbotLogic = chatbotLogic;
  }

  /**
   * Check if message should be ignored
   */
  shouldIgnore(message) {
    return (
      message.from.includes("@g.us") || message.from === "status@broadcast"
    );
  }

  /**
   * Handle payment proof image
   */
  async handlePaymentProof(message, customerId) {
    const step = await this.sessionManager.getStep(customerId);

    if (step !== "awaiting_payment" && step !== "awaiting_admin_approval") {
      return false;
    }

    console.log(`📸 Payment proof received from ${customerId}`);

    try {
      const media = await message.downloadMedia();
      const orderId = await this.sessionManager.getOrderId(customerId);
      const filename = `${orderId}-${Date.now()}.jpg`;
      const filepath = `./payment_proofs/${filename}`;

      // Save payment proof
      fs.writeFileSync(filepath, media.data, "base64");
      console.log(`💾 Saved payment proof: ${filename}`);

      // Store filepath in session
      await this.sessionManager.setPaymentProof(customerId, filepath);

      // Get cart and order info for admin notification
      const cart = await this.sessionManager.getCart(customerId);
      const totalUSD = cart.reduce((sum, item) => sum + item.price, 0);

      // Send confirmation to customer
      const confirmMessage =
        "✅ *Bukti Pembayaran Diterima*\n\n" +
        "Terima kasih! Bukti pembayaran Anda telah kami terima.\n\n" +
        `📋 Order ID: ${orderId}\n` +
        `💰 Total: $${totalUSD}\n\n` +
        "Admin kami akan memverifikasi pembayaran dalam 5-15 menit.\n\n" +
        "Anda akan menerima konfirmasi setelah pembayaran diverifikasi.\n\n" +
        "━━━━━━━━━━━━━━━━━━\n" +
        "💬 Ketik *menu* untuk kembali";

      await message.reply(confirmMessage);

      // Forward to admin
      await this.forwardToAdmin(customerId, orderId, cart, totalUSD, filepath);

      console.log(`✅ Payment proof processed for ${customerId}`);
      return true;
    } catch (saveError) {
      console.error("❌ Error saving payment proof:", saveError);
      await message.reply(
        "⚠️ Gagal menyimpan bukti pembayaran. Silakan coba lagi."
      );
      return true;
    }
  }

  /**
   * Forward payment proof to admin
   */
  async forwardToAdmin(customerId, orderId, cart, totalUSD, filepath) {
    const adminNumbers = [
      process.env.ADMIN_NUMBER_1,
      process.env.ADMIN_NUMBER_2,
      process.env.ADMIN_NUMBER_3,
    ].filter(Boolean);

    let adminMessage = "🔔 *PEMBAYARAN BARU*\n\n";
    adminMessage += `📋 Order ID: ${orderId}\n`;
    adminMessage += `👤 Customer: ${customerId.replace("@c.us", "")}\n`;
    adminMessage += `💵 Total: $${totalUSD}\n\n`;
    adminMessage += "*Produk:*\n";
    cart.forEach((item, index) => {
      adminMessage += `${index + 1}. ${item.name}\n`;
    });
    adminMessage += "\n━━━━━━━━━━━━━━━━━━\n\n";
    adminMessage += "✅ Untuk approve:\n";
    adminMessage += `/approve ${orderId}\n\n`;
    adminMessage += "📸 Bukti pembayaran:";

    for (const adminNum of adminNumbers) {
      const adminId = adminNum.includes("@c.us")
        ? adminNum
        : `${adminNum}@c.us`;
      try {
        await this.client.sendMessage(adminId, adminMessage);
        const { MessageMedia } = require("whatsapp-web.js");
        const proofMedia = MessageMedia.fromFilePath(filepath);
        await this.client.sendMessage(adminId, proofMedia);
        console.log(`✅ Forwarded to admin: ${adminNum}`);
      } catch (adminError) {
        console.error(`❌ Error forwarding to admin ${adminNum}:`, adminError);
      }
    }
  }

  /**
   * Send text response
   */
  async sendTextResponse(message, response) {
    await message.reply(response.message);

    // Handle admin product delivery
    if (
      response.deliverToCustomer &&
      response.customerId &&
      response.customerMessage
    ) {
      try {
        await this.client.sendMessage(
          response.customerId,
          response.customerMessage
        );
        console.log(`✅ Delivered products to ${response.customerId}`);
      } catch (deliveryError) {
        console.error("❌ Error delivering to customer:", deliveryError);
        await message.reply(
          "⚠️ Gagal mengirim ke customer. Silakan kirim manual."
        );
      }
    }
  }

  /**
   * Send QRIS QR code (Xendit)
   */
  async sendXenditQRIS(message, qrisData) {
    if (!qrisData.qrCodePath) return;

    try {
      const { MessageMedia } = require("whatsapp-web.js");
      const media = MessageMedia.fromFilePath(qrisData.qrCodePath);
      await message.reply(media);
      console.log(`📸 Sent Xendit QRIS QR code`);
    } catch (qrError) {
      console.error("❌ Error sending QRIS QR code:", qrError);
      await message.reply(
        "⚠️ Gagal mengirim QR code. Silakan hubungi support."
      );
    }
  }

  /**
   * Send QRIS QR code (InterActive - legacy)
   */
  async sendInterActiveQRIS(message, qrisData, customerId) {
    if (!qrisData.qrisContent) return;

    try {
      const QRISService = require("../services/qrisService");
      const qrisService = new QRISService();
      const { MessageMedia } = require("whatsapp-web.js");

      // Generate QR code image
      const orderId = await this.sessionManager.getOrderId(customerId);
      const qrFilename = `${orderId}.png`;
      const qrPath = await qrisService.generateQRImage(
        qrisData.qrisContent,
        qrFilename
      );

      // Send QR code image
      const media = MessageMedia.fromFilePath(qrPath);
      await message.reply(media);
      console.log(`📸 Sent InterActive QRIS QR code: ${qrFilename}`);
    } catch (qrError) {
      console.error("❌ Error sending QRIS QR code:", qrError);
      await message.reply(
        "⚠️ Gagal mengirim QR code. Silakan hubungi support."
      );
    }
  }

  /**
   * Auto-deliver products
   */
  async autoDeliverProducts(response, customerId) {
    if (!response.deliverToCustomer || !response.products) return;

    try {
      // Send product credentials
      for (const product of response.products) {
        let productMessage = `🎁 *${product.name}*\n\n`;
        productMessage += `📧 Email: ${product.email}\n`;
        productMessage += `🔐 Password: ${product.password}\n\n`;
        productMessage += "━━━━━━━━━━━━━━━━━━\n\n";
        productMessage += "💡 Simpan kredensial ini dengan baik!\n";
        productMessage += "🔒 Jangan bagikan ke orang lain";

        await this.client.sendMessage(customerId, productMessage);
      }

      console.log(
        `✅ Auto-delivered ${response.products.length} products to ${customerId}`
      );
    } catch (deliveryError) {
      console.error("❌ Error auto-delivering products:", deliveryError);
    }
  }

  /**
   * Main message handler
   */
  async handleMessage(message) {
    try {
      const customerId = message.from;

      // Ignore group messages and status
      if (this.shouldIgnore(message)) {
        return;
      }

      // Handle payment proof images
      if (message.hasMedia && message.type === "image") {
        const handled = await this.handlePaymentProof(message, customerId);
        if (handled) return;
      }

      // Get message content
      const messageBody = message.body;
      console.log(`📩 Message from ${customerId}: ${messageBody}`);

      // Process message and get response
      const response = await this.chatbotLogic.processMessage(
        customerId,
        messageBody
      );

      // Check if response is a broadcast command
      if (response && response.type === "broadcast") {
        // Send confirmation to admin
        await message.reply(response.confirmMessage);

        // Send broadcast to all recipients
        for (const recipientId of response.recipients) {
          try {
            await this.client.sendMessage(
              recipientId,
              `📢 *Pesan dari Admin*\n\n${response.message}`
            );
            console.log(`📤 Broadcast sent to ${recipientId}`);
          } catch (error) {
            console.error(
              `❌ Failed to send broadcast to ${recipientId}:`,
              error.message
            );
          }
        }

        console.log(
          `✅ Broadcast completed: ${response.recipients.length} recipients`
        );
        return;
      }

      // Handle response
      if (response && typeof response === "object" && response.message) {
        // Debug: Log response content
        console.log(
          `🔍 Response type: object, message length: ${response.message.length}`
        );

        // Send text message
        await this.sendTextResponse(message, response);

        // Send QRIS QR code (Xendit)
        if (response.qrisData) {
          await this.sendXenditQRIS(message, response.qrisData);
          await this.sendInterActiveQRIS(
            message,
            response.qrisData,
            customerId
          );
        }

        // Auto-deliver products
        await this.autoDeliverProducts(response, customerId);
      } else {
        // Debug: Log simple response
        console.log(
          `🔍 Response type: string, content: ${
            response ? response.substring(0, 100) : "null"
          }...`
        );

        // Send simple text response
        await message.reply(response);
      }

      console.log(`📤 Sent response to ${customerId}`);
    } catch (error) {
      console.error("❌ Error handling message:", error);

      // Log error asynchronously with error handling
      if (this.chatbotLogic.logger) {
        this.sessionManager
          .getStep(message.from)
          .then((step) => {
            this.chatbotLogic.logger.logError(message.from, error, {
              messageBody: message.body,
              step: step,
            });
          })
          .catch((logError) => {
            console.error("❌ Error logging error:", logError.message);
          });
      }

      // Set error cooldown
      if (this.chatbotLogic.validator) {
        this.chatbotLogic.validator.setErrorCooldown(message.from);
      }

      try {
        await message.reply(
          "⚠️ Maaf, terjadi kesalahan.\n\nSilakan coba lagi atau ketik *support* untuk bantuan."
        );
      } catch (replyError) {
        console.error("❌ Error sending error message:", replyError);
      }
    }
  }
}

module.exports = MessageRouter;
