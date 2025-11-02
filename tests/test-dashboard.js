/**
 * Test Suite: Enhanced Admin Dashboard
 * Tests for DashboardService analytics and reporting
 */

const DashboardService = require("../src/services/analytics/DashboardService");
const TransactionLogger = require("../lib/transactionLogger");
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
 * Create test transaction logs
 */
function createTestLogs() {
  const logsDir = path.join(__dirname, "../logs");
  const today = new Date().toISOString().split("T")[0];
  const logFile = path.join(logsDir, `transactions-${today}.log`);

  // Ensure logs directory exists
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const testTransactions = [
    // Order 1: Netflix via QRIS
    {
      timestamp: new Date().toISOString(),
      type: "transactions",
      event: "order_created",
      customerId: "***1234",
      orderId: "ORD-001",
      items: [{ id: "netflix", name: "Netflix Premium", price: 50000 }],
      totalIDR: 50000,
    },
    {
      timestamp: new Date().toISOString(),
      type: "transactions",
      event: "payment_success",
      customerId: "***1234",
      orderId: "ORD-001",
      paymentMethod: "QRIS",
      amount: 50000,
    },

    // Order 2: Spotify via DANA
    {
      timestamp: new Date().toISOString(),
      type: "transactions",
      event: "order_created",
      customerId: "***5678",
      orderId: "ORD-002",
      items: [{ id: "spotify", name: "Spotify Premium", price: 30000 }],
      totalIDR: 30000,
    },
    {
      timestamp: new Date().toISOString(),
      type: "transactions",
      event: "approve_order",
      customerId: "***5678",
      orderId: "ORD-002",
      data: { paymentMethod: "dana", totalIDR: 30000 },
    },

    // Order 3: Canva via Bank Transfer
    {
      timestamp: new Date().toISOString(),
      type: "transactions",
      event: "order_created",
      customerId: "***9999",
      orderId: "ORD-003",
      items: [{ id: "canva", name: "Canva Pro", price: 75000 }],
      totalIDR: 75000,
    },
    {
      timestamp: new Date().toISOString(),
      type: "transactions",
      event: "payment_success",
      customerId: "***9999",
      orderId: "ORD-003",
      paymentMethod: "bank_transfer",
      amount: 75000,
    },

    // Order 4: Repeat customer (***1234)
    {
      timestamp: new Date().toISOString(),
      type: "transactions",
      event: "order_created",
      customerId: "***1234",
      orderId: "ORD-004",
      items: [{ id: "spotify", name: "Spotify Premium", price: 30000 }],
      totalIDR: 30000,
    },
    {
      timestamp: new Date().toISOString(),
      type: "transactions",
      event: "payment_success",
      customerId: "***1234",
      orderId: "ORD-004",
      paymentMethod: "GoPay",
      amount: 30000,
    },

    // Order 5: Pending (not completed)
    {
      timestamp: new Date().toISOString(),
      type: "transactions",
      event: "order_created",
      customerId: "***4444",
      orderId: "ORD-005",
      items: [{ id: "netflix", name: "Netflix Premium", price: 50000 }],
      totalIDR: 50000,
    },
  ];

  // Write test transactions
  const logContent =
    testTransactions.map((tx) => JSON.stringify(tx)).join("\n") + "\n";
  fs.writeFileSync(logFile, logContent);

  return logFile;
}

/**
 * Clean up test data
 */
function cleanupTestData() {
  const today = new Date().toISOString().split("T")[0];
  const testFile = path.join(__dirname, "../logs", `transactions-${today}.log`);

  if (fs.existsSync(testFile)) {
    fs.unlinkSync(testFile);
  }
}

// ============================================
// TEST SUITE START
// ============================================

console.log("\n" + "=".repeat(50));
console.log("🧪 ENHANCED ADMIN DASHBOARD TEST SUITE");
console.log("=".repeat(50) + "\n");

// Setup
const logFile = createTestLogs();
const dashboardService = new DashboardService();

// ============================================
// 1. REVENUE BY PAYMENT METHOD
// ============================================
console.log(`${colors.blue}💳 Revenue by Payment Method${colors.reset}`);

test("Should calculate total revenue correctly", () => {
  const revenue = dashboardService.getRevenueByPaymentMethod(30);

  // Total: 50k + 30k + 75k + 30k = 185k
  const expectedTotal = 185000;

  if (revenue.total !== expectedTotal) {
    throw new Error(`Expected total ${expectedTotal}, got ${revenue.total}`);
  }
});

test("Should categorize QRIS payments", () => {
  const revenue = dashboardService.getRevenueByPaymentMethod(30);

  if (revenue.QRIS !== 50000) {
    throw new Error(`Expected QRIS 50000, got ${revenue.QRIS}`);
  }
});

test("Should categorize Bank Transfer payments", () => {
  const revenue = dashboardService.getRevenueByPaymentMethod(30);

  if (revenue["Bank Transfer"] !== 75000) {
    throw new Error(
      `Expected Bank Transfer 75000, got ${revenue["Bank Transfer"]}`
    );
  }
});

test("Should categorize E-Wallet payments", () => {
  const revenue = dashboardService.getRevenueByPaymentMethod(30);

  // DANA: 30k, GoPay: 30k
  const totalEWallet = revenue.DANA + revenue.GoPay;

  if (totalEWallet !== 60000) {
    throw new Error(`Expected E-Wallet total 60000, got ${totalEWallet}`);
  }
});

test("Should handle zero revenue gracefully", () => {
  // Test with 0 days (should have no data)
  cleanupTestData(); // Remove test file temporarily
  const revenue = dashboardService.getRevenueByPaymentMethod(30);

  if (revenue.total !== 0) {
    throw new Error(`Expected 0 total, got ${revenue.total}`);
  }

  // Restore test file
  createTestLogs();
});

// ============================================
// 2. TOP SELLING PRODUCTS
// ============================================
console.log(`\n${colors.blue}🏆 Top Selling Products${colors.reset}`);

test("Should identify top products by revenue", () => {
  const topProducts = dashboardService.getTopProducts(5, 30);

  if (topProducts.length === 0) {
    throw new Error("Expected at least one product");
  }

  // Check that products are sorted by revenue (descending)
  for (let i = 0; i < topProducts.length - 1; i++) {
    if (topProducts[i].revenue < topProducts[i + 1].revenue) {
      throw new Error("Products should be sorted by revenue descending");
    }
  }
});

test("Should calculate units sold correctly", () => {
  const topProducts = dashboardService.getTopProducts(5, 30);

  // Netflix appears in 2 orders (ORD-001 completed, ORD-005 pending)
  // Service counts all order_created events
  const netflix = topProducts.find((p) => p.productId === "netflix");

  if (!netflix) {
    throw new Error("Netflix should be in top products");
  }

  if (netflix.unitsSold !== 2) {
    throw new Error(`Expected 2 units, got ${netflix.unitsSold}`);
  }
});

test("Should calculate product revenue correctly", () => {
  const topProducts = dashboardService.getTopProducts(5, 30);

  const spotify = topProducts.find((p) => p.productId === "spotify");

  if (!spotify) {
    throw new Error("Spotify should be in top products");
  }

  // Spotify sold 2 times: 30k each = 60k
  if (spotify.revenue !== 60000) {
    throw new Error(`Expected 60000 revenue, got ${spotify.revenue}`);
  }
});

test("Should limit results to specified count", () => {
  const topProducts = dashboardService.getTopProducts(2, 30);

  if (topProducts.length > 2) {
    throw new Error(`Expected max 2 products, got ${topProducts.length}`);
  }
});

test("Should handle empty product list", () => {
  cleanupTestData();
  const topProducts = dashboardService.getTopProducts(5, 30);

  if (topProducts.length !== 0) {
    throw new Error(`Expected 0 products, got ${topProducts.length}`);
  }

  createTestLogs();
});

// ============================================
// 3. CUSTOMER RETENTION
// ============================================
console.log(`\n${colors.blue}🔄 Customer Retention${colors.reset}`);

test("Should count total customers correctly", () => {
  const retention = dashboardService.getRetentionRate(30);

  // Customers: ***1234, ***5678, ***9999, ***4444 = 4 unique
  if (retention.totalCustomers !== 4) {
    throw new Error(`Expected 4 customers, got ${retention.totalCustomers}`);
  }
});

test("Should identify repeat customers", () => {
  const retention = dashboardService.getRetentionRate(30);

  // ***1234 ordered twice (ORD-001, ORD-004)
  if (retention.repeatCustomers !== 1) {
    throw new Error(
      `Expected 1 repeat customer, got ${retention.repeatCustomers}`
    );
  }
});

test("Should identify first-time customers", () => {
  const retention = dashboardService.getRetentionRate(30);

  // ***5678, ***9999, ***4444 = 3 first-time
  if (retention.firstTimeCustomers !== 3) {
    throw new Error(
      `Expected 3 first-time customers, got ${retention.firstTimeCustomers}`
    );
  }
});

test("Should calculate retention rate", () => {
  const retention = dashboardService.getRetentionRate(30);

  // 1 repeat / 4 total = 25%
  const expectedRate = 25.0;

  if (retention.retentionRate !== expectedRate) {
    throw new Error(
      `Expected ${expectedRate}% retention, got ${retention.retentionRate}%`
    );
  }
});

test("Should calculate average orders per customer", () => {
  const retention = dashboardService.getRetentionRate(30);

  // 5 orders / 4 customers = 1.25, rounded to 1.3
  const expectedAvg = 1.3; // Rounded to 1 decimal

  if (Math.abs(retention.avgOrdersPerCustomer - expectedAvg) > 0.1) {
    throw new Error(
      `Expected ~${expectedAvg} avg orders, got ${retention.avgOrdersPerCustomer}`
    );
  }
});

test("Should handle zero customers gracefully", () => {
  cleanupTestData();
  const retention = dashboardService.getRetentionRate(30);

  if (retention.totalCustomers !== 0) {
    throw new Error(`Expected 0 customers, got ${retention.totalCustomers}`);
  }

  if (retention.retentionRate !== 0) {
    throw new Error(`Expected 0% retention, got ${retention.retentionRate}%`);
  }

  createTestLogs();
});

// ============================================
// 4. SALES STATISTICS
// ============================================
console.log(`\n${colors.blue}📊 Sales Statistics${colors.reset}`);

test("Should count total orders", () => {
  const stats = dashboardService.getSalesStats(30);

  // 5 total orders (including pending)
  if (stats.totalOrders !== 5) {
    throw new Error(`Expected 5 orders, got ${stats.totalOrders}`);
  }
});

test("Should count completed orders", () => {
  const stats = dashboardService.getSalesStats(30);

  // 4 completed (ORD-005 is pending)
  if (stats.completedOrders !== 4) {
    throw new Error(
      `Expected 4 completed orders, got ${stats.completedOrders}`
    );
  }
});

test("Should count pending orders", () => {
  const stats = dashboardService.getSalesStats(30);

  // 1 pending (ORD-005)
  if (stats.pendingOrders !== 1) {
    throw new Error(`Expected 1 pending order, got ${stats.pendingOrders}`);
  }
});

test("Should calculate total revenue from completed orders only", () => {
  const stats = dashboardService.getSalesStats(30);

  // Completed: 50k + 30k + 75k + 30k = 185k
  if (stats.totalRevenue !== 185000) {
    throw new Error(`Expected 185000 revenue, got ${stats.totalRevenue}`);
  }
});

test("Should calculate average order value", () => {
  const stats = dashboardService.getSalesStats(30);

  // 185000 / 4 completed = 46250
  const expectedAvg = 46250;

  if (stats.avgOrderValue !== expectedAvg) {
    throw new Error(
      `Expected ${expectedAvg} avg order value, got ${stats.avgOrderValue}`
    );
  }
});

test("Should calculate completion rate", () => {
  const stats = dashboardService.getSalesStats(30);

  // 4 completed / 5 total = 80%
  const expectedRate = 80.0;

  if (stats.completionRate !== expectedRate) {
    throw new Error(
      `Expected ${expectedRate}% completion, got ${stats.completionRate}%`
    );
  }
});

// ============================================
// 5. ASCII BAR CHART
// ============================================
console.log(`\n${colors.blue}📊 ASCII Bar Chart${colors.reset}`);

test("Should generate bar chart from data", () => {
  const data = {
    QRIS: 50000,
    "Bank Transfer": 75000,
    DANA: 30000,
    total: 155000,
  };

  const chart = dashboardService.generateBarChart(data, 20);

  if (typeof chart !== "string") {
    throw new Error("Expected string chart");
  }

  if (chart.length === 0) {
    throw new Error("Chart should not be empty");
  }

  if (!chart.includes("█")) {
    throw new Error("Chart should contain bar characters");
  }
});

test("Should handle empty data", () => {
  const data = {};

  const chart = dashboardService.generateBarChart(data, 20);

  if (!chart.includes("No data")) {
    throw new Error("Should indicate no data");
  }
});

test("Should handle zero values", () => {
  const data = {
    QRIS: 0,
    DANA: 0,
  };

  const chart = dashboardService.generateBarChart(data, 20);

  if (!chart.includes("No data")) {
    throw new Error("Should indicate no data for zero values");
  }
});

test("Should scale bars relative to max value", () => {
  const data = {
    Product1: 100,
    Product2: 50,
    Product3: 25,
  };

  const chart = dashboardService.generateBarChart(data, 20);

  // Product1 should have longest bar (100%)
  // Product2 should have half (50%)
  // Product3 should have quarter (25%)

  if (!chart.includes("100%")) {
    throw new Error("Should show 100% for max value");
  }
});

// ============================================
// 6. COMPLETE DASHBOARD DATA
// ============================================
console.log(`\n${colors.blue}📊 Complete Dashboard${colors.reset}`);

test("Should return complete dashboard data", () => {
  const dashboard = dashboardService.getDashboardData(30);

  if (!dashboard.sales) throw new Error("Missing sales data");
  if (!dashboard.revenue) throw new Error("Missing revenue data");
  if (!dashboard.topProducts) throw new Error("Missing top products");
  if (!dashboard.retention) throw new Error("Missing retention data");
  if (dashboard.periodDays !== 30) throw new Error("Wrong period days");
});

test("Should respect custom days parameter", () => {
  const dashboard = dashboardService.getDashboardData(7);

  if (dashboard.periodDays !== 7) {
    throw new Error(`Expected 7 days, got ${dashboard.periodDays}`);
  }
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
