/**
 * PromoService.js
 *
 * Purpose: Manage promotional codes and discounts
 * Admin creates promo codes, customers apply at checkout
 *
 * Features:
 * - Create/delete promo codes
 * - Validate promo codes (expiry, usage limits)
 * - Apply discounts to orders
 * - Track promo code usage per customer
 * - List active/expired promo codes
 *
 * Storage:
 * - File-based: promos.json
 * - Usage tracking: promo_usage.json
 *
 * @module PromoService
 */

const fs = require("fs");
const path = require("path");

class PromoService {
  constructor() {
    this.promosFile = path.join(__dirname, "../../../data/promos.json");
    this.usageFile = path.join(__dirname, "../../../data/promo_usage.json");
    this.dataDir = path.join(__dirname, "../../../data");

    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    // Initialize files if they don't exist
    if (!fs.existsSync(this.promosFile)) {
      fs.writeFileSync(this.promosFile, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(this.usageFile)) {
      fs.writeFileSync(this.usageFile, JSON.stringify({}, null, 2));
    }
  }

  /**
   * Load promos from file
   * @returns {Array} Array of promo objects
   */
  _loadPromos() {
    try {
      const data = fs.readFileSync(this.promosFile, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error("❌ PromoService._loadPromos error:", error);
      return [];
    }
  }

  /**
   * Save promos to file
   * @param {Array} promos
   */
  _savePromos(promos) {
    try {
      fs.writeFileSync(this.promosFile, JSON.stringify(promos, null, 2));
    } catch (error) {
      console.error("❌ PromoService._savePromos error:", error);
    }
  }

  /**
   * Load usage data from file
   * @returns {Object} Usage data object
   */
  _loadUsage() {
    try {
      const data = fs.readFileSync(this.usageFile, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error("❌ PromoService._loadUsage error:", error);
      return {};
    }
  }

  /**
   * Save usage data to file
   * @param {Object} usage
   */
  _saveUsage(usage) {
    try {
      fs.writeFileSync(this.usageFile, JSON.stringify(usage, null, 2));
    } catch (error) {
      console.error("❌ PromoService._saveUsage error:", error);
    }
  }

  /**
   * Create new promo code
   * @param {string} code - Promo code (uppercase)
   * @param {number} discountPercent - Discount percentage (1-100)
   * @param {number} expiryDays - Days until expiry
   * @param {number} maxUses - Maximum uses (0 = unlimited)
   * @returns {Object} {success, message, promo}
   */
  createPromo(code, discountPercent, expiryDays, maxUses = 0) {
    try {
      // Validate inputs
      code = code.toUpperCase().trim();

      if (!code || code.length < 3) {
        return {
          success: false,
          message: "❌ Kode promo minimal 3 karakter",
        };
      }

      if (!/^[A-Z0-9]+$/.test(code)) {
        return {
          success: false,
          message: "❌ Kode promo hanya boleh huruf dan angka (tanpa spasi)",
        };
      }

      if (discountPercent < 1 || discountPercent > 100) {
        return {
          success: false,
          message: "❌ Diskon harus antara 1-100%",
        };
      }

      if (expiryDays < 1) {
        return {
          success: false,
          message: "❌ Masa berlaku minimal 1 hari",
        };
      }

      // Check if code already exists
      const promos = this._loadPromos();
      const existingIndex = promos.findIndex((p) => p.code === code);

      if (existingIndex !== -1) {
        return {
          success: false,
          message: `❌ Kode promo ${code} sudah ada`,
        };
      }

      // Create promo
      const now = Date.now();
      const expiryDate = now + expiryDays * 24 * 60 * 60 * 1000;

      const promo = {
        code,
        discountPercent,
        expiryDate,
        maxUses,
        currentUses: 0,
        createdAt: now,
        isActive: true,
      };

      promos.push(promo);
      this._savePromos(promos);

      return {
        success: true,
        message:
          `✅ Kode promo ${code} berhasil dibuat!\n\n` +
          `💰 Diskon: ${discountPercent}%\n` +
          `📅 Berlaku: ${expiryDays} hari\n` +
          `🔢 Maks penggunaan: ${maxUses === 0 ? "Unlimited" : maxUses}`,
        promo,
      };
    } catch (error) {
      console.error("❌ PromoService.createPromo error:", error);
      return {
        success: false,
        message: "❌ Gagal membuat kode promo. Silakan coba lagi.",
      };
    }
  }

  /**
   * Validate and get promo code
   * @param {string} code
   * @param {string} customerId
   * @returns {Object} {valid, message, promo, discount}
   */
  validatePromo(code, customerId) {
    try {
      code = code.toUpperCase().trim();

      const promos = this._loadPromos();
      const promo = promos.find((p) => p.code === code);

      if (!promo) {
        return {
          valid: false,
          message: `❌ Kode promo ${code} tidak ditemukan`,
        };
      }

      if (!promo.isActive) {
        return {
          valid: false,
          message: `❌ Kode promo ${code} sudah tidak aktif`,
        };
      }

      // Check expiry
      if (Date.now() > promo.expiryDate) {
        return {
          valid: false,
          message: `❌ Kode promo ${code} sudah kadaluarsa`,
        };
      }

      // Check max uses
      if (promo.maxUses > 0 && promo.currentUses >= promo.maxUses) {
        return {
          valid: false,
          message: `❌ Kode promo ${code} sudah mencapai batas maksimum penggunaan`,
        };
      }

      // Check if customer already used this promo
      const usage = this._loadUsage();
      if (!usage[customerId]) {
        usage[customerId] = [];
      }

      if (usage[customerId].includes(code)) {
        return {
          valid: false,
          message: `❌ Anda sudah menggunakan kode promo ${code} sebelumnya`,
        };
      }

      return {
        valid: true,
        message: `✅ Kode promo ${code} valid! Diskon ${promo.discountPercent}%`,
        promo,
        discountPercent: promo.discountPercent,
      };
    } catch (error) {
      console.error("❌ PromoService.validatePromo error:", error);
      return {
        valid: false,
        message: "❌ Gagal memvalidasi kode promo. Silakan coba lagi.",
      };
    }
  }

  /**
   * Apply promo code (mark as used)
   * @param {string} code
   * @param {string} customerId
   * @returns {Object} {success, message}
   */
  applyPromo(code, customerId) {
    try {
      code = code.toUpperCase().trim();

      // Validate first
      const validation = this.validatePromo(code, customerId);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.message,
        };
      }

      // Update promo usage count
      const promos = this._loadPromos();
      const promoIndex = promos.findIndex((p) => p.code === code);
      if (promoIndex !== -1) {
        promos[promoIndex].currentUses++;
        this._savePromos(promos);
      }

      // Track customer usage
      const usage = this._loadUsage();
      if (!usage[customerId]) {
        usage[customerId] = [];
      }
      usage[customerId].push(code);
      this._saveUsage(usage);

      return {
        success: true,
        message: `✅ Kode promo ${code} berhasil diterapkan!`,
        discountPercent: validation.discountPercent,
      };
    } catch (error) {
      console.error("❌ PromoService.applyPromo error:", error);
      return {
        success: false,
        message: "❌ Gagal menerapkan kode promo. Silakan coba lagi.",
      };
    }
  }

  /**
   * Calculate discount amount
   * @param {number} totalAmount
   * @param {number} discountPercent
   * @returns {Object} {originalAmount, discountAmount, finalAmount}
   */
  calculateDiscount(totalAmount, discountPercent) {
    const discountAmount = Math.round(totalAmount * (discountPercent / 100));
    const finalAmount = totalAmount - discountAmount;

    return {
      originalAmount: totalAmount,
      discountAmount,
      finalAmount,
      discountPercent,
    };
  }

  /**
   * Get all promo codes
   * @param {boolean} includeExpired - Include expired promos
   * @returns {Array} Array of promo objects
   */
  getAllPromos(includeExpired = false) {
    try {
      const promos = this._loadPromos();
      const now = Date.now();

      if (includeExpired) {
        return promos;
      }

      return promos.filter((p) => p.isActive && p.expiryDate > now);
    } catch (error) {
      console.error("❌ PromoService.getAllPromos error:", error);
      return [];
    }
  }

  /**
   * Get promo by code
   * @param {string} code
   * @returns {Object|null} Promo object or null
   */
  getPromo(code) {
    try {
      code = code.toUpperCase().trim();
      const promos = this._loadPromos();
      return promos.find((p) => p.code === code) || null;
    } catch (error) {
      console.error("❌ PromoService.getPromo error:", error);
      return null;
    }
  }

  /**
   * Delete promo code
   * @param {string} code
   * @returns {Object} {success, message}
   */
  deletePromo(code) {
    try {
      code = code.toUpperCase().trim();

      const promos = this._loadPromos();
      const index = promos.findIndex((p) => p.code === code);

      if (index === -1) {
        return {
          success: false,
          message: `❌ Kode promo ${code} tidak ditemukan`,
        };
      }

      promos.splice(index, 1);
      this._savePromos(promos);

      return {
        success: true,
        message: `✅ Kode promo ${code} berhasil dihapus`,
      };
    } catch (error) {
      console.error("❌ PromoService.deletePromo error:", error);
      return {
        success: false,
        message: "❌ Gagal menghapus kode promo. Silakan coba lagi.",
      };
    }
  }

  /**
   * Deactivate promo code (soft delete)
   * @param {string} code
   * @returns {Object} {success, message}
   */
  deactivatePromo(code) {
    try {
      code = code.toUpperCase().trim();

      const promos = this._loadPromos();
      const index = promos.findIndex((p) => p.code === code);

      if (index === -1) {
        return {
          success: false,
          message: `❌ Kode promo ${code} tidak ditemukan`,
        };
      }

      promos[index].isActive = false;
      this._savePromos(promos);

      return {
        success: true,
        message: `✅ Kode promo ${code} berhasil dinonaktifkan`,
      };
    } catch (error) {
      console.error("❌ PromoService.deactivatePromo error:", error);
      return {
        success: false,
        message: "❌ Gagal menonaktifkan kode promo. Silakan coba lagi.",
      };
    }
  }

  /**
   * Get customer promo usage history
   * @param {string} customerId
   * @returns {Array} Array of used promo codes
   */
  getCustomerUsage(customerId) {
    try {
      const usage = this._loadUsage();
      return usage[customerId] || [];
    } catch (error) {
      console.error("❌ PromoService.getCustomerUsage error:", error);
      return [];
    }
  }

  /**
   * Get promo statistics
   * @param {string} code
   * @returns {Object} {totalUses, remainingUses, expiresIn}
   */
  getPromoStats(code) {
    try {
      code = code.toUpperCase().trim();
      const promo = this.getPromo(code);

      if (!promo) {
        return null;
      }

      const now = Date.now();
      const expiresIn = Math.ceil(
        (promo.expiryDate - now) / (24 * 60 * 60 * 1000)
      );
      const remainingUses =
        promo.maxUses > 0 ? promo.maxUses - promo.currentUses : -1;

      return {
        code: promo.code,
        discountPercent: promo.discountPercent,
        totalUses: promo.currentUses,
        remainingUses,
        expiresIn,
        isActive: promo.isActive,
        isExpired: promo.expiryDate < now,
      };
    } catch (error) {
      console.error("❌ PromoService.getPromoStats error:", error);
      return null;
    }
  }
}

module.exports = PromoService;
