/**
 * Stock Alert Service
 * Monitors product stock levels and sends alerts to admin
 */

const DynamicProductLoader = require('../../utils/DynamicProductLoader');

class StockAlertService {
  constructor(whatsappClient = null, adminNumbers = []) {
    this.client = whatsappClient;
    this.adminNumbers = adminNumbers.filter(n => n && n.trim());
    this.lowStockThreshold = parseInt(process.env.LOW_STOCK_THRESHOLD) || 5;
    this.outOfStockThreshold = 0;
  }

  /**
   * Get all products with current stock
   * @returns {Array} Products with stock info
   */
  getProductsWithStock() {
    try {
      const products = DynamicProductLoader.loadProducts();
      const allProducts = [
        ...products.premiumAccounts,
        ...products.virtualCards
      ];
      
      return allProducts.map(product => ({
        id: product.id,
        name: product.name,
        stock: product.stock,
        category: product.category,
        price: product.price
      }));
    } catch (error) {
      console.error('❌ Error loading products:', error);
      return [];
    }
  }

  /**
   * Get products with low stock
   * @param {number} threshold - Stock threshold (default: 5)
   * @returns {Array} Products with stock < threshold
   */
  getLowStockProducts(threshold = this.lowStockThreshold) {
    const products = this.getProductsWithStock();
    return products.filter(p => p.stock > 0 && p.stock <= threshold);
  }

  /**
   * Get products that are out of stock
   * @returns {Array} Products with stock = 0
   */
  getOutOfStockProducts() {
    const products = this.getProductsWithStock();
    return products.filter(p => p.stock === 0);
  }

  /**
   * Format stock alert message
   * @param {Array} lowStock - Low stock products
   * @param {Array} outOfStock - Out of stock products
   * @returns {string} Formatted message
   */
  formatStockAlertMessage(lowStock, outOfStock) {
    let message = '📊 *Daily Stock Report*\n\n';
    message += `⏰ ${new Date().toLocaleString('id-ID', { 
      dateStyle: 'full', 
      timeStyle: 'short' 
    })}\n\n`;
    
    // Out of stock section
    if (outOfStock.length > 0) {
      message += '❌ *Out of Stock* (Perlu Restock Urgent!)\n';
      message += '━━━━━━━━━━━━━━━━━━\n';
      outOfStock.forEach(p => {
        message += `• ${p.name}\n`;
        message += `  Stock: ${p.stock} | Price: Rp${p.price.toLocaleString('id-ID')}\n`;
      });
      message += '\n';
    }
    
    // Low stock section
    if (lowStock.length > 0) {
      message += '⚠️ *Low Stock* (Kurang dari 5 pcs)\n';
      message += '━━━━━━━━━━━━━━━━━━\n';
      lowStock.forEach(p => {
        const emoji = p.stock === 1 ? '🔴' : p.stock <= 3 ? '🟠' : '🟡';
        message += `${emoji} ${p.name}\n`;
        message += `   Stock: ${p.stock} | Price: Rp${p.price.toLocaleString('id-ID')}\n`;
      });
      message += '\n';
    }
    
    // All good section
    if (lowStock.length === 0 && outOfStock.length === 0) {
      message += '✅ *Semua Produk Stock Aman*\n\n';
      message += 'Tidak ada produk dengan stock rendah saat ini.\n\n';
    }
    
    // Summary
    const allProducts = this.getProductsWithStock();
    const totalStock = allProducts.reduce((sum, p) => sum + p.stock, 0);
    const avgStock = allProducts.length > 0 
      ? (totalStock / allProducts.length).toFixed(1) 
      : 0;
    
    message += '📈 *Summary*\n';
    message += '━━━━━━━━━━━━━━━━━━\n';
    message += `Total Products: ${allProducts.length}\n`;
    message += `Total Stock: ${totalStock} items\n`;
    message += `Average Stock: ${avgStock} per product\n`;
    message += `Low Stock: ${lowStock.length}\n`;
    message += `Out of Stock: ${outOfStock.length}\n\n`;
    
    // Actions
    if (outOfStock.length > 0 || lowStock.length > 0) {
      message += '💡 *Recommended Actions:*\n';
      if (outOfStock.length > 0) {
        message += `• Restock ${outOfStock.length} produk habis\n`;
      }
      if (lowStock.length > 0) {
        message += `• Monitor ${lowStock.length} produk stock rendah\n`;
      }
      message += '\n';
    }
    
    message += '📱 Gunakan:\n';
    message += '• /stockreport - Lihat detail semua stock\n';
    message += '• /addstock <id> - Tambah stock manual\n';
    message += '• /syncstock - Sync stock dari file';
    
    return message;
  }

  /**
   * Send stock alert to admin via WhatsApp
   * @param {boolean} forceAlert - Send even if no alerts (default: false)
   * @returns {Promise<object>} Result with success status and message
   */
  async sendStockAlert(forceAlert = false) {
    try {
      const lowStock = this.getLowStockProducts();
      const outOfStock = this.getOutOfStockProducts();
      
      // Only send if there are alerts or forced
      if (!forceAlert && lowStock.length === 0 && outOfStock.length === 0) {
        return {
          success: true,
          sent: false,
          message: 'No stock alerts to send'
        };
      }
      
      const message = this.formatStockAlertMessage(lowStock, outOfStock);
      
      // Send to all admins
      if (!this.client) {
        console.warn('⚠️ WhatsApp client not available, cannot send alert');
        return {
          success: false,
          sent: false,
          message: 'WhatsApp client not available'
        };
      }
      
      const results = [];
      for (const adminNumber of this.adminNumbers) {
        try {
          await this.client.sendMessage(adminNumber, message);
          results.push({ admin: adminNumber, success: true });
          console.log(`✅ Stock alert sent to ${adminNumber}`);
        } catch (error) {
          results.push({ admin: adminNumber, success: false, error: error.message });
          console.error(`❌ Failed to send alert to ${adminNumber}:`, error);
        }
      }
      
      return {
        success: true,
        sent: true,
        message: `Alert sent to ${results.filter(r => r.success).length}/${this.adminNumbers.length} admins`,
        results
      };
    } catch (error) {
      console.error('❌ Error sending stock alert:', error);
      return {
        success: false,
        sent: false,
        message: error.message
      };
    }
  }

  /**
   * Get formatted stock report (for manual /stockreport command)
   * @returns {string} Formatted stock report
   */
  getStockReport() {
    const products = this.getProductsWithStock();
    
    let message = '📊 *Inventory Stock Report*\n\n';
    
    // Group by category
    const categories = {};
    products.forEach(p => {
      if (!categories[p.category]) {
        categories[p.category] = [];
      }
      categories[p.category].push(p);
    });
    
    // Display by category
    Object.entries(categories).forEach(([category, items]) => {
      const categoryName = category === 'premium' ? 'Premium Accounts' : 
                          category === 'vcc' ? 'Virtual Cards' : 
                          category.toUpperCase();
      
      message += `📦 *${categoryName}*\n`;
      message += '━━━━━━━━━━━━━━━━━━\n';
      
      items.forEach(p => {
        const statusEmoji = p.stock === 0 ? '❌' : 
                          p.stock <= 3 ? '🔴' : 
                          p.stock <= 5 ? '🟠' : '✅';
        message += `${statusEmoji} ${p.name}\n`;
        message += `   Stock: ${p.stock} | Rp${p.price.toLocaleString('id-ID')}\n`;
      });
      message += '\n';
    });
    
    return message;
  }

  /**
   * Set WhatsApp client (for late initialization)
   * @param {object} client - WhatsApp client instance
   */
  setClient(client) {
    this.client = client;
  }

  /**
   * Set admin numbers (for late initialization)
   * @param {Array} adminNumbers - Admin WhatsApp numbers
   */
  setAdminNumbers(adminNumbers) {
    this.adminNumbers = adminNumbers.filter(n => n && n.trim());
  }
}

module.exports = StockAlertService;
