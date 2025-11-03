/**
 * Admin Order Handler
 * Handles order approval and broadcast functionality for admins
 * Extracted from AdminHandler for better code organization
 */

const BaseHandler = require("./BaseHandler");
const UIMessages = require("../../lib/uiMessages");

class AdminOrderHandler extends BaseHandler {
  constructor(sessionManager, xenditService, logger) {
    super(sessionManager, logger);
    this.xenditService = xenditService;
  }

  /**
   * /approve <orderId> - Approve manual payment and deliver products
   * @param {string} adminId - Admin customer ID
   * @param {string} message - Command message with order ID
   * @returns {object|string} Response with delivery info or error message
   */
  async handleApprove(adminId, message) {
    const parts = message.split(" ");
    if (parts.length < 2) {
      return UIMessages.adminApprovalFormat();
    }

    const orderId = parts[1];
    const customerId = await this.sessionManager.findCustomerByOrderId(orderId);

    if (!customerId) {
      return UIMessages.orderNotFound(orderId);
    }

    const step = await this.getStep(customerId);
    if (step !== "awaiting_admin_approval") {
      return UIMessages.orderNotPending(orderId);
    }

    // Double-check payment status via Xendit
    const paymentData = await this.sessionManager.getPaymentMethod(customerId);
    if (paymentData.invoiceId) {
      try {
        const paymentStatus = await this.xenditService.checkPaymentStatus(
          paymentData.invoiceId
        );

        if (paymentStatus.status !== "SUCCEEDED") {
          this.log(adminId, "payment_not_verified", {
            orderId,
            invoiceId: paymentData.invoiceId,
            status: paymentStatus.status,
          });
          return `❌ *Payment Belum Berhasil*\n\nOrder: ${orderId}\nStatus: ${paymentStatus.status}\n\nTidak bisa approve sebelum payment SUCCEEDED.`;
        }

        console.log(
          `✅ Payment verified for ${orderId}: ${paymentStatus.status}`
        );
      } catch (error) {
        this.logError(adminId, error, {
          orderId,
          action: "payment_double_check",
        });
        return `⚠️ *Gagal Verifikasi Payment*\n\nError: ${error.message}\n\nSilakan cek manual di dashboard Xendit.`;
      }
    }

    // Deliver products
    const cart = await this.sessionManager.getCart(customerId);
    const ProductDelivery = require("../../services/productDelivery");
    const productDelivery = new ProductDelivery();

    let deliveryResult;
    try {
      deliveryResult = await productDelivery.deliverProducts(
        customerId,
        orderId,
        cart
      );
    } catch (error) {
      this.logError(customerId, error, {
        orderId,
        action: "product_delivery",
      });
      return `❌ *Delivery Error*\n\nOrder: ${orderId}\nError: ${error.message}\n\nSilakan cek file di products_data/ dan stock.`;
    }

    if (!deliveryResult.success) {
      this.logError(customerId, new Error("Delivery failed"), {
        orderId,
        reason: "no_products_available",
        failedProducts: deliveryResult.failed,
      });
      return UIMessages.deliveryFailed(orderId);
    }

    const customerMessage = productDelivery.formatDeliveryMessage(
      deliveryResult,
      orderId
    );

    // Calculate totals
    const { IDR_RATE } = require("../../config");
    const totalUSD = cart.reduce((sum, item) => sum + item.price, 0);
    const totalIDR = totalUSD * IDR_RATE;

    // Log admin approval with complete order data
    this.log(adminId, "approve_order", {
      orderId,
      customerId,
      items: cart.map((p) => ({ id: p.id, name: p.name, price: p.price })),
      totalUSD,
      totalIDR,
      products: cart.map((p) => p.name), // Keep for backward compatibility
      delivered: deliveryResult.delivered.length,
      failed: deliveryResult.failed.length,
    });

    // Note: Stock already decremented in productDelivery.deliverProducts()
    console.log(
      `✅ Order ${orderId} approved and delivered (${deliveryResult.delivered.length} products)`
    );

    // Clear cart and reset step
    await this.sessionManager.clearCart(customerId);
    await this.setStep(customerId, "menu");

    return {
      message: UIMessages.approvalSuccess(orderId),
      deliverToCustomer: true,
      customerId: customerId,
      customerMessage: customerMessage,
    };
  }

  /**
   * /broadcast <message> - Send message to all active customers
   * @param {string} adminId - Admin customer ID
   * @param {string} message - Command message with broadcast text
   * @returns {object|string} Broadcast info or error message
   */
  async handleBroadcast(adminId, message) {
    const broadcastMessage = message.substring("/broadcast ".length).trim();

    if (!broadcastMessage) {
      return "❌ *Format Salah*\n\nGunakan: /broadcast <pesan>\n\n*Contoh:*\n/broadcast Promo spesial hari ini! Diskon 20%";
    }

    const customerIds = await this.sessionManager.getAllCustomerIds();

    this.log(adminId, "broadcast_sent", {
      recipientCount: customerIds.length,
      messageLength: broadcastMessage.length,
    });

    return {
      message: `✅ *Broadcast Dikirim*\n\nPesan akan dikirim ke ${customerIds.length} customer.`,
      broadcast: true,
      recipients: customerIds,
      broadcastMessage: `📢 *Pengumuman*\n\n${broadcastMessage}`,
    };
  }
}

module.exports = AdminOrderHandler;
