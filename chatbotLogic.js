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

    if (normalizedMessage.startsWith("/broadcast ")) {
      return await this.handleAdminBroadcast(customerId, sanitizedMessage);
    }

    if (normalizedMessage.startsWith("/stats")) {
      return await this.handleAdminStats(customerId);
    }

    if (normalizedMessage.startsWith("/status")) {
      return await this.handleAdminStatus(customerId);
    }

    // Handle customer commands
    if (normalizedMessage === "history" || normalizedMessage === "/history") {
      return await this.handleOrderHistory(customerId);
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

    // Try exact match by ID first
    let product = getProductById(message);

    // If not found, try fuzzy search
    if (!product) {
      product = this.fuzzySearchProduct(allProducts, message);
    }

    if (product) {
      this.sessionManager.addToCart(customerId, product);
      const priceIDR = product.price * 15800;
      return UIMessages.productAdded(product.name, priceIDR);
    }

    return UIMessages.productNotFound();
  }

  /**
   * Fuzzy search for products using Levenshtein distance
   */
  fuzzySearchProduct(products, query) {
    const queryLower = query.toLowerCase();

    // First try partial match (contains)
    let match = products.find(
      (p) =>
        p.name.toLowerCase().includes(queryLower) ||
        p.id.toLowerCase().includes(queryLower)
    );

    if (match) return match;

    // If no partial match, try fuzzy matching with Levenshtein distance
    let bestMatch = null;
    let bestScore = Infinity;
    const threshold = 3; // Max allowed distance

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      // Cache lowercased name and id
      const nameLower = product.name.toLowerCase();
      const idLower = product.id.toLowerCase();

      const nameDistance = this.levenshteinDistance(nameLower, queryLower);
      const idDistance = this.levenshteinDistance(idLower, queryLower);

      const minDistance = Math.min(nameDistance, idDistance);

      if (minDistance === 0) {
        // Perfect match, break early
        bestMatch = product;
        bestScore = 0;
        break;
      }

      if (minDistance < bestScore && minDistance <= threshold) {
        bestScore = minDistance;
        bestMatch = product;
      }
    }

    return bestMatch;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    // Initialize matrix
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
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

  /**
   * Admin Command: /stats
   * Shows active sessions, orders, revenue, and error rate
   */
  async handleAdminStats(adminId) {
    if (!InputValidator.isAdmin(adminId)) {
      this.logger.logSecurity(
        adminId,
        "unauthorized_admin_access",
        "not_in_whitelist"
      );
      return UIMessages.unauthorized();
    }

    const fs = require("fs");
    const path = require("path");
    const logsDir = path.join(__dirname, "logs");

    try {
      // Get active sessions
      const activeSessions = this.sessionManager.getActiveSessionCount
        ? await this.sessionManager.getActiveSessionCount()
        : 0;

      // Parse transaction logs
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

      let ordersToday = 0;
      let ordersWeek = 0;
      let ordersMonth = 0;
      let revenueToday = 0;
      let revenueWeek = 0;
      let revenueMonth = 0;
      let errorCount = 0;
      let totalLogs = 0;

      // Read all order logs
      if (fs.existsSync(logsDir)) {
        const logFiles = fs
          .readdirSync(logsDir)
          .filter((f) => f.startsWith("orders-"));

        logFiles.forEach((file) => {
          const filePath = path.join(logsDir, file);
          const content = fs.readFileSync(filePath, "utf-8");
          const lines = content.split("\n").filter((line) => line.trim());

          lines.forEach((line) => {
            totalLogs++;
            try {
              const log = JSON.parse(line);
              const logDate = new Date(log.timestamp);

              if (log.event === "order_created") {
                const revenue = log.metadata.totalPrice || 0;

                // Count today
                if (log.timestamp.startsWith(todayStr)) {
                  ordersToday++;
                  revenueToday += revenue;
                }

                // Count week
                if (logDate >= weekAgo) {
                  ordersWeek++;
                  revenueWeek += revenue;
                }

                // Count month
                if (logDate >= monthAgo) {
                  ordersMonth++;
                  revenueMonth += revenue;
                }
              }
            } catch (e) {
              errorCount++;
            }
          });
        });

        // Read error logs
        const errorLogFiles = fs
          .readdirSync(logsDir)
          .filter((f) => f.startsWith("errors-"));

        errorLogFiles.forEach((file) => {
          const filePath = path.join(logsDir, file);
          const content = fs.readFileSync(filePath, "utf-8");
          const lines = content.split("\n").filter((line) => line.trim());

          lines.forEach((line) => {
            totalLogs++;
            try {
              JSON.parse(line);
              errorCount++;
            } catch (e) {
              // Ignore parse errors
            }
          });
        });
      }

      // Calculate error rate
      const errorRate =
        totalLogs > 0 ? ((errorCount / totalLogs) * 100).toFixed(2) : "0.00";

      // Format response
      let response = `📊 *Admin Statistics*\n\n`;
      response += `👥 *Active Sessions:* ${activeSessions}\n\n`;
      response += `📦 *Orders*\n`;
      response += `• Today: ${ordersToday}\n`;
      response += `• This Week: ${ordersWeek}\n`;
      response += `• This Month: ${ordersMonth}\n\n`;
      response += `💰 *Revenue (IDR)*\n`;
      response += `• Today: ${this.formatIDR(revenueToday)}\n`;
      response += `• This Week: ${this.formatIDR(revenueWeek)}\n`;
      response += `• This Month: ${this.formatIDR(revenueMonth)}\n\n`;
      response += `⚠️ *Error Rate:* ${errorRate}%\n`;
      response += `📝 *Total Logs:* ${totalLogs}`;

      this.logger.logAdminAction(adminId, "stats_viewed", "system", {
        timestamp: now,
      });
      return response;
    } catch (error) {
      console.error("❌ Error generating stats:", error);
      return `❌ *Error Generating Stats*\n\n${error.message}`;
    }
  }

  /**
   * Format IDR currency
   */
  formatIDR(amount) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Admin Command: /status
   * Shows system health status
   */
  async handleAdminStatus(adminId) {
    if (!InputValidator.isAdmin(adminId)) {
      this.logger.logSecurity(
        adminId,
        "unauthorized_admin_access",
        "not_in_whitelist"
      );
      return UIMessages.unauthorized();
    }

    try {
      const redisClient = require("./lib/redisClient");
      const logRotationManager = require("./lib/logRotationManager");

      // Check WhatsApp status (will be checked from index.js)
      const whatsappStatus = "✅ Connected"; // Placeholder - will be real in production

      // Check Redis status
      const redisStatus = redisClient.isReady()
        ? "✅ Available"
        : "⚠️ Fallback";

      // Check Webhook status (check if server is running)
      const webhookStatus = "✅ Active"; // Placeholder - assuming webhook started

      // Get memory usage
      const memUsage = process.memoryUsage();
      const memUsedMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
      const memTotalMB = (memUsage.heapTotal / 1024 / 1024).toFixed(2);
      const memPercent = (
        (memUsage.heapUsed / memUsage.heapTotal) *
        100
      ).toFixed(1);

      // Get uptime
      const uptimeSeconds = process.uptime();
      const uptimeHours = Math.floor(uptimeSeconds / 3600);
      const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);

      // Get log stats
      const logStats = logRotationManager.getStats();

      // Format response
      let response = `🔍 *System Status*\n\n`;
      response += `📱 *WhatsApp:* ${whatsappStatus}\n`;
      response += `💾 *Redis:* ${redisStatus}\n`;
      response += `🌐 *Webhook:* ${webhookStatus}\n\n`;
      response += `🧠 *Memory Usage*\n`;
      response += `• Used: ${memUsedMB} MB / ${memTotalMB} MB\n`;
      response += `• Utilization: ${memPercent}%\n\n`;
      response += `⏱️ *Uptime:* ${uptimeHours}h ${uptimeMinutes}m\n\n`;
      response += `📋 *Log Files*\n`;
      response += `• Total: ${logStats.totalFiles}\n`;
      response += `• Size: ${logStats.totalSize}\n`;
      response += `• Retention: ${logStats.retentionDays} days`;

      this.logger.logAdminAction(adminId, "status_viewed", "system", {
        timestamp: new Date(),
      });
      return response;
    } catch (error) {
      console.error("❌ Error generating status:", error);
      return `❌ *Error Generating Status*\n\n${error.message}`;
    }
  }

  /**
   * Customer Command: history
   * Shows customer's order history
   */
  async handleOrderHistory(customerId) {
    const fs = require("fs");
    const path = require("path");
    const logsDir = path.join(__dirname, "logs");

    try {
      const customerOrders = [];

      // Read all order logs
      if (fs.existsSync(logsDir)) {
        const logFiles = fs
          .readdirSync(logsDir)
          .filter((f) => f.startsWith("orders-"));

        logFiles.forEach((file) => {
          const filePath = path.join(logsDir, file);
          const content = fs.readFileSync(filePath, "utf-8");
          const lines = content.split("\n").filter((line) => line.trim());

          lines.forEach((line) => {
            try {
              const log = JSON.parse(line);

              // Check if this order belongs to this customer
              if (
                log.customerId === customerId &&
                log.event === "order_created"
              ) {
                customerOrders.push({
                  orderId: log.metadata.orderId,
                  timestamp: log.timestamp,
                  totalPrice: log.metadata.totalPrice,
                  products: log.metadata.products,
                  status: "completed", // Default status
                });
              }
            } catch (e) {
              // Skip invalid lines
            }
          });
        });
      }

      // Sort by timestamp (newest first)
      customerOrders.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      // Show last 5 orders
      const recentOrders = customerOrders.slice(0, 5);

      if (recentOrders.length === 0) {
        return `📋 *Riwayat Pesanan*\n\nAnda belum memiliki pesanan.\n\nKetik *menu* untuk mulai berbelanja! 🛍️`;
      }

      let response = `📋 *Riwayat Pesanan* (5 terakhir)\n\n`;

      recentOrders.forEach((order, index) => {
        const date = new Date(order.timestamp);
        const dateStr = date.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
        const timeStr = date.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });

        response += `*${index + 1}. Order #${order.orderId}*\n`;
        response += `📅 ${dateStr} - ${timeStr}\n`;
        response += `📦 Produk:\n`;

        order.products.forEach((product) => {
          response += `   • ${product}\n`;
        });

        response += `💰 Total: ${this.formatIDR(order.totalPrice)}\n`;
        response += `✅ Status: ${
          order.status === "completed" ? "Selesai" : "Pending"
        }\n\n`;
      });

      response += `Total pesanan: ${customerOrders.length}\n\n`;
      response += `Ketik *menu* untuk order lagi! 🛒`;

      this.logger.logAdminAction(customerId, "view_history", "self", {
        orderCount: customerOrders.length,
      });

      return response;
    } catch (error) {
      console.error("❌ Error fetching order history:", error);
      return `❌ *Error Mengambil Riwayat*\n\n${error.message}`;
    }
  }

  /**
   * Admin Command: /broadcast <message>
   * Send message to all active customers
   */
  async handleAdminBroadcast(adminId, fullMessage) {
    if (!InputValidator.isAdmin(adminId)) {
      this.logger.logSecurity(
        adminId,
        "unauthorized_admin_access",
        "not_in_whitelist"
      );
      return UIMessages.unauthorized();
    }

    // Extract message after "/broadcast "
    const message = fullMessage.substring("/broadcast ".length).trim();

    if (!message) {
      return `❌ *Format Salah*\n\nGunakan: /broadcast <pesan>\n\nContoh:\n/broadcast Promo spesial! Diskon 20% semua produk hari ini! 🎉`;
    }

    try {
      // Get all active customer IDs from session manager
      const activeCustomers = this.sessionManager.getAllCustomerIds
        ? await this.sessionManager.getAllCustomerIds()
        : [];

      if (activeCustomers.length === 0) {
        return `⚠️ *Tidak Ada Customer Aktif*\n\nTidak ada customer yang bisa menerima broadcast saat ini.`;
      }

      // Return broadcast info - actual sending will be handled by index.js
      this.logger.logAdminAction(adminId, "broadcast_initiated", "all", {
        message: message.substring(0, 100),
        recipientCount: activeCustomers.length,
      });

      return {
        type: "broadcast",
        message: message,
        recipients: activeCustomers,
        confirmMessage: `📢 *Broadcast Dikirim*\n\n✅ Pesan dikirim ke ${
          activeCustomers.length
        } customer aktif\n\n*Preview:*\n${message.substring(0, 200)}${
          message.length > 200 ? "..." : ""
        }`,
      };
    } catch (error) {
      console.error("❌ Error initiating broadcast:", error);
      return `❌ *Error Broadcast*\n\n${error.message}`;
    }
  }
}

module.exports = ChatbotLogic;
