/**
 * Smoke Tests for MessageRouter
 * Basic coverage for core functionality
 */

const MessageRouter = require("../../../lib/messageRouter");

describe("MessageRouter", () => {
  let router;
  let mockClient;
  let mockSessionManager;
  let mockChatbotLogic;

  beforeEach(() => {
    mockClient = { sendMessage: jest.fn() };
    mockSessionManager = {
      canSendMessage: jest.fn().mockReturnValue(true),
      getRateLimitStatus: jest.fn().mockReturnValue({ resetIn: 60000 }),
      getStep: jest.fn().mockResolvedValue("menu"),
      setStep: jest.fn().mockResolvedValue(true),
      set: jest.fn().mockResolvedValue(true),
      rateLimitMax: 20,
    };
    mockChatbotLogic = {
      processMessage: jest.fn().mockResolvedValue("Response"),
    };

    router = new MessageRouter(mockClient, mockSessionManager, mockChatbotLogic);
  });

  describe("shouldIgnore()", () => {
    test("should ignore group messages", () => {
      const groupMessage = { from: "123456@g.us" };
      expect(router.shouldIgnore(groupMessage)).toBe(true);
    });

    test("should ignore status broadcasts", () => {
      const statusMessage = { from: "status@broadcast" };
      expect(router.shouldIgnore(statusMessage)).toBe(true);
    });

    test("should not ignore direct messages", () => {
      const directMessage = { from: "1234567890@c.us" };
      expect(router.shouldIgnore(directMessage)).toBe(false);
    });
  });

  describe("isRateLimited()", () => {
    test("should return limited false when not rate limited", () => {
      const result = router.isRateLimited("1234567890@c.us");
      expect(result.limited).toBe(false);
    });

    test("should return limited true when rate limited", () => {
      mockSessionManager.canSendMessage.mockReturnValue(false);

      const result = router.isRateLimited("1234567890@c.us");

      expect(result.limited).toBe(true);
      expect(result.message).toContain("Rate Limit");
    });
  });

  describe("handlePaymentProof()", () => {
    test("should handle payment proof upload", async () => {
      const mockMessage = {
        hasMedia: true,
        type: "image",
        downloadMedia: jest.fn().mockResolvedValue({ data: "base64data" }),
        reply: jest.fn().mockResolvedValue({}),
      };

      const fs = require("fs");
      jest.spyOn(fs, "writeFileSync").mockImplementation(() => {});

      await router.handlePaymentProof(mockMessage, "1234567890@c.us");

      expect(mockSessionManager.setStep).toHaveBeenCalledWith(
        "1234567890@c.us",
        "awaiting_order_id_for_proof"
      );

      fs.writeFileSync.mockRestore();
    });
  });
});
