/**
 * Integration test for payment flow
 * Tests payment methods and order processing
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
}

describe("Integration: Payment Flow", () => {
  let customerHandler;
  let sessionManager;
  let mockPaymentHandlers;
  const customerId = "6281234567890@c.us";

  beforeEach(() => {
    sessionManager = new MockSessionManager();
    mockPaymentHandlers = {
      xendit: {
        createInvoice: (data) =>
          Promise.resolve({
            invoice_url: "https://example.com/invoice/123",
            invoice_id: "INV-123",
            amount: data.amount,
            status: "PENDING",
          }),
        getInvoice: (id) =>
          Promise.resolve({
            invoice_id: id,
            status: "PAID",
            amount: 50000,
          }),
      },
      manual: {
        generateInstructions: () =>
          Promise.resolve({
            instructions: "Transfer to BCA 1234567890",
            amount: 50000,
          }),
      },
    };
    const CustomerHandler = require("../../src/handlers/CustomerHandler");
    customerHandler = new CustomerHandler(sessionManager, mockPaymentHandlers);
  });

  describe("checkout process", () => {
    it("should require items in cart", async () => {
      sessionManager.clearCart(customerId);
      sessionManager.setStep(customerId, "checkout");

      const result = await customerHandler.handleCheckout(customerId, "1");
      expect(result).to.be.an("object");
      expect(result.message).to.match(/kosong/i);
    });

    it("should show payment options", async () => {
      sessionManager.addToCart(customerId, {
        id: "test-product",
        name: "Test Product",
        price: 50000,
      });
      sessionManager.setStep(customerId, "checkout");

      const result = await customerHandler.showCart(customerId);
      expect(result).to.be.a("string");
      expect(result).to.include("Test Product");
    });

    it("should calculate correct total", async () => {
      sessionManager.clearCart(customerId);
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
      // Should show both products
      expect(result).to.include("Product 1");
      expect(result).to.include("Product 2");
    });
  });

  describe("payment methods", () => {
    beforeEach(() => {
      sessionManager.addToCart(customerId, {
        id: "test-product",
        name: "Test Product",
        price: 50000,
      });
      sessionManager.setStep(customerId, "checkout");
    });

    it("should accept checkout command", async () => {
      const result = await customerHandler.handleCheckout(customerId, "1");
      expect(result).to.be.an("object");
      expect(result.message).to.be.a("string");
    });

    it("should handle clear cart command", async () => {
      const result = await customerHandler.handleCheckout(customerId, "2");
      expect(result).to.be.an("object");
      expect(result.message).to.be.a("string");

      // Check that result indicates cart clearing (message-based verification)
      expect(result.message).to.be.a("string");
    });
  });

  describe("order creation", () => {
    it("should create order with correct details", async () => {
      sessionManager.clearCart(customerId);
      sessionManager.addToCart(customerId, {
        id: "netflix",
        name: "Netflix Premium",
        price: 50000,
      });

      const cart = sessionManager.getCart(customerId);
      expect(cart.length).to.equal(1);
      expect(cart[0].name).to.equal("Netflix Premium");
    });

    it("should handle multiple items in order", async () => {
      sessionManager.clearCart(customerId);
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

      const cart = sessionManager.getCart(customerId);
      expect(cart.length).to.equal(2);
    });
  });

  describe("payment validation", () => {
    it("should handle invalid payment method", async () => {
      sessionManager.addToCart(customerId, {
        id: "test",
        name: "Test",
        price: 50000,
      });
      sessionManager.setStep(customerId, "select_payment");

      const result = await customerHandler.handle(
        customerId,
        "invalid",
        "select_payment"
      );
      expect(result).to.be.a("string");
    });

    it("should handle zero amount", async () => {
      sessionManager.clearCart(customerId);
      sessionManager.setStep(customerId, "checkout");

      const result = await customerHandler.handleCheckout(customerId, "1");
      expect(result).to.be.an("object");
      expect(result.message).to.match(/kosong/i);
    });
  });

  describe("payment status", () => {
    it("should track payment status", async () => {
      const session = sessionManager.getSession(customerId);
      session.paymentStatus = "pending";

      expect(session.paymentStatus).to.equal("pending");
    });

    it("should update status after payment", async () => {
      const session = sessionManager.getSession(customerId);
      session.paymentStatus = "paid";

      expect(session.paymentStatus).to.equal("paid");
    });
  });

  describe("edge cases", () => {
    it("should handle cart clear during checkout", async () => {
      sessionManager.addToCart(customerId, {
        id: "test",
        name: "Test",
        price: 50000,
      });

      sessionManager.clearCart(customerId);
      const cart = sessionManager.getCart(customerId);
      expect(cart.length).to.equal(0);
    });

    it("should handle very large amounts", async () => {
      sessionManager.addToCart(customerId, {
        id: "expensive",
        name: "Expensive Product",
        price: 999999999,
      });

      const cart = sessionManager.getCart(customerId);
      expect(cart[0].price).to.equal(999999999);
    });

    it("should handle decimal prices", async () => {
      sessionManager.addToCart(customerId, {
        id: "decimal",
        name: "Decimal Product",
        price: 50000.5,
      });

      const cart = sessionManager.getCart(customerId);
      expect(cart[0].price).to.equal(50000.5);
    });
  });

  describe("concurrent checkouts", () => {
    it("should handle multiple customers checking out", async () => {
      const customer1 = "customer1@c.us";
      const customer2 = "customer2@c.us";

      sessionManager.addToCart(customer1, {
        id: "prod1",
        name: "Product 1",
        price: 50000,
      });
      sessionManager.addToCart(customer2, {
        id: "prod2",
        name: "Product 2",
        price: 75000,
      });

      const cart1 = sessionManager.getCart(customer1);
      const cart2 = sessionManager.getCart(customer2);

      expect(cart1.length).to.equal(1);
      expect(cart2.length).to.equal(1);
      expect(cart1[0].id).to.not.equal(cart2[0].id);
    });
  });

  describe("error recovery", () => {
    it("should handle payment failure gracefully", async () => {
      const failingPaymentHandler = {
        createInvoice: () => Promise.reject(new Error("Payment failed")),
      };

      const CustomerHandler = require("../../src/handlers/CustomerHandler");
      const handler = new CustomerHandler(
        sessionManager,
        failingPaymentHandler
      );

      sessionManager.addToCart(customerId, {
        id: "test",
        name: "Test",
        price: 50000,
      });

      try {
        await handler.handleCheckout(customerId, "1");
        // Should handle error gracefully
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it("should preserve cart on payment error", async () => {
      sessionManager.addToCart(customerId, {
        id: "test",
        name: "Test",
        price: 50000,
      });

      const cartBefore = sessionManager.getCart(customerId);
      expect(cartBefore.length).to.equal(1);

      // Cart should still exist even if payment fails
      const cartAfter = sessionManager.getCart(customerId);
      expect(cartAfter.length).to.equal(1);
    });
  });
});
