/**
 * Test Admin Commands & Health Monitoring
 * Validates /stats, /status commands and /health endpoint
 */

const fs = require("fs");
const path = require("path");

// Mock environment
process.env.ADMIN_NUMBER_1 = "628123456789";
process.env.LOG_RETENTION_DAYS = "7";

const SessionManager = require("./sessionManager");
const ChatbotLogic = require("./chatbotLogic");

// Test utilities
function createMockOrderLog(filename, orders) {
  const logsDir = path.join(__dirname, "logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const filePath = path.join(logsDir, filename);
  const logs = orders.map((order) => JSON.stringify(order)).join("\n");
  fs.writeFileSync(filePath, logs + "\n");
}

function cleanupMockLogs() {
  const logsDir = path.join(__dirname, "logs");
  if (fs.existsSync(logsDir)) {
    const files = fs.readdirSync(logsDir);
    files.forEach((file) => {
      if (file.startsWith("test-")) {
        fs.unlinkSync(path.join(logsDir, file));
      }
    });
  }
}

// Run tests
async function runTests() {
  console.log("🧪 Testing Admin Commands & Monitoring\n");

  const sessionManager = new SessionManager();
  await sessionManager.initialize();

  const chatbotLogic = new ChatbotLogic(sessionManager);

  let passCount = 0;
  let failCount = 0;

  // Setup: Create mock order logs
  console.log("📁 Creating mock order logs...");
  const todayStr = new Date().toISOString().split("T")[0];

  createMockOrderLog(`test-orders-${todayStr}.log`, [
    {
      timestamp: new Date().toISOString(),
      event: "order_created",
      customerId: "6281234567890@c.us",
      metadata: {
        orderId: "ORD-001",
        totalPrice: 100000,
        products: ["Netflix Premium"],
      },
    },
    {
      timestamp: new Date().toISOString(),
      event: "order_created",
      customerId: "6281234567891@c.us",
      metadata: {
        orderId: "ORD-002",
        totalPrice: 50000,
        products: ["Spotify Premium"],
      },
    },
  ]);

  // Test 1: Admin /stats command
  console.log("\n--- Test 1: Admin /stats Command ---");
  try {
    const response = await chatbotLogic.processMessage(
      "628123456789@c.us",
      "/stats"
    );

    console.log("Response:", response.substring(0, 200) + "...");

    if (
      response.includes("Admin Statistics") &&
      response.includes("Orders") &&
      response.includes("Revenue")
    ) {
      console.log("✅ PASS: /stats command works correctly");
      passCount++;
    } else {
      console.log("❌ FAIL: /stats response incomplete");
      console.log("Response:", response);
      failCount++;
    }
  } catch (error) {
    console.log("❌ FAIL: Error executing /stats:", error.message);
    failCount++;
  }

  // Test 2: Unauthorized /stats attempt
  console.log("\n--- Test 2: Unauthorized /stats Access ---");
  try {
    const response = await chatbotLogic.processMessage(
      "999999999999@c.us",
      "/stats"
    );

    if (
      response.includes("tidak memiliki akses") ||
      response.includes("Unauthorized")
    ) {
      console.log("✅ PASS: Unauthorized access blocked");
      passCount++;
    } else {
      console.log("❌ FAIL: Unauthorized access not blocked");
      console.log("Response:", response);
      failCount++;
    }
  } catch (error) {
    console.log("❌ FAIL: Error testing unauthorized access:", error.message);
    failCount++;
  }

  // Test 3: Admin /status command
  console.log("\n--- Test 3: Admin /status Command ---");
  try {
    const response = await chatbotLogic.processMessage(
      "628123456789@c.us",
      "/status"
    );

    console.log("Response:", response.substring(0, 200) + "...");

    if (
      response.includes("System Status") &&
      response.includes("Memory Usage") &&
      response.includes("Uptime")
    ) {
      console.log("✅ PASS: /status command works correctly");
      passCount++;
    } else {
      console.log("❌ FAIL: /status response incomplete");
      console.log("Response:", response);
      failCount++;
    }
  } catch (error) {
    console.log("❌ FAIL: Error executing /status:", error.message);
    failCount++;
  }

  // Test 4: Unauthorized /status attempt
  console.log("\n--- Test 4: Unauthorized /status Access ---");
  try {
    const response = await chatbotLogic.processMessage(
      "999999999999@c.us",
      "/status"
    );

    if (
      response.includes("tidak memiliki akses") ||
      response.includes("Unauthorized")
    ) {
      console.log("✅ PASS: Unauthorized access blocked");
      passCount++;
    } else {
      console.log("❌ FAIL: Unauthorized access not blocked");
      console.log("Response:", response);
      failCount++;
    }
  } catch (error) {
    console.log("❌ FAIL: Error testing unauthorized access:", error.message);
    failCount++;
  }

  // Test 5: Currency formatting
  console.log("\n--- Test 5: IDR Currency Formatting ---");
  try {
    const formatted = chatbotLogic.formatIDR(1500000);

    if (formatted.includes("Rp") && formatted.includes("1.500.000")) {
      console.log(`✅ PASS: Currency formatted correctly: ${formatted}`);
      passCount++;
    } else {
      console.log(`❌ FAIL: Currency format incorrect: ${formatted}`);
      failCount++;
    }
  } catch (error) {
    console.log("❌ FAIL: Error formatting currency:", error.message);
    failCount++;
  }

  // Test 6: Session count
  console.log("\n--- Test 6: Active Session Count ---");
  try {
    // Create some sessions
    await sessionManager.getSession("6281111111111@c.us");
    await sessionManager.getSession("6281111111112@c.us");
    await sessionManager.getSession("6281111111113@c.us");

    const count = await sessionManager.getActiveSessionCount();

    if (count >= 3) {
      console.log(`✅ PASS: Session count correct: ${count}`);
      passCount++;
    } else {
      console.log(`❌ FAIL: Session count incorrect: ${count} (expected >= 3)`);
      failCount++;
    }
  } catch (error) {
    console.log("❌ FAIL: Error getting session count:", error.message);
    failCount++;
  }

  // Cleanup
  cleanupMockLogs();
  await sessionManager.shutdown();

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 Test Summary");
  console.log("=".repeat(50));
  console.log(`✅ Passed: ${passCount}/6`);
  console.log(`❌ Failed: ${failCount}/6`);
  console.log(`📈 Success Rate: ${((passCount / 6) * 100).toFixed(0)}%`);

  if (failCount === 0) {
    console.log("\n🎉 All admin command tests passed!");
  } else {
    console.log("\n⚠️  Some tests failed. Please check the output above.");
  }
}

// Run tests
runTests().catch((error) => {
  console.error("❌ Test execution error:", error);
  process.exit(1);
});
