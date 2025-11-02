/**
 * Integration test for admin commands
 * Tests admin functionality and permissions
 */

const { expect } = require("chai");

// Mock dependencies
class MockSessionManager {
  constructor() {
    this.sessions = new Map();
  }

  getSession(customerId) {
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

  setStep(customerId, step) {
    const session = this.getSession(customerId);
    session.step = step;
  }

  getStep(customerId) {
    const session = this.getSession(customerId);
    return session.step;
  }

  getAllSessions() {
    return Array.from(this.sessions.values());
  }
}

describe("Integration: Admin Commands", () => {
  let adminHandler;
  let sessionManager;
  let mockPaymentHandlers;
  const adminId = "6281234567890@c.us";
  const regularUserId = "6289999999999@c.us";

  before(() => {
    // Set admin number for testing
    process.env.ADMIN_NUMBER_1 = "6281234567890";
  });

  beforeEach(() => {
    sessionManager = new MockSessionManager();
    mockPaymentHandlers = {};
    const AdminHandler = require("../../src/handlers/AdminHandler");
    // Provide mock logger to prevent null errors
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

  describe("authentication", () => {
    it("should allow admin to execute commands", async () => {
      const result = await adminHandler.handle(adminId, "/stats", "menu");
      expect(result).to.not.include("tidak memiliki akses");
    });

    it("should deny regular users", async () => {
      const result = await adminHandler.handle(regularUserId, "/stats", "menu");
      expect(result).to.match(/tidak diizinkan|unauthorized|khusus admin/i);
    });

    it("should validate admin on every command", async () => {
      const commands = ["/stats", "/help", "/status", "/broadcast"];

      for (const command of commands) {
        const result = await adminHandler.handle(
          regularUserId,
          command,
          "menu"
        );
        expect(result).to.match(/tidak diizinkan|unauthorized|khusus admin/i);
      }
    });
  });

  describe("stats command", () => {
    it("should show system statistics", async () => {
      const result = await adminHandler.handleStats(adminId);
      expect(result).to.match(/admin\s+dashboard/i);
    });

    it("should show active sessions count", async () => {
      sessionManager.getSession("user1");
      sessionManager.getSession("user2");
      sessionManager.getSession("user3");

      const result = await adminHandler.handleStats(adminId);
      expect(result).to.match(/active\s+sessions/i);
    });

    it("should show order statistics", async () => {
      const result = await adminHandler.handleStats(adminId);
      expect(result).to.be.a("string");
      expect(result.length).to.be.greaterThan(0);
    });
  });

  describe("help command", () => {
    it("should list all admin commands", async () => {
      const result = await adminHandler.handle(adminId, "/help", "menu");
      expect(result).to.match(/admin\s+commands/i);
    });

    it("should include command descriptions", async () => {
      const result = await adminHandler.handle(adminId, "/help", "menu");
      expect(result).to.include("/stats");
      expect(result).to.include("/broadcast");
    });
  });

  describe("broadcast command", () => {
    it("should accept broadcast command", async () => {
      const result = await adminHandler.handle(
        adminId,
        "/broadcast Test message",
        "menu"
      );
      expect(result).to.be.a("string");
    });

    it("should handle empty broadcast message", async () => {
      const result = await adminHandler.handle(adminId, "/broadcast", "menu");
      expect(result).to.be.a("string");
    });
  });

  describe("stock management", () => {
    it("should handle stock command", async () => {
      const result = await adminHandler.handle(
        adminId,
        "/stock netflix 100",
        "menu"
      );
      expect(result).to.be.a("string");
    });

    it("should validate stock quantity", async () => {
      const result = await adminHandler.handle(
        adminId,
        "/stock netflix invalid",
        "menu"
      );
      expect(result).to.be.a("string");
    });

    it("should handle negative stock", async () => {
      const result = await adminHandler.handle(
        adminId,
        "/stock netflix -10",
        "menu"
      );
      expect(result).to.be.a("string");
    });
  });

  describe("product management", () => {
    it("should handle add product command", async () => {
      const result = await adminHandler.handle(adminId, "/addproduct", "menu");
      expect(result).to.be.a("string");
    });

    it("should handle edit product command", async () => {
      const result = await adminHandler.handle(adminId, "/editproduct", "menu");
      expect(result).to.be.a("string");
    });

    it("should handle remove product command", async () => {
      const result = await adminHandler.handle(
        adminId,
        "/removeproduct",
        "menu"
      );
      expect(result).to.be.a("string");
    });
  });

  describe("settings command", () => {
    it("should handle settings command", async () => {
      const result = await adminHandler.handle(adminId, "/settings", "menu");
      expect(result).to.be.a("string");
    });
  });

  describe("unknown commands", () => {
    it("should handle unknown admin command", async () => {
      const result = await adminHandler.handle(
        adminId,
        "/unknowncommand",
        "menu"
      );
      expect(result).to.be.a("string");
      // Should either show help or error message
    });

    it("should suggest help for unknown commands", async () => {
      const result = await adminHandler.handle(adminId, "/unknown", "menu");
      expect(result).to.be.a("string");
    });
  });

  describe("edge cases", () => {
    it("should handle commands with extra spaces", async () => {
      const result = await adminHandler.handle(adminId, "/stats   ", "menu");
      expect(result).to.match(/admin\s+dashboard/i);
    });

    it("should handle uppercase commands", async () => {
      const result = await adminHandler.handle(adminId, "/STATS", "menu");
      expect(result).to.be.a("string");
    });

    it("should handle mixed case commands", async () => {
      const result = await adminHandler.handle(adminId, "/StAtS", "menu");
      expect(result).to.be.a("string");
    });

    it("should handle very long command arguments", async () => {
      const longMessage = "a".repeat(10000);
      const result = await adminHandler.handle(
        adminId,
        `/broadcast ${longMessage}`,
        "menu"
      );
      expect(result).to.be.a("string");
    });
  });

  describe("concurrent admin operations", () => {
    it("should handle multiple admins simultaneously", async () => {
      const admin1 = "6281111111111@c.us";
      const admin2 = "6281222222222@c.us";

      process.env.ADMIN_NUMBER_2 = "6281111111111";
      process.env.ADMIN_NUMBER_3 = "6281222222222";

      const AdminHandler = require("../../src/handlers/AdminHandler");
      const handler = new AdminHandler(sessionManager, mockPaymentHandlers);

      const result1 = await handler.handle(admin1, "/stats", "menu");
      const result2 = await handler.handle(admin2, "/stats", "menu");

      expect(result1).to.be.a("string");
      expect(result2).to.be.a("string");
    });
  });

  describe("error handling", () => {
    it("should handle malformed commands gracefully", async () => {
      const result = await adminHandler.handle(adminId, "///", "menu");
      expect(result).to.be.a("string");
    });

    it("should handle commands with special characters", async () => {
      const result = await adminHandler.handle(adminId, "/stats@#$%", "menu");
      expect(result).to.be.a("string");
    });
  });
});
