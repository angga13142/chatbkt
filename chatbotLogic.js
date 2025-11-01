/**
 * Chatbot Logic - Refactored & Modular
 * Handles message processing and response generation
 */

const {
  formatProductList,
  getProductById,
  getAllProducts,
} = require("./config");
const XenditService = require("./xenditService");
const UIMessages = require("./lib/uiMessages");
const PaymentMessages = require("./lib/paymentMessages");
const PaymentHandlers = require("./lib/paymentHandlers");
const InputValidator = require("./lib/inputValidator");
const TransactionLogger = require("./lib/transactionLogger");

class ChatbotLogic {
  constructor(sessionManager) {
    this.sessionManager = sessionManager;
    this.xenditService = XenditService;
    this.validator = new InputValidator(); // Instance for rate limiting
    this.logger = new TransactionLogger();
    this.paymentHandlers = new PaymentHandlers(
      XenditService,
      sessionManager,
      this.logger
    );
  }

  /**
   * Process incoming message and generate response
   */
  async processMessage(customerId, message) {
    // Check rate limiting
    const rateLimitCheck = this.validator.canSendMessage(customerId);
    if (!rateLimitCheck.allowed) {
      this.logger.logSecurity(
        customerId,
        "rate_limit_exceeded",
        rateLimitCheck.reason,
        {
          limit: this.validator.MESSAGE_LIMIT,
        }
      );
      return rateLimitCheck.message;
    }

    // Check error cooldown
    const cooldownCheck = this.validator.isInCooldown(customerId);
    if (cooldownCheck.inCooldown) {
      return cooldownCheck.message;
    }

    // Validate and sanitize input
    const sanitizedMessage = InputValidator.sanitizeMessage(message);
    if (!sanitizedMessage) {
      return UIMessages.invalidOption();
    }

    const step = this.sessionManager.getStep(customerId);
    const normalizedMessage = sanitizedMessage.toLowerCase().trim();

    // Handle admin commands
    if (normalizedMessage.startsWith("/approve ")) {
      return await this.handleAdminApprove(customerId, normalizedMessage);
    }

    // Handle global commands
    if (normalizedMessage === "menu" || normalizedMessage === "help") {
      this.sessionManager.setStep(customerId, "menu");
      return UIMessages.mainMenu();
    }

    if (normalizedMessage === "cart") {
      return this.showCart(customerId);
    }

    // Route to step handler
    return await this.routeToHandler(customerId, normalizedMessage, step);
  }

  /**
   * Route message to appropriate handler based on step
   */
  async routeToHandler(customerId, message, step) {
    switch (step) {
      case "menu":
        return this.handleMenuSelection(customerId, message);
      case "browsing":
        return this.handleProductSelection(customerId, message);
      case "checkout":
        return await this.handleCheckout(customerId, message);
      case "select_payment":
        return await this.paymentHandlers.handlePaymentSelection(
          customerId,
          message
        );
      case "select_bank":
        return await this.paymentHandlers.handleBankChoice(customerId, message);
      case "awaiting_payment":
        return await this.handleAwaitingPayment(customerId, message);
      case "awaiting_admin_approval":
        return UIMessages.awaitingAdminApproval();
      default:
        return UIMessages.mainMenu();
    }
  }

  /**
   * Handle main menu selection
   */
  handleMenuSelection(customerId, message) {
    if (message === "1" || message === "browse" || message === "products") {
      this.sessionManager.setStep(customerId, "browsing");
      return this.showProducts();
    }

    if (message === "2" || message === "cart") {
      return this.showCart(customerId);
    }

    if (message === "3" || message === "about") {
      return UIMessages.about();
    }

    if (message === "4" || message === "support" || message === "contact") {
      return UIMessages.contact();
    }

    return UIMessages.invalidOption() + "\n\n" + UIMessages.mainMenu();
  }

  /**
   * Show available products
   */
  showProducts() {
    const productList = formatProductList();
    return UIMessages.browsingInstructions(productList);
  }

  /**
   * Handle product selection
   */
  handleProductSelection(customerId, message) {
    const allProducts = getAllProducts();

    // Try to find product by ID or name
    let product = getProductById(message);
    if (!product) {
      product = allProducts.find(
        (p) =>
          p.name.toLowerCase().includes(message) ||
          p.id.toLowerCase().includes(message)
      );
    }

    if (product) {
      this.sessionManager.addToCart(customerId, product);
      const priceIDR = product.price * 15800;
      return UIMessages.productAdded(product.name, priceIDR);
    }

    return UIMessages.productNotFound();
  }

  /**
   * Show cart contents
   */
  /**
   * Show cart contents
   */
  async showCart(customerId) {
    const cart = await this.sessionManager.getCart(customerId);

    if (cart.length === 0) {
      return UIMessages.emptyCart();
    }

    const total = cart.reduce((sum, item) => sum + item.price, 0);
    await this.sessionManager.setStep(customerId, "checkout");

    return UIMessages.cartView(cart, total);
  }

  /**
   * Handle checkout process
   */
  async handleCheckout(customerId, message) {
    if (message === "checkout" || message === "buy" || message === "order") {
      return this.processCheckout(customerId);
    }

    if (message === "clear") {
      this.sessionManager.clearCart(customerId);
      this.sessionManager.setStep(customerId, "menu");
      return {
        message: UIMessages.cartCleared(),
        qrisData: null,
      };
    }

    return {
      message: UIMessages.checkoutPrompt(),
      qrisData: null,
    };
  }

  /**
   * Process checkout and show payment options
   */
  processCheckout(customerId) {
    // Check order rate limit
    const orderLimitCheck = this.validator.canPlaceOrder(customerId);
    if (!orderLimitCheck.allowed) {
      this.logger.logSecurity(
        customerId,
        "order_limit_exceeded",
        orderLimitCheck.reason,
        {
          limit: this.validator.ORDER_LIMIT,
        }
      );
      return {
        message: orderLimitCheck.message,
        qrisData: null,
      };
    }

    const cart = this.sessionManager.getCart(customerId);

    // Check stock availability
    const { isInStock } = require("./config");
    const outOfStockItems = cart.filter((item) => !isInStock(item.id));

    if (outOfStockItems.length > 0) {
      const itemNames = outOfStockItems.map((item) => item.name).join(", ");
      this.logger.logSecurity(
        customerId,
        "out_of_stock_checkout",
        "stock_unavailable",
        {
          items: outOfStockItems.map((i) => i.id),
        }
      );
      return {
        message: `❌ *Stok Habis*\n\nMaaf, produk berikut tidak tersedia:\n${itemNames}\n\nSilakan hapus dari keranjang dengan ketik *clear* dan pilih produk lain.`,
        qrisData: null,
      };
    }

    const totalUSD = cart.reduce((sum, item) => sum + item.price, 0);
    const orderId = `ORD-${Date.now()}-${customerId.slice(-4)}`;

    this.sessionManager.setOrderId(customerId, orderId);
    this.sessionManager.setStep(customerId, "select_payment");

    const totalIDR = this.xenditService.convertToIDR(totalUSD);

    // Log order creation
    this.logger.logOrder(customerId, orderId, cart, totalUSD, totalIDR);

    const orderSummary = UIMessages.orderSummary(orderId, cart, totalIDR);
    const paymentMenu = PaymentMessages.paymentMethodSelection(
      orderId,
      totalIDR
    );

    return {
      message: orderSummary + paymentMenu,
      qrisData: null,
    };
  }

  /**
   * Handle awaiting payment state
   */
  async handleAwaitingPayment(customerId, message) {
    if (message === "cek" || message === "check" || message === "status") {
      return await this.paymentHandlers.checkPaymentStatus(customerId);
    }

    return PaymentMessages.awaitingPayment();
  }

  /**
   * Handle admin approval command
   */
  async handleAdminApprove(adminId, message) {
    if (!InputValidator.isAdmin(adminId)) {
      this.logger.logSecurity(
        adminId,
        "unauthorized_admin_access",
        "not_in_whitelist"
      );
      return UIMessages.unauthorized();
    }

    const parts = message.split(" ");
    if (parts.length < 2) {
      return UIMessages.adminApprovalFormat();
    }

    const approveOrderId = parts[1];
    const targetCustomerId =
      this.sessionManager.findCustomerByOrderId(approveOrderId);

    if (!targetCustomerId) {
      return UIMessages.orderNotFound(approveOrderId);
    }

    const step = this.sessionManager.getStep(targetCustomerId);
    if (step !== "awaiting_admin_approval") {
      return UIMessages.orderNotPending(approveOrderId);
    }

    // Double-check payment status via Xendit API
    const paymentData = this.sessionManager.getPaymentMethod(targetCustomerId);
    if (paymentData.invoiceId) {
      try {
        const paymentStatus = await this.xenditService.checkPaymentStatus(
          paymentData.invoiceId
        );

        if (paymentStatus.status !== "SUCCEEDED") {
          this.logger.logSecurity(
            adminId,
            "payment_not_verified",
            "payment_status_mismatch",
            {
              orderId: approveOrderId,
              invoiceId: paymentData.invoiceId,
              status: paymentStatus.status,
            }
          );
          return `❌ *Payment Belum Berhasil*\n\nOrder: ${approveOrderId}\nStatus: ${paymentStatus.status}\n\nTidak bisa approve sebelum payment SUCCEEDED.`;
        }

        console.log(
          `✅ Payment verified for ${approveOrderId}: ${paymentStatus.status}`
        );
      } catch (error) {
        this.logger.logError(adminId, error, {
          orderId: approveOrderId,
          action: "payment_double_check",
        });
        return `⚠️ *Gagal Verifikasi Payment*\n\nError: ${error.message}\n\nSilakan cek manual di dashboard Xendit.`;
      }
    }

    const cart = this.sessionManager.getCart(targetCustomerId);
    const ProductDelivery = require("./productDelivery");
    const productDelivery = new ProductDelivery();
    const deliveryResult = productDelivery.deliverProducts(
      targetCustomerId,
      approveOrderId,
      cart
    );

    if (!deliveryResult.success) {
      this.logger.logError(targetCustomerId, new Error("Delivery failed"), {
        orderId: approveOrderId,
        reason: "no_products_available",
      });
      return UIMessages.deliveryFailed(approveOrderId);
    }

    const customerMessage = productDelivery.formatDeliveryMessage(
      deliveryResult,
      approveOrderId
    );

    // Log admin approval and delivery
    this.logger.logAdminAction(adminId, "approve_order", approveOrderId, {
      customerId: targetCustomerId,
      products: cart.map((p) => p.name),
    });
    this.logger.logDelivery(targetCustomerId, approveOrderId, cart);

    // Decrement stock for delivered products
    const { decrementStock } = require("./config");
    cart.forEach((item) => {
      decrementStock(item.id);
      console.log(`📦 Stock decremented for ${item.id}`);
    });

    this.sessionManager.clearCart(targetCustomerId);
    this.sessionManager.setStep(targetCustomerId, "menu");

    return {
      message: UIMessages.approvalSuccess(approveOrderId),
      deliverToCustomer: true,
      customerId: targetCustomerId,
      customerMessage: customerMessage,
    };
  }
}

module.exports = ChatbotLogic;
