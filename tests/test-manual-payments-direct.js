/**
 * Simple direct test of manual payment functionality
 */

const PaymentHandlers = require("../lib/paymentHandlers.js");
const PaymentMessages = require("../lib/paymentMessages.js");
const SessionManager = require("../sessionManager.js");

console.log("🧪 Direct Payment Test\n");
console.log("=".repeat(60));

// Test 1: Manual E-Wallet Instructions
console.log("\n📋 TEST 1: DANA Payment Instructions");
console.log("-".repeat(60));
const danaMsg = PaymentMessages.manualEWalletInstructions(
  "DANA",
  "081234567890",
  "John Doe",
  50000,
  "ORD-TEST-001"
);

if (
  danaMsg.includes("TRANSFER DANA") &&
  danaMsg.includes("081234567890") &&
  danaMsg.includes("John Doe") &&
  danaMsg.includes("Admin akan verifikasi")
) {
  console.log("✅ DANA instructions correct");
  console.log("\nSample output:");
  console.log(danaMsg);
} else {
  console.log("❌ DANA instructions missing elements");
  process.exit(1);
}

// Test 2: Manual Bank Transfer Instructions
console.log("\n\n📋 TEST 2: BCA Payment Instructions");
console.log("-".repeat(60));
const bcaMsg = PaymentMessages.manualBankTransferInstructions(
  "BCA",
  "1234567890",
  "John Doe",
  100000,
  "ORD-TEST-002"
);

if (
  bcaMsg.includes("TRANSFER BANK BCA") &&
  bcaMsg.includes("1234567890") &&
  bcaMsg.includes("Via Mobile Banking") &&
  bcaMsg.includes("Via ATM")
) {
  console.log("✅ BCA instructions correct");
  console.log("\nSample output:");
  console.log(bcaMsg);
} else {
  console.log("❌ BCA instructions missing elements");
  process.exit(1);
}

// Test 3: Payment Handler E-Wallet Flow
console.log("\n\n📋 TEST 3: Payment Handler - E-Wallet Flow");
console.log("-".repeat(60));

(async () => {
  const sm = new SessionManager();

  // Mock XenditService for currency conversion
  const mockXendit = {
    convertToIDR: (usd) => Math.round(usd * 15800),
  };

  const ph = new PaymentHandlers(mockXendit, sm);
  const testId = "test@c.us";

  // Setup session
  await sm.getSession(testId); // Creates session if doesn't exist
  await sm.setOrderId(testId, "ORD-HANDLER-TEST");

  // Test DANA
  console.log("\nTesting DANA handler...");
  const result = await ph.handleEWalletPayment(
    testId,
    "ORD-HANDLER-TEST",
    50000,
    "DANA"
  );

  if (result.message.includes("TRANSFER DANA")) {
    console.log("✅ DANA handler works");

    // Check session state
    const session = await sm.getSession(testId);
    console.log(`Session step: ${session.step}`);
    console.log(`Payment method: ${session.paymentMethod}`);
    console.log(`Payment account: ${session.paymentAccount}`);

    if (
      session.step === "awaiting_admin_approval" &&
      session.paymentMethod === "dana" &&
      session.paymentAccount === "081234567890"
    ) {
      console.log("✅ Session state correct");
    } else {
      console.log("❌ Session state incorrect");
      process.exit(1);
    }
  } else {
    console.log("❌ DANA handler failed");
    console.log(result);
    process.exit(1);
  }

  // Test 4: Payment Handler Bank Flow
  console.log("\n\n📋 TEST 4: Payment Handler - Bank Flow");
  console.log("-".repeat(60));

  // Reset session
  await sm.getSession(testId); // Creates session if doesn't exist
  await sm.setOrderId(testId, "ORD-BANK-TEST");

  console.log("\nTesting BCA handler...");
  const bankResult = await ph.handleBankChoice(testId, "1"); // 1 = BCA

  if (bankResult.message.includes("TRANSFER BANK BCA")) {
    console.log("✅ BCA handler works");

    // Check session state
    const session = await sm.getSession(testId);
    console.log(`Session step: ${session.step}`);
    console.log(`Payment method: ${session.paymentMethod}`);
    console.log(`Payment account: ${session.paymentAccount}`);

    if (
      session.step === "awaiting_admin_approval" &&
      session.paymentMethod === "bank_bca" &&
      session.paymentAccount === "1234567890"
    ) {
      console.log("✅ Session state correct");
    } else {
      console.log("❌ Session state incorrect");
      process.exit(1);
    }
  } else {
    console.log("❌ BCA handler failed");
    console.log(bankResult);
    process.exit(1);
  }

  console.log("\n\n" + "=".repeat(60));
  console.log("✅ ALL DIRECT TESTS PASSED");
  console.log("=".repeat(60));

  console.log("\n📊 Summary:");
  console.log("  ✅ DANA message template");
  console.log("  ✅ BCA message template");
  console.log("  ✅ DANA payment handler");
  console.log("  ✅ BCA payment handler");
  console.log("  ✅ Session state management");
  console.log("  ✅ awaiting_admin_approval step set correctly");

  console.log("\n💡 Manual payment system is fully functional!");
  console.log("\n📝 Ready for live testing with WhatsApp bot");
})();
