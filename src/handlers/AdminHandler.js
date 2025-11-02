/**
 * Admin Handler
 * Handles all admin commands and system management
 */

const BaseHandler = require("./BaseHandler");
const InputValidator = require("../../lib/inputValidator");
const UIMessages = require("../../lib/uiMessages");
const AIHandler = require("./AIHandler");
const AdminStatsService = require("../services/admin/AdminStatsService");

class AdminHandler extends BaseHandler {
  constructor(sessionManager, xenditService, logger = null) {
    super(sessionManager, logger);
    this.xenditService = xenditService;
    this.aiHandler = new AIHandler(undefined, undefined, logger);
    this.statsService = new AdminStatsService();
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
        return await this.handleStats(adminId);
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

      if (message.startsWith("/addstock ")) {
        return await this.handleAddStock(adminId, message);
      }

      if (message.startsWith("/addstock-bulk")) {
        return await this.handleAddStockBulk(adminId, message);
      }

      if (message.startsWith("/stockreport")) {
        return await this.handleStockReport(adminId);
      }

      if (message.startsWith("/salesreport")) {
        return await this.handleSalesReport(adminId, message);
      }

      // Unknown admin command
      return this.showAdminHelp();
    } catch (error) {
      this.logError(adminId, error, { command: message });
      return `❌ Terjadi kesalahan saat menjalankan command admin.\n\n${error.message}`;
    }
  }

  /**
   * /approve <orderId> - Approve payment and deliver product
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
  async handleStats(adminId) {
    try {
      const stats = await this.statsService.getStats(this.sessionManager);
      const response = AdminStatsService.formatStatsMessage(stats);

      this.log(adminId, "stats_viewed");
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

  /**
   * /addstock <product-id> <credentials> - Add product credentials
   */
  async handleAddStock(adminId, message) {
    const parts = message.split(" ");
    if (parts.length < 3) {
      return (
        "❌ *Format salah!*\n\n" +
        "*Format:* `/addstock <product-id> <email:password>`\n\n" +
        "*Contoh:*\n" +
        "`/addstock netflix premium@netflix.com:Pass123!`\n" +
        "`/addstock spotify music@domain.com:Spotify456!`\n\n" +
        "*Note:* Gunakan `:` atau `|` untuk memisahkan email dan password"
      );
    }

    const productId = parts[1];
    const credentials = parts.slice(2).join(" ");

    // Import InventoryManager
    const InventoryManager = require("../services/inventory/InventoryManager");
    const inventoryManager = new InventoryManager();

    const result = await inventoryManager.addCredentials(
      productId,
      credentials,
      adminId
    );

    if (result.success) {
      return (
        `✅ *Credentials berhasil ditambahkan!*\n\n` +
        `📦 *Produk:* ${result.productId}\n` +
        `📊 *Stok sekarang:* ${result.stockCount}\n\n` +
        `💾 Credentials tersimpan dan siap dijual!`
      );
    } else {
      return `❌ *Gagal menambahkan credentials:*\n\n${result.error}`;
    }
  }

  /**
   * /addstock-bulk <product-id> - Add multiple credentials
   */
  async handleAddStockBulk(adminId, message) {
    const parts = message.split(" ");
    if (parts.length < 2) {
      return (
        "❌ *Format salah!*\n\n" +
        "*Format:* `/addstock-bulk <product-id>`\n\n" +
        "*Contoh:* `/addstock-bulk netflix`\n\n" +
        "Setelah itu, kirim credentials (satu per baris):\n" +
        "```\n" +
        "email1@domain.com:password1\n" +
        "email2@domain.com:password2\n" +
        "email3@domain.com:password3\n" +
        "```"
      );
    }

    const productId = parts[1];

    // Set admin state to bulk adding
    await this.sessionManager.setStep(adminId, "admin_bulk_add");
    await this.sessionManager.setData(adminId, { bulkProductId: productId });

    return (
      `📝 *Mode Bulk Add untuk: ${productId}*\n\n` +
      `Silakan kirim credentials sekarang (satu per baris):\n\n` +
      `*Format per baris:*\n` +
      "`email:password` atau `email|password`\n\n" +
      `*Contoh:*\n` +
      "```\n" +
      "premium1@netflix.com:Pass123!\n" +
      "premium2@netflix.com:Secret456!\n" +
      "premium3@netflix.com:Secure789!\n" +
      "```\n\n" +
      `Kirim "done" atau "selesai" jika sudah selesai.`
    );
  }

  /**
   * Process bulk add credentials
   */
  async processBulkAdd(adminId, message) {
    // Get product ID from session data
    const sessionData = await this.sessionManager.getData(adminId);
    const productId = sessionData?.bulkProductId;

    if (!productId) {
      return "❌ Session expired. Mulai lagi dengan /addstock-bulk";
    }

    // Check if done
    if (
      message.toLowerCase() === "done" ||
      message.toLowerCase() === "selesai"
    ) {
      await this.sessionManager.setStep(adminId, "menu");
      await this.sessionManager.setData(adminId, {});
      return "✅ Bulk add selesai! Gunakan /stockreport untuk melihat stok.";
    }

    // Parse credentials (one per line)
    const lines = message
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      return "❌ Tidak ada credentials valid. Coba lagi atau kirim 'done' untuk selesai.";
    }

    // Import InventoryManager
    const InventoryManager = require("../services/inventory/InventoryManager");
    const inventoryManager = new InventoryManager();

    const result = await inventoryManager.addBulkCredentials(
      productId,
      lines,
      adminId
    );

    if (result.success) {
      let response =
        `✅ *Bulk add berhasil!*\n\n` +
        `📦 *Produk:* ${result.productId}\n` +
        `✅ *Berhasil:* ${result.validCount}\n` +
        `❌ *Gagal:* ${result.invalidCount}\n` +
        `📊 *Total stok:* ${result.stockCount}\n\n`;

      if (result.errors && result.errors.length > 0) {
        response += `⚠️ *Error (3 pertama):*\n`;
        result.errors.forEach((err) => (response += `• ${err}\n`));
        response += "\n";
      }

      response += `Kirim lagi untuk tambah, atau "done" untuk selesai.`;
      return response;
    } else {
      return `❌ *Gagal:* ${result.error}\n\nCoba lagi atau kirim "done" untuk selesai.`;
    }
  }

  /**
   * /stockreport - Show current stock for all products
   */
  async handleStockReport(adminId) {
    const InventoryManager = require("../services/inventory/InventoryManager");
    const inventoryManager = new InventoryManager();

    const stocks = await inventoryManager.getAllStockCounts();

    let message = "*📊 LAPORAN STOK*\n\n";

    if (Object.keys(stocks).length === 0) {
      message += "❌ Belum ada produk atau stok kosong.";
    } else {
      let totalStock = 0;

      for (const [productId, count] of Object.entries(stocks)) {
        const status =
          count === 0 ? "🔴" : count < 5 ? "🟡" : count < 10 ? "🟢" : "🟢";
        message += `${status} *${productId}:* ${count}\n`;
        totalStock += count;
      }

      message += `\n📦 *Total stok:* ${totalStock}`;
    }

    return message;
  }

  /**
   * /salesreport [days] - Show sales report
   */
  async handleSalesReport(adminId, message) {
    const parts = message.split(" ");
    const days = parts.length > 1 ? parseInt(parts[1]) : 7;

    if (isNaN(days) || days < 1 || days > 90) {
      return "❌ Invalid days. Gunakan angka 1-90.\n\n*Contoh:* `/salesreport 7`";
    }

    const InventoryManager = require("../services/inventory/InventoryManager");
    const inventoryManager = new InventoryManager();

    const report = await inventoryManager.getSalesReport(days);

    if (!report) {
      return "❌ Gagal generate sales report.";
    }

    let message = `*📊 SALES REPORT*\n*${report.period}*\n\n`;

    if (report.totalSales === 0) {
      message += "❌ Belum ada penjualan.";
    } else {
      message += `💰 *Total penjualan:* ${report.totalSales}\n\n`;
      message += "*Breakdown per produk:*\n";

      for (const [productId, count] of Object.entries(report.salesByProduct)) {
        message += `📦 ${productId}: ${count}\n`;
      }
    }

    return message;
  }

  /**
   * Show admin help menu
   */
  showAdminHelp() {
    let message = "👨‍💼 *ADMIN COMMANDS*\n\n";
    message += "📦 *Order Management:*\n";
    message += "• /approve <orderId> - Approve payment\n";
    message += "• /stats - View statistics\n\n";
    message += "📢 *Communication:*\n";
    message += "• /broadcast <msg> - Send to all users\n\n";
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
    message += "🤖 *AI Tools:*\n";
    message += "• /generate-desc <productId> - Generate product description";

    return message;
  }
}

module.exports = AdminHandler;
