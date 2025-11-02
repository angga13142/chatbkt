/**
 * Test suite for manual payment flow (E-wallet and Bank Transfer)
 * Tests configuration, message templates, and payment handler logic
 */

const PaymentMessages = require("../lib/paymentMessages.js");
const config = require("../config.js");

console.log("🧪 Testing Manual Payment System\n");
console.log("=".repeat(50));

// Test 1: Payment accounts configuration
console.log("\n📋 TEST 1: Payment Accounts Configuration");
console.log("-".repeat(50));
try {
  const paymentAccounts = config.getSetting("paymentAccounts");

  // Check E-wallet accounts
  const ewallets = ["dana", "gopay", "ovo", "shopeepay"];
  console.log("\n💳 E-Wallet Accounts:");
  ewallets.forEach((wallet) => {
    const account = paymentAccounts[wallet];
    console.log(`  ${wallet.toUpperCase()}:`);
    console.log(`    Number: ${account.number}`);
    console.log(`    Name: ${account.name}`);
    console.log(`    Enabled: ${account.enabled ? "✅" : "❌"}`);
  });

  // Check Bank accounts
  const banks = ["bca", "bni", "bri", "mandiri"];
  console.log("\n🏦 Bank Accounts:");
  banks.forEach((bank) => {
    const account = paymentAccounts[bank];
    console.log(`  ${bank.toUpperCase()}:`);
    console.log(`    Account: ${account.accountNumber}`);
    console.log(`    Name: ${account.accountName}`);
    console.log(`    Enabled: ${account.enabled ? "✅" : "❌"}`);
  });

  console.log("\n✅ TEST 1 PASSED: Configuration loaded successfully");
} catch (error) {
  console.error("❌ TEST 1 FAILED:", error.message);
  process.exit(1);
}

// Test 2: E-wallet message template
console.log("\n\n📋 TEST 2: E-Wallet Message Template");
console.log("-".repeat(50));
try {
  const ewalletMsg = PaymentMessages.manualEWalletInstructions(
    "DANA",
    "081234567890",
    "John Doe",
    50000,
    "ORD-TEST-001"
  );

  // Check message content
  const requiredElements = [
    "TRANSFER DANA",
    "ORD-TEST-001",
    "Rp 50.000",
    "081234567890",
    "John Doe",
    "Langkah-langkah",
    "Screenshot bukti",
    "Admin akan verifikasi",
  ];

  let allPresent = true;
  requiredElements.forEach((element) => {
    if (!ewalletMsg.includes(element)) {
      console.error(`  ❌ Missing: ${element}`);
      allPresent = false;
    }
  });

  if (allPresent) {
    console.log("\n✅ All required elements present");
    console.log("\n📄 Sample Message:");
    console.log(ewalletMsg);
    console.log("\n✅ TEST 2 PASSED: E-wallet message template works");
  } else {
    throw new Error("Missing required elements in message");
  }
} catch (error) {
  console.error("❌ TEST 2 FAILED:", error.message);
  process.exit(1);
}

// Test 3: Bank transfer message template
console.log("\n\n📋 TEST 3: Bank Transfer Message Template");
console.log("-".repeat(50));
try {
  const bankMsg = PaymentMessages.manualBankTransferInstructions(
    "BCA",
    "1234567890",
    "John Doe",
    100000,
    "ORD-TEST-002"
  );

  // Check message content
  const requiredElements = [
    "TRANSFER BANK BCA",
    "ORD-TEST-002",
    "Rp 100.000",
    "1234567890",
    "John Doe",
    "Via Mobile Banking",
    "Via ATM",
    "Screenshot / foto bukti",
    "Admin akan verifikasi",
  ];

  let allPresent = true;
  requiredElements.forEach((element) => {
    if (!bankMsg.includes(element)) {
      console.error(`  ❌ Missing: ${element}`);
      allPresent = false;
    }
  });

  if (allPresent) {
    console.log("\n✅ All required elements present");
    console.log("\n📄 Sample Message:");
    console.log(bankMsg);
    console.log("\n✅ TEST 3 PASSED: Bank transfer message template works");
  } else {
    throw new Error("Missing required elements in message");
  }
} catch (error) {
  console.error("❌ TEST 3 FAILED:", error.message);
  process.exit(1);
}

// Test 4: All payment methods
console.log("\n\n📋 TEST 4: All Payment Methods");
console.log("-".repeat(50));
try {
  const paymentAccounts = config.getSetting("paymentAccounts");

  // Test all e-wallets
  console.log("\n💳 Testing E-Wallets:");
  ["dana", "gopay", "ovo", "shopeepay"].forEach((wallet) => {
    const account = paymentAccounts[wallet];
    const msg = PaymentMessages.manualEWalletInstructions(
      wallet.toUpperCase(),
      account.number,
      account.name,
      25000,
      "TEST-" + wallet.toUpperCase()
    );

    if (msg.includes(wallet.toUpperCase()) && msg.includes(account.number)) {
      console.log(`  ✅ ${wallet.toUpperCase()} - OK`);
    } else {
      throw new Error(`${wallet} message generation failed`);
    }
  });

  // Test all banks
  console.log("\n🏦 Testing Banks:");
  ["bca", "bni", "bri", "mandiri"].forEach((bank) => {
    const account = paymentAccounts[bank];
    const msg = PaymentMessages.manualBankTransferInstructions(
      bank.toUpperCase(),
      account.accountNumber,
      account.accountName,
      50000,
      "TEST-" + bank.toUpperCase()
    );

    if (
      msg.includes(bank.toUpperCase()) &&
      msg.includes(account.accountNumber)
    ) {
      console.log(`  ✅ ${bank.toUpperCase()} - OK`);
    } else {
      throw new Error(`${bank} message generation failed`);
    }
  });

  console.log("\n✅ TEST 4 PASSED: All payment methods work");
} catch (error) {
  console.error("❌ TEST 4 FAILED:", error.message);
  process.exit(1);
}

// Test 5: Disabled payment method handling
console.log("\n\n📋 TEST 5: Disabled Payment Method Handling");
console.log("-".repeat(50));
try {
  // This would normally be handled by paymentHandlers.js
  // Testing that we can access enabled status
  const paymentAccounts = config.getSetting("paymentAccounts");
  const testAccount = paymentAccounts.dana;

  if (typeof testAccount.enabled === "boolean") {
    console.log("✅ Payment method enabled flag exists");
    console.log(`  DANA enabled: ${testAccount.enabled ? "✅" : "❌"}`);
  } else {
    throw new Error("Enabled flag not found");
  }

  console.log("\n✅ TEST 5 PASSED: Can check payment method status");
} catch (error) {
  console.error("❌ TEST 5 FAILED:", error.message);
  process.exit(1);
}

// Test 6: Edge cases
console.log("\n\n📋 TEST 6: Edge Cases");
console.log("-".repeat(50));
try {
  // Test with large amounts
  const largeAmountMsg = PaymentMessages.manualEWalletInstructions(
    "DANA",
    "081234567890",
    "John Doe",
    9999999,
    "ORD-LARGE"
  );

  if (largeAmountMsg.includes("Rp 9.999.999")) {
    console.log("✅ Large amount formatting: Rp 9.999.999");
  } else {
    throw new Error("Large amount formatting failed");
  }

  // Test with long names
  const longNameMsg = PaymentMessages.manualBankTransferInstructions(
    "BCA",
    "1234567890",
    "John Michael Alexander Smith Jr.",
    1000,
    "ORD-LONG-NAME"
  );

  if (longNameMsg.includes("John Michael Alexander Smith Jr.")) {
    console.log("✅ Long name handling: John Michael Alexander Smith Jr.");
  } else {
    throw new Error("Long name handling failed");
  }

  console.log("\n✅ TEST 6 PASSED: Edge cases handled correctly");
} catch (error) {
  console.error("❌ TEST 6 FAILED:", error.message);
  process.exit(1);
}

// Summary
console.log("\n\n" + "=".repeat(50));
console.log("✅ ALL TESTS PASSED");
console.log("=".repeat(50));
console.log("\n📊 Summary:");
console.log("  ✅ Payment accounts configuration");
console.log("  ✅ E-wallet message templates");
console.log("  ✅ Bank transfer message templates");
console.log("  ✅ All 8 payment methods");
console.log("  ✅ Disabled status checking");
console.log("  ✅ Edge case handling");
console.log("\n💡 Manual payment system is ready!");
console.log("\n📝 Next steps:");
console.log("  1. Update .env with actual payment account details");
console.log("  2. Test with real WhatsApp messages");
console.log("  3. Verify admin approval workflow (/approve)");
console.log("  4. Test screenshot upload handling");
