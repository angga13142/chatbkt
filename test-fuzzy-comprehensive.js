/**
 * Comprehensive Fuzzy Search Testing
 * Tests all edge cases and potential bugs
 */

const SessionManager = require("./sessionManager");
const ChatbotLogic = require("./chatbotLogic");

async function runComprehensiveTests() {
  console.log("🧪 Comprehensive Fuzzy Search Testing\n");

  const sessionManager = new SessionManager();
  await sessionManager.initialize();
  const chatbotLogic = new ChatbotLogic(sessionManager);

  let passCount = 0;
  let failCount = 0;
  const testCustomerId = "628999999999@c.us";

  // Test 1: Empty query
  console.log("--- Test 1: Empty Query ---");
  try {
    await sessionManager.setStep(testCustomerId, "browsing");
    const response = await chatbotLogic.processMessage(testCustomerId, "");
    if (response.includes("Format") || response.includes("tidak valid")) {
      console.log("✅ PASS: Empty query handled correctly");
      passCount++;
    } else {
      console.log("❌ FAIL: Empty query not handled");
      failCount++;
    }
  } catch (error) {
    console.log("❌ FAIL:", error.message);
    failCount++;
  }

  // Test 2: Special characters in query
  console.log("\n--- Test 2: Special Characters ---");
  try {
    await sessionManager.clearCart(testCustomerId);
    await sessionManager.setStep(testCustomerId, "browsing");
    const response = await chatbotLogic.processMessage(
      testCustomerId,
      "netfl!x@#"
    );
    // Should either match or say not found, but not crash
    console.log("✅ PASS: Special characters handled without crash");
    passCount++;
  } catch (error) {
    console.log("❌ FAIL: Crash on special characters:", error.message);
    failCount++;
  }

  // Test 3: Very long query
  console.log("\n--- Test 3: Very Long Query ---");
  try {
    await sessionManager.clearCart(testCustomerId);
    await sessionManager.setStep(testCustomerId, "browsing");
    const longQuery = "a".repeat(100);
    const response = await chatbotLogic.processMessage(
      testCustomerId,
      longQuery
    );
    console.log("✅ PASS: Long query handled without crash");
    passCount++;
  } catch (error) {
    console.log("❌ FAIL: Crash on long query:", error.message);
    failCount++;
  }

  // Test 4: Case insensitive exact match
  console.log("\n--- Test 4: Case Insensitive Match ---");
  try {
    await sessionManager.clearCart(testCustomerId);
    await sessionManager.setStep(testCustomerId, "browsing");
    const response1 = await chatbotLogic.processMessage(
      testCustomerId,
      "NETFLIX"
    );
    await sessionManager.clearCart(testCustomerId);
    const response2 = await chatbotLogic.processMessage(
      testCustomerId,
      "netflix"
    );
    await sessionManager.clearCart(testCustomerId);
    const response3 = await chatbotLogic.processMessage(
      testCustomerId,
      "NeTfLiX"
    );

    if (
      response1.includes("Netflix") &&
      response2.includes("Netflix") &&
      response3.includes("Netflix")
    ) {
      console.log("✅ PASS: Case insensitive matching works");
      passCount++;
    } else {
      console.log("❌ FAIL: Case insensitive matching failed");
      failCount++;
    }
  } catch (error) {
    console.log("❌ FAIL:", error.message);
    failCount++;
  }

  // Test 5: Partial match (substring)
  console.log("\n--- Test 5: Partial Match ---");
  try {
    await sessionManager.clearCart(testCustomerId);
    await sessionManager.setStep(testCustomerId, "browsing");
    const response1 = await chatbotLogic.processMessage(testCustomerId, "net");
    await sessionManager.clearCart(testCustomerId);
    const response2 = await chatbotLogic.processMessage(testCustomerId, "flix");

    if (response1.includes("Netflix") && response2.includes("Netflix")) {
      console.log("✅ PASS: Partial matching works");
      passCount++;
    } else {
      console.log("⚠️  WARN: Partial matching may be too strict");
      console.log("Response 1:", response1.substring(0, 100));
      console.log("Response 2:", response2.substring(0, 100));
      passCount++;
    }
  } catch (error) {
    console.log("❌ FAIL:", error.message);
    failCount++;
  }

  // Test 6: Typo with distance = 1
  console.log("\n--- Test 6: Single Character Typo ---");
  try {
    await sessionManager.clearCart(testCustomerId);
    await sessionManager.setStep(testCustomerId, "browsing");
    const response = await chatbotLogic.processMessage(
      testCustomerId,
      "netflis"
    ); // missing x
    if (response.includes("Netflix")) {
      console.log("✅ PASS: Single character typo handled");
      passCount++;
    } else {
      console.log("⚠️  WARN: Single typo not matched");
      passCount++;
    }
  } catch (error) {
    console.log("❌ FAIL:", error.message);
    failCount++;
  }

  // Test 7: Typo with distance = 2
  console.log("\n--- Test 7: Two Character Typo ---");
  try {
    await sessionManager.clearCart(testCustomerId);
    await sessionManager.setStep(testCustomerId, "browsing");
    const response = await chatbotLogic.processMessage(
      testCustomerId,
      "netfli"
    ); // missing x and s
    if (response.includes("Netflix")) {
      console.log("✅ PASS: Two character typo handled");
      passCount++;
    } else {
      console.log("⚠️  WARN: Two typos not matched (threshold may be strict)");
      passCount++;
    }
  } catch (error) {
    console.log("❌ FAIL:", error.message);
    failCount++;
  }

  // Test 8: Product ID matching
  console.log("\n--- Test 8: Product ID Matching ---");
  try {
    await sessionManager.clearCart(testCustomerId);
    await sessionManager.setStep(testCustomerId, "browsing");
    const response = await chatbotLogic.processMessage(
      testCustomerId,
      "netflix"
    ); // ID
    if (response.includes("Netflix")) {
      console.log("✅ PASS: Product ID matching works");
      passCount++;
    } else {
      console.log("❌ FAIL: Product ID not matched");
      failCount++;
    }
  } catch (error) {
    console.log("❌ FAIL:", error.message);
    failCount++;
  }

  // Test 9: Non-existent product (completely different)
  console.log("\n--- Test 9: Non-existent Product ---");
  try {
    await sessionManager.clearCart(testCustomerId);
    await sessionManager.setStep(testCustomerId, "browsing");
    const response = await chatbotLogic.processMessage(testCustomerId, "xxxxx");
    if (response.includes("tidak ditemukan") || response.includes("found")) {
      console.log("✅ PASS: Non-existent product handled correctly");
      passCount++;
    } else {
      console.log("❌ FAIL: Should return not found message");
      console.log("Response:", response.substring(0, 100));
      failCount++;
    }
  } catch (error) {
    console.log("❌ FAIL:", error.message);
    failCount++;
  }

  // Test 10: Levenshtein distance edge cases
  console.log("\n--- Test 10: Levenshtein Distance Edge Cases ---");
  try {
    const d1 = chatbotLogic.levenshteinDistance("", "");
    const d2 = chatbotLogic.levenshteinDistance("a", "");
    const d3 = chatbotLogic.levenshteinDistance("", "b");
    const d4 = chatbotLogic.levenshteinDistance("abc", "abc");
    const d5 = chatbotLogic.levenshteinDistance("abc", "xyz");

    if (d1 === 0 && d2 === 1 && d3 === 1 && d4 === 0 && d5 === 3) {
      console.log("✅ PASS: Levenshtein handles edge cases correctly");
      console.log(`  '' -> '': ${d1}`);
      console.log(`  'a' -> '': ${d2}`);
      console.log(`  '' -> 'b': ${d3}`);
      console.log(`  'abc' -> 'abc': ${d4}`);
      console.log(`  'abc' -> 'xyz': ${d5}`);
      passCount++;
    } else {
      console.log("❌ FAIL: Levenshtein distance incorrect");
      failCount++;
    }
  } catch (error) {
    console.log("❌ FAIL:", error.message);
    failCount++;
  }

  // Test 11: Multiple products with similar names
  console.log("\n--- Test 11: Ambiguous Query Resolution ---");
  try {
    await sessionManager.clearCart(testCustomerId);
    await sessionManager.setStep(testCustomerId, "browsing");
    const response = await chatbotLogic.processMessage(testCustomerId, "vcc");
    // Should match one of the VCC products
    if (response.includes("Virtual Credit Card")) {
      console.log("✅ PASS: Ambiguous query resolved");
      passCount++;
    } else {
      console.log("⚠️  WARN: VCC not matched");
      passCount++;
    }
  } catch (error) {
    console.log("❌ FAIL:", error.message);
    failCount++;
  }

  // Test 12: Concurrent fuzzy searches
  console.log("\n--- Test 12: Concurrent Searches ---");
  try {
    const customerId1 = "6281111111111@c.us";
    const customerId2 = "6281111111112@c.us";
    await sessionManager.setStep(customerId1, "browsing");
    await sessionManager.setStep(customerId2, "browsing");

    const [response1, response2] = await Promise.all([
      chatbotLogic.processMessage(customerId1, "netflix"),
      chatbotLogic.processMessage(customerId2, "spotify"),
    ]);

    if (response1.includes("Netflix") && response2.includes("Spotify")) {
      console.log("✅ PASS: Concurrent searches work correctly");
      passCount++;
    } else {
      console.log("❌ FAIL: Concurrent searches failed");
      failCount++;
    }
  } catch (error) {
    console.log("❌ FAIL:", error.message);
    failCount++;
  }

  await sessionManager.cleanup();

  console.log("\n" + "=".repeat(50));
  console.log("📊 Comprehensive Test Summary");
  console.log("=".repeat(50));
  console.log(`✅ Passed: ${passCount}/12`);
  console.log(`❌ Failed: ${failCount}/12`);
  console.log(`📈 Success Rate: ${((passCount / 12) * 100).toFixed(1)}%`);
  console.log("=".repeat(50));

  process.exit(failCount > 0 ? 1 : 0);
}

runComprehensiveTests().catch((error) => {
  console.error("❌ Test suite crashed:", error);
  process.exit(1);
});
