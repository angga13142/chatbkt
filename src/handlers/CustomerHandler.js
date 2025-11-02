/**
 * Customer Handler
 * Handles all customer-facing commands and shopping flow
 */

const BaseHandler = require("./BaseHandler");
const { getProductById, getAllProducts } = require("../../config");
const UIMessages = require("../../lib/uiMessages");
const FuzzySearch = require("../utils/FuzzySearch");
const { SessionSteps } = require("../utils/Constants");
const AIHandler = require("./AIHandler");
const OrderService = require("../services/order/OrderService");
const WishlistService = require("../services/wishlist/WishlistService");
const PromoService = require("../services/promo/PromoService");
const ReviewService = require("../services/review/ReviewService");
const ProductService = require("../services/product/ProductService");

class CustomerHandler extends BaseHandler {
  constructor(sessionManager, paymentHandlers, logger = null) {
    super(sessionManager, logger);
    this.paymentHandlers = paymentHandlers;
    this.aiHandler = new AIHandler(undefined, undefined, logger);
    this.orderService = new OrderService();
    this.wishlistService = new WishlistService(sessionManager);
    this.promoService = new PromoService();
    this.reviewService = new ReviewService();
    this.productService = new ProductService();
  }

  /**
   * Main handler - routes to appropriate method based on step
   */
  async handle(customerId, message, step) {
    console.log(
      `[CustomerHandler] handle() called - Step: ${step}, Message: "${message}"`
    );

    try {
      // Global commands accessible from any step
      if (message === "menu" || message === "help") {
        console.log(`[CustomerHandler] -> Global command: menu/help`);
        await this.setStep(customerId, SessionSteps.MENU);
        return UIMessages.mainMenu();
      }

      if (message === "cart") {
        console.log(`[CustomerHandler] -> Global command: cart`);
        return await this.showCart(customerId);
      }

      if (message === "history" || message === "/history") {
        console.log(`[CustomerHandler] -> Global command: history`);
        return await this.handleOrderHistory(customerId);
      }

      if (
        message === "track" ||
        message === "/track" ||
        message.startsWith("/track ")
      ) {
        console.log(`[CustomerHandler] -> Global command: track`);
        return await this.handleTrackOrder(customerId, message);
      }

      if (message === "wishlist" || message === "/wishlist") {
        console.log(`[CustomerHandler] -> Global command: wishlist`);
        return await this.handleViewWishlist(customerId);
      }

      if (message.startsWith("/review ") || message.startsWith("review ")) {
        console.log(`[CustomerHandler] -> Global command: review`);
        return await this.handleAddReview(customerId, message);
      }

      // Route based on current step
      console.log(`[CustomerHandler] Routing to step-specific handler...`);
      switch (step) {
        case SessionSteps.MENU:
          console.log(`[CustomerHandler] -> handleMenuSelection()`);
          return await this.handleMenuSelection(customerId, message);

        case SessionSteps.BROWSING:
          console.log(`[CustomerHandler] -> handleProductSelection()`);
          return await this.handleProductSelection(customerId, message);

        case SessionSteps.CHECKOUT:
          console.log(`[CustomerHandler] -> handleCheckout()`);
          return await this.handleCheckout(customerId, message);

        case SessionSteps.AWAITING_PAYMENT:
          console.log(`[CustomerHandler] -> handleAwaitingPayment()`);
          return await this.handleAwaitingPayment(customerId, message);

        case SessionSteps.AWAITING_ADMIN_APPROVAL:
          console.log(`[CustomerHandler] -> awaitingAdminApproval()`);
          return UIMessages.awaitingAdminApproval();

        case "awaiting_order_id_for_proof":
          console.log(`[CustomerHandler] -> handleOrderIdForProof()`);
          return await this.handleOrderIdForProof(customerId, message);

        default:
          console.log(`[CustomerHandler] -> default: mainMenu()`);
          return UIMessages.mainMenu();
      }
    } catch (error) {
      console.error(`[CustomerHandler] Error in handle():`, error);
      this.logError(customerId, error, { message, step });
      return "❌ Terjadi kesalahan. Silakan coba lagi atau ketik *menu* untuk kembali ke menu utama.";
    }
  }

  /**
   * Handle main menu selection
   */
  async handleMenuSelection(customerId, message) {
    console.log(
      `[CustomerHandler] handleMenuSelection() - Message: "${message}"`
    );

    if (message === "1" || message === "browse" || message === "products") {
      console.log(`[CustomerHandler] Setting step to BROWSING...`);
      await this.setStep(customerId, SessionSteps.BROWSING);
      console.log(
        `[CustomerHandler] Step set to BROWSING, returning product list`
      );
      return this.showProducts();
    }

    if (message === "2" || message === "cart") {
      console.log(`[CustomerHandler] Showing cart`);
      return await this.showCart(customerId);
    }

    if (message === "3" || message === "about") {
      console.log(`[CustomerHandler] Showing about`);
      return UIMessages.about();
    }

    if (message === "4" || message === "support" || message === "contact") {
      console.log(`[CustomerHandler] Showing contact`);
      return UIMessages.contact();
    }

    console.log(`[CustomerHandler] Invalid option, showing menu`);
    return UIMessages.invalidOption() + "\n\n" + UIMessages.mainMenu();
  }

  /**
   * Show available products
   */
  showProducts() {
    const productList = this.productService.formatProductList(
      this.reviewService
    );
    return UIMessages.browsingInstructions(productList);
  }

  /**
   * Handle product selection during browsing
   */
  async handleProductSelection(customerId, message) {
    console.log(
      `[CustomerHandler] handleProductSelection called: "${message}"`
    );

    const allProducts = getAllProducts();
    console.log(`[CustomerHandler] Total products: ${allProducts.length}`);

    // Try exact match by ID first
    let product = getProductById(message);
    let fuzzyScore = 1.0; // Perfect match

    console.log(
      `[CustomerHandler] Exact match result:`,
      product ? product.id : "null"
    );

    // If not found, try fuzzy search with FuzzySearch utility
    if (!product) {
      console.log(`[CustomerHandler] Trying fuzzy search for: "${message}"`);
      // Use static method with correct parameter order: search(products, query)
      product = FuzzySearch.search(allProducts, message, 5); // threshold = 5

      console.log(
        `[CustomerHandler] Fuzzy search result:`,
        product ? product.id : "null"
      );

      if (product) {
        // Calculate similarity score (1.0 = perfect, 0.0 = no match)
        fuzzyScore = FuzzySearch.similarityRatio(
          product.name.toLowerCase(),
          message.toLowerCase()
        );

        this.log(
          customerId,
          "fuzzy_match",
          `Fuzzy match: "${message}" -> "${
            product.name
          }" (score: ${fuzzyScore.toFixed(2)})`
        );
      }
    }

    // Check if AI should handle this (low confidence or question)
    if (this.aiHandler.shouldHandleMessage(message, fuzzyScore)) {
      this.log(
        customerId,
        "ai_fallback",
        `AI fallback triggered for: "${message}"`
      );

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
      const priceIDR = product.price; // Price is already in IDR

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
      await this.sessionManager.set(customerId, "promoCode", null);
      await this.sessionManager.set(customerId, "discountPercent", 0);
      await this.setStep(customerId, SessionSteps.MENU);

      this.log(customerId, "cart_cleared");

      return {
        message: UIMessages.cartCleared(),
        qrisData: null,
      };
    }

    // Handle promo code: "promo CODE"
    if (message && message.toLowerCase().startsWith("promo ")) {
      const promoCode = message.substring(6).trim();
      return await this.handleApplyPromo(customerId, promoCode);
    }

    return {
      message: UIMessages.checkoutPrompt(),
      qrisData: null,
    };
  }

  /**
   * Apply promo code
   */
  async handleApplyPromo(customerId, promoCode) {
    const validation = this.promoService.validatePromo(promoCode, customerId);

    if (!validation.valid) {
      return {
        message: validation.message,
        qrisData: null,
      };
    }

    // Store promo code in session (don't apply yet, apply at final payment)
    await this.sessionManager.set(
      customerId,
      "promoCode",
      promoCode.toUpperCase()
    );
    await this.sessionManager.set(
      customerId,
      "discountPercent",
      validation.discountPercent
    );

    const cart = await this.sessionManager.getCart(customerId);
    const totalIDR = cart.reduce((sum, item) => sum + item.price, 0);
    const discount = this.promoService.calculateDiscount(
      totalIDR,
      validation.discountPercent
    );

    let response = `✅ *Kode Promo Diterapkan!*\n\n`;
    response += `🎟️ Kode: ${promoCode.toUpperCase()}\n`;
    response += `💰 Diskon: ${validation.discountPercent}%\n\n`;
    response += `━━━━━━━━━━━━━━━━━━\n`;
    response += `💵 Subtotal: Rp ${discount.originalAmount.toLocaleString(
      "id-ID"
    )}\n`;
    response += `🎁 Diskon: -Rp ${discount.discountAmount.toLocaleString(
      "id-ID"
    )}\n`;
    response += `💳 *Total: Rp ${discount.finalAmount.toLocaleString(
      "id-ID"
    )}*\n\n`;
    response += `Ketik *checkout* untuk melanjutkan pembayaran.`;

    this.log(customerId, "promo_applied", {
      promoCode: promoCode.toUpperCase(),
      discountPercent: validation.discountPercent,
      originalAmount: discount.originalAmount,
      finalAmount: discount.finalAmount,
    });

    return {
      message: response,
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

    const totalIDR = cart.reduce((sum, item) => sum + item.price, 0); // Price already in IDR
    const orderId = `ORD-${Date.now()}-${customerId.slice(-4)}`;

    // Apply promo code if exists
    const session = await this.sessionManager.getSession(customerId);
    let promoCode = session.promoCode;
    let discountPercent = session.discountPercent || 0;
    let discountAmount = 0;
    let finalAmount = totalIDR;

    if (promoCode && discountPercent > 0) {
      // Apply promo code (mark as used)
      const applyResult = this.promoService.applyPromo(promoCode, customerId);

      if (applyResult.success) {
        const discount = this.promoService.calculateDiscount(
          totalIDR,
          discountPercent
        );
        discountAmount = discount.discountAmount;
        finalAmount = discount.finalAmount;

        this.log(customerId, "promo_code_applied", {
          promoCode,
          discountPercent,
          originalAmount: totalIDR,
          discountAmount,
          finalAmount,
        });
      } else {
        // Promo validation failed at checkout, clear it
        promoCode = null;
        discountPercent = 0;
        await this.sessionManager.set(customerId, "promoCode", null);
        await this.sessionManager.set(customerId, "discountPercent", 0);
      }
    }

    await this.sessionManager.setOrderId(customerId, orderId);
    await this.setStep(customerId, SessionSteps.SELECT_PAYMENT);

    this.log(customerId, "checkout_initiated", {
      orderId,
      itemCount: cart.length,
      totalIDR: finalAmount,
      promoCode,
      discountAmount,
    });

    const UIMessages = require("../../lib/uiMessages");
    const PaymentMessages = require("../../lib/paymentMessages");

    const orderSummary = UIMessages.orderSummary(
      orderId,
      cart,
      finalAmount,
      promoCode,
      discountAmount
    );
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

  /**
   * Handle order tracking (/track command)
   */
  async handleTrackOrder(customerId, message) {
    try {
      console.log(
        `[CustomerHandler] handleTrackOrder() - Customer: ${customerId}, Message: "${message}"`
      );

      // Parse status filter if provided
      const parts = message.trim().split(/\s+/);
      const statusFilter = parts[1]?.toLowerCase(); // e.g., "/track pending"

      let orders;
      if (
        statusFilter &&
        ["pending", "completed", "awaiting_payment"].includes(statusFilter)
      ) {
        orders = await this.orderService.getOrdersByStatus(
          customerId,
          statusFilter
        );
      } else {
        orders = await this.orderService.getCustomerOrders(customerId);
      }

      return UIMessages.orderList(orders);
    } catch (error) {
      this.logError(customerId, error, { action: "track_order" });
      return "❌ Gagal mengambil riwayat pesanan. Silakan coba lagi nanti.";
    }
  }

  /**
   * Handle Order ID input after screenshot upload
   */
  async handleOrderIdForProof(customerId, message) {
    const fs = require("fs");

    try {
      const orderId = message.trim().toUpperCase();

      // Validate Order ID format (basic check)
      if (!orderId.match(/^ORD-\d+/i)) {
        return (
          "❌ *Format Order ID tidak valid*\n\n" +
          "Order ID harus dalam format: ORD-123456\n\n" +
          "Silakan coba lagi atau ketik *menu* untuk membatalkan."
        );
      }

      // Get temporary proof file
      const tempFilepath = await this.sessionManager.get(
        customerId,
        "tempProofPath"
      );

      if (!tempFilepath || !fs.existsSync(tempFilepath)) {
        await this.setStep(customerId, SessionSteps.MENU);
        return (
          "❌ *Bukti pembayaran tidak ditemukan*\n\n" +
          "Silakan upload ulang screenshot pembayaran Anda.\n\n" +
          "Ketik *menu* untuk kembali."
        );
      }

      // Rename temp file with Order ID
      const finalFilename = `${orderId}-${Date.now()}.jpg`;
      const finalFilepath = `./payment_proofs/${finalFilename}`;

      fs.renameSync(tempFilepath, finalFilepath);
      console.log(`💾 Renamed proof: ${tempFilepath} → ${finalFilepath}`);

      // Clear temp filepath from session
      await this.sessionManager.set(customerId, "tempProofPath", null);

      // Reset to menu step
      await this.setStep(customerId, SessionSteps.MENU);

      // Send confirmation
      const confirmMessage =
        "✅ *Bukti Pembayaran Diterima*\n\n" +
        "Terima kasih! Bukti pembayaran Anda telah kami terima.\n\n" +
        `📋 Order ID: ${orderId}\n\n` +
        "Admin kami akan memverifikasi pembayaran dalam 5-15 menit.\n\n" +
        "Anda akan menerima konfirmasi setelah pembayaran diverifikasi.\n\n" +
        "━━━━━━━━━━━━━━━━━━\n" +
        "💬 Ketik *menu* untuk kembali";

      return confirmMessage;
    } catch (error) {
      this.logError(customerId, error, { action: "order_id_for_proof" });
      await this.setStep(customerId, SessionSteps.MENU);
      return "❌ Gagal memproses bukti pembayaran. Silakan coba lagi atau hubungi admin.";
    }
  }

  /**
   * Handle add product to wishlist
   * Triggered by "simpan <product>" or ⭐ emoji
   * @param {string} customerId
   * @param {string} message
   * @returns {string} Response message
   */
  async handleAddToWishlist(customerId, message) {
    console.log(
      `[CustomerHandler] handleAddToWishlist() - Message: "${message}"`
    );

    try {
      let productName = "";

      // Parse command: "simpan netflix" or "⭐ netflix"
      if (message.startsWith("simpan ")) {
        productName = message.replace("simpan ", "").trim();
      } else if (message.startsWith("⭐")) {
        productName = message.replace("⭐", "").trim();
      } else {
        return "❌ Format salah. Gunakan: *simpan <nama produk>* atau *⭐ <nama produk>*\n\nContoh: simpan netflix";
      }

      if (!productName) {
        return "❌ Nama produk tidak boleh kosong.\n\nContoh: simpan netflix";
      }

      // Find product using fuzzy search
      const allProducts = getAllProducts();
      const product = FuzzySearch.search(allProducts, productName, 3);

      if (!product) {
        return `❌ Produk "${productName}" tidak ditemukan.\n\nKetik *browse* untuk melihat daftar produk.`;
      }

      // Add to wishlist
      const result = await this.wishlistService.addProduct(customerId, product);

      return result.message;
    } catch (error) {
      this.logError(customerId, error, { action: "add_to_wishlist", message });
      return "❌ Gagal menambahkan ke wishlist. Silakan coba lagi atau hubungi admin.";
    }
  }

  /**
   * Handle view wishlist
   * @param {string} customerId
   * @returns {string} Response message
   */
  async handleViewWishlist(customerId) {
    console.log(`[CustomerHandler] handleViewWishlist()`);

    try {
      const wishlist = await this.wishlistService.getWishlist(customerId);

      if (wishlist.length === 0) {
        return (
          "⭐ *Wishlist Anda*\n\n" +
          "Wishlist Anda masih kosong.\n\n" +
          "━━━━━━━━━━━━━━━━━━\n" +
          "*Cara Menambahkan:*\n" +
          "• Ketik: *simpan <nama produk>*\n" +
          "• Atau: *⭐ <nama produk>*\n\n" +
          "Contoh:\n" +
          "• simpan netflix\n" +
          "• ⭐ spotify\n\n" +
          "━━━━━━━━━━━━━━━━━━\n" +
          "💬 Ketik *browse* untuk melihat produk"
        );
      }

      return UIMessages.wishlistView(wishlist);
    } catch (error) {
      this.logError(customerId, error, { action: "view_wishlist" });
      return "❌ Gagal menampilkan wishlist. Silakan coba lagi atau hubungi admin.";
    }
  }

  /**
   * Handle remove from wishlist
   * @param {string} customerId
   * @param {string} productId
   * @returns {string} Response message
   */
  async handleRemoveFromWishlist(customerId, productId) {
    console.log(
      `[CustomerHandler] handleRemoveFromWishlist() - Product ID: ${productId}`
    );

    try {
      const result = await this.wishlistService.removeProduct(
        customerId,
        productId
      );
      return result.message;
    } catch (error) {
      this.logError(customerId, error, {
        action: "remove_from_wishlist",
        productId,
      });
      return "❌ Gagal menghapus dari wishlist. Silakan coba lagi atau hubungi admin.";
    }
  }

  /**
   * Handle move wishlist item to cart
   * @param {string} customerId
   * @param {string} productId
   * @returns {string} Response message
   */
  async handleMoveToCart(customerId, productId) {
    console.log(
      `[CustomerHandler] handleMoveToCart() - Product ID: ${productId}`
    );

    try {
      const result = await this.wishlistService.moveToCart(
        customerId,
        productId
      );
      return result.message;
    } catch (error) {
      this.logError(customerId, error, { action: "move_to_cart", productId });
      return "❌ Gagal memindahkan ke keranjang. Silakan coba lagi atau hubungi admin.";
    }
  }

  /**
   * Handle add product review
   * Command: /review <product-name> <rating> <review-text>
   * Example: /review netflix 5 Mantap banget!
   * @param {string} customerId
   * @param {string} message
   * @returns {string} Response message
   */
  handleAddReview(customerId, message) {
    console.log(`[CustomerHandler] handleAddReview() - Message: "${message}"`);

    try {
      // Parse command: /review netflix 5 Mantap!
      const parts = message.trim().replace(/^\//, "").split(/\s+/);

      if (parts.length < 4) {
        return (
          "❌ *Format salah!*\n\n" +
          "*Format:* `/review <produk> <rating> <komentar>`\n\n" +
          "*Contoh:*\n" +
          "• /review netflix 5 Bagus sekali!\n" +
          "• /review spotify 4 Mantap, lancar\n\n" +
          "*Rating:* 1-5 bintang ⭐"
        );
      }

      // Extract product name, rating, and review text
      const productName = parts[1];
      const ratingStr = parts[2];
      const reviewText = parts.slice(3).join(" ");

      // Validate rating
      const rating = parseInt(ratingStr);
      if (isNaN(rating) || rating < 1 || rating > 5) {
        return (
          "❌ *Rating tidak valid!*\n\n" +
          "Rating harus berupa angka 1-5\n\n" +
          "Contoh: /review netflix *5* Mantap!"
        );
      }

      // Find product using fuzzy search
      const allProducts = getAllProducts();
      const product = FuzzySearch.search(allProducts, productName, 3);

      if (!product) {
        return (
          `❌ *Produk "${productName}" tidak ditemukan*\n\n` +
          "Ketik *browse* untuk melihat daftar produk."
        );
      }

      // OPTIONAL: Verify purchase (check if customer has ordered this product)
      // Uncomment if you want to enforce purchase verification
      /*
      const orders = await this.orderService.getCustomerOrders(customerId);
      const hasPurchased = orders.some(order => 
        order.items?.some(item => item.id === product.id) &&
        order.rawStatus === 'completed'
      );

      if (!hasPurchased) {
        return (
          "❌ *Anda belum membeli produk ini*\n\n" +
          "Hanya customer yang sudah membeli produk yang dapat memberikan review.\n\n" +
          "Ketik *browse* untuk mulai berbelanja."
        );
      }
      */

      // Add review
      const result = this.reviewService.addReview(
        product.id,
        customerId,
        rating,
        reviewText,
        null // orderId optional
      );

      if (!result.success) {
        return result.message;
      }

      // Show success message with product info
      const stars = "⭐".repeat(rating);
      const avgRating = this.reviewService.getAverageRating(product.id);

      let response = result.message + "\n\n";
      response += `📦 *${product.name}*\n`;
      response += `${stars} ${rating}/5\n`;
      response += `💬 "${reviewText}"\n\n`;
      response += `━━━━━━━━━━━━━━━━━━\n`;
      response += `📊 *Rating Produk:*\n`;
      response += `${
        avgRating.count > 1
          ? "⭐ " + avgRating.average + "/5.0"
          : "⭐ " + avgRating.average + "/5.0"
      } (${avgRating.count} review${avgRating.count > 1 ? "s" : ""})`;

      this.log(customerId, "review_added", {
        productId: product.id,
        productName: product.name,
        rating,
        reviewId: result.reviewId,
      });

      return response;
    } catch (error) {
      this.logError(customerId, error, { action: "add_review", message });
      return "❌ Gagal menambahkan review. Silakan coba lagi atau hubungi admin.";
    }
  }
}

module.exports = CustomerHandler;
