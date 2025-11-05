/**
 * Smoke Tests for RedisClient
 * Basic coverage for Redis singleton instance
 */

const redisClient = require("../../../lib/redisClient");

describe("RedisClient", () => {
  describe("instance", () => {
    test("should be defined", () => {
      expect(redisClient).toBeDefined();
    });

    test("should have default values when not connected", () => {
      expect(redisClient.client).toBeNull();
      expect(redisClient.isConnected).toBe(false);
    });
  });

  describe("isReady()", () => {
    test("should return false when not connected", () => {
      expect(redisClient.isReady()).toBe(false);
    });
  });

  describe("getClient()", () => {
    test("should return null when not connected", () => {
      expect(redisClient.getClient()).toBeNull();
    });
  });
});
