/**
 * Test Suite: Review System
 * Tests for ProductReviewService and customer/admin review functionality
 */

const ReviewService = require("../src/services/review/ReviewService");
const fs = require("fs");
const path = require("path");

// Colors for test output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

let testCount = 0;
let passCount = 0;
let failCount = 0;

/**
 * Test runner
 */
function test(description, testFn) {
  testCount++;
  try {
    testFn();
    passCount++;
    console.log(`${colors.green}✓${colors.reset} ${description}`);
  } catch (error) {
    failCount++;
    console.log(`${colors.red}✗${colors.reset} ${description}`);
    console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
  }
}

/**
 * Async test runner
 */
async function asyncTest(description, testFn) {
  testCount++;
  try {
    await testFn();
    passCount++;
    console.log(`${colors.green}✓${colors.reset} ${description}`);
  } catch (error) {
    failCount++;
    console.log(`${colors.red}✗${colors.reset} ${description}`);
    console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
  }
}

/**
 * Clean up test data
 */
function cleanupTestData() {
  const testFilePath = path.join(__dirname, "../data/reviews.json");
  if (fs.existsSync(testFilePath)) {
    fs.unlinkSync(testFilePath);
  }
}

// ============================================
// TEST SUITE START
// ============================================

console.log("\n" + "=".repeat(50));
console.log("🧪 REVIEW SYSTEM TEST SUITE");
console.log("=".repeat(50) + "\n");

// Cleanup before tests
cleanupTestData();

// Initialize ReviewService
const reviewService = new ReviewService();
const testCustomerId = "6281234567890@c.us";
const testProductId = "netflix";
const testOrderId = "ORD-123456-7890";

// ============================================
// 1. BASIC REVIEW OPERATIONS
// ============================================
console.log(`${colors.blue}📝 Basic Review Operations${colors.reset}`);

test("Should add a review successfully", () => {
  const result = reviewService.addReview(
    testProductId,
    testCustomerId,
    5,
    "Mantap banget! Recommended!",
    testOrderId
  );

  if (!result.success) throw new Error("Expected success=true");
  if (!result.reviewId) throw new Error("Expected reviewId");
  if (!result.reviewId.startsWith("REV-"))
    throw new Error("Invalid reviewId format");
  if (!result.message.includes("✅"))
    throw new Error("Expected success message");
});

test("Should retrieve product reviews", () => {
  const reviews = reviewService.getProductReviews(testProductId);

  if (!Array.isArray(reviews)) throw new Error("Expected array");
  if (reviews.length !== 1) throw new Error("Expected 1 review");
  if (reviews[0].productId !== testProductId)
    throw new Error("Wrong product ID");
  if (reviews[0].rating !== 5) throw new Error("Wrong rating");
});

test("Should retrieve customer reviews", () => {
  const reviews = reviewService.getCustomerReviews(testCustomerId);

  if (!Array.isArray(reviews)) throw new Error("Expected array");
  if (reviews.length !== 1) throw new Error("Expected 1 review");
  if (reviews[0].customerId !== testCustomerId)
    throw new Error("Wrong customer ID");
});

test("Should get review by ID", () => {
  const allReviews = reviewService.getAllReviews();
  const reviewId = allReviews[0].reviewId;

  const review = reviewService.getReview(reviewId);

  if (!review) throw new Error("Review not found");
  if (review.reviewId !== reviewId) throw new Error("Wrong review ID");
  if (review.productId !== testProductId) throw new Error("Wrong product ID");
});

// ============================================
// 2. RATING CALCULATIONS
// ============================================
console.log(`\n${colors.blue}⭐ Rating Calculations${colors.reset}`);

test("Should calculate average rating correctly", () => {
  // Add more reviews
  reviewService.addReview(
    testProductId,
    "6281234567891@c.us",
    4,
    "Bagus!",
    null
  );
  reviewService.addReview(
    testProductId,
    "6281234567892@c.us",
    3,
    "Lumayan",
    null
  );

  const avgRating = reviewService.getAverageRating(testProductId);

  if (typeof avgRating.average !== "number") throw new Error("Expected number");
  if (avgRating.count !== 3) throw new Error("Expected 3 reviews");

  // Average should be (5 + 4 + 3) / 3 = 4.0
  const expectedAvg = 4.0;
  if (Math.abs(avgRating.average - expectedAvg) > 0.01)
    throw new Error(`Expected avg ${expectedAvg}, got ${avgRating.average}`);
});

test("Should calculate rating distribution", () => {
  const distribution = reviewService.getRatingDistribution(testProductId);

  if (typeof distribution !== "object") throw new Error("Expected object");
  if (distribution[5] !== 1) throw new Error("Expected 1 five-star");
  if (distribution[4] !== 1) throw new Error("Expected 1 four-star");
  if (distribution[3] !== 1) throw new Error("Expected 1 three-star");
  if (distribution[2] !== 0) throw new Error("Expected 0 two-star");
  if (distribution[1] !== 0) throw new Error("Expected 0 one-star");
});

test("Should return zero ratings for product with no reviews", () => {
  const avgRating = reviewService.getAverageRating("spotify");

  if (avgRating.average !== 0) throw new Error("Expected 0 average");
  if (avgRating.count !== 0) throw new Error("Expected 0 count");
});

// ============================================
// 3. VALIDATION TESTS
// ============================================
console.log(`\n${colors.blue}✅ Validation Tests${colors.reset}`);

test("Should reject rating below 1", () => {
  const result = reviewService.addReview(
    testProductId,
    testCustomerId,
    0,
    "Test review",
    null
  );

  if (result.success) throw new Error("Should reject rating 0");
  if (!result.message.includes("1-5"))
    throw new Error("Expected validation message");
});

test("Should reject rating above 5", () => {
  const result = reviewService.addReview(
    testProductId,
    testCustomerId,
    6,
    "Test review",
    null
  );

  if (result.success) throw new Error("Should reject rating 6");
  if (!result.message.includes("1-5"))
    throw new Error("Expected validation message");
});

test("Should reject non-integer rating", () => {
  const result = reviewService.addReview(
    testProductId,
    testCustomerId,
    4.5,
    "Test review",
    null
  );

  if (result.success) throw new Error("Should reject decimal rating");
  if (!result.message.includes("1-5"))
    throw new Error("Expected validation message");
});

test("Should reject review text too short", () => {
  const result = reviewService.addReview(
    testProductId,
    "6281234567893@c.us",
    5,
    "Ok",
    null
  );

  if (result.success) throw new Error("Should reject short text");
  if (!result.message.includes("3-500 karakter"))
    throw new Error("Expected length validation");
});

test("Should reject review text too long", () => {
  const longText = "a".repeat(501);
  const result = reviewService.addReview(
    testProductId,
    "6281234567894@c.us",
    5,
    longText,
    null
  );

  if (result.success) throw new Error("Should reject long text");
  if (!result.message.includes("3-500 karakter"))
    throw new Error("Expected length validation");
});

test("Should reject duplicate reviews", () => {
  const result = reviewService.addReview(
    testProductId,
    testCustomerId,
    5,
    "Duplicate review test",
    null
  );

  if (result.success) throw new Error("Should reject duplicate");
  if (!result.message.includes("sudah me-review"))
    throw new Error("Expected duplicate message");
});

// ============================================
// 4. UPDATE AND DELETE OPERATIONS
// ============================================
console.log(`\n${colors.blue}✏️ Update and Delete Operations${colors.reset}`);

test("Should update a review", () => {
  const allReviews = reviewService.getCustomerReviews(testCustomerId);
  const reviewId = allReviews[0].reviewId;

  const result = reviewService.updateReview(
    reviewId,
    4,
    "Updated review text - masih bagus!"
  );

  if (!result.success) throw new Error("Update should succeed");
  if (!result.message.includes("✅"))
    throw new Error("Expected success message");

  const updatedReview = reviewService.getReview(reviewId);
  if (updatedReview.rating !== 4) throw new Error("Rating not updated");
  if (!updatedReview.reviewText.includes("Updated"))
    throw new Error("Text not updated");
});

test("Should not update non-existent review", () => {
  const result = reviewService.updateReview(
    "REV-9999999999-fake",
    5,
    "Test text"
  );

  if (result.success) throw new Error("Should fail for non-existent review");
  if (!result.message.includes("tidak ditemukan"))
    throw new Error("Expected not found message");
});

test("Should soft delete a review", () => {
  const allReviews = reviewService.getCustomerReviews("6281234567891@c.us");
  const reviewId = allReviews[0].reviewId;

  const result = reviewService.deleteReview(reviewId);

  if (!result.success) throw new Error("Delete should succeed");
  if (!result.message.includes("✅"))
    throw new Error("Expected success message");

  const review = reviewService.getReview(reviewId);
  if (review.isActive !== false)
    throw new Error("Review should be marked inactive");
});

test("Should exclude inactive reviews by default", () => {
  const activeReviews = reviewService.getProductReviews(testProductId, true);
  const allReviews = reviewService.getProductReviews(testProductId, false);

  if (activeReviews.length >= allReviews.length)
    throw new Error("Active reviews should be less than all");
});

test("Should permanently delete a review", () => {
  const allReviews = reviewService.getCustomerReviews("6281234567892@c.us");
  const reviewId = allReviews[0].reviewId;

  const result = reviewService.permanentDeleteReview(reviewId);

  if (!result.success) throw new Error("Permanent delete should succeed");

  const review = reviewService.getReview(reviewId);
  if (review !== null) throw new Error("Review should be permanently deleted");
});

// ============================================
// 5. STATISTICS AND REPORTING
// ============================================
console.log(`\n${colors.blue}📊 Statistics and Reporting${colors.reset}`);

test("Should generate overall statistics", () => {
  const stats = reviewService.getStatistics();

  if (typeof stats.totalReviews !== "number")
    throw new Error("Expected totalReviews");
  if (typeof stats.averageRating !== "number")
    throw new Error("Expected averageRating");
  if (typeof stats.activeReviews !== "number")
    throw new Error("Expected activeReviews");
  if (typeof stats.deletedReviews !== "number")
    throw new Error("Expected deletedReviews");
  if (typeof stats.ratingDistribution !== "object")
    throw new Error("Expected ratingDistribution");
});

test("Should format review for display", () => {
  const allReviews = reviewService.getCustomerReviews(testCustomerId);
  const review = allReviews[0];

  const formatted = reviewService.formatReview(review, false);

  if (typeof formatted !== "string") throw new Error("Expected string");
  if (!formatted.includes("⭐")) throw new Error("Expected rating stars");
  if (!formatted.includes(review.reviewText))
    throw new Error("Expected review text");
  if (!formatted.includes("628123****890"))
    throw new Error("Expected masked customer ID");
});

test("Should show full customer ID when showCustomerId=true", () => {
  const allReviews = reviewService.getCustomerReviews(testCustomerId);
  const review = allReviews[0];

  const formatted = reviewService.formatReview(review, true);

  if (!formatted.includes(testCustomerId))
    throw new Error("Expected full customer ID");
  if (formatted.includes("****"))
    throw new Error("Should not mask when showCustomerId=true");
});

test("Should check if customer has reviewed product", () => {
  const hasReviewed = reviewService.hasReviewed(testProductId, testCustomerId);

  if (!hasReviewed) throw new Error("Customer should have reviewed");

  const hasNotReviewed = reviewService.hasReviewed(
    "spotify",
    "6281234567999@c.us"
  );

  if (hasNotReviewed) throw new Error("Customer should not have reviewed");
});

// ============================================
// 6. EDGE CASES
// ============================================
console.log(`\n${colors.blue}🔍 Edge Cases${colors.reset}`);

test("Should handle empty product reviews", () => {
  const reviews = reviewService.getProductReviews("nonexistent-product");

  if (!Array.isArray(reviews)) throw new Error("Expected array");
  if (reviews.length !== 0) throw new Error("Expected empty array");
});

test("Should handle empty customer reviews", () => {
  const reviews = reviewService.getCustomerReviews("6289999999999@c.us");

  if (!Array.isArray(reviews)) throw new Error("Expected array");
  if (reviews.length !== 0) throw new Error("Expected empty array");
});

test("Should handle missing review file gracefully", () => {
  cleanupTestData();
  const newService = new ReviewService();

  const reviews = newService.getAllReviews();

  if (!Array.isArray(reviews)) throw new Error("Expected array");
  if (reviews.length !== 0) throw new Error("Expected empty array");
});

test("Should validate rating as integer", () => {
  const isValid1 = reviewService.validateRating(5);
  const isValid2 = reviewService.validateRating("5");
  const isInvalid1 = reviewService.validateRating(4.5);
  const isInvalid2 = reviewService.validateRating("abc");

  if (!isValid1) throw new Error("5 should be valid");
  if (isValid2) throw new Error("String '5' should be invalid");
  if (isInvalid1) throw new Error("4.5 should be invalid");
  if (isInvalid2) throw new Error("'abc' should be invalid");
});

test("Should validate review text length", () => {
  const isValid = reviewService.validateReviewText("Bagus banget!");
  const isTooShort = reviewService.validateReviewText("Ok");
  const isTooLong = reviewService.validateReviewText("a".repeat(501));

  if (!isValid.valid) throw new Error("Valid text should pass");
  if (isTooShort.valid) throw new Error("Short text should fail");
  if (isTooLong.valid) throw new Error("Long text should fail");
});

// ============================================
// TEST SUMMARY
// ============================================
console.log("\n" + "=".repeat(50));
console.log("📊 TEST SUMMARY");
console.log("=".repeat(50));
console.log(`Total Tests: ${testCount}`);
console.log(
  `${colors.green}Passed: ${passCount}${colors.reset} (${(
    (passCount / testCount) *
    100
  ).toFixed(1)}%)`
);
console.log(
  `${colors.red}Failed: ${failCount}${colors.reset} (${(
    (failCount / testCount) *
    100
  ).toFixed(1)}%)`
);
console.log("=".repeat(50) + "\n");

// Cleanup after tests
cleanupTestData();

// Exit with appropriate code
process.exit(failCount > 0 ? 1 : 0);
