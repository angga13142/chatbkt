/**
 * Redis Inventory Storage
 * High-performance inventory management using Redis Lists for FIFO queue
 * Replaces file-based system with Redis for better concurrency and reliability
 */

const crypto = require("crypto");
const { AsyncLocalStorage } = require("async_hooks");

class RedisInventoryStorage {
  constructor(redisClient) {
    this.redis = redisClient;
    this.als = new AsyncLocalStorage();
    this.isReady = false;
  }

  /**
   * Initialize Redis connection
   */
  async initialize() {
    try {
      if (!this.redis.isReady()) {
        throw new Error("Redis client not ready");
      }
      this.isReady = true;
      console.log("✅ RedisInventoryStorage initialized");
      return true;
    } catch (error) {
      console.error("❌ RedisInventoryStorage init failed:", error.message);
      this.isReady = false;
      return false;
    }
  }

  /**
   * Generate transaction ID
   */
  generateTransactionId() {
    return `TXN-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  }

  /**
   * Get Redis key for product credentials
   */
  getCredentialsKey(productId) {
    return `inventory:credentials:${productId}`;
  }

  /**
   * Get Redis key for stock count
   */
  getStockCountKey(productId) {
    return `inventory:stock:${productId}`;
  }

  /**
   * Get Redis key for sales ledger
   */
  getSalesLedgerKey(date) {
    return `inventory:sales:${date}`;
  }

  /**
   * Get Redis key for transaction log
   */
  getTransactionLogKey() {
    return `inventory:transactions`;
  }

  /**
   * Log transaction to Redis Stream
   */
  async logTransaction(action, data) {
    const transactionId =
      this.als.getStore()?.transactionId || this.generateTransactionId();

    try {
      const logEntry = {
        transactionId,
        timestamp: new Date().toISOString(),
        action,
        ...data,
      };

      // Convert all values to strings for Redis Stream
      const streamData = Object.entries(logEntry)
        .map(([key, value]) => [key, String(value)])
        .flat();

      // Add to Redis Stream (better than append to file)
      await this.redis
        .getClient()
        .xAdd(this.getTransactionLogKey(), "*", streamData);

      console.log(`📝 [${transactionId}] ${action}`);
    } catch (error) {
      console.error("❌ Error logging transaction:", error.message);
    }
  }

  /**
   * Add credentials to product (FIFO queue using Redis List)
   * @param {string} productId - Product ID
   * @param {string} credentials - Credentials string
   * @param {string} adminId - Admin WhatsApp ID
   */
  async addCredentials(productId, credentials, adminId) {
    const transactionId = this.generateTransactionId();

    return this.als.run({ transactionId }, async () => {
      try {
        const key = this.getCredentialsKey(productId);
        const stockKey = this.getStockCountKey(productId);

        // Add to end of list (FIFO: first in, first out)
        await this.redis.getClient().rPush(key, credentials);

        // Update stock count
        const stockCount = await this.redis.getClient().lLen(key);
        await this.redis.getClient().set(stockKey, stockCount);

        // Log transaction
        await this.logTransaction("ADD_CREDENTIALS", {
          productId,
          adminId,
          stockCount,
        });

        return {
          success: true,
          productId,
          stockCount,
          message: `✅ Credentials added! Current stock: ${stockCount}`,
        };
      } catch (error) {
        await this.logTransaction("ADD_CREDENTIALS_ERROR", {
          productId,
          adminId,
          error: error.message,
        });

        return {
          success: false,
          error: error.message,
        };
      }
    });
  }

  /**
   * Add multiple credentials (bulk)
   */
  async addBulkCredentials(productId, credentialsList, adminId) {
    const transactionId = this.generateTransactionId();

    return this.als.run({ transactionId }, async () => {
      try {
        const key = this.getCredentialsKey(productId);
        const stockKey = this.getStockCountKey(productId);

        // Add all credentials in one operation (atomic)
        if (credentialsList.length > 0) {
          await this.redis.getClient().rPush(key, credentialsList);
        }

        // Update stock count
        const stockCount = await this.redis.getClient().lLen(key);
        await this.redis.getClient().set(stockKey, stockCount);

        // Log transaction
        await this.logTransaction("ADD_BULK_CREDENTIALS", {
          productId,
          adminId,
          count: credentialsList.length,
          stockCount,
        });

        return {
          success: true,
          productId,
          validCount: credentialsList.length,
          invalidCount: 0,
          stockCount,
          message: `✅ Added ${credentialsList.length} credentials. Stock: ${stockCount}`,
        };
      } catch (error) {
        await this.logTransaction("ADD_BULK_CREDENTIALS_ERROR", {
          productId,
          adminId,
          error: error.message,
        });

        return {
          success: false,
          error: error.message,
        };
      }
    });
  }

  /**
   * Get one credential (FIFO - pop from front of list)
   * @param {string} productId - Product ID
   * @returns {string|null} Credential or null
   */
  async getCredential(productId) {
    try {
      const key = this.getCredentialsKey(productId);
      const stockKey = this.getStockCountKey(productId);

      // Pop from front of list (FIFO)
      const credential = await this.redis.getClient().lPop(key);

      if (credential) {
        // Update stock count
        const stockCount = await this.redis.getClient().lLen(key);
        await this.redis.getClient().set(stockKey, stockCount);

        console.log(
          `📦 Retrieved credential for ${productId} (${stockCount} left)`
        );
      }

      return credential;
    } catch (error) {
      console.error("❌ Error getting credential:", error.message);
      return null;
    }
  }

  /**
   * Get stock count
   */
  async getStockCount(productId) {
    try {
      const stockKey = this.getStockCountKey(productId);
      const count = await this.redis.getClient().get(stockKey);
      return count ? parseInt(count) : 0;
    } catch (error) {
      console.error("❌ Error getting stock count:", error.message);
      return 0;
    }
  }

  /**
   * Get all stock counts
   */
  async getAllStockCounts() {
    try {
      const pattern = "inventory:stock:*";
      const keys = await this.redis.getClient().keys(pattern);

      const stocks = {};
      for (const key of keys) {
        const productId = key.replace("inventory:stock:", "");
        const count = await this.redis.getClient().get(key);
        stocks[productId] = count ? parseInt(count) : 0;
      }

      return stocks;
    } catch (error) {
      console.error("❌ Error getting all stock counts:", error.message);
      return {};
    }
  }

  /**
   * Archive sold credential to sales ledger
   */
  async archiveSoldCredential(productId, credential, orderId, customerId) {
    const transactionId = this.generateTransactionId();

    return this.als.run({ transactionId }, async () => {
      try {
        const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        const key = this.getSalesLedgerKey(date);

        const saleRecord = {
          transactionId,
          productId,
          orderId,
          customerId,
          credential,
          soldAt: new Date().toISOString(),
        };

        // Add to Redis Hash (one entry per order)
        await this.redis
          .getClient()
          .hSet(key, orderId, JSON.stringify(saleRecord));

        // Set expiry: 90 days retention
        await this.redis.getClient().expire(key, 90 * 24 * 60 * 60);

        await this.logTransaction("ARCHIVE_SOLD", {
          productId,
          orderId,
          customerId,
        });

        return { success: true };
      } catch (error) {
        console.error("❌ Error archiving credential:", error.message);
        return { success: false, error: error.message };
      }
    });
  }

  /**
   * Get sales report
   */
  async getSalesReport(days = 7) {
    try {
      const today = new Date();
      const sales = {};
      let totalSales = 0;

      // Query last N days
      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];

        const key = this.getSalesLedgerKey(dateStr);
        const records = await this.redis.getClient().hGetAll(key);

        for (const [orderId, recordStr] of Object.entries(records)) {
          try {
            const record = JSON.parse(recordStr);
            sales[record.productId] = (sales[record.productId] || 0) + 1;
            totalSales++;
          } catch (e) {
            // Skip invalid records
          }
        }
      }

      return {
        period: `Last ${days} days`,
        totalSales,
        salesByProduct: sales,
      };
    } catch (error) {
      console.error("❌ Error generating sales report:", error.message);
      return null;
    }
  }

  /**
   * Check if Redis is ready
   */
  ready() {
    return this.isReady && this.redis.isReady();
  }
}

module.exports = RedisInventoryStorage;
