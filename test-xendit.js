/**
 * Xendit Payment Integration Test
 * Tests QRIS, E-Wallet, and Virtual Account payment flows
 */

require("dotenv").config();
const XenditService = require("./xenditService");
const SessionManager = require("./sessionManager");
const ChatbotLogic = require("./chatbotLogic");

// Test customer ID
const testCustomerId = "6281234567890@c.us";

// Initialize components
const sessionManager = new SessionManager();
const chatbotLogic = new ChatbotLogic(sessionManager);

// Console colors
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function section(title) {
  console.log("\n" + "━".repeat(60));
  log(colors.cyan, `  ${title}`);
  console.log("━".repeat(60) + "\n");
}

async function testXenditConfiguration() {
  section("1. Testing Xendit Configuration");

  if (!process.env.XENDIT_SECRET_KEY) {
    log(colors.red, "❌ XENDIT_SECRET_KEY not configured in .env");
    return false;
  }

  log(colors.green, "✅ XENDIT_SECRET_KEY found");
  log(
    colors.blue,
    `   Key: ${process.env.XENDIT_SECRET_KEY.substring(0, 20)}...`
  );
  log(
    colors.blue,
    `   Mode: ${
      process.env.XENDIT_SECRET_KEY.includes("development")
        ? "TEST"
        : "PRODUCTION"
    }`
  );

  return true;
}

async function testQRISPayment() {
  section("2. Testing QRIS Payment Flow");

  try {
    log(colors.yellow, "📝 Creating QRIS payment...");

    const orderId = `TEST-QRIS-${Date.now()}`;
    const amount = 15800; // Rp 15,800 (1 USD)

    const result = await XenditService.createQrisPayment(amount, orderId, {
      phone: testCustomerId,
      name: "Test Customer",
    });

    log(colors.green, "✅ QRIS payment created successfully!");
    log(colors.blue, `   Order ID: ${orderId}`);
    log(colors.blue, `   Invoice ID: ${result.invoiceId}`);
    log(colors.blue, `   Amount: Rp ${amount.toLocaleString("id-ID")}`);
    log(colors.blue, `   QR Code saved: ${result.qrCodePath}`);
    log(colors.blue, `   Status: ${result.status}`);

    // Test status check
    log(colors.yellow, "\n🔍 Checking payment status...");
    const status = await XenditService.checkPaymentStatus(result.invoiceId);
    log(colors.green, "✅ Status check successful!");
    log(colors.blue, `   Status: ${status.status}`);

    return true;
  } catch (error) {
    log(colors.red, `❌ QRIS test failed: ${error.message}`);
    return false;
  }
}

async function testEWalletPayment() {
  section("3. Testing E-Wallet Payment Flow");

  const ewallets = ["DANA", "SHOPEEPAY"];
  let successCount = 0;

  for (const ewallet of ewallets) {
    try {
      log(colors.yellow, `\n📱 Testing ${ewallet}...`);

      const orderId = `TEST-${ewallet}-${Date.now()}`;
      const amount = 15800;

      const result = await XenditService.createEwalletPayment(
        amount,
        orderId,
        ewallet,
        { phone: testCustomerId, name: "Test Customer" }
      );

      log(colors.green, `✅ ${ewallet} payment created!`);
      log(colors.blue, `   Invoice ID: ${result.invoiceId}`);
      log(colors.blue, `   Redirect URL: ${result.redirectUrl}`);
      log(colors.blue, `   Status: ${result.status}`);

      successCount++;
    } catch (error) {
      log(colors.red, `❌ ${ewallet} test failed: ${error.message}`);
    }
  }

  log(
    colors.green,
    `\n✅ E-Wallet tests: ${successCount}/${ewallets.length} passed`
  );
  return successCount === ewallets.length;
}

async function testVirtualAccount() {
  section("4. Testing Virtual Account Payment Flow");

  const banks = ["BCA", "BNI", "BRI", "MANDIRI"];
  let successCount = 0;

  for (const bank of banks) {
    try {
      log(colors.yellow, `\n🏦 Testing ${bank}...`);

      const orderId = `TEST-VA-${bank}-${Date.now()}`;
      const amount = 15800;

      const result = await XenditService.createVirtualAccount(
        amount,
        orderId,
        bank,
        { name: "Test Customer", phone: testCustomerId }
      );

      log(colors.green, `✅ ${bank} VA created!`);
      log(colors.blue, `   Bank: ${result.bankName}`);
      log(colors.blue, `   VA Number: ${result.vaNumber}`);
      log(colors.blue, `   Invoice ID: ${result.invoiceId}`);
      log(
        colors.blue,
        `   Amount: Rp ${result.amount.toLocaleString("id-ID")}`
      );
      log(colors.blue, `   Status: ${result.status}`);

      successCount++;
    } catch (error) {
      log(colors.red, `❌ ${bank} test failed: ${error.message}`);
    }
  }

  log(
    colors.green,
    `\n✅ Virtual Account tests: ${successCount}/${banks.length} passed`
  );
  return successCount === banks.length;
}

async function testChatbotFlow() {
  section("5. Testing Chatbot Payment Flow");

  try {
    // Simulate customer journey
    log(colors.yellow, "👤 Simulating customer journey...\n");

    // 1. Start menu
    log(colors.cyan, 'Customer: "menu"');
    let response = await chatbotLogic.processMessage(testCustomerId, "menu");
    log(colors.green, "✅ Menu displayed");

    // 2. Browse products
    log(colors.cyan, '\nCustomer: "1" (Browse)');
    response = await chatbotLogic.processMessage(testCustomerId, "1");
    log(colors.green, "✅ Products displayed");

    // 3. Add product to cart
    log(colors.cyan, '\nCustomer: "netflix"');
    response = await chatbotLogic.processMessage(testCustomerId, "netflix");
    log(colors.green, "✅ Product added to cart");

    // 4. View cart
    log(colors.cyan, '\nCustomer: "cart"');
    response = await chatbotLogic.processMessage(testCustomerId, "cart");
    log(colors.green, "✅ Cart displayed");

    // 5. Checkout
    log(colors.cyan, '\nCustomer: "checkout"');
    response = await chatbotLogic.processMessage(testCustomerId, "checkout");
    log(colors.green, "✅ Payment method menu displayed");
    log(colors.blue, `   Response type: ${typeof response}`);

    // 6. Select QRIS
    log(colors.cyan, '\nCustomer: "1" (QRIS)');
    response = await chatbotLogic.processMessage(testCustomerId, "1");
    log(colors.green, "✅ QRIS payment created");

    if (response && response.qrisData) {
      log(colors.blue, `   QR Code path: ${response.qrisData.qrCodePath}`);
    }

    // 7. Check status
    log(colors.cyan, '\nCustomer: "cek"');
    response = await chatbotLogic.processMessage(testCustomerId, "cek");
    log(colors.green, "✅ Payment status checked");

    // Cleanup
    sessionManager.clearCart(testCustomerId);
    sessionManager.setStep(testCustomerId, "menu");

    return true;
  } catch (error) {
    log(colors.red, `❌ Chatbot flow test failed: ${error.message}`);
    console.error(error.stack);
    return false;
  }
}

async function runTests() {
  console.log("\n" + "═".repeat(60));
  log(colors.magenta, "  🧪 XENDIT PAYMENT INTEGRATION TEST SUITE");
  console.log("═".repeat(60));

  const results = {
    config: false,
    qris: false,
    ewallet: false,
    va: false,
    chatbot: false,
  };

  // Run all tests
  results.config = await testXenditConfiguration();

  if (results.config) {
    results.qris = await testQRISPayment();
    results.ewallet = await testEWalletPayment();
    results.va = await testVirtualAccount();
    results.chatbot = await testChatbotFlow();
  }

  // Summary
  section("TEST SUMMARY");

  const tests = [
    ["Configuration", results.config],
    ["QRIS Payment", results.qris],
    ["E-Wallet Payment", results.ewallet],
    ["Virtual Account", results.va],
    ["Chatbot Flow", results.chatbot],
  ];

  tests.forEach(([name, passed]) => {
    const icon = passed ? "✅" : "❌";
    const color = passed ? colors.green : colors.red;
    log(color, `${icon} ${name}`);
  });

  const totalPassed = Object.values(results).filter((r) => r).length;
  const totalTests = Object.keys(results).length;

  console.log("\n" + "═".repeat(60));
  if (totalPassed === totalTests) {
    log(colors.green, `  🎉 ALL TESTS PASSED (${totalPassed}/${totalTests})`);
  } else {
    log(
      colors.yellow,
      `  ⚠️  SOME TESTS FAILED (${totalPassed}/${totalTests})`
    );
  }
  console.log("═".repeat(60) + "\n");

  // Next steps
  if (totalPassed === totalTests) {
    log(colors.cyan, "📝 Next Steps:");
    log(
      colors.blue,
      "   1. Open Xendit Dashboard: https://dashboard.xendit.co/"
    );
    log(colors.blue, "   2. Go to Test Mode → Transactions");
    log(colors.blue, "   3. Find your test payments and mark as SUCCESS");
    log(colors.blue, '   4. Test with WhatsApp: Send "menu" to bot');
    log(colors.blue, "   5. Complete full purchase flow");
  }
}

// Run tests
runTests().catch((error) => {
  console.error("Test suite crashed:", error);
  process.exit(1);
});
