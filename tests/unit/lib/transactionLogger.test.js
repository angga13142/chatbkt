/**
 * Smoke Tests for TransactionLogger
 * Basic coverage for logging functionality
 */

const fs = require("fs");
const TransactionLogger = require("../../../lib/transactionLogger");

jest.mock("fs");

describe("TransactionLogger", () => {
  let logger;

  beforeEach(() => {
    logger = new TransactionLogger();
    jest.clearAllMocks();
  });

  describe("getLogFilePath()", () => {
    test("should return log file path for transactions", () => {
      const path = logger.getLogFilePath("transactions");
      expect(path).toContain("transactions-");
      expect(path).toContain(".log");
    });

    test("should use custom type", () => {
      const path = logger.getLogFilePath("errors");
      expect(path).toContain("errors-");
    });
  });

  describe("writeLog()", () => {
    test("should write log entry to file", () => {
      fs.appendFileSync.mockImplementation(() => {});

      logger.writeLog("test", { data: "value" });

      expect(fs.appendFileSync).toHaveBeenCalled();
    });

    test("should handle write errors gracefully", () => {
      fs.appendFileSync.mockImplementation(() => {
        throw new Error("Write error");
      });

      expect(() => {
        logger.writeLog("test", { data: "value" });
      }).not.toThrow();
    });
  });

  describe("logOrder()", () => {
    test("should log order creation", () => {
      fs.appendFileSync.mockImplementation(() => {});

      const cart = [{ id: "netflix", name: "Netflix", price: 1 }];

      logger.logOrder("1234567890@c.us", "ORD-123", cart, 1, 15000);

      expect(fs.appendFileSync).toHaveBeenCalled();
    });
  });

  describe("logPaymentSuccess()", () => {
    test("should log payment success events", () => {
      fs.appendFileSync.mockImplementation(() => {});

      logger.logPaymentSuccess("1234567890@c.us", "ORD-123", "QRIS", 15000, "INV-123");

      expect(fs.appendFileSync).toHaveBeenCalled();
    });
  });

  describe("maskPhone()", () => {
    test("should mask phone number", () => {
      const masked = logger.maskPhone("6281234567890@c.us");
      expect(masked).toContain("***");
    });
  });
});
