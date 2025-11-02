/**
 * Admin Handler
 * Handles all admin commands and system management
 */

const BaseHandler = require("./BaseHandler");
const InputValidator = require("../../lib/inputValidator");
const UIMessages = require("../../lib/uiMessages");
const AIHandler = require("./AIHandler");
const AdminStatsService = require("../services/admin/AdminStatsService");
const AdminInventoryHandler = require("./AdminInventoryHandler");
const AdminPromoHandler = require("./AdminPromoHandler");
const PromoService = require("../services/promo/PromoService");
const ReviewService = require("../services/review/ReviewService");
const DashboardService = require("../services/analytics/DashboardService");

class AdminHandler extends BaseHandler {
  constructor(sessionManager, xenditService, logger = null) {
    super(sessionManager, logger);
    this.xenditService = xenditService;
    this.aiHandler = new AIHandler(undefined, undefined, logger);
    this.statsService = new AdminStatsService();
    this.inventoryHandler = new AdminInventoryHandler(sessionManager, logger);
    this.promoService = new PromoService();
    this.promoHandler = new AdminPromoHandler(
      sessionManager,
      this.promoService,
      logger
    );
    this.reviewService = new ReviewService();
    this.dashboardService = new DashboardService(logger);
  }

  /**
   * Main handler - routes admin commands
   */
  async handle(adminId, message) {
    // Check admin authorization
    if (!InputValidator.isAdmin(adminId)) {
      this.logger.logSecurity(
        adminId,
        "unauthorized_admin_access",
        "not_in_whitelist"
      );
      return UIMessages.unauthorized();
    }

    try {
      // Route to appropriate admin command handler
      if (message.startsWith("/approve ")) {
        return await this.handleApprove(adminId, message);
      }

      if (message.startsWith("/broadcast ")) {
        return await this.handleBroadcast(adminId, message);
      }

      if (message.startsWith("/stats")) {
        const parts = message.split(/\s+/);
        const days = parts.length > 1 ? parseInt(parts[1]) || 30 : 30;
        return await this.handleStats(adminId, days);
      }

      if (message.startsWith("/status")) {
        return this.handleStatus(adminId);
      }

      if (message.startsWith("/stock")) {
        return this.handleStock(adminId, message);
      }

      if (message.startsWith("/addproduct")) {
        return await this.handleAddProduct(adminId, message);
      }

      if (message.startsWith("/editproduct")) {
        return this.handleEditProduct(adminId, message);
      }

      if (message.startsWith("/removeproduct")) {
        return this.handleRemoveProduct(adminId, message);
      }

      if (message.startsWith("/settings")) {
        return await this.handleSettings(adminId, message);
      }

      if (message.startsWith("/generate-desc")) {
        return await this.handleGenerateDescription(adminId, message);
      }

      if (message.startsWith("/addstock-bulk ")) {
        return await this.inventoryHandler.handleAddStockBulk(adminId, message);
      }

      if (message.startsWith("/addstock ")) {
        return await this.inventoryHandler.handleAddStock(adminId, message);
      }

      if (message.startsWith("/stockreport")) {
        return await this.inventoryHandler.handleStockReport(adminId);
      }

      if (message.startsWith("/salesreport")) {
        return await this.inventoryHandler.handleSalesReport(adminId, message);
      }

      if (message.startsWith("/createpromo ")) {
        return this.promoHandler.handleCreatePromo(adminId, message);
      }

      if (message.startsWith("/listpromos")) {
        return this.promoHandler.handleListPromos(adminId);
      }

      if (message.startsWith("/deletepromo ")) {
        return this.promoHandler.handleDeletePromo(adminId, message);
      }

      if (message.startsWith("/promostats ")) {
        return this.promoHandler.handlePromoStats(adminId, message);
      }

      if (message.startsWith("/reviews ")) {
        return this.handleViewReviews(adminId, message);
      }

      if (message === "/reviewstats") {
        return this.handleReviewStats(adminId);
      }

      if (message.startsWith("/deletereview ")) {
        return this.handleDeleteReview(adminId, message);
      }

      // Check if admin is in bulk add mode
      const step = await this.sessionManager.getStep(adminId);
      if (step === "admin_bulk_add") {
        return await this.inventoryHandler.processBulkAdd(adminId, message);
      }

      // Unknown admin command
      return this.showAdminHelp();
    } catch (error) {
      this.logError(adminId, error, { command: message });
      return `❌ Terjadi kesalahan saat menjalankan command admin.\n\n${error.message}`;
    }
  }

  /**
   * /approve <orderId> - Approve manual payment
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
    const deliveryResult = productDelivery.deliverProducts(
      customerId,
      orderId,
      cart
    );

    if (!deliveryResult.success) {
      this.logError(customerId, new Error("Delivery failed"), {
        orderId,
        reason: "no_products_available",
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
    });

    // Decrement stock
    const { decrementStock } = require("../../config");
    cart.forEach((item) => {
      decrementStock(item.id);
      console.log(`📦 Stock decremented for ${item.id}`);
    });

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

  /**
   * /stats - Show statistics (orders, revenue, active sessions)
   */
  async handleStats(adminId, days = 30) {
    try {
      // Get basic stats (existing)
      const basicStats = await this.statsService.getStats(this.sessionManager);

      // Get enhanced dashboard data
      const dashboard = this.dashboardService.getDashboardData(days);

      // Build enhanced stats message
      let response = "📊 *ADMIN DASHBOARD*\n\n";

      // === SALES OVERVIEW ===
      response += "💰 *Sales Overview* (Last " + days + " Days)\n";
      response += "━━━━━━━━━━━━━━━━━━\n";
      response += `📦 Total Orders: ${dashboard.sales.totalOrders}\n`;
      response += `✅ Completed: ${dashboard.sales.completedOrders}\n`;
      response += `⏳ Pending: ${dashboard.sales.pendingOrders}\n`;
      response += `💵 Total Revenue: ${this._formatIDR(
        dashboard.sales.totalRevenue
      )}\n`;
      response += `📈 Avg Order: ${this._formatIDR(
        dashboard.sales.avgOrderValue
      )}\n`;
      response += `✔️ Completion Rate: ${dashboard.sales.completionRate}%\n\n`;

      // === REVENUE BY PAYMENT METHOD ===
      if (dashboard.revenue.total > 0) {
        response += "💳 *Revenue by Payment Method*\n";
        response += "━━━━━━━━━━━━━━━━━━\n";
        response += this.dashboardService.generateBarChart(
          dashboard.revenue,
          15
        );
        response += "\n";
        response += `📊 Total: ${this._formatIDR(dashboard.revenue.total)}\n\n`;
      }

      // === TOP 5 PRODUCTS ===
      if (dashboard.topProducts.length > 0) {
        response += "🏆 *Top 5 Best-Selling Products*\n";
        response += "━━━━━━━━━━━━━━━━━━\n";
        dashboard.topProducts.forEach((product, index) => {
          response += `${index + 1}. ${product.productName}\n`;
          response += `   • Sold: ${product.unitsSold} units\n`;
          response += `   • Revenue: ${this._formatIDR(product.revenue)}\n`;
          if (index < dashboard.topProducts.length - 1) response += "\n";
        });
        response += "\n\n";
      }

      // === CUSTOMER RETENTION ===
      response += "👥 *Customer Retention*\n";
      response += "━━━━━━━━━━━━━━━━━━\n";
      response += `📊 Total Customers: ${dashboard.retention.totalCustomers}\n`;
      response += `🆕 First-time: ${dashboard.retention.firstTimeCustomers}\n`;
      response += `🔁 Repeat: ${dashboard.retention.repeatCustomers}\n`;
      response += `📈 Retention Rate: ${dashboard.retention.retentionRate}%\n`;
      response += `📊 Avg Orders/Customer: ${dashboard.retention.avgOrdersPerCustomer}\n\n`;

      // === QUICK STATS (from existing) ===
      response += "⚡ *Quick Stats*\n";
      response += "━━━━━━━━━━━━━━━━━━\n";
      response += `👥 Active Sessions: ${basicStats.activeSessions}\n`;
      response += `🛒 Active Carts: ${basicStats.activeCarts}\n`;
      response += `⏰ Pending Payments: ${basicStats.pendingPayments}\n\n`;

      response += "━━━━━━━━━━━━━━━━━━\n";
      response += `📅 Period: Last ${days} days\n`;
      response += `⏱️ Generated: ${new Date().toLocaleString("id-ID")}\n\n`;
      response += "💡 Use */stats 7* for last 7 days\n";
      response += "💡 Use */stats 90* for last 90 days";

      this.log(adminId, "stats_viewed", { days });
      return response;
    } catch (error) {
      this.logError(adminId, error, { action: "stats" });
      return `❌ *Error Generating Stats*\n\n${error.message}`;
    }
  }

  /**
   * /status - Show system status
   */
  handleStatus(adminId) {
    try {
      const redisClient = require("../../lib/redisClient");
      const logRotationManager = require("../../lib/logRotationManager");

      const whatsappStatus = "✅ Connected";
      const redisStatus = redisClient.isReady()
        ? "✅ Available"
        : "⚠️ Fallback";
      const webhookStatus = "✅ Active";

      // Memory usage
      const memUsage = process.memoryUsage();
      const memUsedMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
      const memTotalMB = (memUsage.heapTotal / 1024 / 1024).toFixed(2);
      const memPercent = (
        (memUsage.heapUsed / memUsage.heapTotal) *
        100
      ).toFixed(1);

      // Uptime
      const uptimeSeconds = process.uptime();
      const uptimeHours = Math.floor(uptimeSeconds / 3600);
      const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);

      // Log stats
      const logStats = logRotationManager.getStats();

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

      this.log(adminId, "status_viewed");
      return response;
    } catch (error) {
      this.logError(adminId, error, { action: "status" });
      return `❌ *Error Generating Status*\n\n${error.message}`;
    }
  }

  /**
   * /stock [productId] [quantity] - Manage product stock
   */
  handleStock(adminId, message) {
    const parts = message.split(/\s+/);

    // Show all stock
    if (parts.length === 1) {
      return this.showAllStock();
    }

    // Update stock
    if (parts.length === 3) {
      const [, productId, quantity] = parts;
      const { setStock } = require("../../config");
      const result = setStock(productId.toLowerCase(), quantity);

      if (result.success) {
        this.log(adminId, "stock_update", {
          productId,
          oldStock: result.oldStock,
          newStock: result.newStock,
        });

        return (
          `✅ *Stok Berhasil Diupdate*\n\n` +
          `📦 *Produk:* ${result.product.name}\n` +
          `🔢 *Stok Lama:* ${result.oldStock}\n` +
          `🔢 *Stok Baru:* ${result.newStock}\n` +
          `⏰ *Diupdate:* ${new Date().toLocaleString("id-ID")}`
        );
      } else {
        return result.message;
      }
    }

    // Invalid format
    return (
      `❌ *Format Salah*\n\n` +
      `Gunakan: /stock <productId> <jumlah>\n\n` +
      `*Contoh:*\n` +
      `/stock netflix 50\n` +
      `/stock spotify 30\n\n` +
      `*Atau ketik /stock untuk melihat semua stok*`
    );
  }

  /**
   * Show all product stock levels
   */
  showAllStock() {
    const { getAllProducts } = require("../../config");
    const products = getAllProducts();

    let message = "📊 *STOCK INVENTORY*\n\n";

    message += "📺 *Akun Premium:*\n";
    products
      .filter((p) => p.category === "Premium Account")
      .forEach((p, idx) => {
        const status = p.stock > 10 ? "✅" : p.stock > 0 ? "⚠️" : "❌";
        message += `${idx + 1}. ${p.name}\n`;
        message += `   ID: ${p.id}\n`;
        message += `   ${status} Stok: ${p.stock}\n\n`;
      });

    message += "💳 *Kartu Kredit Virtual:*\n";
    products
      .filter((p) => p.category === "Virtual Card")
      .forEach((p, idx) => {
        const status = p.stock > 10 ? "✅" : p.stock > 0 ? "⚠️" : "❌";
        message += `${idx + 1}. ${p.name}\n`;
        message += `   ID: ${p.id}\n`;
        message += `   ${status} Stok: ${p.stock}\n\n`;
      });

    message += "\n*Update Stok:*\n/stock <productId> <jumlah>";

    return message;
  }

  /**
   * /addproduct - Add new product to catalog
   */
  handleAddProduct(adminId, message) {
    const commandText = message.substring("/addproduct ".length).trim();

    if (!commandText) {
      return (
        `❌ *Format Salah*\n\n` +
        `Gunakan: /addproduct <id> | <name> | <price> | <description> | <stock> | <category>\n\n` +
        `*Contoh:*\n` +
        `/addproduct hbo | HBO Max Premium (1 Month) | 1 | Full HD streaming | 10 | premium\n\n` +
        `*Kategori:*\n` +
        `• premium - Akun premium\n` +
        `• vcc - Virtual credit card`
      );
    }

    const parts = commandText.split("|").map((p) => p.trim());

    if (parts.length !== 6) {
      return (
        `❌ *Format Salah*\n\n` +
        `Harus ada 6 bagian dipisah dengan |\n\n` +
        `Format: /addproduct <id> | <name> | <price> | <description> | <stock> | <category>`
      );
    }

    const [id, name, price, description, stock, category] = parts;
    const { addProduct } = require("../../config");
    const result = addProduct({
      id,
      name,
      price,
      description,
      stock,
      category,
    });

    if (result.success) {
      this.log(adminId, "product_added", { productId: id, category });
      return result.message;
    } else {
      return result.message;
    }
  }

  /**
   * /editproduct - Edit existing product
   */
  handleEditProduct(adminId, message) {
    const commandText = message.substring("/editproduct ".length).trim();

    if (!commandText) {
      return (
        `❌ *Format Salah*\n\n` +
        `Gunakan: /editproduct <id> | <field> | <value>\n\n` +
        `*Fields:*\n` +
        `• name - Nama produk\n` +
        `• price - Harga (USD)\n` +
        `• description - Deskripsi\n` +
        `• stock - Jumlah stok\n\n` +
        `*Contoh:*\n` +
        `/editproduct netflix | price | 2\n` +
        `/editproduct spotify | name | Spotify Premium Family`
      );
    }

    const parts = commandText.split("|").map((p) => p.trim());

    if (parts.length !== 3) {
      return `❌ *Format Salah*\n\nHarus ada 3 bagian dipisah dengan |`;
    }

    const [id, field, value] = parts;
    const { editProduct } = require("../../config");
    const result = editProduct(id, field, value);

    if (result.success) {
      this.log(adminId, "product_edited", { productId: id, field, value });
      return result.message;
    } else {
      return result.message;
    }
  }

  /**
   * /removeproduct - Remove product from catalog
   */
  handleRemoveProduct(adminId, message) {
    const parts = message.split(/\s+/);

    if (parts.length !== 2) {
      return (
        `❌ *Format Salah*\n\n` +
        `Gunakan: /removeproduct <productId>\n\n` +
        `*Contoh:*\n` +
        `/removeproduct netflix`
      );
    }

    const productId = parts[1];
    const { removeProduct } = require("../../config");
    const result = removeProduct(productId);

    if (result.success) {
      this.log(adminId, "product_removed", { productId });
      return result.message;
    } else {
      return result.message;
    }
  }

  /**
   * /settings - Manage system settings
   */
  handleSettings(adminId, message) {
    const parts = message.split(/\s+/);

    // View all settings
    if (parts.length === 1) {
      return this.showAllSettings();
    }

    // Show help
    if (parts.length === 2 && parts[1] === "help") {
      return this.showSettingsHelp();
    }

    // Update setting
    if (parts.length === 3) {
      const [, key, value] = parts;
      const { updateSetting } = require("../../config");
      const result = updateSetting(key, value);

      if (result.success) {
        this.log(adminId, "settings_update", {
          key,
          oldValue: result.oldValue,
          newValue: result.newValue,
        });

        return (
          `✅ *Setting Berhasil Diupdate*\n\n` +
          `🔧 *Key:* ${result.key}\n` +
          `📝 *Nilai Lama:* ${result.oldValue}\n` +
          `📝 *Nilai Baru:* ${result.newValue}\n` +
          `⏰ *Diupdate:* ${new Date().toLocaleString("id-ID")}`
        );
      } else {
        return result.message;
      }
    }

    return (
      `❌ *Format Salah*\n\n` +
      `*Cara menggunakan:*\n` +
      `• /settings - Lihat semua settings\n` +
      `• /settings help - Lihat panduan\n` +
      `• /settings <key> <value> - Update setting`
    );
  }

  /**
   * Show all system settings
   */
  showAllSettings() {
    const { getAllSettings } = require("../../config");
    const settings = getAllSettings();

    let message = "⚙️ *SYSTEM SETTINGS*\n\n";
    message += "💱 *Currency:*\n";
    message += `• usdToIdrRate: ${settings.usdToIdrRate}\n\n`;
    message += "⏱️ *Session:*\n";
    message += `• sessionTimeout: ${settings.sessionTimeout} min\n`;
    message += `• maxMessagesPerMinute: ${settings.maxMessagesPerMinute}\n\n`;
    message += "🏪 *Business:*\n";
    message += `• shopName: ${settings.shopName}\n\n`;
    message += "📦 *Delivery:*\n";
    message += `• autoDeliveryEnabled: ${settings.autoDeliveryEnabled}\n`;
    message += `• lowStockThreshold: ${settings.lowStockThreshold}\n\n`;
    message += "🔧 *System:*\n";
    message += `• maintenanceMode: ${settings.maintenanceMode}\n\n`;
    message += "💡 Ketik /settings help untuk panduan lengkap";

    return message;
  }

  /**
   * Show settings help guide
   */
  showSettingsHelp() {
    let message = "📖 *SETTINGS GUIDE*\n\n";
    message += "🔑 *Available Settings:*\n\n";
    message += "• usdToIdrRate - Kurs USD ke IDR\n";
    message += "• sessionTimeout - Timeout session (menit)\n";
    message += "• maxMessagesPerMinute - Max pesan/menit\n";
    message += "• shopName - Nama toko\n";
    message += "• autoDeliveryEnabled - Auto delivery (true/false)\n";
    message += "• lowStockThreshold - Batas stok rendah\n";
    message += "• maintenanceMode - Mode maintenance (true/false)\n\n";
    message +=
      "⚠️ *Note:* Settings bersifat temporary.\nUntuk permanent, edit file .env";

    return message;
  }

  /**
   * /generate-desc <productId> - Generate AI product description
   */
  async handleGenerateDescription(adminId, message) {
    const parts = message.split(" ");
    if (parts.length < 2) {
      return (
        `📝 *GENERATE PRODUCT DESCRIPTION*\n\n` +
        `Format: /generate-desc <productId>\n\n` +
        `Contoh: /generate-desc netflix\n\n` +
        `AI akan membuat deskripsi produk yang menarik dan persuasif.`
      );
    }

    const productId = parts[1].toLowerCase();

    this.logInfo(adminId, `Generating description for product: ${productId}`);

    const result = await this.aiHandler.generateProductDescription(productId);

    if (!result.success) {
      return `❌ ${result.error}`;
    }

    // Format the generated description
    let response = `🤖 *AI GENERATED DESCRIPTION*\n\n`;
    response += `📦 Product: ${result.productName}\n\n`;

    if (result.generated.title) {
      response += `*Title:*\n${result.generated.title}\n\n`;
    }

    if (result.generated.description) {
      response += `*Description:*\n${result.generated.description}\n\n`;
    }

    if (result.generated.features && result.generated.features.length > 0) {
      response += `*Features:*\n`;
      result.generated.features.forEach((feature, i) => {
        response += `${i + 1}. ${feature}\n`;
      });
      response += "\n";
    }

    if (result.generated.cta) {
      response += `*Call to Action:*\n${result.generated.cta}\n\n`;
    }

    if (result.generated.raw) {
      response += `${result.generated.raw}\n\n`;
    }

    response += `---\n\n`;
    response += `💡 Copy deskripsi di atas dan gunakan untuk update product catalog.`;

    return response;
  }

  // Inventory management methods moved to AdminInventoryHandler
  // Promo code methods moved to AdminPromoHandler

  /**
   * /reviews <product> - View all reviews for a product
   * Example: /reviews netflix
   */
  handleViewReviews(adminId, message) {
    try {
      const productId = message.replace("/reviews ", "").trim().toLowerCase();

      if (!productId) {
        return (
          "❌ *Format salah!*\n\n" +
          "*Format:* `/reviews <productId>`\n\n" +
          "*Contoh:*\n" +
          "• /reviews netflix\n" +
          "• /reviews spotify"
        );
      }

      const reviews = this.reviewService.getProductReviews(productId, false);

      if (reviews.length === 0) {
        return `📝 *Reviews untuk ${productId}*\n\nBelum ada review untuk produk ini.`;
      }

      const avgRating = this.reviewService.getAverageRating(productId);
      const distribution = this.reviewService.getRatingDistribution(productId);

      let response = `📝 *Reviews untuk ${productId}*\n\n`;
      response += `⭐ *Rating:* ${avgRating.average}/5.0 (${avgRating.count} reviews)\n\n`;
      response += `📊 *Distribusi Rating:*\n`;
      response += `5⭐: ${distribution[5] || 0} | 4⭐: ${
        distribution[4] || 0
      } | 3⭐: ${distribution[3] || 0} | 2⭐: ${distribution[2] || 0} | 1⭐: ${
        distribution[1] || 0
      }\n\n`;
      response += `━━━━━━━━━━━━━━━━━━\n\n`;

      // Show last 10 reviews
      const recentReviews = reviews.slice(-10).reverse();
      recentReviews.forEach((review, index) => {
        response += this.reviewService.formatReview(review, true);
        if (index < recentReviews.length - 1) {
          response += "\n---\n\n";
        }
      });

      if (reviews.length > 10) {
        response += `\n\n📌 Showing ${recentReviews.length} of ${reviews.length} reviews`;
      }

      this.log(adminId, "view_reviews", { productId, count: reviews.length });

      return response;
    } catch (error) {
      this.logError(adminId, error, { action: "view_reviews", message });
      return "❌ Gagal menampilkan reviews. Silakan coba lagi.";
    }
  }

  /**
   * /reviewstats - Overall review statistics
   */
  handleReviewStats(adminId) {
    try {
      const stats = this.reviewService.getStatistics();

      let response = "📊 *REVIEW STATISTICS*\n\n";
      response += `📝 Total Reviews: ${stats.totalReviews}\n`;
      response += `⭐ Average Rating: ${stats.averageRating}/5.0\n`;
      response += `✅ Active Reviews: ${stats.activeReviews}\n`;
      response += `❌ Deleted Reviews: ${stats.deletedReviews}\n\n`;
      response += `📈 *Rating Distribution:*\n`;
      response += `5⭐: ${stats.ratingDistribution[5] || 0} reviews\n`;
      response += `4⭐: ${stats.ratingDistribution[4] || 0} reviews\n`;
      response += `3⭐: ${stats.ratingDistribution[3] || 0} reviews\n`;
      response += `2⭐: ${stats.ratingDistribution[2] || 0} reviews\n`;
      response += `1⭐: ${stats.ratingDistribution[1] || 0} reviews\n\n`;

      if (stats.topRatedProducts && stats.topRatedProducts.length > 0) {
        response += `🏆 *Top Rated Products:*\n`;
        stats.topRatedProducts.forEach((product, index) => {
          response += `${index + 1}. ${product.productId}: ⭐ ${
            product.averageRating
          }/5.0 (${product.reviewCount} reviews)\n`;
        });
      }

      this.log(adminId, "view_review_stats", {
        totalReviews: stats.totalReviews,
      });

      return response;
    } catch (error) {
      this.logError(adminId, error, { action: "review_stats" });
      return "❌ Gagal menampilkan review statistics. Silakan coba lagi.";
    }
  }

  /**
   * /deletereview <reviewId> - Delete/moderate a review
   * Example: /deletereview REV-1234567890-abc
   */
  handleDeleteReview(adminId, message) {
    try {
      const reviewId = message.replace("/deletereview ", "").trim();

      if (!reviewId || !reviewId.startsWith("REV-")) {
        return (
          "❌ *Format salah!*\n\n" +
          "*Format:* `/deletereview <reviewId>`\n\n" +
          "*Contoh:*\n" +
          "• /deletereview REV-1234567890-abc\n\n" +
          "Review ID dapat dilihat dengan `/reviews <product>`"
        );
      }

      const review = this.reviewService.getReview(reviewId);
      if (!review) {
        return `❌ Review dengan ID "${reviewId}" tidak ditemukan.`;
      }

      // Soft delete (set isActive = false)
      const result = this.reviewService.deleteReview(reviewId);

      if (!result.success) {
        return result.message;
      }

      let response = "✅ *Review berhasil dihapus*\n\n";
      response += `📝 Review ID: ${reviewId}\n`;
      response += `📦 Product: ${review.productId}\n`;
      response += `⭐ Rating: ${review.rating}/5\n`;
      response += `💬 Text: "${review.reviewText}"\n\n`;
      response += `⚠️ Review di-soft delete (masih bisa dipulihkan)`;

      this.log(adminId, "delete_review", {
        reviewId,
        productId: review.productId,
        rating: review.rating,
      });

      return response;
    } catch (error) {
      this.logError(adminId, error, { action: "delete_review", message });
      return "❌ Gagal menghapus review. Silakan coba lagi.";
    }
  }

  /**
   * Show admin help menu
   */
  showAdminHelp() {
    let message = "👨‍💼 *ADMIN COMMANDS*\n\n";
    message += "📦 *Order Management:*\n";
    message += "• /approve <orderId> - Approve payment\n";
    message += "• /stats [days] - Enhanced dashboard (default: 30 days)\n\n";
    message += "📢 *Communication:*\n";
    message += "• /broadcast <msg> - Send to all users\n\n";
    message += "💰 *Promo Management:*\n";
    message += "• /createpromo CODE DISC DAYS - Create promo\n";
    message += "• /listpromos - List all promos\n";
    message += "• /deletepromo CODE - Delete promo\n";
    message += "• /promostats CODE - Promo stats\n\n";
    message += "📊 *System:*\n";
    message += "• /status - System status\n";
    message += "• /settings - Manage settings\n\n";
    message += "🛍️ *Product Management:*\n";
    message += "• /stock - View/update stock\n";
    message += "• /addproduct - Add product\n";
    message += "• /editproduct - Edit product\n";
    message += "• /removeproduct - Remove product\n\n";
    message += "📥 *Inventory Management:*\n";
    message += "• /addstock <id> <cred> - Add credentials\n";
    message += "• /addstock-bulk <id> - Add multiple credentials\n";
    message += "• /stockreport - View all stock\n";
    message += "• /salesreport [days] - Sales report\n\n";
    message += "⭐ *Review Management:*\n";
    message += "• /reviews <product> - View product reviews\n";
    message += "• /reviewstats - Overall review stats\n";
    message += "• /deletereview <id> - Delete/moderate review\n\n";
    message += "🤖 *AI Tools:*\n";
    message += "• /generate-desc <productId> - Generate product description";

    return message;
  }

  /**
   * Format IDR currency
   * @private
   */
  _formatIDR(amount) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  }
}

module.exports = AdminHandler;
