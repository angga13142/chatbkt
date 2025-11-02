/**
 * Promo Code System Tests
 * Tests promotional code functionality
 */

const PromoService = require("../src/services/promo/PromoService");
const SessionManager = require("../sessionManager");
const CustomerHandler = require("../src/handlers/CustomerHandler");
const AdminHandler = require("../src/handlers/AdminHandler");
const fs = require("fs");
const path = require("path");

// Mock payment handlers
const mockPaymentHandlers = {
  xendit: { createQRIS: async () => ({ success: false }) },
  manualQRIS: { getQRIS: async () => ({ success: false }) },
};

// Mock Xendit service
const mockXenditService = {
  createQRIS: async () => ({ success: false }),
  checkPaymentStatus: async () => ({ status: "PENDING" }),
};

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🧪 PROMO CODE SYSTEM TESTS");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// Clean up test data files
const testDataDir = path.join(__dirname, "../data");
const promosFile = path.join(testDataDir, "promos.json");
const usageFile = path.join(testDataDir, "promo_usage.json");

function cleanupTestData() {
  if (fs.existsSync(promosFile)) fs.unlinkSync(promosFile);
  if (fs.existsSync(usageFile)) fs.unlinkSync(usageFile);
}

// Test setup
const promoService = new PromoService();
const sessionManager = new SessionManager();
const customerHandler = new CustomerHandler(
  sessionManager,
  mockPaymentHandlers
);
const adminHandler = new AdminHandler(sessionManager, mockXenditService);

const customerId1 = "6281234567890@c.us";
const customerId2 = "6289876543210@c.us";
const adminId = process.env.ADMIN_NUMBER_1 || "6281111111111@c.us";

let passedTests = 0;
let totalTests = 0;

function test(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ ${description}`);
    passedTests++;
  } catch (error) {
    console.log(`❌ ${description}`);
    console.log(`   Error: ${error.message}`);
  }
}

async function asyncTest(description, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`✅ ${description}`);
    passedTests++;
  } catch (error) {
    console.log(`❌ ${description}`);
    console.log(`   Error: ${error.message}`);
  }
}

async function runTests() {
  // Clean up before tests
  cleanupTestData();

  // ============================================
  // 1. PromoService Tests
  // ============================================
  console.log("\n📦 PromoService Tests\n");

  await asyncTest("Should create promo code", async () => {
    const result = promoService.createPromo("NEWUSER10", 10, 30, 0);
    if (!result.success) throw new Error("Failed to create promo");
    if (!result.promo) throw new Error("Promo object not returned");
    if (result.promo.code !== "NEWUSER10") throw new Error("Wrong promo code");
    if (result.promo.discountPercent !== 10) throw new Error("Wrong discount");
  });

  await asyncTest("Should not create duplicate promo code", async () => {
    const result = promoService.createPromo("NEWUSER10", 20, 30, 0);
    if (result.success) throw new Error("Should not allow duplicate");
    if (!result.message.includes("sudah ada"))
      throw new Error("Wrong error message");
  });

  await asyncTest("Should validate promo code format", async () => {
    const result1 = promoService.createPromo("AB", 10, 30, 0);
    if (result1.success) throw new Error("Should reject short code");

    const result2 = promoService.createPromo("PROMO CODE", 10, 30, 0);
    if (result2.success) throw new Error("Should reject code with spaces");

    const result3 = promoService.createPromo("PROMO-10", 10, 30, 0);
    if (result3.success)
      throw new Error("Should reject code with special chars");
  });

  await asyncTest("Should validate discount percentage", async () => {
    const result1 = promoService.createPromo("INVALID1", 0, 30, 0);
    if (result1.success) throw new Error("Should reject 0% discount");

    const result2 = promoService.createPromo("INVALID2", 101, 30, 0);
    if (result2.success) throw new Error("Should reject >100% discount");
  });

  await asyncTest("Should validate expiry days", async () => {
    const result = promoService.createPromo("INVALID3", 10, 0, 0);
    if (result.success) throw new Error("Should reject 0 day expiry");
  });

  await asyncTest("Should create promo with max uses", async () => {
    const result = promoService.createPromo("LIMITED50", 50, 7, 100);
    if (!result.success) throw new Error("Failed to create limited promo");
    if (result.promo.maxUses !== 100) throw new Error("Wrong max uses");
  });

  await asyncTest("Should validate promo code", async () => {
    const validation = promoService.validatePromo("NEWUSER10", customerId1);
    if (!validation.valid) throw new Error("Should be valid");
    if (validation.discountPercent !== 10)
      throw new Error("Wrong discount percent");
  });

  await asyncTest("Should reject invalid promo code", async () => {
    const validation = promoService.validatePromo("INVALID", customerId1);
    if (validation.valid) throw new Error("Should be invalid");
  });

  await asyncTest("Should apply promo code", async () => {
    const result = promoService.applyPromo("NEWUSER10", customerId1);
    if (!result.success) throw new Error("Failed to apply promo");
    if (result.discountPercent !== 10) throw new Error("Wrong discount");
  });

  await asyncTest("Should not reuse promo code", async () => {
    const validation = promoService.validatePromo("NEWUSER10", customerId1);
    if (validation.valid) throw new Error("Should reject already used promo");
    if (!validation.message.includes("sudah menggunakan"))
      throw new Error("Wrong error");
  });

  await asyncTest(
    "Should allow different customer to use same promo",
    async () => {
      const validation = promoService.validatePromo("NEWUSER10", customerId2);
      if (!validation.valid)
        throw new Error("Should be valid for different customer");
    }
  );

  await asyncTest("Should calculate discount correctly", async () => {
    const discount = promoService.calculateDiscount(100000, 10);
    if (discount.originalAmount !== 100000)
      throw new Error("Wrong original amount");
    if (discount.discountAmount !== 10000)
      throw new Error("Wrong discount amount");
    if (discount.finalAmount !== 90000) throw new Error("Wrong final amount");
    if (discount.discountPercent !== 10)
      throw new Error("Wrong discount percent");
  });

  await asyncTest("Should get all promos", async () => {
    const promos = promoService.getAllPromos(false);
    if (promos.length === 0) throw new Error("Should have promos");
    const newUserPromo = promos.find((p) => p.code === "NEWUSER10");
    if (!newUserPromo) throw new Error("NEWUSER10 promo not found");
  });

  await asyncTest("Should get promo by code", async () => {
    const promo = promoService.getPromo("NEWUSER10");
    if (!promo) throw new Error("Promo not found");
    if (promo.code !== "NEWUSER10") throw new Error("Wrong promo");
  });

  await asyncTest("Should get promo stats", async () => {
    const stats = promoService.getPromoStats("NEWUSER10");
    if (!stats) throw new Error("Stats not returned");
    if (stats.totalUses !== 1)
      throw new Error(`Expected 1 use, got ${stats.totalUses}`);
    if (stats.code !== "NEWUSER10") throw new Error("Wrong code");
  });

  await asyncTest("Should track customer usage", async () => {
    const usage = promoService.getCustomerUsage(customerId1);
    if (usage.length !== 1)
      throw new Error(`Expected 1 usage, got ${usage.length}`);
    if (usage[0] !== "NEWUSER10") throw new Error("Wrong promo in usage");
  });

  await asyncTest("Should deactivate promo", async () => {
    promoService.createPromo("TEMPPROMO", 5, 1, 0);
    const result = promoService.deactivatePromo("TEMPPROMO");
    if (!result.success) throw new Error("Failed to deactivate");

    const validation = promoService.validatePromo("TEMPPROMO", customerId2);
    if (validation.valid)
      throw new Error("Should be invalid after deactivation");
  });

  await asyncTest("Should delete promo", async () => {
    promoService.createPromo("DELETETEST", 5, 1, 0);
    const result = promoService.deletePromo("DELETETEST");
    if (!result.success) throw new Error("Failed to delete");

    const promo = promoService.getPromo("DELETETEST");
    if (promo) throw new Error("Promo should be deleted");
  });

  await asyncTest("Should enforce max uses", async () => {
    promoService.createPromo("MAXTEST", 10, 30, 1);
    promoService.applyPromo("MAXTEST", customerId1);

    const validation = promoService.validatePromo("MAXTEST", customerId2);
    if (validation.valid)
      throw new Error("Should reject when max uses reached");
  });

  await asyncTest("Should handle expired promo", async () => {
    // Create promo that expires immediately
    promoService.createPromo("EXPIRED", 10, -1, 0);

    const validation = promoService.validatePromo("EXPIRED", customerId1);
    if (validation.valid) throw new Error("Should reject expired promo");
  });

  // ============================================
  // 2. AdminHandler Tests
  // ============================================
  console.log("\n👨‍💼 AdminHandler Promo Tests\n");

  await asyncTest("Should handle /createpromo command", async () => {
    const response = await adminHandler.promoHandler.handleCreatePromo(
      adminId,
      "/createpromo FLASH25 25 7 50"
    );
    if (!response.includes("berhasil dibuat"))
      throw new Error("Wrong response");
  });

  await asyncTest("Should handle invalid /createpromo format", async () => {
    const response = await adminHandler.promoHandler.handleCreatePromo(
      adminId,
      "/createpromo INVALID"
    );
    if (!response.includes("Format salah"))
      throw new Error("Should show format error");
  });

  await asyncTest("Should handle /listpromos command", async () => {
    const response = adminHandler.promoHandler.handleListPromos(adminId);
    if (!response.includes("DAFTAR PROMO"))
      throw new Error("Wrong response format");
    if (!response.includes("FLASH25")) throw new Error("Should list FLASH25");
  });

  await asyncTest("Should handle /promostats command", async () => {
    const response = adminHandler.promoHandler.handlePromoStats(
      adminId,
      "/promostats FLASH25"
    );
    if (!response.includes("PROMO STATISTICS"))
      throw new Error("Wrong response format");
    if (!response.includes("FLASH25"))
      throw new Error("Should show FLASH25 stats");
  });

  await asyncTest("Should handle /deletepromo command", async () => {
    promoService.createPromo("DELETEADMIN", 10, 7, 0);
    const response = adminHandler.promoHandler.handleDeletePromo(
      adminId,
      "/deletepromo DELETEADMIN"
    );
    if (!response.includes("berhasil dihapus"))
      throw new Error("Should confirm deletion");
  });

  // ============================================
  // 3. CustomerHandler Tests
  // ============================================
  console.log("\n👤 CustomerHandler Promo Tests\n");

  await asyncTest("Should apply promo during checkout", async () => {
    // Setup cart
    await sessionManager.addToCart(customerId2, {
      id: "netflix",
      name: "Netflix Premium",
      price: 15000,
    });
    await sessionManager.setStep(customerId2, "checkout");

    const response = await customerHandler.handleApplyPromo(
      customerId2,
      "LIMITED50"
    );
    if (typeof response.message !== "string")
      throw new Error("Response should be string");
    if (!response.message.includes("Kode Promo Diterapkan"))
      throw new Error("Should confirm promo applied");
    if (!response.message.includes("LIMITED50"))
      throw new Error("Should show promo code");
  });

  await asyncTest("Should show discount in checkout", async () => {
    const session = await sessionManager.getSession(customerId2);
    if (!session.promoCode) throw new Error("Promo code should be saved");
    if (session.promoCode !== "LIMITED50")
      throw new Error("Wrong promo code saved");
    if (session.discountPercent !== 50) throw new Error("Wrong discount saved");
  });

  await asyncTest("Should handle invalid promo", async () => {
    const response = await customerHandler.handleApplyPromo(
      customerId2,
      "INVALID99"
    );
    if (!response.message.includes("tidak ditemukan"))
      throw new Error("Should show error");
  });

  await asyncTest("Should clear promo on cart clear", async () => {
    await sessionManager.setStep(customerId2, "checkout");
    const response = await customerHandler.handleCheckout(customerId2, "clear");

    const session = await sessionManager.getSession(customerId2);
    if (session.promoCode !== null)
      throw new Error("Promo code should be cleared");
    if (session.discountPercent !== 0)
      throw new Error("Discount should be cleared");
  });

  // ============================================
  // 4. Integration Tests
  // ============================================
  console.log("\n🔗 Integration Tests\n");

  await asyncTest("Full checkout flow with promo", async () => {
    // Setup
    const testCustomer = "6285555555555@c.us";
    await sessionManager.addToCart(testCustomer, {
      id: "spotify",
      name: "Spotify Premium",
      price: 20000,
    });
    await sessionManager.setStep(testCustomer, "checkout");

    // Apply promo
    promoService.createPromo("INTTEST10", 10, 30, 0);
    const applyResult = await customerHandler.handleApplyPromo(
      testCustomer,
      "INTTEST10"
    );
    if (!applyResult.message.includes("Diterapkan"))
      throw new Error("Apply failed");

    // Verify discount calculation
    const session = await sessionManager.getSession(testCustomer);
    if (session.promoCode !== "INTTEST10") throw new Error("Promo not saved");

    const discount = promoService.calculateDiscount(20000, 10);
    if (discount.finalAmount !== 18000) throw new Error("Wrong final amount");
  });

  await asyncTest("Promo should persist across session", async () => {
    const testCustomer = "6286666666666@c.us";

    // Create and apply promo
    promoService.createPromo("PERSIST20", 20, 30, 0);
    await sessionManager.addToCart(testCustomer, {
      id: "netflix",
      name: "Netflix",
      price: 15000,
    });
    await sessionManager.setStep(testCustomer, "checkout");
    await customerHandler.handleApplyPromo(testCustomer, "PERSIST20");

    // Check persistence
    const session = await sessionManager.getSession(testCustomer);
    if (session.promoCode !== "PERSIST20")
      throw new Error("Promo not persisted");
    if (session.discountPercent !== 20)
      throw new Error("Discount not persisted");
  });

  // ============================================
  // 5. Edge Cases
  // ============================================
  console.log("\n⚠️  Edge Case Tests\n");

  await asyncTest("Should handle uppercase/lowercase promo codes", async () => {
    const validation1 = promoService.validatePromo(
      "flash25",
      "6287777777777@c.us"
    );
    const validation2 = promoService.validatePromo(
      "FLASH25",
      "6287777777777@c.us"
    );

    if (validation1.valid !== validation2.valid)
      throw new Error("Case sensitivity issue");
  });

  await asyncTest("Should handle promo with whitespace", async () => {
    const validation = promoService.validatePromo(
      "  FLASH25  ",
      "6288888888888@c.us"
    );
    if (!validation.valid) throw new Error("Should trim whitespace");
  });

  await asyncTest("Should calculate 100% discount", async () => {
    promoService.createPromo("FREE100", 100, 1, 1);
    const discount = promoService.calculateDiscount(50000, 100);
    if (discount.finalAmount !== 0) throw new Error("Should be free");
    if (discount.discountAmount !== 50000)
      throw new Error("Wrong discount amount");
  });

  await asyncTest("Should handle 1% discount", async () => {
    const discount = promoService.calculateDiscount(100000, 1);
    if (discount.discountAmount !== 1000) throw new Error("Wrong 1% discount");
    if (discount.finalAmount !== 99000) throw new Error("Wrong final amount");
  });

  await asyncTest("Should handle rounding", async () => {
    const discount = promoService.calculateDiscount(15333, 10);
    // Should round to nearest integer
    if (!Number.isInteger(discount.discountAmount))
      throw new Error("Should be integer");
    if (!Number.isInteger(discount.finalAmount))
      throw new Error("Should be integer");
  });

  // ============================================
  // Test Summary
  // ============================================
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 TEST SUMMARY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(
    `Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`
  );

  if (passedTests === totalTests) {
    console.log("✅ ALL PROMO CODE TESTS PASSED!");

    // Cleanup test data after successful tests
    cleanupTestData();

    process.exit(0);
  } else {
    console.log("❌ SOME TESTS FAILED");
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error("\n❌ Test suite error:", error);
  cleanupTestData();
  process.exit(1);
});
