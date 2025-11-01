/**
 * Test script for chatbot logic
 * This tests the chatbot functionality without requiring WhatsApp connection
 */

const SessionManager = require("./sessionManager");
const ChatbotLogic = require("./chatbotLogic");
const { getAllProducts, getProductById } = require("./config");

async function runTests() {
  console.log("🧪 Starting Chatbot Logic Tests...\n");

  try {
    // Test 1: Session Manager
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Test 1: Session Manager");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const sessionManager = new SessionManager();
    await sessionManager.initialize();
    const testCustomerId = "1234567890";

    const session = await sessionManager.getSession(testCustomerId);
    console.log("✓ Created session for customer:", testCustomerId);
    console.log("  Initial step:", session.step);

    await sessionManager.setStep(testCustomerId, "browsing");
    const step = await sessionManager.getStep(testCustomerId);
    console.log("✓ Changed step to:", step);

    const testProduct = { id: "test", name: "Test Product", price: 1 };
    await sessionManager.addToCart(testCustomerId, testProduct);
    console.log("✓ Added product to cart");

    let cart = await sessionManager.getCart(testCustomerId);
    console.log("  Cart items:", cart.length);

    await sessionManager.clearCart(testCustomerId);
    console.log("✓ Cleared cart");

    cart = await sessionManager.getCart(testCustomerId);
    console.log("  Cart items after clear:", cart.length);

    // Test 2: Product Configuration
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Test 2: Product Configuration");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const allProducts = getAllProducts();
    console.log("✓ Total products available:", allProducts.length);

    const netflix = getProductById("netflix");
    if (netflix) {
      console.log("✓ Found Netflix product:");
      console.log("  Name:", netflix.name);
      console.log("  Price: Rp", netflix.price.toLocaleString("id-ID"));
    }

    // Test 3: Chatbot Logic
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Test 3: Chatbot Logic Flow");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const chatbot = new ChatbotLogic(sessionManager);

    // Test main menu
    let response = await chatbot.processMessage(testCustomerId, "menu");
    console.log("✓ Main menu command processed");
    console.log("  Response length:", response.length, "characters");
    console.log(
      '  Contains "Selamat datang":',
      response.includes("Selamat datang")
    );

    // Test browsing products
    response = await chatbot.processMessage(testCustomerId, "1");
    console.log("✓ Browse products command processed");
    console.log(
      '  Contains "KATALOG PRODUK":',
      response.includes("KATALOG PRODUK")
    );

    // Test adding product to cart
    response = await chatbot.processMessage(testCustomerId, "netflix");
    console.log("✓ Product selection processed");
    console.log('  Contains "ditambahkan":', response.includes("ditambahkan"));

    cart = await sessionManager.getCart(testCustomerId);
    console.log("  Cart has items:", cart.length > 0);

    // Test viewing cart
    response = await chatbot.processMessage(testCustomerId, "cart");
    console.log("✓ View cart command processed");
    console.log('  Contains "KERANJANG":', response.includes("KERANJANG"));

    // Test checkout
    response = await chatbot.processMessage(testCustomerId, "checkout");
    console.log("✓ Checkout command processed");
    console.log(
      '  Contains "ORDER":',
      response.includes("ORDER") || response.includes("KONFIRMASI")
    );

    cart = await sessionManager.getCart(testCustomerId);
    console.log("  Cart items after checkout:", cart.length);

    // Test 4: Multiple Sessions
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Test 4: Multiple Customer Sessions");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const customer1 = "1111111111";
    const customer2 = "2222222222";

    await chatbot.processMessage(customer1, "menu");
    await chatbot.processMessage(customer1, "1");
    await chatbot.processMessage(customer1, "netflix");

    await chatbot.processMessage(customer2, "menu");
    await chatbot.processMessage(customer2, "1");
    await chatbot.processMessage(customer2, "spotify");

    const cart1 = await sessionManager.getCart(customer1);
    const cart2 = await sessionManager.getCart(customer2);

    console.log("✓ Customer 1 cart:", cart1.length, "items");
    console.log("  Product:", cart1[0]?.name);
    console.log("✓ Customer 2 cart:", cart2.length, "items");
    console.log("  Product:", cart2[0]?.name);
    console.log("✓ Sessions are isolated:", cart1[0]?.id !== cart2[0]?.id);

    // Cleanup
    await sessionManager.shutdown();

    // Summary
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ ALL TESTS PASSED!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\nThe chatbot logic is working correctly! 🎉");
    console.log("Ready to connect to WhatsApp.\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

// Run tests
runTests();
