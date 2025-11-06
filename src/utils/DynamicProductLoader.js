/**
 * Dynamic Product Loader
 * Auto-discovers products from products_data/ folder
 */

const fs = require("fs");
const path = require("path");

const PRODUCTS_DIR = path.join(__dirname, "../../products_data");
const PRODUCT_METADATA_FILE = path.join(
  __dirname,
  "../../products_data/products.json"
);

class DynamicProductLoader {
  /**
   * Scan products_data/ directory for product files
   * @returns {Array} List of discovered product files
   */
  static scanProductFiles() {
    try {
      if (!fs.existsSync(PRODUCTS_DIR)) {
        console.warn(
          `⚠️ Products directory not found: ${PRODUCTS_DIR}`
        );
        return [];
      }

      const files = fs.readdirSync(PRODUCTS_DIR);
      const productFiles = files.filter(
        (file) =>
          file.endsWith(".txt") &&
          !file.startsWith("_") &&
          file !== "README.txt"
      );

      return productFiles.map((file) => ({
        filename: file,
        productId: file.replace(".txt", ""),
        path: path.join(PRODUCTS_DIR, file),
      }));
    } catch (error) {
      console.error("❌ Error scanning product files:", error);
      return [];
    }
  }

  /**
   * Load product metadata from products.json
   * @returns {Object} Product metadata by productId
   */
  static loadProductMetadata() {
    try {
      if (fs.existsSync(PRODUCT_METADATA_FILE)) {
        const data = fs.readFileSync(PRODUCT_METADATA_FILE, "utf8");
        return JSON.parse(data);
      }
    } catch {
      console.warn("⚠️ No product metadata file, using auto-detection");
    }
    return {};
  }

  /**
   * Auto-generate product metadata from filename
   * @param {string} productId - Product ID from filename
   * @returns {Object} Generated metadata
   */
  static generateMetadata(productId) {
    // Detect category from ID
    let category = "premium";
    if (productId.startsWith("vcc")) {
      category = "vcc";
    } else if (productId.includes("game")) {
      category = "game";
    } else if (productId.includes("vpn")) {
      category = "vpn";
    }

    // Generate name (capitalize and format)
    const name = productId
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    // Default descriptions by category
    const descriptions = {
      premium: "Premium account access",
      vcc: "Virtual credit card",
      game: "Game credits/items",
      vpn: "VPN subscription",
    };

    return {
      id: productId,
      name: `${name} Premium`,
      price: 15800, // Default price (can be overridden in metadata)
      description: descriptions[category] || "Digital product",
      stock: 0, // Will be loaded from file
      category: category,
      autoDiscovered: true, // Flag for auto-discovered products
    };
  }

  /**
   * Count available stock from product file
   * @param {string} filePath - Path to product file
   * @returns {number} Number of lines (stock count)
   */
  static countStock(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content
        .split("\n")
        .filter((line) => line.trim().length > 0);
      return lines.length;
    } catch {
      return 0;
    }
  }

  /**
   * Load all products dynamically
   * @returns {Object} Products object with premiumAccounts and virtualCards
   */
  static loadProducts() {
    const productFiles = this.scanProductFiles();
    const metadata = this.loadProductMetadata();

    const premiumAccounts = [];
    const virtualCards = [];

    productFiles.forEach(({ productId, path: filePath }) => {
      // Use metadata if available, otherwise auto-generate
      const productData = metadata[productId]
        ? {
            ...metadata[productId],
            id: productId, // Ensure ID matches file
          }
        : this.generateMetadata(productId);

      // Count actual stock from file
      productData.stock = this.countStock(filePath);

      // Categorize
      if (productData.category === "vcc") {
        virtualCards.push(productData);
      } else {
        premiumAccounts.push(productData);
      }
    });

    return {
      premiumAccounts: premiumAccounts.sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
      virtualCards: virtualCards.sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    };
  }

  /**
   * Get product by ID (searches in loaded products)
   * @param {string} productId - Product ID
   * @returns {Object|null} Product object or null
   */
  static getProductById(productId) {
    const products = this.loadProducts();
    const allProducts = [
      ...products.premiumAccounts,
      ...products.virtualCards,
    ];
    return allProducts.find((p) => p.id === productId) || null;
  }

  /**
   * Check if product file exists
   * @param {string} productId - Product ID
   * @returns {boolean}
   */
  static productFileExists(productId) {
    const filePath = path.join(PRODUCTS_DIR, `${productId}.txt`);
    return fs.existsSync(filePath);
  }

  /**
   * Generate sample products.json metadata file
   * @returns {string} JSON string
   */
  static generateSampleMetadata() {
    const sample = {
      netflix: {
        name: "Netflix Premium (1 Month)",
        price: 15800,
        description: "Full HD streaming, 4 screens, offline download",
        category: "premium",
      },
      spotify: {
        name: "Spotify Premium (1 Month)",
        price: 15800,
        description: "Ad-free music, unlimited skips, offline mode",
        category: "premium",
      },
      "vcc-basic": {
        name: "Virtual Card Basic ($10)",
        price: 15800,
        description: "Pre-loaded $10 balance for online payments",
        category: "vcc",
      },
    };
    return JSON.stringify(sample, null, 2);
  }
}

module.exports = DynamicProductLoader;
