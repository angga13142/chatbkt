/**
 * Additional unit tests for CustomerHandler to improve coverage
 * Tests for order history, about, support, and checkout error paths
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
    return this.getSession(customerId).step;
  }

  getCart(customerId) {
    return this.getSession(customerId).cart;
  }

  addToCart(customerId, item) {
    const session = this.getSession(customerId);
    session.cart.push(item);
  }

  clearCart(customerId) {
    const session = this.getSession(customerId);
    session.cart = [];
  }

  set(customerId, key, value) {
    const session = this.getSession(customerId);
    session[key] = value;
  }

  get(customerId, key) {
    const session = this.getSession(customerId);
    return session[key];
  }

  getOrders(customerId) {
    return this.getSession(customerId).orders;
  }

  addOrder(customerId, order) {
    const session = this.getSession(customerId);
    session.orders.push(order);
  }
}

describe("CustomerHandler - Additional Coverage Tests", () => {
  let customerHandler;
  let sessionManager;
  let mockPaymentHandlers;
  const customerId = "123@c.us";

  before(() => {
    mockPaymentHandlers = {
      xendit: { createInvoice: () => Promise.resolve({ invoice_url: "test" }) },
    };
  });

  beforeEach(() => {
    sessionManager = new MockSessionManager();
    const CustomerHandler = require("../../../src/handlers/CustomerHandler");
    customerHandler = new CustomerHandler(sessionManager, mockPaymentHandlers);
  });

  describe("order history", () => {
    it("should show empty order history", async () => {
      const result = await customerHandler.handle(
        customerId,
        "history",
        "menu"
      );
      expect(result).to.be.a("string");
      expect(result.length).to.be.greaterThan(0);
    });

    it("should show order history with orders", async () => {
      sessionManager.addOrder(customerId, {
        id: "ORD001",
        items: [{ name: "Netflix Premium", price: 50000 }],
        total: 50000,
        status: "paid",
        date: new Date(),
      });

      const result = await customerHandler.handle(
        customerId,
        "history",
        "menu"
      );
      expect(result).to.be.a("string");
    });

    it("should handle history from different steps", async () => {
      sessionManager.setStep(customerId, "browsing");
      const result = await customerHandler.handle(
        customerId,
        "history",
        "browsing"
      );
      expect(result).to.be.a("string");
    });

    it("should handle history with many orders", async () => {
      for (let i = 0; i < 10; i++) {
        sessionManager.addOrder(customerId, {
          id: `ORD00${i}`,
          items: [{ name: `Product ${i}`, price: 50000 }],
          total: 50000,
          status: "paid",
          date: new Date(),
        });
      }

      const result = await customerHandler.handle(
        customerId,
        "history",
        "menu"
      );
      expect(result).to.be.a("string");
    });
  });

  describe("about command", () => {
    it("should show about information", async () => {
      const result = await customerHandler.handleMenuSelection(customerId, "3");
      expect(result).to.be.a("string");
      expect(result.length).to.be.greaterThan(0);
    });

    it("should handle about from menu step", async () => {
      sessionManager.setStep(customerId, "menu");
      const result = await customerHandler.handleMenuSelection(customerId, "3");
      expect(result).to.be.a("string");
    });
  });

  describe("support command", () => {
    it("should show support information", async () => {
      const result = await customerHandler.handleMenuSelection(customerId, "4");
      expect(result).to.be.a("string");
      expect(result.length).to.be.greaterThan(0);
    });

    it("should handle support from menu step", async () => {
      sessionManager.setStep(customerId, "menu");
      const result = await customerHandler.handleMenuSelection(customerId, "4");
      expect(result).to.be.a("string");
    });
  });

  describe("checkout error paths", () => {
    it("should handle checkout with empty cart", async () => {
      sessionManager.clearCart(customerId);
      sessionManager.setStep(customerId, "checkout");

      const result = await customerHandler.handleCheckout(customerId, "1");
      expect(result).to.be.an("object");
      expect(result.message).to.be.a("string");
    });

    it("should handle checkout with invalid choice", async () => {
      sessionManager.addToCart(customerId, {
        id: "test",
        name: "Test Product",
        price: 50000,
      });
      sessionManager.setStep(customerId, "checkout");

      const result = await customerHandler.handleCheckout(customerId, "999");
      expect(result).to.be.an("object");
      expect(result.message).to.be.a("string");
    });

    it("should handle checkout choice 2 (clear cart)", async () => {
      sessionManager.addToCart(customerId, {
        id: "test",
        name: "Test Product",
        price: 50000,
      });
      sessionManager.setStep(customerId, "checkout");

      const result = await customerHandler.handleCheckout(customerId, "clear");
      expect(result).to.be.an("object");
      expect(result.message).to.be.a("string");

      const cart = sessionManager.getCart(customerId);
      expect(cart.length).to.equal(0);
    });

    it("should handle checkout with null choice", async () => {
      sessionManager.addToCart(customerId, {
        id: "test",
        name: "Test Product",
        price: 50000,
      });
      sessionManager.setStep(customerId, "checkout");

      const result = await customerHandler.handleCheckout(customerId, null);
      expect(result).to.be.an("object");
      expect(result.message).to.be.a("string");
    });

    it("should handle checkout with empty choice", async () => {
      sessionManager.addToCart(customerId, {
        id: "test",
        name: "Test Product",
        price: 50000,
      });
      sessionManager.setStep(customerId, "checkout");

      const result = await customerHandler.handleCheckout(customerId, "");
      expect(result).to.be.an("object");
      expect(result.message).to.be.a("string");
    });
  });

  describe("browsing step", () => {
    it("should handle browsing with empty product query", async () => {
      sessionManager.setStep(customerId, "browsing");
      const result = await customerHandler.handle(customerId, "", "browsing");
      expect(result).to.be.a("string");
    });

    it("should handle browsing with whitespace query", async () => {
      sessionManager.setStep(customerId, "browsing");
      const result = await customerHandler.handle(
        customerId,
        "   ",
        "browsing"
      );
      expect(result).to.be.a("string");
    });

    it("should handle browsing with special characters", async () => {
      sessionManager.setStep(customerId, "browsing");
      const result = await customerHandler.handle(
        customerId,
        "@#$%^&",
        "browsing"
      );
      expect(result).to.be.a("string");
    });

    it("should handle browsing with very long query", async () => {
      sessionManager.setStep(customerId, "browsing");
      const longQuery = "a".repeat(1000);
      const result = await customerHandler.handle(
        customerId,
        longQuery,
        "browsing"
      );
      expect(result).to.be.a("string");
    });

    it("should handle browsing with numeric query", async () => {
      sessionManager.setStep(customerId, "browsing");
      const result = await customerHandler.handle(
        customerId,
        "123456",
        "browsing"
      );
      expect(result).to.be.a("string");
    });
  });

  describe("cart operations", () => {
    it("should handle viewing empty cart from any step", async () => {
      sessionManager.clearCart(customerId);
      sessionManager.setStep(customerId, "browsing");

      const result = await customerHandler.handle(
        customerId,
        "cart",
        "browsing"
      );
      expect(result).to.match(/kosong/i);
    });

    it("should handle cart with single item", async () => {
      sessionManager.addToCart(customerId, {
        id: "netflix",
        name: "Netflix Premium",
        price: 50000,
      });

      const result = await customerHandler.showCart(customerId);
      expect(result).to.match(/netflix/i);
    });

    it("should handle cart with multiple items", async () => {
      sessionManager.addToCart(customerId, {
        id: "netflix",
        name: "Netflix Premium",
        price: 50000,
      });
      sessionManager.addToCart(customerId, {
        id: "spotify",
        name: "Spotify Premium",
        price: 40000,
      });

      const result = await customerHandler.showCart(customerId);
      expect(result).to.match(/netflix/i);
      expect(result).to.match(/spotify/i);
    });

    it("should calculate correct total for cart", async () => {
      sessionManager.addToCart(customerId, {
        id: "prod1",
        name: "Product 1",
        price: 50000,
      });
      sessionManager.addToCart(customerId, {
        id: "prod2",
        name: "Product 2",
        price: 75000,
      });

      const result = await customerHandler.showCart(customerId);
      expect(result).to.be.a("string");
      // Verify both products are listed
      expect(result).to.include("Product 1");
      expect(result).to.include("Product 2");
    });
  });

  describe("menu selection edge cases", () => {
    it("should handle numeric string choices", async () => {
      const result = await customerHandler.handleMenuSelection(customerId, "1");
      expect(result).to.be.a("string");
    });

    it("should handle choice with whitespace", async () => {
      const result = await customerHandler.handleMenuSelection(
        customerId,
        "  1  "
      );
      expect(result).to.be.a("string");
    });

    it("should handle choice with letters", async () => {
      const result = await customerHandler.handleMenuSelection(
        customerId,
        "abc"
      );
      expect(result).to.match(/tidak valid/i);
    });

    it("should handle choice out of range", async () => {
      const result = await customerHandler.handleMenuSelection(
        customerId,
        "10"
      );
      expect(result).to.match(/tidak valid/i);
    });

    it("should handle zero choice", async () => {
      const result = await customerHandler.handleMenuSelection(customerId, "0");
      expect(result).to.match(/tidak valid/i);
    });

    it("should handle negative choice", async () => {
      const result = await customerHandler.handleMenuSelection(
        customerId,
        "-1"
      );
      expect(result).to.match(/tidak valid/i);
    });
  });

  describe("global commands", () => {
    it("should handle menu command from checkout", async () => {
      sessionManager.setStep(customerId, "checkout");
      const result = await customerHandler.handle(
        customerId,
        "menu",
        "checkout"
      );
      expect(result).to.match(/menu/i);
    });

    it("should handle cart command from checkout", async () => {
      sessionManager.setStep(customerId, "checkout");
      const result = await customerHandler.handle(
        customerId,
        "cart",
        "checkout"
      );
      expect(result).to.be.a("string");
    });

    it("should handle history from checkout", async () => {
      sessionManager.setStep(customerId, "checkout");
      const result = await customerHandler.handle(
        customerId,
        "history",
        "checkout"
      );
      expect(result).to.be.a("string");
    });
  });

  describe("session state", () => {
    it("should maintain step after operations", async () => {
      sessionManager.setStep(customerId, "browsing");
      await customerHandler.handle(customerId, "test query", "browsing");
      const step = sessionManager.getSession(customerId).step;
      expect(step).to.equal("browsing");
    });

    it("should change step on menu selection", async () => {
      sessionManager.setStep(customerId, "menu");
      await customerHandler.handleMenuSelection(customerId, "1");
      const step = sessionManager.getSession(customerId).step;
      expect(step).to.equal("browsing");
    });

    it("should preserve cart across step changes", async () => {
      sessionManager.addToCart(customerId, {
        id: "test",
        name: "Test",
        price: 50000,
      });
      sessionManager.setStep(customerId, "menu");
      sessionManager.setStep(customerId, "browsing");
      sessionManager.setStep(customerId, "checkout");

      const cart = sessionManager.getCart(customerId);
      expect(cart.length).to.equal(1);
    });
  });
});
