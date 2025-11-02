/**
 * Dashboard Analytics Service
 * Provides enhanced analytics for admin dashboard
 */

const TransactionLogger = require("../../../lib/transactionLogger");
const fs = require("fs");
const path = require("path");

class DashboardService {
  constructor(transactionLogger = null) {
    this.transactionLogger = transactionLogger || new TransactionLogger();
    this.logsDir = path.join(process.cwd(), "logs");
  }

  /**
   * Get revenue breakdown by payment method
   * @param {number} days - Number of days to analyze (default: 30)
   * @returns {Object} Revenue by payment method
   */
  getRevenueByPaymentMethod(days = 30) {
    try {
      const transactions = this._getTransactionsFromLogs(days);
      const revenue = {
        QRIS: 0,
        "Bank Transfer": 0,
        DANA: 0,
        GoPay: 0,
        ShopeePay: 0,
        Manual: 0,
        total: 0,
      };

      transactions.forEach((tx) => {
        if (
          tx.event === "payment_success" ||
          tx.event === "approve_order" ||
          tx.event === "order_approved"
        ) {
          const amount = tx.amount || tx.data?.totalIDR || 0;
          const method = tx.paymentMethod || tx.data?.paymentMethod || "Manual";

          // Categorize payment methods
          if (method === "QRIS") {
            revenue.QRIS += amount;
          } else if (
            method.includes("bank") ||
            method.includes("Bank") ||
            method === "bank_transfer"
          ) {
            revenue["Bank Transfer"] += amount;
          } else if (method.toLowerCase().includes("dana")) {
            revenue.DANA += amount;
          } else if (method.toLowerCase().includes("gopay")) {
            revenue.GoPay += amount;
          } else if (method.toLowerCase().includes("shopee")) {
            revenue.ShopeePay += amount;
          } else {
            revenue.Manual += amount;
          }

          revenue.total += amount;
        }
      });

      return revenue;
    } catch (error) {
      console.error(
        `❌ DashboardService.getRevenueByPaymentMethod error: ${error.message}`
      );
      return {
        QRIS: 0,
        "Bank Transfer": 0,
        DANA: 0,
        GoPay: 0,
        ShopeePay: 0,
        Manual: 0,
        total: 0,
      };
    }
  }

  /**
   * Get top selling products
   * @param {number} limit - Number of products to return (default: 5)
   * @param {number} days - Number of days to analyze (default: 30)
   * @returns {Array} Top products with sales data
   */
  getTopProducts(limit = 5, days = 30) {
    try {
      const transactions = this._getTransactionsFromLogs(days);
      const productSales = new Map();

      transactions.forEach((tx) => {
        if (tx.event === "order_created") {
          const items = tx.items || tx.data?.items || [];

          items.forEach((item) => {
            const productId = item.id;
            const productName = item.name;
            const price = item.price || 0;

            if (!productSales.has(productId)) {
              productSales.set(productId, {
                productId,
                productName,
                unitsSold: 0,
                revenue: 0,
              });
            }

            const stats = productSales.get(productId);
            stats.unitsSold += 1;
            stats.revenue += price;
          });
        }
      });

      // Convert to array and sort by revenue
      const topProducts = Array.from(productSales.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);

      return topProducts;
    } catch (error) {
      console.error(
        `❌ DashboardService.getTopProducts error: ${error.message}`
      );
      return [];
    }
  }

  /**
   * Calculate customer retention rate
   * @param {number} days - Number of days to analyze (default: 30)
   * @returns {Object} Retention statistics
   */
  getRetentionRate(days = 30) {
    try {
      const transactions = this._getTransactionsFromLogs(days);
      const customerOrders = new Map();

      // Count orders per customer
      transactions.forEach((tx) => {
        if (tx.event === "order_created") {
          const customerId = tx.customerId;

          if (!customerOrders.has(customerId)) {
            customerOrders.set(customerId, {
              customerId,
              orderCount: 0,
              firstOrder: tx.timestamp,
              lastOrder: tx.timestamp,
            });
          }

          const stats = customerOrders.get(customerId);
          stats.orderCount += 1;
          stats.lastOrder = tx.timestamp;
        }
      });

      // Calculate retention metrics
      const totalCustomers = customerOrders.size;
      const repeatCustomers = Array.from(customerOrders.values()).filter(
        (c) => c.orderCount > 1
      ).length;
      const firstTimeCustomers = totalCustomers - repeatCustomers;

      const retentionRate =
        totalCustomers > 0
          ? ((repeatCustomers / totalCustomers) * 100).toFixed(1)
          : 0;

      const avgOrdersPerCustomer =
        totalCustomers > 0
          ? (
              Array.from(customerOrders.values()).reduce(
                (sum, c) => sum + c.orderCount,
                0
              ) / totalCustomers
            ).toFixed(1)
          : 0;

      return {
        totalCustomers,
        firstTimeCustomers,
        repeatCustomers,
        retentionRate: parseFloat(retentionRate),
        avgOrdersPerCustomer: parseFloat(avgOrdersPerCustomer),
      };
    } catch (error) {
      console.error(
        `❌ DashboardService.getRetentionRate error: ${error.message}`
      );
      return {
        totalCustomers: 0,
        firstTimeCustomers: 0,
        repeatCustomers: 0,
        retentionRate: 0,
        avgOrdersPerCustomer: 0,
      };
    }
  }

  /**
   * Get overall sales statistics
   * @param {number} days - Number of days to analyze (default: 30)
   * @returns {Object} Sales statistics
   */
  getSalesStats(days = 30) {
    try {
      const transactions = this._getTransactionsFromLogs(days);

      let totalOrders = 0;
      let completedOrders = 0;
      let totalRevenue = 0;
      let avgOrderValue = 0;

      const orderMap = new Map();

      transactions.forEach((tx) => {
        if (tx.event === "order_created") {
          totalOrders++;
          orderMap.set(tx.orderId, {
            orderId: tx.orderId,
            amount: tx.totalIDR || tx.data?.totalIDR || 0,
            status: "pending",
          });
        }

        if (
          tx.event === "payment_success" ||
          tx.event === "approve_order" ||
          tx.event === "order_approved"
        ) {
          const order = orderMap.get(tx.orderId);
          if (order) {
            order.status = "completed";
            completedOrders++;
            totalRevenue += order.amount;
          }
        }
      });

      avgOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;

      const completionRate =
        totalOrders > 0
          ? ((completedOrders / totalOrders) * 100).toFixed(1)
          : 0;

      return {
        totalOrders,
        completedOrders,
        pendingOrders: totalOrders - completedOrders,
        totalRevenue,
        avgOrderValue: Math.round(avgOrderValue),
        completionRate: parseFloat(completionRate),
      };
    } catch (error) {
      console.error(
        `❌ DashboardService.getSalesStats error: ${error.message}`
      );
      return {
        totalOrders: 0,
        completedOrders: 0,
        pendingOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
        completionRate: 0,
      };
    }
  }

  /**
   * Generate ASCII bar chart
   * @param {Object} data - Key-value pairs for chart
   * @param {number} maxWidth - Maximum bar width (default: 20)
   * @returns {string} ASCII bar chart
   */
  generateBarChart(data, maxWidth = 20) {
    try {
      const entries = Object.entries(data).filter(
        ([key]) => key !== "total" && key !== "retentionRate"
      );

      if (entries.length === 0) {
        return "No data available";
      }

      // Find max value for scaling
      const maxValue = Math.max(...entries.map(([, value]) => value));

      if (maxValue === 0) {
        return "No data to display";
      }

      let chart = "";

      entries.forEach(([label, value]) => {
        const barLength = Math.round((value / maxValue) * maxWidth);
        const bar = "█".repeat(barLength);
        const percentage = ((value / maxValue) * 100).toFixed(0);

        // Format label and value
        const labelPadded = label.padEnd(15);
        const valuePadded = this._formatIDR(value).padStart(12);

        chart += `${labelPadded} ${bar} ${percentage}%\n`;
        chart += `${" ".repeat(15)} ${valuePadded}\n`;
      });

      return chart.trim();
    } catch (error) {
      console.error(
        `❌ DashboardService.generateBarChart error: ${error.message}`
      );
      return "Error generating chart";
    }
  }

  /**
   * Get transaction logs from files for specified days
   * @private
   * @param {number} days
   * @returns {Array} Array of transaction objects
   */
  _getTransactionsFromLogs(days) {
    const transactions = [];

    try {
      // Get date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Read log files for each day
      for (
        let d = new Date(startDate);
        d <= endDate;
        d.setDate(d.getDate() + 1)
      ) {
        const dateStr = d.toISOString().split("T")[0];
        const logFile = path.join(this.logsDir, `transactions-${dateStr}.log`);

        if (fs.existsSync(logFile)) {
          const content = fs.readFileSync(logFile, "utf8");
          const lines = content.trim().split("\n").filter(Boolean);

          lines.forEach((line) => {
            try {
              const entry = JSON.parse(line);
              transactions.push(entry);
            } catch {
              // Skip invalid JSON lines
            }
          });
        }
      }

      return transactions;
    } catch (error) {
      console.error(
        `❌ DashboardService._getTransactionsFromLogs error: ${error.message}`
      );
      return [];
    }
  }

  /**
   * Format IDR currency
   * @private
   * @param {number} amount
   * @returns {string}
   */
  _formatIDR(amount) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Get complete dashboard data
   * @param {number} days - Number of days to analyze (default: 30)
   * @returns {Object} Complete dashboard data
   */
  getDashboardData(days = 30) {
    return {
      sales: this.getSalesStats(days),
      revenue: this.getRevenueByPaymentMethod(days),
      topProducts: this.getTopProducts(5, days),
      retention: this.getRetentionRate(days),
      periodDays: days,
    };
  }
}

module.exports = DashboardService;
