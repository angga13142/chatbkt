/**
 * Test Redis Inventory Storage
 * Tests Redis-based FIFO queue for inventory management
 */

const redisClient = require("../lib/redisClient");
const RedisInventoryStorage = require("../src/services/inventory/RedisInventoryStorage");

const ADMIN_ID = "6281234567890@c.us";
const TEST_PRODUCT = "test-redis-netflix";

async function runTests() {
  console.log("╔════════════════════════════════════════════╗");
  console.log("║  REDIS INVENTORY STORAGE TEST SUITE        ║");
  console.log("╚════════════════════════════════════════════╝\n");

  try {
    // Connect to Redis
    console.log("🔄 Connecting to Redis...");
    await redisClient.connect();

    if (!redisClient.isReady()) {
      console.log("❌ Redis not available - skipping tests");
      return;
    }

    const storage = new RedisInventoryStorage(redisClient);
    await storage.initialize();

    // Test 1: Add credential
    console.log("\n📝 TEST 1: Add Credential to Redis");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const result1 = await storage.addCredentials(
      TEST_PRODUCT,
      "premium1@netflix.com:Password123!",
      ADMIN_ID
    );

    console.log(result1.success ? "✅ PASS" : "❌ FAIL");
    console.log(`Stock: ${result1.stockCount}`);

    // Test 2: Bulk add
    console.log("\n📝 TEST 2: Bulk Add Credentials");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const result2 = await storage.addBulkCredentials(
      TEST_PRODUCT,
      [
        "premium2@netflix.com:Pass456!",
        "premium3@netflix.com:Secret789!",
        "premium4@netflix.com:Secure2024!",
      ],
      ADMIN_ID
    );

    console.log(result2.success ? "✅ PASS" : "❌ FAIL");
    console.log(`Valid: ${result2.validCount}, Stock: ${result2.stockCount}`);

    // Test 3: Get stock count
    console.log("\n📝 TEST 3: Get Stock Count");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const count = await storage.getStockCount(TEST_PRODUCT);
    console.log(`Stock count: ${count}`);
    console.log(count === 4 ? "✅ PASS" : "❌ FAIL");

    // Test 4: Get credential (FIFO)
    console.log("\n📝 TEST 4: Get Credential (FIFO)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const cred1 = await storage.getCredential(TEST_PRODUCT);
    console.log(`Got: ${cred1}`);
    console.log(
      cred1 === "premium1@netflix.com:Password123!" ? "✅ PASS" : "❌ FAIL"
    );

    const remainingStock = await storage.getStockCount(TEST_PRODUCT);
    console.log(`Remaining: ${remainingStock}`);
    console.log(remainingStock === 3 ? "✅ PASS" : "❌ FAIL");

    // Test 5: Archive sold
    console.log("\n📝 TEST 5: Archive Sold Credential");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const result5 = await storage.archiveSoldCredential(
      TEST_PRODUCT,
      cred1,
      "ORD-TEST-123",
      "6289999999999@c.us"
    );

    console.log(result5.success ? "✅ PASS" : "❌ FAIL");

    // Test 6: Sales report
    console.log("\n📝 TEST 6: Sales Report");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const report = await storage.getSalesReport(7);
    console.log(`Period: ${report.period}`);
    console.log(`Total sales: ${report.totalSales}`);
    console.log(report.totalSales >= 1 ? "✅ PASS" : "❌ FAIL");

    // Test 7: Get all stock counts
    console.log("\n📝 TEST 7: Get All Stock Counts");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const allStocks = await storage.getAllStockCounts();
    console.log(`Products found: ${Object.keys(allStocks).length}`);
    for (const [id, count] of Object.entries(allStocks)) {
      console.log(`  • ${id}: ${count}`);
    }
    console.log(TEST_PRODUCT in allStocks ? "✅ PASS" : "❌ FAIL");

    // Cleanup
    console.log("\n🧹 Cleanup");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const client = redisClient.getClient();
    await client.del(`inventory:credentials:${TEST_PRODUCT}`);
    await client.del(`inventory:stock:${TEST_PRODUCT}`);
    console.log("✅ Test data cleaned");

    console.log("\n╔════════════════════════════════════════════╗");
    console.log("║            TEST SUMMARY                    ║");
    console.log("╚════════════════════════════════════════════╝");
    console.log("\n🎉 All tests completed!\n");
  } catch (error) {
    console.error("\n❌ TEST ERROR:", error);
  } finally {
    await redisClient.disconnect();
  }
}

runTests();
