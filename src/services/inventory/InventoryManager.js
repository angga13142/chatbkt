/**
 * Inventory Manager
 * Manages product credentials with transaction logging and security
 * Uses Redis for high-performance FIFO queue with file fallback
 */

const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const crypto = require("crypto");
const { AsyncLocalStorage } = require("async_hooks");
const RedisInventoryStorage = require("./RedisInventoryStorage");

class InventoryManager {
  constructor(redisClient = null) {
    this.productsDataDir = "./products_data";
    this.soldDataDir = "./products_data/sold";
    this.logFile = "./logs/inventory_transactions.log";
    this.als = new AsyncLocalStorage();

    // Redis storage (primary)
    this.redisStorage = null;
    this.useRedis = false;

    // Initialize Redis if available
    if (redisClient) {
      this.redisStorage = new RedisInventoryStorage(redisClient);
      this.initializeRedis();
    }

    // Ensure directories exist (fallback)
    this.initializeDirectories();
  }

  /**
   * Initialize Redis storage
   */
  async initializeRedis() {
    try {
      const initialized = await this.redisStorage.initialize();
      if (initialized) {
        this.useRedis = true;
        console.log("✅ InventoryManager: Using Redis storage");
      } else {
        console.log("⚠️  InventoryManager: Falling back to file storage");
      }
    } catch (error) {
      console.error("❌ Redis initialization failed:", error.message);
      console.log("⚠️  InventoryManager: Using file storage");
    }
  }

  /**
   * Initialize required directories
   */
  async initializeDirectories() {
    try {
      await fs.mkdir(this.productsDataDir, { recursive: true });
      await fs.mkdir(this.soldDataDir, { recursive: true });
      await fs.mkdir(path.dirname(this.logFile), { recursive: true });
    } catch (error) {
      console.error("❌ Error creating directories:", error);
    }
  }

  /**
   * Generate unique transaction ID
   * @returns {string} Unique transaction ID
   */
  generateTransactionId() {
    return `TXN-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  }

  /**
   * Log transaction with transaction ID
   * @param {string} action - Action type
   * @param {Object} data - Transaction data
   */
  async logTransaction(action, data) {
    const transactionId =
      this.als.getStore()?.transactionId || this.generateTransactionId();
    const timestamp = new Date().toISOString();

    const logEntry = {
      transactionId,
      timestamp,
      action,
      ...data,
    };

    try {
      const logLine = JSON.stringify(logEntry) + "\n";
      await fs.appendFile(this.logFile, logLine, "utf-8");
      console.log(`📝 [${transactionId}] ${action}:`, data);
    } catch (error) {
      console.error("❌ Error logging transaction:", error);
    }
  }

  /**
   * Sanitize product ID to prevent path traversal
   * @param {string} productId - Product ID from user input
   * @returns {string} Sanitized product ID
   */
  sanitizeProductId(productId) {
    // Remove any path traversal attempts and special characters
    return productId.replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase();
  }

  /**
   * Validate credentials format
   * @param {string} credentials - Credentials string
   * @returns {Object} Validation result
   */
  validateCredentials(credentials) {
    const trimmed = credentials.trim();

    if (trimmed.length === 0) {
      return { valid: false, error: "Credentials cannot be empty" };
    }

    // Check for common separators
    const hasSeparator =
      trimmed.includes(":") || trimmed.includes("|") || trimmed.includes(",");

    if (!hasSeparator) {
      return {
        valid: false,
        error:
          "Credentials must include separator (:, |, or ,) between email and password",
      };
    }

    // Check for minimum length
    if (trimmed.length < 10) {
      return { valid: false, error: "Credentials too short" };
    }

    return { valid: true };
  }

  /**
   * Add product credentials (from WhatsApp admin)
   * @param {string} productId - Product ID
   * @param {string} credentials - Credentials string (email:password or email|password)
   * @param {string} adminId - Admin WhatsApp ID
   * @returns {Object} Result
   */
  async addCredentials(productId, credentials, adminId) {
    // Sanitize product ID
    const safeProductId = this.sanitizeProductId(productId);

    // Validate credentials
    const validation = this.validateCredentials(credentials);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Use Redis if available, otherwise fall back to file
    if (this.useRedis && this.redisStorage.ready()) {
      return await this.redisStorage.addCredentials(
        safeProductId,
        credentials.trim(),
        adminId
      );
    }

    // File-based fallback
    const transactionId = this.generateTransactionId();

    return this.als.run({ transactionId }, async () => {
      try {
        // Get file path
        const filepath = path.join(
          this.productsDataDir,
          `${safeProductId}.txt`
        );

        // Append credentials (thread-safe)
        await fs.appendFile(filepath, credentials.trim() + "\n", "utf-8");

        // Get new stock count
        const content = await fs.readFile(filepath, "utf-8");
        const lines = content
          .split("\n")
          .filter((line) => line.trim().length > 0);
        const stockCount = lines.length;

        await this.logTransaction("ADD_CREDENTIALS", {
          productId: safeProductId,
          adminId,
          stockCount,
          credentialsLength: credentials.length,
        });

        return {
          success: true,
          productId: safeProductId,
          stockCount,
          message: `✅ Credentials added successfully! Current stock: ${stockCount}`,
        };
      } catch (error) {
        await this.logTransaction("ADD_CREDENTIALS_ERROR", {
          productId,
          adminId,
          error: error.message,
        });

        return {
          success: false,
          error: `Failed to add credentials: ${error.message}`,
        };
      }
    });
  }

  /**
   * Add multiple credentials at once (bulk add)
   * @param {string} productId - Product ID
   * @param {Array<string>} credentialsList - Array of credentials
   * @param {string} adminId - Admin WhatsApp ID
   * @returns {Object} Result
   */
  async addBulkCredentials(productId, credentialsList, adminId) {
    const transactionId = this.generateTransactionId();

    return this.als.run({ transactionId }, async () => {
      try {
        const safeProductId = this.sanitizeProductId(productId);
        const filepath = path.join(
          this.productsDataDir,
          `${safeProductId}.txt`
        );

        let validCount = 0;
        let invalidCount = 0;
        const errors = [];

        // Validate all credentials first
        const validCredentials = [];
        for (const cred of credentialsList) {
          const validation = this.validateCredentials(cred);
          if (validation.valid) {
            validCredentials.push(cred.trim());
            validCount++;
          } else {
            invalidCount++;
            errors.push(
              `Line ${credentialsList.indexOf(cred) + 1}: ${validation.error}`
            );
          }
        }

        // Append all valid credentials
        if (validCredentials.length > 0) {
          const content = validCredentials.join("\n") + "\n";
          await fs.appendFile(filepath, content, "utf-8");
        }

        // Get final stock count
        const fileContent = await fs.readFile(filepath, "utf-8");
        const lines = fileContent
          .split("\n")
          .filter((line) => line.trim().length > 0);
        const stockCount = lines.length;

        await this.logTransaction("ADD_BULK_CREDENTIALS", {
          productId: safeProductId,
          adminId,
          validCount,
          invalidCount,
          stockCount,
        });

        return {
          success: true,
          productId: safeProductId,
          validCount,
          invalidCount,
          stockCount,
          errors: errors.length > 0 ? errors.slice(0, 3) : null, // Show first 3 errors
          message: `✅ Added ${validCount} credentials. ${
            invalidCount > 0 ? `${invalidCount} invalid entries skipped.` : ""
          }\nCurrent stock: ${stockCount}`,
        };
      } catch (error) {
        await this.logTransaction("ADD_BULK_CREDENTIALS_ERROR", {
          productId,
          adminId,
          error: error.message,
        });

        return {
          success: false,
          error: `Failed to add bulk credentials: ${error.message}`,
        };
      }
    });
  }

  /**
   * Get current stock count
   * @param {string} productId - Product ID
   * @returns {number} Stock count
   */
  async getStockCount(productId) {
    try {
      const safeProductId = this.sanitizeProductId(productId);
      const filepath = path.join(this.productsDataDir, `${safeProductId}.txt`);

      // Check if file exists
      if (!fsSync.existsSync(filepath)) {
        return 0;
      }

      const content = await fs.readFile(filepath, "utf-8");
      const lines = content
        .split("\n")
        .filter((line) => line.trim().length > 0);
      return lines.length;
    } catch (error) {
      console.error("❌ Error getting stock count:", error);
      return 0;
    }
  }

  /**
   * Get all stock counts
   * @returns {Object} Stock counts by product
   */
  async getAllStockCounts() {
    try {
      const files = await fs.readdir(this.productsDataDir);
      const txtFiles = files.filter((file) => file.endsWith(".txt"));

      const stocks = {};
      for (const file of txtFiles) {
        const productId = file.replace(".txt", "");
        const count = await this.getStockCount(productId);
        stocks[productId] = count;
      }

      return stocks;
    } catch (error) {
      console.error("❌ Error getting all stock counts:", error);
      return {};
    }
  }

  /**
   * Move sold credential to archive
   * @param {string} productId - Product ID
   * @param {string} credentials - Sold credentials
   * @param {string} orderId - Order ID
   * @param {string} customerId - Customer ID
   */
  async archiveSoldCredential(productId, credentials, orderId, customerId) {
    const transactionId = this.generateTransactionId();

    return this.als.run({ transactionId }, async () => {
      try {
        const safeProductId = this.sanitizeProductId(productId);
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `${safeProductId}_${orderId}_${timestamp}.txt`;
        const filepath = path.join(this.soldDataDir, filename);

        const content = {
          productId: safeProductId,
          orderId,
          customerId,
          credentials,
          soldAt: new Date().toISOString(),
          transactionId,
        };

        await fs.writeFile(filepath, JSON.stringify(content, null, 2), "utf-8");

        await this.logTransaction("ARCHIVE_SOLD", {
          productId: safeProductId,
          orderId,
          customerId,
        });

        return { success: true };
      } catch (error) {
        console.error("❌ Error archiving sold credential:", error);
        return { success: false, error: error.message };
      }
    });
  }

  /**
   * Get sales report
   * @param {number} days - Number of days to look back
   * @returns {Object} Sales report
   */
  async getSalesReport(days = 7) {
    try {
      const files = await fs.readdir(this.soldDataDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const sales = {};
      let totalSales = 0;

      for (const file of files) {
        try {
          const filepath = path.join(this.soldDataDir, file);
          const content = await fs.readFile(filepath, "utf-8");
          const data = JSON.parse(content);

          const soldDate = new Date(data.soldAt);
          if (soldDate >= cutoffDate) {
            const productId = data.productId;
            sales[productId] = (sales[productId] || 0) + 1;
            totalSales++;
          }
        } catch (error) {
          // Skip invalid files
          continue;
        }
      }

      return {
        period: `Last ${days} days`,
        totalSales,
        salesByProduct: sales,
      };
    } catch (error) {
      console.error("❌ Error generating sales report:", error);
      return null;
    }
  }
}

module.exports = InventoryManager;
