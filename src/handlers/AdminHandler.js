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
const AdminReviewHandler = require("./AdminReviewHandler");
const AdminAnalyticsHandler = require("./AdminAnalyticsHandler");
const AdminOrderHandler = require("./AdminOrderHandler");

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

    // Initialize specialized handlers
    this.reviewHandler = new AdminReviewHandler(this.reviewService, logger);
    this.analyticsHandler = new AdminAnalyticsHandler(
      this.dashboardService,
      this.statsService,
      sessionManager,
      logger
    );
    this.orderHandler = new AdminOrderHandler(
      sessionManager,
      this.xenditService,
      logger
    );

    // Command routing map for O(1) lookup (from PR #1 optimization)
    this.commandRoutes = this._initializeCommandRoutes();
  }

  /**
   * Initialize command routing map for better performance
   * Uses O(1) map lookup instead of O(n) sequential if checks
   * @private
   */
  _initializeCommandRoutes() {
    return {
      // Help
      "/help": () => this.showAdminHelp(),

      // Order & Communication
      "/approve": (adminId, msg) =>
        this.orderHandler.handleApprove(adminId, msg),
      "/broadcast": (adminId, msg) =>
        this.orderHandler.handleBroadcast(adminId, msg),

      // Analytics & Stats
      "/stats": async (adminId, msg) => {
        const parts = msg.split(/\s+/);
        const days = parts.length > 1 ? parseInt(parts[1]) || 30 : 30;
        return await this.analyticsHandler.handleStats(adminId, days);
      },
      "/status": (adminId) => this.handleStatus(adminId),

      // Product Management
      "/stock": (adminId, msg) => this.handleStock(adminId, msg),
      "/addproduct": (adminId, msg) => this.handleAddProduct(adminId, msg),
      "/editproduct": (adminId, msg) => this.handleEditProduct(adminId, msg),
      "/removeproduct": (adminId, msg) =>
        this.handleRemoveProduct(adminId, msg),
      "/generate-desc": (adminId, msg) =>
        this.handleGenerateDescription(adminId, msg),

      // Inventory
      "/addstock-bulk": (adminId, msg) =>
        this.inventoryHandler.handleAddStockBulk(adminId, msg),
      "/addstock": (adminId, msg) =>
        this.inventoryHandler.handleAddStock(adminId, msg),
      "/syncstock": (adminId) => this.inventoryHandler.handleSyncStock(adminId),
      "/stockreport": (adminId) =>
        this.inventoryHandler.handleStockReport(adminId),
      "/salesreport": (adminId, msg) =>
        this.inventoryHandler.handleSalesReport(adminId, msg),

      // Promo
      "/createpromo": (adminId, msg) =>
        this.promoHandler.handleCreatePromo(adminId, msg),
      "/listpromos": (adminId) => this.promoHandler.handleListPromos(adminId),
      "/deletepromo": (adminId, msg) =>
        this.promoHandler.handleDeletePromo(adminId, msg),
      "/promostats": (adminId, msg) =>
        this.promoHandler.handlePromoStats(adminId, msg),

      // Reviews
      "/reviews": (adminId, msg) =>
        this.reviewHandler.handleViewReviews(adminId, msg),
      "/reviewstats": (adminId) =>
        this.reviewHandler.handleReviewStats(adminId),
      "/deletereview": (adminId, msg) =>
        this.reviewHandler.handleDeleteReview(adminId, msg),

      // Settings
      "/settings": (adminId, msg) => this.handleSettings(adminId, msg),
    };
  }

  /**
   * Main handler - routes admin commands with O(1) map lookup
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

    // Null/undefined check (from PR #1 bug fix)
    if (!message || typeof message !== "string") {
      return this.showAdminHelp();
    }

    try {
      // Check if admin is in bulk add mode (special state)
      const step = await this.sessionManager.getStep(adminId);
      if (step === "admin_bulk_add") {
        return await this.inventoryHandler.processBulkAdd(adminId, message);
      }

      // Parse command once to avoid redundant operations
      const command = message.split(/\s+/)[0];

      // Try exact match first (O(1) lookup)
      if (this.commandRoutes[command]) {
        return await this.commandRoutes[command](adminId, message);
      }

      // Try prefix match for commands with parameters
      for (const [route, handler] of Object.entries(this.commandRoutes)) {
        if (message.startsWith(route + " ") || message === route) {
          return await handler(adminId, message);
        }
      }

      // Unknown admin command
      return this.showAdminHelp();
    } catch (error) {
      this.logError(adminId, error, { command: message });
      return `❌ Terjadi kesalahan saat menjalankan command admin.\n\n${error.message}`;
    }
  }

  /**
   * handleStats - Wrapper for backward compatibility (delegates to analyticsHandler)
   */
  async handleStats(adminId, days = 30) {
    return await this.analyticsHandler.handleStats(adminId, days);
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
   * Show admin help menu
   */
  showAdminHelp() {
    let message = "👨‍💼 *ADMIN COMMAND REFERENCE*\n\n";
    message += "Gunakan /help untuk melihat pesan ini\n";
    message += "━━━━━━━━━━━━━━━━━━\n\n";

    message += "📦 *Order & Communication* (2 commands)\n";
    message += "• /approve <order-id> - Setujui pembayaran & kirim produk\n";
    message +=
      "• /broadcast <message> - Kirim pesan ke semua customer aktif\n\n";

    message += "📊 *Analytics & Stats* (2 commands)\n";
    message += "• /stats [days] - Dashboard analytics (default: 30 hari)\n";
    message += "• /status - Status sistem (RAM, uptime, Redis, logs)\n\n";

    message += "🏷️ *Product Management* (5 commands)\n";
    message += "• /stock [id] [qty] - Lihat/update stock produk\n";
    message += "• /addproduct <id|name|price|desc|cat> - Tambah produk baru\n";
    message += "• /editproduct <id> <field> <value> - Edit produk\n";
    message += "• /removeproduct <product-id> - Hapus produk\n";
    message += "• /generate-desc <product-id> - AI generate deskripsi\n\n";

    message += "📦 *Inventory Management* (5 commands)\n";
    message += "• /addstock <id> <credentials> - Tambah 1 credential\n";
    message += "• /addstock-bulk <product-id> - Mode bulk add\n";
    message += "• /syncstock - Sync stock dari folder products_data/\n";
    message += "• /stockreport - Laporan stock semua produk\n";
    message += "• /salesreport [days] - Laporan penjualan (default: 30)\n\n";

    message += "🎟️ *Promo Management* (4 commands)\n";
    message += "• /createpromo <CODE> <diskon%> <hari> - Buat promo\n";
    message += "• /listpromos - Lihat semua promo aktif\n";
    message += "• /deletepromo <CODE> - Hapus promo\n";
    message += "• /promostats [CODE] - Statistik penggunaan promo\n\n";

    message += "⭐ *Review Management* (3 commands)\n";
    message += "• /reviews <product-id> - Lihat review produk\n";
    message += "• /reviewstats - Statistik review keseluruhan\n";
    message += "• /deletereview <prod-id> <idx> - Hapus review\n\n";

    message += "⚙️ *Settings* (1 command)\n";
    message += "• /settings [key] [value] - Kelola pengaturan bot\n\n";

    message += "━━━━━━━━━━━━━━━━━━\n";
    message += "📝 *Total: 22 Admin Commands*\n\n";
    message += "💡 Tips:\n";
    message += "• Semua command dimulai dengan /\n";
    message += "• Parameter <wajib> | [opsional]\n";
    message += "• Gunakan /help kapan saja\n";
    message += "• Command case-insensitive";

    return message;
  }
}

module.exports = AdminHandler;
