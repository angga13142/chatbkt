/**
 * Inventory Service Factory
 * Creates appropriate inventory storage based on Redis availability
 */

const RedisInventoryStorage = require("./RedisInventoryStorage");
const InventoryManager = require("./InventoryManager");

class InventoryService {
  static async create(redisClient = null) {
    // Try Redis first
    if (redisClient && redisClient.isReady()) {
      try {
        const redisStorage = new RedisInventoryStorage(redisClient);
        const initialized = await redisStorage.initialize();

        if (initialized) {
          console.log("✅ Inventory: Using Redis storage (FIFO queue)");
          return redisStorage;
        }
      } catch (error) {
        console.error("❌ Redis inventory init failed:", error.message);
      }
    }

    // Fallback to file-based
    console.log("⚠️  Inventory: Using file storage (fallback)");
    return new InventoryManager();
  }

  /**
   * Get credential from Redis or file
   * Used by productDelivery.js
   */
  static async getCredential(storage, productId) {
    if (storage instanceof RedisInventoryStorage) {
      return await storage.getCredential(productId);
    }

    // File-based (original method from InventoryManager)
    const fs = require("fs");
    const path = require("path");

    try {
      const filepath = path.join("./products_data", `${productId}.txt`);

      if (!fs.existsSync(filepath)) {
        return null;
      }

      const content = fs.readFileSync(filepath, "utf-8");
      const lines = content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length === 0) {
        return null;
      }

      // Get first credential
      const credential = lines[0];
      const remainingLines = lines.slice(1);

      // Update file
      fs.writeFileSync(filepath, remainingLines.join("\n") + "\n", "utf-8");

      return credential;
    } catch (error) {
      console.error("❌ Error getting credential:", error.message);
      return null;
    }
  }
}

module.exports = InventoryService;
