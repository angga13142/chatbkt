/**
 * Redis Client Manager
 * Handles Redis connection with pool, error handling, and graceful shutdown
 */

const { createClient } = require("redis");

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    try {
      // Redis configuration from environment
      const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

      this.client = createClient({
        url: redisUrl,
        password: process.env.REDIS_PASSWORD,
        socket: {
          connectTimeout: 10000,
          reconnectStrategy: (retries) => {
            if (retries > this.maxReconnectAttempts) {
              console.error(
                "❌ Redis: Max reconnect attempts reached, giving up"
              );
              return false;
            }

            // Exponential backoff with jitter
            const jitter = Math.floor(Math.random() * 200);
            const delay = Math.min(Math.pow(2, retries) * 100, 3000);

            console.log(
              `🔄 Redis: Reconnect attempt ${retries}/${
                this.maxReconnectAttempts
              } in ${delay + jitter}ms`
            );
            return delay + jitter;
          },
        },
      });

      // Event handlers
      this.client.on("error", (err) => {
        console.error("❌ Redis Client Error:", err.message);
        this.isConnected = false;
      });

      this.client.on("connect", () => {
        console.log("🔄 Redis: Connecting...");
      });

      this.client.on("ready", () => {
        console.log("✅ Redis: Client ready");
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.client.on("reconnecting", () => {
        console.log("🔄 Redis: Reconnecting...");
        this.reconnectAttempts++;
      });

      this.client.on("end", () => {
        console.log("⚠️  Redis: Connection closed");
        this.isConnected = false;
      });

      // Connect to Redis
      await this.client.connect();

      console.log("✅ Redis connected successfully");
      return true;
    } catch (error) {
      console.error("❌ Failed to connect to Redis:", error.message);
      console.log("⚠️  Running in fallback mode (in-memory sessions)");
      return false;
    }
  }

  /**
   * Get Redis client instance
   * @returns {Object} Redis client
   */
  getClient() {
    return this.client;
  }

  /**
   * Check if Redis is connected
   * @returns {boolean}
   */
  isReady() {
    return this.isConnected && this.client;
  }

  /**
   * Graceful shutdown
   */
  async disconnect() {
    if (this.client) {
      try {
        console.log("🔄 Closing Redis connection...");
        await this.client.quit();
        console.log("✅ Redis connection closed gracefully");
      } catch (error) {
        console.error("❌ Error closing Redis connection:", error.message);
        // Force close if graceful quit fails
        if (this.client) {
          await this.client.disconnect();
        }
      }
    }
  }

  /**
   * Health check
   * @returns {boolean}
   */
  async ping() {
    try {
      if (!this.isReady()) {
        return false;
      }
      const result = await this.client.ping();
      return result === "PONG";
    } catch (error) {
      console.error("❌ Redis ping failed:", error.message);
      return false;
    }
  }
}

// Singleton instance
const redisClient = new RedisClient();

module.exports = redisClient;
