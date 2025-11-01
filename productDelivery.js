const fs = require("fs");
const path = require("path");

class ProductDelivery {
  constructor() {
    this.productsDataDir = "./products_data";
    this.deliveryLogFile = "./delivery.log";
  }

  /**
   * Get product credentials from database
   * @param {string} productId - Product ID
   * @returns {Object|null} Credentials or null if not available
   */
  getProductCredentials(productId) {
    try {
      const filepath = path.join(this.productsDataDir, `${productId}.txt`);

      if (!fs.existsSync(filepath)) {
        console.warn(`⚠️ Product data file not found: ${productId}.txt`);
        return null;
      }

      const content = fs.readFileSync(filepath, "utf-8");
      const lines = content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length === 0) {
        console.warn(`⚠️ No credentials available for: ${productId}`);
        return null;
      }

      // Get first available credential and remove it from file
      const credential = lines[0];
      const remainingLines = lines.slice(1);

      // Update file with remaining credentials
      fs.writeFileSync(filepath, remainingLines.join("\n") + "\n", "utf-8");

      return this.parseCredential(credential);
    } catch (error) {
      console.error(`❌ Error reading product credentials: ${error.message}`);
      return null;
    }
  }

  /**
   * Parse credential line
   * @param {string} line - Credential line
   * @returns {Object} Parsed credential
   */
  parseCredential(line) {
    // Format: email:password or email|password
    const separator = line.includes("|") ? "|" : ":";
    const parts = line.split(separator);

    if (parts.length >= 2) {
      return {
        email: parts[0].trim(),
        password: parts[1].trim(),
        raw: line,
      };
    }

    // Single line format (for VCC or other data)
    return {
      raw: line,
    };
  }

  /**
   * Deliver products to customer
   * @param {string} customerId - Customer WhatsApp ID
   * @param {string} orderId - Order ID
   * @param {Array} cart - Cart items
   * @returns {Object} Delivery result
   */
  deliverProducts(customerId, orderId, cart) {
    const deliveredProducts = [];
    const failedProducts = [];

    for (const item of cart) {
      const credentials = this.getProductCredentials(item.id);

      if (credentials) {
        deliveredProducts.push({
          product: item,
          credentials: credentials,
        });
      } else {
        failedProducts.push(item);
      }
    }

    // Log delivery
    this.logDelivery(customerId, orderId, deliveredProducts, failedProducts);

    return {
      success: deliveredProducts.length > 0,
      delivered: deliveredProducts,
      failed: failedProducts,
    };
  }

  /**
   * Format delivery message for customer
   * @param {Object} deliveryResult - Result from deliverProducts
   * @param {string} orderId - Order ID
   * @returns {string} Formatted message
   */
  formatDeliveryMessage(deliveryResult, orderId) {
    let message = "🎁 *DETAIL AKUN ANDA*\n\n";
    message += `📋 Order ID: ${orderId}\n\n`;
    message += "━━━━━━━━━━━━━━━━━━\n\n";

    deliveryResult.delivered.forEach((item, index) => {
      message += `${index + 1}. *${item.product.name}*\n`;

      if (item.credentials.email && item.credentials.password) {
        message += `📧 Email: ${item.credentials.email}\n`;
        message += `🔑 Password: ${item.credentials.password}\n`;
      } else {
        message += `📄 ${item.credentials.raw}\n`;
      }

      message += "\n";
    });

    if (deliveryResult.failed.length > 0) {
      message += "━━━━━━━━━━━━━━━━━━\n\n";
      message += "⚠️ *Produk Belum Tersedia:*\n";
      deliveryResult.failed.forEach((item) => {
        message += `• ${item.name}\n`;
      });
      message += "\nKami akan mengirimkan segera. Mohon tunggu.\n";
    }

    message += "\n━━━━━━━━━━━━━━━━━━\n\n";
    message += "📌 *PENTING:*\n";
    message += "• Simpan data ini dengan aman\n";
    message += "• Jangan bagikan ke orang lain\n";
    message += "• Login segera untuk aktivasi\n\n";
    message += "Terima kasih sudah berbelanja! 🎉";

    return message;
  }

  /**
   * Log delivery to file
   * @param {string} customerId
   * @param {string} orderId
   * @param {Array} delivered
   * @param {Array} failed
   */
  logDelivery(customerId, orderId, delivered, failed) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        customerId,
        orderId,
        delivered: delivered.map((d) => d.product.id),
        failed: failed.map((f) => f.id),
      };

      fs.appendFileSync(
        this.deliveryLogFile,
        JSON.stringify(logEntry) + "\n",
        "utf-8"
      );
    } catch (error) {
      console.error(`❌ Error logging delivery: ${error.message}`);
    }
  }

  /**
   * Check product stock availability
   * @param {string} productId
   * @returns {number} Number of available credentials
   */
  checkStock(productId) {
    try {
      const filepath = path.join(this.productsDataDir, `${productId}.txt`);

      if (!fs.existsSync(filepath)) {
        return 0;
      }

      const content = fs.readFileSync(filepath, "utf-8");
      const lines = content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      return lines.length;
    } catch (error) {
      console.error(`❌ Error checking stock: ${error.message}`);
      return 0;
    }
  }
}

module.exports = ProductDelivery;
