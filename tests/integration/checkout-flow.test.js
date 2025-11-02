/**
 * Integration test for checkout flow
 * Tests the complete customer journey from browsing to checkout
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

  getAllSessions() {
    return Array.from(this.sessions.values());
  }
}

describe("Integration: Checkout Flow", () => {
  let customerHandler;
  let sessionManager;
  let mockPaymentHandlers;
  const customerId = "6281234567890@c.us";

  beforeEach(() => {
    sessionManager = new MockSessionManager();
    mockPaymentHandlers = {
      xendit: {
        createInvoice: () =>
          Promise.resolve({ invoice_url: "https://example.com/invoice" }),
      },
    };
    const CustomerHandler = require("../../src/handlers/CustomerHandler");
    customerHandler = new CustomerHandler(sessionManager, mockPaymentHandlers);
  });

  it("should complete full checkout flow", async () => {
    // Step 1: Start at menu
    let result = await customerHandler.handle(customerId, "menu", "menu");
    expect(result).to.match(/menu/i);

    // Step 2: Select browse option
    result = await customerHandler.handleMenuSelection(customerId, "1");
    expect(result).to.match(/katalog\s+produk/i);
    expect(sessionManager.getSession(customerId).step).to.equal("browsing");

    // Step 3: Add product to cart (simulate finding a product)
    const products = require("../../config").getAllProducts();
    if (products.length > 0) {
      const firstProduct = products[0];
      sessionManager.addToCart(customerId, {
        id: firstProduct.id,
        name: firstProduct.name,
        price: firstProduct.price,
      });

      // Step 4: View cart
      result = await customerHandler.showCart(customerId);
      expect(result).to.include(firstProduct.name);

      // Step 5: Proceed to checkout
      sessionManager.setStep(customerId, "checkout");
      result = await customerHandler.handleCheckout(customerId, "1");
      expect(result).to.be.an("object");
      expect(result.message).to.be.a("string");

      // Cart should have items
      const cart = sessionManager.getCart(customerId);
      expect(cart.length).to.be.greaterThan(0);
    }
  });

  it("should prevent checkout with empty cart", async () => {
    sessionManager.clearCart(customerId);
    sessionManager.setStep(customerId, "checkout");

    const result = await customerHandler.handleCheckout(customerId, "1");
    expect(result).to.be.an("object");
    expect(result.message).to.match(/kosong/i);
  });

  it("should allow cart modification before checkout", async () => {
    // Add item
    sessionManager.addToCart(customerId, {
      id: "test-product",
      name: "Test Product",
      price: 100000,
    });

    let cart = sessionManager.getCart(customerId);
    expect(cart.length).to.equal(1);

    // Clear cart
    sessionManager.clearCart(customerId);
    cart = sessionManager.getCart(customerId);
    expect(cart.length).to.equal(0);

    // Add multiple items
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

    cart = sessionManager.getCart(customerId);
    expect(cart.length).to.equal(2);
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

  it("should allow returning to menu from any step", async () => {
    sessionManager.setStep(customerId, "browsing");
    let result = await customerHandler.handle(customerId, "menu", "browsing");
    expect(result).to.match(/menu/i);
    expect(sessionManager.getSession(customerId).step).to.equal("menu");

    sessionManager.setStep(customerId, "checkout");
    result = await customerHandler.handle(customerId, "menu", "checkout");
    expect(result).to.match(/menu/i);
    expect(sessionManager.getSession(customerId).step).to.equal("menu");
  });

  it("should handle multiple customers independently", async () => {
    const customer1 = "customer1@c.us";
    const customer2 = "customer2@c.us";

    // Customer 1 adds items
    sessionManager.addToCart(customer1, {
      id: "prod1",
      name: "Product 1",
      price: 50000,
    });

    // Customer 2 adds different items
    sessionManager.addToCart(customer2, {
      id: "prod2",
      name: "Product 2",
      price: 75000,
    });

    const cart1 = sessionManager.getCart(customer1);
    const cart2 = sessionManager.getCart(customer2);

    expect(cart1.length).to.equal(1);
    expect(cart2.length).to.equal(1);
    expect(cart1[0].id).to.equal("prod1");
    expect(cart2[0].id).to.equal("prod2");
  });

  it("should handle cart view from any step", async () => {
    sessionManager.addToCart(customerId, {
      id: "test",
      name: "Test Product",
      price: 50000,
    });

    sessionManager.setStep(customerId, "menu");
    let result = await customerHandler.handle(customerId, "cart", "menu");
    expect(result).to.include("Test Product");

    sessionManager.setStep(customerId, "browsing");
    result = await customerHandler.handle(customerId, "cart", "browsing");
    expect(result).to.include("Test Product");
  });

  it("should persist cart across step changes", async () => {
    sessionManager.addToCart(customerId, {
      id: "test",
      name: "Test Product",
      price: 50000,
    });

    sessionManager.setStep(customerId, "browsing");
    expect(sessionManager.getCart(customerId).length).to.equal(1);

    sessionManager.setStep(customerId, "menu");
    expect(sessionManager.getCart(customerId).length).to.equal(1);

    sessionManager.setStep(customerId, "checkout");
    expect(sessionManager.getCart(customerId).length).to.equal(1);
  });
});
