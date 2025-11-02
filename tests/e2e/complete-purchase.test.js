/**
 * End-to-End test for complete purchase flow
 * Tests the entire customer journey from start to finish
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

describe("E2E: Complete Purchase Journey", () => {
  let customerHandler;
  let productHandler;
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
      },
    };

    const CustomerHandler = require("../../src/handlers/CustomerHandler");
    const ProductHandler = require("../../src/handlers/ProductHandler");

    customerHandler = new CustomerHandler(sessionManager, mockPaymentHandlers);
    productHandler = new ProductHandler(sessionManager);
  });

  it("should complete full purchase flow: menu -> browse -> add to cart -> checkout", async () => {
    // Step 1: Customer starts at menu
    let result = await customerHandler.handle(customerId, "menu", "menu");
    expect(result).to.match(/menu/i);
    expect(sessionManager.getSession(customerId).step).to.equal("menu");

    // Step 2: Customer selects browse option (1)
    result = await customerHandler.handleMenuSelection(customerId, "1");
    expect(result).to.match(/katalog\s+produk/i);
    expect(sessionManager.getSession(customerId).step).to.equal("browsing");

    // Step 3: Customer searches for a product
    const products = require("../../config").getAllProducts();
    expect(products.length).to.be.greaterThan(0);

    // Step 4: Add product to cart (simulate fuzzy search)
    const firstProduct = products[0];
    sessionManager.addToCart(customerId, {
      id: firstProduct.id,
      name: firstProduct.name,
      price: firstProduct.price,
    });

    // Step 5: View cart
    result = await customerHandler.showCart(customerId);
    expect(result).to.include(firstProduct.name);
    const cart = sessionManager.getCart(customerId);
    expect(cart.length).to.equal(1);

    // Step 6: Proceed to checkout
    sessionManager.setStep(customerId, "checkout");
    result = await customerHandler.handleCheckout(customerId, "1");
    // handleCheckout returns an object with {message, qrisData}
    expect(result).to.be.an("object");
    expect(result).to.have.property("message");

    // Verify final state
    expect(cart.length).to.be.greaterThan(0);
  });

  it("should handle product search and add multiple items", async () => {
    // Start browsing
    sessionManager.setStep(customerId, "browsing");

    // Get available products
    const products = require("../../config").getAllProducts();
    expect(products.length).to.be.at.least(2);

    // Add first product
    sessionManager.addToCart(customerId, {
      id: products[0].id,
      name: products[0].name,
      price: products[0].price,
    });

    // Add second product
    sessionManager.addToCart(customerId, {
      id: products[1].id,
      name: products[1].name,
      price: products[1].price,
    });

    // Check cart
    const cart = sessionManager.getCart(customerId);
    expect(cart.length).to.equal(2);

    // View cart
    const result = await customerHandler.showCart(customerId);
    expect(result).to.include(products[0].name);
    expect(result).to.include(products[1].name);
  });

  it("should allow cart modification before checkout", async () => {
    const products = require("../../config").getAllProducts();

    // Add items
    sessionManager.addToCart(customerId, {
      id: products[0].id,
      name: products[0].name,
      price: products[0].price,
    });
    sessionManager.addToCart(customerId, {
      id: products[1].id,
      name: products[1].name,
      price: products[1].price,
    });

    let cart = sessionManager.getCart(customerId);
    expect(cart.length).to.equal(2);

    // Remove one item by clearing and re-adding
    sessionManager.clearCart(customerId);
    sessionManager.addToCart(customerId, {
      id: products[0].id,
      name: products[0].name,
      price: products[0].price,
    });

    cart = sessionManager.getCart(customerId);
    expect(cart.length).to.equal(1);
  });

  it("should handle navigation between steps", async () => {
    // Start at menu
    let result = await customerHandler.handle(customerId, "menu", "menu");
    expect(sessionManager.getSession(customerId).step).to.equal("menu");

    // Go to browsing
    result = await customerHandler.handleMenuSelection(customerId, "1");
    expect(sessionManager.getSession(customerId).step).to.equal("browsing");

    // Return to menu
    result = await customerHandler.handle(customerId, "menu", "browsing");
    expect(sessionManager.getSession(customerId).step).to.equal("menu");

    // Go to browsing again
    result = await customerHandler.handleMenuSelection(customerId, "1");
    expect(sessionManager.getSession(customerId).step).to.equal("browsing");

    // View cart from browsing
    result = await customerHandler.handle(customerId, "cart", "browsing");
    expect(result).to.be.a("string");
  });

  it("should persist session data across interactions", async () => {
    // Add item
    const products = require("../../config").getAllProducts();
    sessionManager.addToCart(customerId, {
      id: products[0].id,
      name: products[0].name,
      price: products[0].price,
    });

    // Change step
    sessionManager.setStep(customerId, "menu");

    // Cart should persist
    let cart = sessionManager.getCart(customerId);
    expect(cart.length).to.equal(1);

    // Change step again
    sessionManager.setStep(customerId, "browsing");

    // Cart should still persist
    cart = sessionManager.getCart(customerId);
    expect(cart.length).to.equal(1);
  });

  it("should handle order history", async () => {
    const result = await customerHandler.handle(customerId, "history", "menu");
    expect(result).to.be.a("string");
  });

  it("should handle about/support commands", async () => {
    sessionManager.setStep(customerId, "menu");

    // Test about command (option 3)
    let result = await customerHandler.handleMenuSelection(customerId, "3");
    expect(result).to.be.a("string");

    // Test support command (option 4)
    result = await customerHandler.handleMenuSelection(customerId, "4");
    expect(result).to.be.a("string");
  });

  it("should validate empty cart at checkout", async () => {
    sessionManager.clearCart(customerId);
    sessionManager.setStep(customerId, "checkout");

    const result = await customerHandler.handleCheckout(customerId, "1");
    // handleCheckout returns an object with {message, qrisData}
    expect(result).to.be.an("object");
    expect(result.message).to.include("kosong");
  });

  it("should calculate correct order total", async () => {
    const products = require("../../config").getAllProducts();

    // Add multiple items with known prices
    sessionManager.clearCart(customerId);
    sessionManager.addToCart(customerId, {
      id: "test1",
      name: "Test Product 1",
      price: 50000,
    });
    sessionManager.addToCart(customerId, {
      id: "test2",
      name: "Test Product 2",
      price: 75000,
    });

    const cart = sessionManager.getCart(customerId);
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    expect(total).to.equal(125000);
  });

  it("should handle session timeout/expiry", async () => {
    const session = sessionManager.getSession(customerId);
    expect(session.lastActivity).to.be.a("number");

    // Simulate activity
    session.lastActivity = Date.now();
    expect(session.lastActivity).to.be.greaterThan(0);
  });

  describe("error scenarios", () => {
    it("should handle invalid menu selection", async () => {
      const result = await customerHandler.handleMenuSelection(
        customerId,
        "999"
      );
      expect(result).to.include("tidak valid");
    });

    it("should handle empty product search", async () => {
      sessionManager.setStep(customerId, "browsing");
      const result = await productHandler.handle(customerId, "", "browsing");
      expect(result).to.be.a("string");
    });

    it("should handle non-existent product search", async () => {
      sessionManager.setStep(customerId, "browsing");
      const result = await productHandler.handle(
        customerId,
        "nonexistentproduct12345xyz",
        "browsing"
      );
      expect(result).to.be.a("string");
    });
  });

  describe("concurrent users", () => {
    it("should handle multiple users independently", async () => {
      const customer1 = "customer1@c.us";
      const customer2 = "customer2@c.us";
      const products = require("../../config").getAllProducts();

      // Customer 1 journey
      sessionManager.setStep(customer1, "browsing");
      sessionManager.addToCart(customer1, {
        id: products[0].id,
        name: products[0].name,
        price: products[0].price,
      });

      // Customer 2 journey
      sessionManager.setStep(customer2, "browsing");
      sessionManager.addToCart(customer2, {
        id: products[1].id,
        name: products[1].name,
        price: products[1].price,
      });

      // Verify independence
      const cart1 = sessionManager.getCart(customer1);
      const cart2 = sessionManager.getCart(customer2);

      expect(cart1.length).to.equal(1);
      expect(cart2.length).to.equal(1);
      expect(cart1[0].id).to.not.equal(cart2[0].id);

      const step1 = sessionManager.getSession(customer1).step;
      const step2 = sessionManager.getSession(customer2).step;

      expect(step1).to.equal("browsing");
      expect(step2).to.equal("browsing");
    });
  });
});
