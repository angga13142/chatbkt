/**
 * Comprehensive Transaction Simulation Test
 * Deep analysis of complete transaction flows including edge cases
 */

const SessionManager = require("../sessionManager");
const ChatbotLogic = require("../chatbotLogic");
const config = require("../config");

// Disable Redis for testing
process.env.REDIS_HOST = "";

console.log("\n" + "=".repeat(80));
console.log("🧪 COMPREHENSIVE TRANSACTION SIMULATION TEST");
console.log("=".repeat(80) + "\n");

async function runComprehensiveTests() {
  const sessionManager = new SessionManager();
  const chatbotLogic = new ChatbotLogic(sessionManager);

  let testsPassed = 0;
  let testsFailed = 0;

  // Helper function to test
  async function test(description, testFn) {
    try {
      console.log(`\n📋 Testing: ${description}`);
      await testFn();
      console.log(`✅ PASSED: ${description}`);
      testsPassed++;
    } catch (error) {
      console.log(`❌ FAILED: ${description}`);
      console.log(`   Error: ${error.message}`);
      testsFailed++;
    }
  }

  // Helper to simulate customer message
  async function sendMessage(customerId, message) {
    return await chatbotLogic.processMessage(customerId, message);
  }

  // Helper to extract message from response (handles both string and object types)
  function extractMessage(response) {
    return typeof response === "string" ? response : response?.message || "";
  }

  console.log("\n" + "-".repeat(80));
  console.log("SCENARIO 1: COMPLETE PURCHASE FLOW - NETFLIX");
  console.log("-".repeat(80));

  await test("Customer starts with menu command", async () => {
    const customer1 = "6281234567890@c.us";
    const response = await sendMessage(customer1, "menu");
    if (!response || typeof response !== "string") {
      throw new Error("Menu response should be a string");
    }
    if (!response.toLowerCase().includes("selamat datang")) {
      throw new Error("Menu should contain welcome message");
    }
  });

  await test("Customer browses products (option 1)", async () => {
    const customer1 = "6281234567890@c.us";
    const response = await sendMessage(customer1, "1");
    if (!response || typeof response !== "string") {
      throw new Error("Browse response should be a string");
    }
    const session = await sessionManager.getSession(customer1);
    if (session.step !== "browsing") {
      throw new Error(`Step should be 'browsing', got '${session.step}'`);
    }
  });

  await test("Customer adds Netflix to cart", async () => {
    const customer1 = "6281234567890@c.us";
    const response = await sendMessage(customer1, "netflix");
    if (!response || typeof response !== "string") {
      throw new Error("Product selection response should be a string");
    }
    const cart = await sessionManager.getCart(customer1);
    if (cart.length !== 1) {
      throw new Error(`Cart should have 1 item, got ${cart.length}`);
    }
    if (!cart[0].name.toLowerCase().includes("netflix")) {
      throw new Error("Cart should contain Netflix");
    }
  });

  await test("Customer views cart", async () => {
    const customer1 = "6281234567890@c.us";
    const response = await sendMessage(customer1, "cart");
    if (!response || typeof response !== "string") {
      throw new Error("Cart response should be a string");
    }
    const session = await sessionManager.getSession(customer1);
    if (session.step !== "checkout") {
      throw new Error(`Step should be 'checkout', got '${session.step}'`);
    }
  });

  await test("Customer proceeds to checkout", async () => {
    const customer1 = "6281234567890@c.us";
    const response = await sendMessage(customer1, "checkout");
    const message = extractMessage(response);
    if (!message) {
      throw new Error("Checkout should return a response");
    }
    const session = await sessionManager.getSession(customer1);
    if (session.step !== "select_payment") {
      throw new Error(
        `Step should be 'select_payment', got '${session.step}'`
      );
    }
  });

  console.log("\n" + "-".repeat(80));
  console.log("SCENARIO 2: MULTIPLE PRODUCTS IN CART");
  console.log("-".repeat(80));

  await test("Customer 2 adds multiple products", async () => {
    const customer2 = "6282345678901@c.us";
    await sendMessage(customer2, "menu");
    await sendMessage(customer2, "1"); // Browse
    await sendMessage(customer2, "netflix"); // Add Netflix
    await sendMessage(customer2, "spotify"); // Add Spotify
    await sendMessage(customer2, "youtube"); // Add YouTube

    const cart = await sessionManager.getCart(customer2);
    if (cart.length !== 3) {
      throw new Error(`Cart should have 3 items, got ${cart.length}`);
    }
  });

  await test("Cart total calculation is correct", async () => {
    const customer2 = "6282345678901@c.us";
    const cart = await sessionManager.getCart(customer2);
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    if (total <= 0) {
      throw new Error(`Total should be > 0, got ${total}`);
    }
    // Each product is Rp 1, so 3 products = Rp 3
    if (total !== 3) {
      throw new Error(`Total should be 3, got ${total}`);
    }
  });

  console.log("\n" + "-".repeat(80));
  console.log("SCENARIO 3: CART OPERATIONS");
  console.log("-".repeat(80));

  await test("Customer can clear cart", async () => {
    const customer3 = "6283456789012@c.us";
    await sendMessage(customer3, "menu");
    await sendMessage(customer3, "1"); // Browse
    await sendMessage(customer3, "netflix"); // Add product
    let cart = await sessionManager.getCart(customer3);
    if (cart.length !== 1) {
      throw new Error("Cart should have 1 item before clear");
    }

    // Go to cart/checkout and clear
    await sendMessage(customer3, "cart");
    await sendMessage(customer3, "clear");
    cart = await sessionManager.getCart(customer3);
    if (cart.length !== 0) {
      throw new Error(`Cart should be empty after clear, got ${cart.length}`);
    }
  });

  console.log("\n" + "-".repeat(80));
  console.log("SCENARIO 4: SESSION ISOLATION");
  console.log("-".repeat(80));

  await test("Multiple customers have isolated sessions", async () => {
    const customerA = "6284567890123@c.us";
    const customerB = "6285678901234@c.us";

    // Customer A adds Netflix
    await sendMessage(customerA, "menu");
    await sendMessage(customerA, "1");
    await sendMessage(customerA, "netflix");

    // Customer B adds Spotify
    await sendMessage(customerB, "menu");
    await sendMessage(customerB, "1");
    await sendMessage(customerB, "spotify");

    // Verify isolation
    const cartA = await sessionManager.getCart(customerA);
    const cartB = await sessionManager.getCart(customerB);

    if (cartA.length !== 1 || cartB.length !== 1) {
      throw new Error("Each cart should have 1 item");
    }

    if (!cartA[0].name.toLowerCase().includes("netflix")) {
      throw new Error("Customer A should have Netflix");
    }

    if (!cartB[0].name.toLowerCase().includes("spotify")) {
      throw new Error("Customer B should have Spotify");
    }
  });

  console.log("\n" + "-".repeat(80));
  console.log("SCENARIO 5: FUZZY SEARCH");
  console.log("-".repeat(80));

  await test("Fuzzy search finds products with typos", async () => {
    const customer4 = "6286789012345@c.us";
    await sendMessage(customer4, "menu");
    await sendMessage(customer4, "1"); // Browse

    // Try with typo
    const response = await sendMessage(customer4, "netflx"); // Missing 'i'
    const cart = await sessionManager.getCart(customer4);

    // Should still find Netflix
    if (cart.length < 1) {
      throw new Error("Fuzzy search should find Netflix despite typo");
    }
  });

  await test("Fuzzy search finds products with partial match", async () => {
    const customer5 = "6287890123456@c.us";
    await sendMessage(customer5, "menu");
    await sendMessage(customer5, "1"); // Browse

    // Try partial match
    const response = await sendMessage(customer5, "spot"); // Partial "spotify"
    const cart = await sessionManager.getCart(customer5);

    if (cart.length < 1) {
      throw new Error("Fuzzy search should find Spotify with partial match");
    }
  });

  console.log("\n" + "-".repeat(80));
  console.log("SCENARIO 6: EDGE CASES");
  console.log("-".repeat(80));

  await test("Empty cart checkout shows error", async () => {
    const customer6 = "6288901234567@c.us";
    await sendMessage(customer6, "menu");
    const response = await sendMessage(customer6, "cart");
    const message = extractMessage(response);
    if (!message.toLowerCase().includes("kosong")) {
      throw new Error("Should show empty cart message");
    }
  });

  await test("Invalid menu option shows error", async () => {
    const customer7 = "6289012345678@c.us";
    await sendMessage(customer7, "menu");
    const response = await sendMessage(customer7, "999"); // Invalid option
    if (!response || typeof response !== "string") {
      throw new Error("Should return error message");
    }
  });

  await test("Invalid product name shows error", async () => {
    const customer8 = "6280123456789@c.us";
    await sendMessage(customer8, "menu");
    await sendMessage(customer8, "1"); // Browse
    const response = await sendMessage(
      customer8,
      "nonexistentproduct12345xyz"
    );
    if (!response || typeof response !== "string") {
      throw new Error("Should return error message for invalid product");
    }
    // Cart should remain empty
    const cart = await sessionManager.getCart(customer8);
    if (cart.length > 0) {
      throw new Error("Cart should be empty after invalid product search");
    }
  });

  console.log("\n" + "-".repeat(80));
  console.log("SCENARIO 7: NAVIGATION");
  console.log("-".repeat(80));

  await test("Menu command works from any step", async () => {
    const customer9 = "6281111111111@c.us";
    await sendMessage(customer9, "menu");
    await sendMessage(customer9, "1"); // Browse
    let session = await sessionManager.getSession(customer9);
    if (session.step !== "browsing") {
      throw new Error("Should be in browsing step");
    }

    // Return to menu
    await sendMessage(customer9, "menu");
    session = await sessionManager.getSession(customer9);
    if (session.step !== "menu") {
      throw new Error("Should return to menu step");
    }
  });

  await test("Cart command works from any step", async () => {
    const customer10 = "6282222222222@c.us";
    await sendMessage(customer10, "menu");
    await sendMessage(customer10, "1"); // Browse
    await sendMessage(customer10, "netflix"); // Add item
    
    let session = await sessionManager.getSession(customer10);
    if (session.step !== "browsing") {
      throw new Error("Should be in browsing step after adding product");
    }

    // Try cart from browsing step
    await sendMessage(customer10, "cart");
    session = await sessionManager.getSession(customer10);
    if (session.step !== "checkout") {
      throw new Error("Should go to checkout step when cart has items");
    }
  });

  console.log("\n" + "-".repeat(80));
  console.log("SCENARIO 8: PRODUCT CATALOG");
  console.log("-".repeat(80));

  await test("All products are available", async () => {
    const products = config.getAllProducts();
    if (products.length < 1) {
      throw new Error("Should have at least 1 product");
    }
  });

  await test("Products have required fields", async () => {
    const products = config.getAllProducts();
    for (const product of products) {
      if (!product.id) throw new Error("Product missing id");
      if (!product.name) throw new Error("Product missing name");
      if (typeof product.price !== "number")
        throw new Error("Product missing price");
      if (!product.description) throw new Error("Product missing description");
    }
  });

  await test("Product IDs are unique", async () => {
    const products = config.getAllProducts();
    const ids = products.map((p) => p.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      throw new Error("Product IDs are not unique");
    }
  });

  console.log("\n" + "-".repeat(80));
  console.log("SCENARIO 9: SPECIAL CHARACTERS & INPUT VALIDATION");
  console.log("-".repeat(80));

  await test("Handles messages with extra whitespace", async () => {
    const customer11 = "6283333333333@c.us";
    const response = await sendMessage(customer11, "  menu  ");
    if (!response) {
      throw new Error("Should handle whitespace");
    }
  });

  await test("Handles uppercase input", async () => {
    const customer12 = "6284444444444@c.us";
    await sendMessage(customer12, "MENU");
    const session = await sessionManager.getSession(customer12);
    if (session.step !== "menu") {
      throw new Error("Should handle uppercase MENU");
    }
  });

  await test("Handles mixed case input", async () => {
    const customer13 = "6285555555555@c.us";
    await sendMessage(customer13, "MeNu");
    const session = await sessionManager.getSession(customer13);
    if (session.step !== "menu") {
      throw new Error("Should handle mixed case MeNu");
    }
  });

  console.log("\n" + "-".repeat(80));
  console.log("SCENARIO 10: SESSION STATE PERSISTENCE");
  console.log("-".repeat(80));

  await test("Session step persists across messages", async () => {
    const customer14 = "6286666666666@c.us";
    await sendMessage(customer14, "menu");
    await sendMessage(customer14, "1"); // Go to browsing

    let session = await sessionManager.getSession(customer14);
    const stepBefore = session.step;

    // Send another message (invalid product)
    await sendMessage(customer14, "invalidproduct");

    session = await sessionManager.getSession(customer14);
    if (session.step !== stepBefore) {
      throw new Error("Step should persist after invalid product");
    }
  });

  await test("Cart persists across step changes", async () => {
    const customer15 = "6287777777777@c.us";
    await sendMessage(customer15, "menu");
    await sendMessage(customer15, "1"); // Browse
    await sendMessage(customer15, "netflix"); // Add Netflix

    let cart = await sessionManager.getCart(customer15);
    if (cart.length !== 1) {
      throw new Error("Cart should have 1 item");
    }

    // Go back to menu
    await sendMessage(customer15, "menu");

    // Cart should persist
    cart = await sessionManager.getCart(customer15);
    if (cart.length !== 1) {
      throw new Error("Cart should still have 1 item after returning to menu");
    }
  });

  console.log("\n" + "=".repeat(80));
  console.log("📊 TEST RESULTS SUMMARY");
  console.log("=".repeat(80));
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  console.log(`📈 Total Tests: ${testsPassed + testsFailed}`);
  console.log(
    `🎯 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`
  );
  console.log("=".repeat(80) + "\n");

  if (testsFailed === 0) {
    console.log("🎉 ALL TESTS PASSED! The system is working correctly.\n");
    return 0;
  } else {
    console.log(
      `⚠️  ${testsFailed} test(s) failed. Please review and fix.\n`
    );
    return 1;
  }
}

// Run tests
runComprehensiveTests()
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((error) => {
    console.error("❌ Fatal error running tests:", error);
    process.exit(1);
  });
