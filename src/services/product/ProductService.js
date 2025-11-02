/**
 * Product Service
 * Handles product catalog operations and stock management
 */

const fs = require("fs");
const path = require("path");
const {
  products: productsCatalog,
  DEFAULT_STOCK,
  VCC_STOCK,
} = require("../../config/products.config");

class ProductService {
  constructor() {
    this.products = {
      ...productsCatalog.premiumAccounts.reduce(
        (acc, p) => ({ ...acc, [p.id]: p }),
        {}
      ),
      ...productsCatalog.virtualCards.reduce(
        (acc, p) => ({ ...acc, [p.id]: p }),
        {}
      ),
    };
  }

  /**
   * Get all products with category labels
   * @returns {Array} All products with category
   */
  getAllProducts() {
    const premiumAccounts = productsCatalog.premiumAccounts.map((p) => ({
      ...p,
      categoryLabel: "Premium Accounts",
    }));

    const virtualCards = productsCatalog.virtualCards.map((p) => ({
      ...p,
      categoryLabel: "Virtual Cards",
    }));

    return [...premiumAccounts, ...virtualCards];
  }

  /**
   * Get product by ID
   * @param {string} productId
   * @returns {Object|null} Product or null
   */
  getProductById(productId) {
    return this.products[productId] || null;
  }

  /**
   * Check if product is in stock
   * @param {string} productId
   * @returns {boolean}
   */
  isInStock(productId) {
    const product = this.products[productId];
    return product && product.stock > 0;
  }

  /**
   * Get product stock level
   * @param {string} productId
   * @returns {number}
   */
  getStock(productId) {
    const product = this.products[productId];
    return product ? product.stock : 0;
  }

  /**
   * Set product stock
   * @param {string} productId
   * @param {number} quantity
   * @returns {boolean} Success
   */
  setStock(productId, quantity) {
    if (this.products[productId]) {
      this.products[productId].stock = Math.max(0, quantity);
      return true;
    }
    return false;
  }

  /**
   * Decrement product stock
   * @param {string} productId
   * @param {number} quantity
   * @returns {boolean} Success
   */
  decrementStock(productId, quantity = 1) {
    const product = this.products[productId];
    if (product && product.stock >= quantity) {
      product.stock -= quantity;
      return true;
    }
    return false;
  }

  /**
   * Add new product
   * @param {Object} productData
   * @returns {boolean} Success
   */
  addProduct(productData) {
    if (this.products[productData.id]) {
      return false; // Product already exists
    }

    this.products[productData.id] = {
      id: productData.id,
      name: productData.name,
      price: parseFloat(productData.price),
      description: productData.description,
      stock: parseInt(productData.stock) || DEFAULT_STOCK,
      category: productData.category || "premium",
    };

    return true;
  }

  /**
   * Edit existing product
   * @param {string} productId
   * @param {string} field
   * @param {*} value
   * @returns {boolean} Success
   */
  editProduct(productId, field, value) {
    const product = this.products[productId];
    if (!product) return false;

    const allowedFields = ["name", "price", "description", "stock", "category"];
    if (!allowedFields.includes(field)) return false;

    if (field === "price") {
      product[field] = parseFloat(value);
    } else if (field === "stock") {
      product[field] = parseInt(value);
    } else {
      product[field] = value;
    }

    return true;
  }

  /**
   * Remove product
   * @param {string} productId
   * @returns {boolean} Success
   */
  removeProduct(productId) {
    if (this.products[productId]) {
      delete this.products[productId];
      return true;
    }
    return false;
  }

  /**
   * Format product list for display
   * @param {Object} reviewService - ReviewService instance (optional)
   * @returns {string} Formatted list
   */
  formatProductList(reviewService = null) {
    let message = "*🛍️ Katalog Produk Premium*\n\n";

    // Premium Accounts
    message += "*📺 Premium Accounts*\n";
    productsCatalog.premiumAccounts.forEach((product, index) => {
      const priceIDR = this.formatIDR(product.price); // Price is already in IDR
      const stockStatus =
        product.stock > 0 ? `✅ (${product.stock})` : "❌ Stok Habis";

      message += `${index + 1}. ${product.name}\n`;
      message += `   💰 ${priceIDR}\n`;
      message += `   📦 ${stockStatus}\n`;

      // Add rating if reviewService provided
      if (reviewService) {
        const rating = reviewService.getAverageRating(product.id);
        if (rating.count > 0) {
          message += `   ⭐ ${rating.average}/5.0 (${rating.count} review${
            rating.count > 1 ? "s" : ""
          })\n`;
        }
      }

      message += `   ℹ️ ${product.description}\n\n`;
    });

    // Virtual Cards
    message += "*💳 Virtual Cards*\n";
    productsCatalog.virtualCards.forEach((product, index) => {
      const priceIDR = this.formatIDR(product.price); // Price is already in IDR
      const stockStatus =
        product.stock > 0 ? `✅ (${product.stock})` : "❌ Stok Habis";

      message += `${index + 1}. ${product.name}\n`;
      message += `   💰 ${priceIDR}\n`;
      message += `   📦 ${stockStatus}\n`;

      // Add rating if reviewService provided
      if (reviewService) {
        const rating = reviewService.getAverageRating(product.id);
        if (rating.count > 0) {
          message += `   ⭐ ${rating.average}/5.0 (${rating.count} review${
            rating.count > 1 ? "s" : ""
          })\n`;
        }
      }

      message += `   ℹ️ ${product.description}\n\n`;
    });

    message += "_Ketik nama produk untuk menambahkan ke keranjang_\n";
    message += "_Ketik *cart* untuk melihat keranjang_";

    return message;
  }

  /**
   * Format IDR currency
   * @param {number} amount
   * @returns {string}
   */
  formatIDR(amount) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Get product credentials from file
   * @param {string} productId
   * @returns {string|null} Credentials or null
   */
  getProductCredentials(productId) {
    const filePath = path.join(
      __dirname,
      "../../../products_data",
      `${productId}.txt`
    );

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, "utf8");
    const lines = content
      .trim()
      .split("\n")
      .filter((line) => line.trim());

    if (lines.length === 0) {
      return null;
    }

    // Return first available credential and remove it from file
    const credential = lines.shift();
    fs.writeFileSync(filePath, lines.join("\n") + "\n");

    return credential;
  }
}

module.exports = ProductService;
