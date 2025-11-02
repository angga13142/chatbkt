/**
 * Test Inventory Management Features
 * Tests /addstock, /addstock-bulk, /stockreport, /salesreport
 */

const InventoryManager = require("../src/services/inventory/InventoryManager");
const fs = require("fs");
const path = require("path");

// Test data
const ADMIN_ID = "6281234567890@c.us";
const TEST_PRODUCT_ID = "test-netflix";
const TEST_CREDENTIALS = [
  "premium1@netflix.com:Password123!",
  "premium2@netflix.com:Secret456!",
  "premium3@netflix.com:Secure789!",
];

// Cleanup test files
function cleanup() {
  try {
    const testFile = path.join("./products_data", `${TEST_PRODUCT_ID}.txt`);
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
    console.log("🧹 Cleanup completed");
  } catch (error) {
    console.error("❌ Cleanup error:", error.message);
  }
}

// Test 1: Add single credential
async function testAddCredential() {
  console.log("\n📝 TEST 1: Add Single Credential");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const inventoryManager = new InventoryManager();
  const result = await inventoryManager.addCredentials(
    TEST_PRODUCT_ID,
    TEST_CREDENTIALS[0],
    ADMIN_ID
  );

  if (result.success) {
    console.log("✅ PASS: Credential added successfully");
    console.log(`   Stock count: ${result.stockCount}`);
    console.log(`   Message: ${result.message}`);
  } else {
    console.log("❌ FAIL: Could not add credential");
    console.log(`   Error: ${result.error}`);
  }

  return result.success;
}

// Test 2: Add bulk credentials
async function testAddBulkCredentials() {
  console.log("\n📝 TEST 2: Add Bulk Credentials");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const inventoryManager = new InventoryManager();

  // Add remaining credentials
  const bulkCreds = TEST_CREDENTIALS.slice(1);
  const result = await inventoryManager.addBulkCredentials(
    TEST_PRODUCT_ID,
    bulkCreds,
    ADMIN_ID
  );

  if (result.success) {
    console.log("✅ PASS: Bulk credentials added successfully");
    console.log(`   Valid: ${result.validCount}`);
    console.log(`   Invalid: ${result.invalidCount}`);
    console.log(`   Total stock: ${result.stockCount}`);
  } else {
    console.log("❌ FAIL: Could not add bulk credentials");
    console.log(`   Error: ${result.error}`);
  }

  return result.success;
}

// Test 3: Get stock count
async function testGetStockCount() {
  console.log("\n📝 TEST 3: Get Stock Count");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const inventoryManager = new InventoryManager();
  const count = await inventoryManager.getStockCount(TEST_PRODUCT_ID);

  const expectedCount = TEST_CREDENTIALS.length;

  if (count === expectedCount) {
    console.log(`✅ PASS: Stock count is correct (${count})`);
  } else {
    console.log(
      `❌ FAIL: Stock count mismatch (expected ${expectedCount}, got ${count})`
    );
  }

  return count === expectedCount;
}

// Test 4: Get all stock counts
async function testGetAllStockCounts() {
  console.log("\n📝 TEST 4: Get All Stock Counts");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const inventoryManager = new InventoryManager();
  const stocks = await inventoryManager.getAllStockCounts();

  console.log(`   Found ${Object.keys(stocks).length} products with stock`);

  for (const [productId, count] of Object.entries(stocks)) {
    console.log(`   • ${productId}: ${count}`);
  }

  const hasTestProduct = TEST_PRODUCT_ID in stocks;

  if (hasTestProduct) {
    console.log("✅ PASS: Test product found in stock report");
  } else {
    console.log("❌ FAIL: Test product not found in stock report");
  }

  return hasTestProduct;
}

// Test 5: Validate credentials format
async function testValidateCredentials() {
  console.log("\n📝 TEST 5: Validate Credentials Format");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const inventoryManager = new InventoryManager();

  const testCases = [
    { input: "email@test.com:password123", shouldPass: true },
    { input: "email@test.com|password123", shouldPass: true },
    { input: "email@test.com,password123", shouldPass: true },
    { input: "invalid", shouldPass: false },
    { input: "", shouldPass: false },
    { input: "short", shouldPass: false },
  ];

  let allPassed = true;

  for (const testCase of testCases) {
    const result = inventoryManager.validateCredentials(testCase.input);
    const passed = result.valid === testCase.shouldPass;

    if (passed) {
      console.log(
        `   ✅ '${testCase.input}' -> ${result.valid ? "valid" : "invalid"}`
      );
    } else {
      console.log(
        `   ❌ '${testCase.input}' -> Expected ${testCase.shouldPass}, got ${result.valid}`
      );
      allPassed = false;
    }
  }

  if (allPassed) {
    console.log("✅ PASS: All validation tests passed");
  } else {
    console.log("❌ FAIL: Some validation tests failed");
  }

  return allPassed;
}

// Test 6: Archive sold credential
async function testArchiveSoldCredential() {
  console.log("\n📝 TEST 6: Archive Sold Credential");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const inventoryManager = new InventoryManager();
  const result = await inventoryManager.archiveSoldCredential(
    TEST_PRODUCT_ID,
    TEST_CREDENTIALS[0],
    "ORD-TEST-123",
    "6289999999999@c.us"
  );

  if (result.success) {
    console.log("✅ PASS: Credential archived successfully");
  } else {
    console.log("❌ FAIL: Could not archive credential");
    console.log(`   Error: ${result.error}`);
  }

  return result.success;
}

// Test 7: Get sales report
async function testGetSalesReport() {
  console.log("\n📝 TEST 7: Get Sales Report");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const inventoryManager = new InventoryManager();
  const report = await inventoryManager.getSalesReport(7);

  if (report) {
    console.log(`✅ PASS: Sales report generated`);
    console.log(`   Period: ${report.period}`);
    console.log(`   Total sales: ${report.totalSales}`);
    console.log(`   Products:`);
    for (const [productId, count] of Object.entries(report.salesByProduct)) {
      console.log(`     • ${productId}: ${count}`);
    }
  } else {
    console.log("❌ FAIL: Could not generate sales report");
  }

  return report !== null;
}

// Test 8: Sanitize product ID (security test)
async function testSanitizeProductId() {
  console.log("\n📝 TEST 8: Sanitize Product ID (Security)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const inventoryManager = new InventoryManager();

  const testCases = [
    { input: "netflix", expected: "netflix" },
    { input: "NETFLIX", expected: "netflix" },
    { input: "netflix-premium", expected: "netflix-premium" },
    { input: "../../../etc/passwd", expected: "etcpasswd" }, // Path traversal attempt
    { input: "test;rm -rf /", expected: "testrm-rf" }, // Command injection attempt
    {
      input: "test<script>alert(1)</script>",
      expected: "testscriptalert1script",
    },
  ];

  let allPassed = true;

  for (const testCase of testCases) {
    const result = inventoryManager.sanitizeProductId(testCase.input);
    const passed = result === testCase.expected;

    if (passed) {
      console.log(`   ✅ '${testCase.input}' -> '${result}'`);
    } else {
      console.log(
        `   ❌ '${testCase.input}' -> Expected '${testCase.expected}', got '${result}'`
      );
      allPassed = false;
    }
  }

  if (allPassed) {
    console.log("✅ PASS: All sanitization tests passed");
  } else {
    console.log("❌ FAIL: Some sanitization tests failed");
  }

  return allPassed;
}

// Run all tests
async function runAllTests() {
  console.log("╔════════════════════════════════════════════╗");
  console.log("║  INVENTORY MANAGEMENT SYSTEM TEST SUITE    ║");
  console.log("╚════════════════════════════════════════════╝");

  // Cleanup first
  cleanup();

  const results = [];

  try {
    results.push(await testAddCredential());
    results.push(await testAddBulkCredentials());
    results.push(await testGetStockCount());
    results.push(await testGetAllStockCounts());
    results.push(await testValidateCredentials());
    results.push(await testArchiveSoldCredential());
    results.push(await testGetSalesReport());
    results.push(await testSanitizeProductId());

    // Summary
    console.log("\n╔════════════════════════════════════════════╗");
    console.log("║            TEST SUMMARY                    ║");
    console.log("╚════════════════════════════════════════════╝");

    const passed = results.filter((r) => r).length;
    const total = results.length;

    console.log(`\n   Total tests: ${total}`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${total - passed}`);
    console.log(`   📊 Success rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (passed === total) {
      console.log("\n🎉 ALL TESTS PASSED! 🎉\n");
    } else {
      console.log("\n⚠️ SOME TESTS FAILED\n");
    }
  } catch (error) {
    console.error("\n❌ TEST SUITE ERROR:", error);
  } finally {
    // Cleanup
    cleanup();
  }
}

// Run tests
runAllTests();
