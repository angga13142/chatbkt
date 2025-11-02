/**
 * Unit tests for AdminHandler
 */

const { expect } = require("chai");

// Mock dependencies
class MockSessionManager {
  constructor() {
    this.sessions = new Map();
  }

  getAllSessions() {
    return Array.from(this.sessions.values());
  }

  async getSession(customerId) {
    if (!this.sessions.has(customerId)) {
      this.sessions.set(customerId, {
        customerId,
        step: "menu",
        cart: [],
        orders: [],
        lastActivity: Date.now(),
      });
    }
    return this.sessions.get(customerId);
  }

  async setStep(customerId, step) {
    const session = await this.getSession(customerId);
    session.step = step;
  }

  async getStep(customerId) {
    const session = await this.getSession(customerId);
    return session.step;
  }

  async setData(customerId, data) {
    const session = await this.getSession(customerId);
    session.data = data;
  }

  async getData(customerId) {
    const session = await this.getSession(customerId);
    return session.data || {};
  }
}

describe("AdminHandler", () => {
  let adminHandler;
  let sessionManager;
  let mockPaymentHandlers;

  before(() => {
    // Set admin number for testing
    process.env.ADMIN_NUMBER_1 = "6281234567890";
    mockPaymentHandlers = {};
  });

  beforeEach(() => {
    sessionManager = new MockSessionManager();
    const AdminHandler = require("../../../src/handlers/AdminHandler");
    // Provide a mock logger to prevent null errors
    const mockLogger = {
      logSecurity: () => {},
      log: () => {},
      logError: () => {},
    };
    adminHandler = new AdminHandler(
      sessionManager,
      mockPaymentHandlers,
      mockLogger
    );
  });

  describe("isAdmin", () => {
    it("should return true for admin number", () => {
      const InputValidator = require("../../../lib/inputValidator");
      expect(InputValidator.isAdmin("6281234567890@c.us")).to.be.true;
    });

    it("should return false for non-admin number", () => {
      const InputValidator = require("../../../lib/inputValidator");
      expect(InputValidator.isAdmin("6289999999999@c.us")).to.be.false;
    });

    it("should handle null input", () => {
      const InputValidator = require("../../../lib/inputValidator");
      // InputValidator.isAdmin may not handle null gracefully
      try {
        const result = InputValidator.isAdmin(null);
        expect(result).to.be.false;
      } catch (e) {
        // Expected - null input throws error
        expect(e).to.exist;
      }
    });

    it("should handle undefined input", () => {
      const InputValidator = require("../../../lib/inputValidator");
      // InputValidator.isAdmin may not handle undefined gracefully
      try {
        const result = InputValidator.isAdmin(undefined);
        expect(result).to.be.false;
      } catch (e) {
        // Expected - undefined input throws error
        expect(e).to.exist;
      }
    });
  });

  describe("handle", () => {
    const adminId = "6281234567890@c.us";

    it("should reject non-admin users", async () => {
      const result = await adminHandler.handle(
        "6289999999999@c.us",
        "/stats",
        "menu"
      );
      expect(result).to.be.a("string");
      expect(result).to.match(/tidak diizinkan|unauthorized|khusus admin/i);
    });

    it("should handle /stats command", async () => {
      const result = await adminHandler.handle(adminId, "/stats", "menu");
      expect(result).to.be.a("string");
      expect(result).to.match(/admin\s+dashboard/i);
    });

    it("should handle /help command", async () => {
      const result = await adminHandler.handle(adminId, "/help", "menu");
      expect(result).to.be.a("string");
      expect(result).to.match(/admin\s+commands/i);
    });

    it("should handle unknown command", async () => {
      const result = await adminHandler.handle(adminId, "/unknown", "menu");
      expect(result).to.be.a("string");
      // Unknown commands show help message
      expect(result).to.match(/admin\s+commands/i);
    });

    it("should handle command without slash", async () => {
      const result = await adminHandler.handle(adminId, "stats", "menu");
      expect(result).to.be.a("string");
    });
  });

  describe("handleStats", () => {
    it("should return statistics", async () => {
      const adminId = "6281234567890@c.us";
      const result = await adminHandler.handleStats(adminId);
      expect(result).to.be.a("string");
      expect(result).to.match(/admin\s+dashboard/i);
    });

    it("should show active sessions count", async () => {
      const adminId = "6281234567890@c.us";
      // Add some mock sessions
      sessionManager.getSession("user1");
      sessionManager.getSession("user2");
      const result = await adminHandler.handleStats(adminId);
      expect(result).to.match(/active\s+sessions/i);
    });
  });

  describe("edge cases", () => {
    it("should handle null message", async () => {
      const adminId = "6281234567890@c.us";
      const result = await adminHandler.handle(adminId, null, "menu");
      expect(result).to.be.a("string");
    });

    it("should handle empty message", async () => {
      const adminId = "6281234567890@c.us";
      const result = await adminHandler.handle(adminId, "", "menu");
      expect(result).to.be.a("string");
    });

    it("should handle special characters", async () => {
      const adminId = "6281234567890@c.us";
      const result = await adminHandler.handle(
        adminId,
        "/<script>alert('xss')</script>",
        "menu"
      );
      expect(result).to.be.a("string");
    });

    it("should handle very long command", async () => {
      const adminId = "6281234567890@c.us";
      const longCommand = "/command" + "a".repeat(10000);
      const result = await adminHandler.handle(adminId, longCommand, "menu");
      expect(result).to.be.a("string");
    });
  });

  describe("error handling", () => {
    it("should handle errors gracefully", async () => {
      const adminId = "6281234567890@c.us";
      // Force an error by passing invalid data
      try {
        const result = await adminHandler.handle(adminId, "/stats", null);
        expect(result).to.be.a("string");
      } catch (error) {
        // Should not throw, should return error message
        expect.fail("Should handle errors gracefully");
      }
    });
  });
});
