/**
 * Admin Promo Handler
 * Handles promo code management commands: createpromo, listpromos, deletepromo, promostats
 */

const BaseHandler = require("./BaseHandler");

class AdminPromoHandler extends BaseHandler {
  /**
   * @param {SessionManager} sessionManager
   * @param {PromoService} promoService
   * @param {Logger} logger
   */
  constructor(sessionManager, promoService, logger = null) {
    super(sessionManager, logger);
    this.promoService = promoService;
  }

  /**
   * /createpromo CODE DISCOUNT DAYS [MAX_USES] - Create promo code
   */
  handleCreatePromo(adminId, message) {
    const parts = message.split(" ");

    if (parts.length < 4) {
      return (
        "❌ *Format salah*\n\n" +
        "Gunakan: /createpromo CODE DISCOUNT DAYS [MAX_USES]\n\n" +
        "Contoh:\n" +
        "• /createpromo NEWUSER10 10 30 - 10% diskon, 30 hari, unlimited\n" +
        "• /createpromo FLASH50 50 7 100 - 50% diskon, 7 hari, max 100 uses"
      );
    }

    const code = parts[1];
    const discountPercent = parseInt(parts[2]);
    const expiryDays = parseInt(parts[3]);
    const maxUses = parts[4] ? parseInt(parts[4]) : 0;

    if (isNaN(discountPercent) || isNaN(expiryDays)) {
      return "❌ Discount dan Days harus berupa angka";
    }

    if (parts[4] && isNaN(maxUses)) {
      return "❌ Max uses harus berupa angka";
    }

    const result = this.promoService.createPromo(
      code,
      discountPercent,
      expiryDays,
      maxUses
    );
    return result.message;
  }

  /**
   * /listpromos - List all promo codes
   */
  handleListPromos(_adminId) {
    const promos = this.promoService.getAllPromos(true);

    if (promos.length === 0) {
      return (
        "📋 *DAFTAR PROMO*\n\n" +
        "Belum ada promo code yang dibuat.\n\n" +
        "Gunakan /createpromo untuk membuat promo baru."
      );
    }

    let message = "📋 *DAFTAR PROMO CODE*\n\n";

    const now = Date.now();
    const activePromos = promos.filter((p) => p.isActive && p.expiryDate > now);
    const expiredPromos = promos.filter(
      (p) => !p.isActive || p.expiryDate <= now
    );

    if (activePromos.length > 0) {
      message += "✅ *AKTIF:*\n\n";
      activePromos.forEach((promo, index) => {
        const expiresIn = Math.ceil(
          (promo.expiryDate - now) / (24 * 60 * 60 * 1000)
        );
        const remaining =
          promo.maxUses > 0
            ? `${promo.maxUses - promo.currentUses}/${promo.maxUses}`
            : "Unlimited";

        message += `${index + 1}. 🎟️ *${promo.code}*\n`;
        message += `   💰 Diskon: ${promo.discountPercent}%\n`;
        message += `   📅 Sisa: ${expiresIn} hari\n`;
        message += `   🔢 Uses: ${promo.currentUses} (Sisa: ${remaining})\n\n`;
      });
    }

    if (expiredPromos.length > 0) {
      message += "❌ *EXPIRED/INACTIVE:*\n\n";
      expiredPromos.forEach((promo, index) => {
        message += `${index + 1}. ${promo.code} - ${promo.discountPercent}% (${
          promo.currentUses
        } uses)\n`;
      });
    }

    message += "\n━━━━━━━━━━━━━━━━━━\n";
    message += `📊 Total: ${promos.length} promo\n\n`;
    message += "💡 *Perintah:*\n";
    message += "• /promostats CODE - Lihat detail\n";
    message += "• /deletepromo CODE - Hapus promo";

    return message;
  }

  /**
   * /deletepromo CODE - Delete promo code
   */
  handleDeletePromo(adminId, message) {
    const parts = message.split(" ");

    if (parts.length < 2) {
      return "❌ Format: /deletepromo CODE\n\nContoh: /deletepromo NEWUSER10";
    }

    const code = parts[1];
    const result = this.promoService.deletePromo(code);
    return result.message;
  }

  /**
   * /promostats CODE - Get promo statistics
   */
  handlePromoStats(adminId, message) {
    const parts = message.split(" ");

    if (parts.length < 2) {
      return "❌ Format: /promostats CODE\n\nContoh: /promostats NEWUSER10";
    }

    const code = parts[1];
    const stats = this.promoService.getPromoStats(code);

    if (!stats) {
      return `❌ Kode promo ${code} tidak ditemukan`;
    }

    let response = `📊 *PROMO STATISTICS*\n\n`;
    response += `🎟️ Code: *${stats.code}*\n`;
    response += `💰 Discount: ${stats.discountPercent}%\n`;
    response += `📈 Total Uses: ${stats.totalUses}\n`;
    response += `🔢 Remaining: ${
      stats.remainingUses === -1 ? "Unlimited" : stats.remainingUses
    }\n`;
    response += `📅 Expires In: ${stats.expiresIn} hari\n`;
    response += `📌 Status: ${
      stats.isActive
        ? stats.isExpired
          ? "❌ Expired"
          : "✅ Active"
        : "❌ Inactive"
    }\n`;

    this.log(adminId, "promo_stats_viewed", { code });
    return response;
  }
}

module.exports = AdminPromoHandler;
