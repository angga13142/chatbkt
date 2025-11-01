/**
 * Session Manager Test
 * Tests session operations in fallback (in-memory) mode
 */

const SessionManager = require("./sessionManager");

async function testSessionManager() {
  console.log("🧪 Testing Session Manager...\n");

  try {
    // Initialize session manager
    const sessionManager = new SessionManager();
    await sessionManager.initialize();

    console.log("1️⃣ Testing session creation...");
    const customerId = "6281234567890@c.us";
    const session = await sessionManager.getSession(customerId);

    if (!session || session.customerId !== customerId) {
      throw new Error("Failed to create session");
    }
    if (session.step !== "menu") {
      throw new Error(`Expected step 'menu', got '${session.step}'`);
    }
    console.log("✅ Session created successfully\n");

    console.log("2️⃣ Testing cart operations...");
    const product = {
      id: "netflix",
      name: "Netflix Premium",
      price: 15800,
    };

    await sessionManager.addToCart(customerId, product);
    const cart = await sessionManager.getCart(customerId);

    if (cart.length !== 1) {
      throw new Error(`Expected 1 item in cart, got ${cart.length}`);
    }
    if (cart[0].id !== "netflix") {
      throw new Error("Cart item mismatch");
    }
    console.log("✅ Cart operations working\n");

    console.log("3️⃣ Testing step changes...");
    await sessionManager.setStep(customerId, "browsing");
    let step = await sessionManager.getStep(customerId);
    if (step !== "browsing") {
      throw new Error(`Expected 'browsing', got '${step}'`);
    }

    await sessionManager.setStep(customerId, "checkout");
    step = await sessionManager.getStep(customerId);
    if (step !== "checkout") {
      throw new Error(`Expected 'checkout', got '${step}'`);
    }
    console.log("✅ Step transitions working\n");

    console.log("4️⃣ Testing order ID...");
    const orderId = "ORD-" + Date.now();
    await sessionManager.setOrderId(customerId, orderId);
    const retrievedOrderId = await sessionManager.getOrderId(customerId);

    if (retrievedOrderId !== orderId) {
      throw new Error("Order ID mismatch");
    }
    console.log("✅ Order ID storage working\n");

    console.log("5️⃣ Testing payment method...");
    const invoiceId = "INV-" + Date.now();
    await sessionManager.setPaymentMethod(customerId, "QRIS", invoiceId);
    const paymentData = await sessionManager.getPaymentMethod(customerId);

    if (paymentData.method !== "QRIS") {
      throw new Error("Payment method mismatch");
    }
    if (paymentData.invoiceId !== invoiceId) {
      throw new Error("Invoice ID mismatch");
    }
    console.log("✅ Payment method storage working\n");

    console.log("6️⃣ Testing findCustomerByOrderId...");
    const foundCustomer = await sessionManager.findCustomerByOrderId(orderId);
    if (foundCustomer !== customerId) {
      throw new Error("Customer lookup by order ID failed");
    }
    console.log("✅ Customer lookup working\n");

    console.log("7️⃣ Testing cart clearing...");
    await sessionManager.clearCart(customerId);
    const emptyCart = await sessionManager.getCart(customerId);
    if (emptyCart.length !== 0) {
      throw new Error("Cart not cleared");
    }
    console.log("✅ Cart clearing working\n");

    console.log("8️⃣ Testing multiple customers (isolation)...");
    const customer2 = "6289876543210@c.us";
    await sessionManager.addToCart(customer2, {
      id: "spotify",
      name: "Spotify Premium",
    });

    const cart1 = await sessionManager.getCart(customerId);
    const cart2 = await sessionManager.getCart(customer2);

    if (cart1.length !== 0) {
      throw new Error("Customer 1 cart should be empty");
    }
    if (cart2.length !== 1) {
      throw new Error("Customer 2 cart should have 1 item");
    }
    console.log("✅ Customer isolation working\n");

    console.log("9️⃣ Testing session cleanup...");
    await sessionManager.cleanupSessions();
    console.log("✅ Cleanup executed\n");

    console.log("🔟 Testing graceful shutdown...");
    await sessionManager.shutdown();
    console.log("✅ Shutdown successful\n");

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ ALL SESSION MANAGER TESTS PASSED");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return true;
  } catch (error) {
    console.error("\n❌ Session manager test failed:", error.message);
    console.error("Stack:", error.stack);
    return false;
  }
}

// Run tests
testSessionManager()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
