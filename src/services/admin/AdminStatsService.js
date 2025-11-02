/**
 * Admin Statistics Service
 * Handles statistical analysis and reporting for admin dashboard
 */

const fs = require("fs");
const path = require("path");

class AdminStatsService {
  constructor() {
    this.logsDir = path.join(process.cwd(), "logs");
  }

  /**
   * Get comprehensive admin statistics
   */
  async getStats(sessionManager) {
    try {
      const activeSessions = sessionManager.getActiveSessionCount
        ? await sessionManager.getActiveSessionCount()
        : 0;

      const {
        ordersToday,
        ordersWeek,
        ordersMonth,
        revenueToday,
        revenueWeek,
        revenueMonth,
      } = this.parseOrderLogs();

      const { errorCount, totalLogs, errorRate } = this.parseErrorLogs();

      return {
        activeSessions,
        orders: {
          today: ordersToday,
          week: ordersWeek,
          month: ordersMonth,
        },
        revenue: {
          today: revenueToday,
          week: revenueWeek,
          month: revenueMonth,
        },
        systemHealth: {
          errorRate,
          totalLogs,
          errorCount,
        },
      };
    } catch (error) {
      throw new Error(`Failed to generate stats: ${error.message}`);
    }
  }

  /**
   * Parse order logs and calculate statistics
   */
  parseOrderLogs() {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    let ordersToday = 0,
      ordersWeek = 0,
      ordersMonth = 0;
    let revenueToday = 0,
      revenueWeek = 0,
      revenueMonth = 0;

    if (!fs.existsSync(this.logsDir)) {
      return {
        ordersToday,
        ordersWeek,
        ordersMonth,
        revenueToday,
        revenueWeek,
        revenueMonth,
      };
    }

    const logFiles = fs
      .readdirSync(this.logsDir)
      .filter((f) => f.startsWith("orders-"));

    logFiles.forEach((file) => {
      const content = fs.readFileSync(path.join(this.logsDir, file), "utf-8");
      const lines = content.split("\n").filter((line) => line.trim());

      lines.forEach((line) => {
        try {
          const log = JSON.parse(line);
          const logDate = new Date(log.timestamp);

          if (log.event === "order_created") {
            const revenue = log.metadata.totalPrice || 0;

            if (log.timestamp.startsWith(todayStr)) {
              ordersToday++;
              revenueToday += revenue;
            }
            if (logDate >= weekAgo) {
              ordersWeek++;
              revenueWeek += revenue;
            }
            if (logDate >= monthAgo) {
              ordersMonth++;
              revenueMonth += revenue;
            }
          }
        } catch {
          // Skip invalid log lines
        }
      });
    });

    return {
      ordersToday,
      ordersWeek,
      ordersMonth,
      revenueToday,
      revenueWeek,
      revenueMonth,
    };
  }

  /**
   * Parse error logs and calculate error rate
   */
  parseErrorLogs() {
    let errorCount = 0;
    let totalLogs = 0;

    if (!fs.existsSync(this.logsDir)) {
      return { errorCount, totalLogs, errorRate: "0.00" };
    }

    // Count order log entries
    const orderLogFiles = fs
      .readdirSync(this.logsDir)
      .filter((f) => f.startsWith("orders-"));

    orderLogFiles.forEach((file) => {
      const content = fs.readFileSync(path.join(this.logsDir, file), "utf-8");
      const lines = content.split("\n").filter((line) => line.trim());
      totalLogs += lines.length;
    });

    // Count error log entries
    const errorLogFiles = fs
      .readdirSync(this.logsDir)
      .filter((f) => f.startsWith("errors-"));

    errorLogFiles.forEach((file) => {
      const content = fs.readFileSync(path.join(this.logsDir, file), "utf-8");
      const lines = content.split("\n").filter((line) => line.trim());
      errorCount += lines.length;
      totalLogs += lines.length;
    });

    const errorRate =
      totalLogs > 0 ? ((errorCount / totalLogs) * 100).toFixed(2) : "0.00";

    return { errorCount, totalLogs, errorRate };
  }

  /**
   * Format currency to IDR
   */
  static formatIDR(amount) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Format stats for display
   */
  static formatStatsMessage(stats) {
    let response = `📊 *Admin Statistics*\n\n`;
    response += `👥 *Active Sessions:* ${stats.activeSessions}\n\n`;
    response += `📦 *Orders*\n`;
    response += `• Today: ${stats.orders.today}\n`;
    response += `• This Week: ${stats.orders.week}\n`;
    response += `• This Month: ${stats.orders.month}\n\n`;
    response += `💰 *Revenue (IDR)*\n`;
    response += `• Today: ${AdminStatsService.formatIDR(
      stats.revenue.today
    )}\n`;
    response += `• This Week: ${AdminStatsService.formatIDR(
      stats.revenue.week
    )}\n`;
    response += `• This Month: ${AdminStatsService.formatIDR(
      stats.revenue.month
    )}\n\n`;
    response += `📊 *System Health*\n`;
    response += `• Error Rate: ${stats.systemHealth.errorRate}%\n`;
    response += `• Total Logs: ${stats.systemHealth.totalLogs}`;

    return response;
  }
}

module.exports = AdminStatsService;
