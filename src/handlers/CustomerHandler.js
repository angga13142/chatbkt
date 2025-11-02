/**
 * Customer Handler
 * Handles all customer-facing commands and shopping flow
 */

const BaseHandler = require("./BaseHandler");
const {
  formatProductList,
  getProductById,
  getAllProducts,
} = require("../../config");
const UIMessages = require("../../lib/uiMessages");
const FuzzySearch = require("../utils/FuzzySearch");
const { SessionSteps } = require("../utils/Constants");
const AIHandler = require("./AIHandler");

class CustomerHandler extends BaseHandler {
  constructor(sessionManager, paymentHandlers, logger = null) {
    super(sessionManager, logger);
    this.paymentHandlers = paymentHandlers;
    this.aiHandler = new AIHandler(undefined, undefined, logger);
    this.fuzzySearch = new FuzzySearch();
  }

  /**
   * Main handler - routes to appropriate method based on step
   */
  async handle(customerId, message, step) {
    try {
      // Global commands accessible from any step
      if (message === "menu" || message === "help") {
        await this.setStep(customerId, SessionSteps.MENU);
        return UIMessages.mainMenu();
      }

      if (message === "cart") {
        return await this.showCart(customerId);
      }

      if (message === "history" || message === "/history") {
        return await this.handleOrderHistory(customerId);
      }

      // Route based on current step
      switch (step) {
        case SessionSteps.MENU:
          return await this.handleMenuSelection(customerId, message);

        case SessionSteps.BROWSING:
          return await this.handleProductSelection(customerId, message);

        case SessionSteps.CHECKOUT:
          return await this.handleCheckout(customerId, message);

        case SessionSteps.AWAITING_PAYMENT:
          return await this.handleAwaitingPayment(customerId, message);

        case SessionSteps.AWAITING_ADMIN_APPROVAL:
          return UIMessages.awaitingAdminApproval();

        default:
          return UIMessages.mainMenu();
      }
    } catch (error) {
      this.logError(customerId, error, { message, step });
      return "❌ Terjadi kesalahan. Silakan coba lagi atau ketik *menu* untuk kembali ke menu utama.";
    }
  }

  /**
   * Handle main menu selection
   */
  async handleMenuSelection(customerId, message) {
    if (message === "1" || message === "browse" || message === "products") {
      await this.setStep(customerId, SessionSteps.BROWSING);
      return this.showProducts();
    }

    if (message === "2" || message === "cart") {
      return await this.showCart(customerId);
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
   * Handle product selection during browsing
   */
  async handleProductSelection(customerId, message) {
    const allProducts = getAllProducts();

    // Try exact match by ID first
    let product = getProductById(message);
    let fuzzyScore = 1.0; // Perfect match

    // If not found, try fuzzy search
    if (!product) {
      const fuzzyResults = this.fuzzySearch.search(message, allProducts);

      if (fuzzyResults.length > 0) {
        product = fuzzyResults[0].item;
        fuzzyScore = fuzzyResults[0].score;

        this.logInfo(
          customerId,
          `Fuzzy match: "${message}" -> "${
            product.name
          }" (score: ${fuzzyScore.toFixed(2)})`
        );
      }
    }

    // Check if AI should handle this (low confidence or question)
    if (this.aiHandler.shouldHandleMessage(message, fuzzyScore)) {
      this.logInfo(customerId, `AI fallback triggered for: "${message}"`);

      const cart = await this.sessionManager.getCart(customerId);
      const aiResponse = await this.aiHandler.handleFallback({
        customerId,
        message,
        context: {
          step: SessionSteps.BROWSING,
          cart,
        },
      });

      return aiResponse;
    }

    // Product found with good confidence
    if (product) {
      await this.sessionManager.addToCart(customerId, product);
      const priceIDR = product.price * 15800;

      this.log(customerId, "product_added_to_cart", {
        productId: product.id,
        productName: product.name,
        priceIDR,
        fuzzyScore,
      });

      return UIMessages.productAdded(product.name, priceIDR);
    }

    // No product found and AI didn't help
    this.log(customerId, "product_not_found", { query: message });
    return UIMessages.productNotFound();
  }

  /**
   * Show cart contents
   */
  async showCart(customerId) {
    const cart = await this.sessionManager.getCart(customerId);

    if (cart.length === 0) {
      return UIMessages.emptyCart();
    }

    const total = cart.reduce((sum, item) => sum + item.price, 0);
    await this.setStep(customerId, SessionSteps.CHECKOUT);

    this.log(customerId, "cart_viewed", {
      itemCount: cart.length,
      totalUSD: total,
    });

    return UIMessages.cartView(cart, total);
  }

  /**
   * Handle checkout process
   */
  async handleCheckout(customerId, message) {
    if (message === "checkout" || message === "buy" || message === "order") {
      return await this.processCheckout(customerId);
    }

    if (message === "clear") {
      await this.sessionManager.clearCart(customerId);
      await this.setStep(customerId, SessionSteps.MENU);

      this.log(customerId, "cart_cleared");

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
  async processCheckout(customerId) {
    const cart = await this.sessionManager.getCart(customerId);

    if (cart.length === 0) {
      return {
        message: UIMessages.emptyCart(),
        qrisData: null,
      };
    }

    // Check stock availability
    const { isInStock } = require("../../config");
    const outOfStockItems = cart.filter((item) => !isInStock(item.id));

    if (outOfStockItems.length > 0) {
      const itemNames = outOfStockItems.map((item) => item.name).join(", ");

      this.log(customerId, "checkout_failed_out_of_stock", {
        items: outOfStockItems.map((i) => i.id),
      });

      return {
        message: `❌ *Stok Habis*\n\nMaaf, produk berikut tidak tersedia:\n${itemNames}\n\nSilakan hapus dari keranjang dengan ketik *clear* dan pilih produk lain.`,
        qrisData: null,
      };
    }

    const totalUSD = cart.reduce((sum, item) => sum + item.price, 0);
    const orderId = `ORD-${Date.now()}-${customerId.slice(-4)}`;

    await this.sessionManager.setOrderId(customerId, orderId);
    await this.setStep(customerId, SessionSteps.SELECT_PAYMENT);

    const XenditService = require("../../services/xenditService");
    const totalIDR = XenditService.convertToIDR(totalUSD);

    this.log(customerId, "checkout_initiated", {
      orderId,
      itemCount: cart.length,
      totalUSD,
      totalIDR,
    });

    const UIMessages = require("../../lib/uiMessages");
    const PaymentMessages = require("../../lib/paymentMessages");

    const orderSummary = UIMessages.orderSummary(orderId, cart, totalIDR);
    const paymentMenu = PaymentMessages.paymentMethodSelection(orderId);

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

    const PaymentMessages = require("../../lib/paymentMessages");
    return PaymentMessages.awaitingPayment();
  }

  /**
   * Handle order history request
   */
  async handleOrderHistory(customerId) {
    const TransactionLogger = require("../../lib/transactionLogger");
    const logger = new TransactionLogger();

    try {
      const history = await logger.getCustomerOrders(customerId);

      if (!history || history.length === 0) {
        return "📋 *Riwayat Pesanan*\n\nAnda belum memiliki riwayat pesanan.\n\nKetik *menu* untuk mulai berbelanja!";
      }

      let message = "📋 *Riwayat Pesanan Anda*\n\n";

      history.slice(0, 5).forEach((order, index) => {
        const date = new Date(order.timestamp).toLocaleDateString("id-ID");
        const status = order.status || "pending";
        const statusEmoji =
          status === "paid" ? "✅" : status === "pending" ? "⏳" : "❌";

        message += `${index + 1}. ${statusEmoji} ${order.orderId}\n`;
        message += `   📅 ${date}\n`;
        message += `   💰 Rp ${order.totalIDR.toLocaleString("id-ID")}\n`;
        message += `   📦 ${order.items?.length || 0} item(s)\n\n`;
      });

      if (history.length > 5) {
        message += `_Menampilkan 5 pesanan terakhir dari ${history.length} total pesanan_\n\n`;
      }

      message += "Ketik *menu* untuk kembali ke menu utama.";

      return message;
    } catch (error) {
      this.logError(customerId, error, { action: "order_history" });
      return "❌ Gagal mengambil riwayat pesanan. Silakan coba lagi nanti.";
    }
  }
}

module.exports = CustomerHandler;
