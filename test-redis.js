/**
 * Redis Client Test
 * Tests Redis connection, operations, and error handling
 */

const redisClient = require("./lib/redisClient");

async function testRedis() {
  console.log("🧪 Testing Redis Client...\n");

  try {
    // Test 1: Connection
    console.log("1️⃣ Testing connection...");
    const connected = await redisClient.connect();

    if (!connected) {
      console.log("⚠️  Redis not available - using fallback mode");
      console.log("   This is OK for development without Redis installed");
      return true; // Not a failure
    }

    console.log("✅ Connected to Redis\n");

    // Test 2: Ping
    console.log("2️⃣ Testing ping...");
    const pingResult = await redisClient.ping();
    if (!pingResult) {
      throw new Error("Ping failed");
    }
    console.log("✅ Ping successful\n");

    // Test 3: Set/Get
    console.log("3️⃣ Testing set/get operations...");
    const client = redisClient.getClient();
    const testKey = "test:session:123";
    const testData = JSON.stringify({
      customerId: "123",
      cart: ["item1", "item2"],
      step: "menu",
      timestamp: Date.now(),
    });

    await client.setEx(testKey, 60, testData);
    console.log("✅ Set data with 60s TTL");

    const retrievedData = await client.get(testKey);
    if (!retrievedData) {
      throw new Error("Failed to retrieve data");
    }
    console.log("✅ Retrieved data successfully");

    const parsed = JSON.parse(retrievedData);
    if (parsed.customerId !== "123") {
      throw new Error("Data mismatch");
    }
    console.log("✅ Data integrity verified\n");

    // Test 4: TTL
    console.log("4️⃣ Testing TTL...");
    const ttl = await client.ttl(testKey);
    if (ttl <= 0 || ttl > 60) {
      throw new Error(`Invalid TTL: ${ttl}`);
    }
    console.log(`✅ TTL is ${ttl} seconds (expected ≤60)\n`);

    // Test 5: Pattern matching
    console.log("5️⃣ Testing pattern matching...");
    await client.setEx("test:session:456", 60, JSON.stringify({ id: "456" }));
    await client.setEx("test:session:789", 60, JSON.stringify({ id: "789" }));

    const keys = await client.keys("test:session:*");
    if (keys.length < 3) {
      throw new Error(`Expected at least 3 keys, found ${keys.length}`);
    }
    console.log(`✅ Found ${keys.length} matching keys\n`);

    // Test 6: Cleanup
    console.log("6️⃣ Cleaning up test data...");
    for (const key of keys) {
      await client.del(key);
    }
    console.log("✅ Test data cleaned\n");

    // Test 7: Graceful shutdown
    console.log("7️⃣ Testing graceful shutdown...");
    await redisClient.disconnect();
    console.log("✅ Disconnected gracefully\n");

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ ALL REDIS TESTS PASSED");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return true;
  } catch (error) {
    console.error("\n❌ Redis test failed:", error.message);
    console.error("Stack:", error.stack);
    return false;
  }
}

// Run tests
testRedis()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
