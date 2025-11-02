/**
 * AIHandler Unit Tests
 * Tests for AI fallback handler, tools, and admin description generator
 */

const AIHandler = require("../../../src/handlers/AIHandler");
const AIService = require("../../../src/services/ai/AIService");
const ProductService = require("../../../src/services/product/ProductService");

// Mock dependencies
jest.mock("../../../src/services/ai/AIService");
jest.mock("../../../src/services/product/ProductService");

describe("AIHandler", () => {
  let aiHandler;
  let mockAIService;
  let mockProductService;
  let mockLogger;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    // Mock ProductService
    mockProductService = {
      getAllProducts: jest.fn(),
      getProductById: jest.fn(),
    };

    // Mock AIService
    mockAIService = {
      isEnabled: jest.fn(),
      checkRateLimit: jest.fn(),
      getCachedResponse: jest.fn(),
      setCachedResponse: jest.fn(),
      incrementRateLimit: jest.fn(),
      generateCompletion: jest.fn(),
      createTool: jest.fn((name, desc, schema, execute) => ({
        name,
        description: desc,
        execute,
      })),
    };

    // Setup ProductService mock
    ProductService.mockImplementation(() => mockProductService);
    AIService.mockImplementation(() => mockAIService);

    aiHandler = new AIHandler(mockProductService, null, mockLogger);
    aiHandler.aiService = mockAIService;
  });

  describe("shouldHandleMessage", () => {
    beforeEach(() => {
      mockAIService.isEnabled.mockReturnValue(true);
    });

    test("should return false if AI is disabled", () => {
      mockAIService.isEnabled.mockReturnValue(false);
      expect(aiHandler.shouldHandleMessage("test message", 0.5)).toBe(false);
    });

    test("should return false for very short messages", () => {
      expect(aiHandler.shouldHandleMessage("hi", 0.5)).toBe(false);
    });

    test("should return true for low fuzzy score", () => {
      expect(aiHandler.shouldHandleMessage("netflx", 0.5)).toBe(true);
    });

    test("should return true for question words", () => {
      expect(aiHandler.shouldHandleMessage("apa itu netflix?", 0)).toBe(true);
      expect(aiHandler.shouldHandleMessage("bagaimana cara beli?", 0)).toBe(
        true
      );
      expect(aiHandler.shouldHandleMessage("berapa harganya?", 0)).toBe(true);
    });

    test("should return true for recommendation keywords", () => {
      expect(aiHandler.shouldHandleMessage("berikan rekomendasi", 0)).toBe(
        true
      );
      expect(aiHandler.shouldHandleMessage("ada saran produk?", 0)).toBe(true);
    });

    test("should return false for good match without triggers", () => {
      expect(aiHandler.shouldHandleMessage("netflix", 0.9)).toBe(false);
    });
  });

  describe("detectIntent", () => {
    test("should detect recommendation intent", () => {
      expect(aiHandler.detectIntent("berikan rekomendasi")).toBe(
        "recommendation"
      );
      expect(aiHandler.detectIntent("ada saran?")).toBe("recommendation");
    });

    test("should detect question intent", () => {
      expect(aiHandler.detectIntent("apa itu netflix?")).toBe("question");
      expect(aiHandler.detectIntent("bagaimana cara bayar?")).toBe("question");
    });

    test("should default to typo intent", () => {
      expect(aiHandler.detectIntent("netflx")).toBe("typo");
      expect(aiHandler.detectIntent("spotfy")).toBe("typo");
    });
  });

  describe("handleFallback", () => {
    const customerId = "6281234567890@c.us";
    const message = "netflx";

    beforeEach(() => {
      mockAIService.isEnabled.mockReturnValue(true);
      mockAIService.checkRateLimit.mockResolvedValue({ allowed: true });
      mockAIService.getCachedResponse.mockResolvedValue(null);
      mockAIService.generateCompletion.mockResolvedValue({
        text: "Maksud kamu Netflix ya? Ini detailnya...",
        toolCalls: [],
        toolResults: [],
      });
    });

    test("should handle successful AI fallback", async () => {
      const response = await aiHandler.handleFallback({
        customerId,
        message,
        context: { step: "browsing" },
      });

      expect(response).toBe("Maksud kamu Netflix ya? Ini detailnya...");
      expect(mockAIService.checkRateLimit).toHaveBeenCalledWith(customerId);
      expect(mockAIService.incrementRateLimit).toHaveBeenCalledWith(customerId);
      expect(mockAIService.setCachedResponse).toHaveBeenCalled();
    });

    test("should return rate limit error if exceeded", async () => {
      mockAIService.checkRateLimit.mockResolvedValue({
        allowed: false,
        reason: "hourly_limit",
      });

      const response = await aiHandler.handleFallback({
        customerId,
        message,
        context: {},
      });

      expect(response).toContain("terlalu banyak");
      expect(mockAIService.generateCompletion).not.toHaveBeenCalled();
    });

    test("should return cached response if available", async () => {
      const cachedResponse = "Cached AI response";
      mockAIService.getCachedResponse.mockResolvedValue(cachedResponse);

      const response = await aiHandler.handleFallback({
        customerId,
        message,
        context: {},
      });

      expect(response).toBe(cachedResponse);
      expect(mockAIService.generateCompletion).not.toHaveBeenCalled();
    });

    test("should handle API errors gracefully", async () => {
      mockAIService.generateCompletion.mockRejectedValue(
        new Error("API Error")
      );

      const response = await aiHandler.handleFallback({
        customerId,
        message,
        context: {},
      });

      expect(response).toContain("AI sedang sibuk");
      expect(mockLogger.error).toHaveBeenCalled();
    });

    test("should include context in AI request", async () => {
      const context = {
        step: "browsing",
        cart: [{ name: "Netflix" }],
      };

      await aiHandler.handleFallback({ customerId, message, context });

      expect(mockAIService.generateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.any(Array),
          tools: expect.any(Object),
          systemPrompt: expect.any(String),
        })
      );
    });
  });

  describe("buildContextMessage", () => {
    test("should build context with cart info", () => {
      const context = {
        step: "browsing",
        cart: [{ name: "Netflix" }, { name: "Spotify" }],
      };

      mockProductService.getAllProducts.mockReturnValue([
        { id: "netflix", name: "Netflix", price: 1, categoryLabel: "Premium" },
      ]);

      const contextMsg = aiHandler.buildContextMessage(context);

      expect(contextMsg).toContain("Netflix, Spotify");
      expect(contextMsg).toContain("browsing");
      expect(contextMsg).toContain("Daftar produk");
    });

    test("should include order history if available", () => {
      const context = {
        orderHistory: ["Netflix", "Disney+"],
      };

      mockProductService.getAllProducts.mockReturnValue([]);

      const contextMsg = aiHandler.buildContextMessage(context);

      expect(contextMsg).toContain("pernah beli");
      expect(contextMsg).toContain("Netflix");
    });
  });

  describe("createSearchProductsTool", () => {
    test("should search and return matching products", () => {
      const tool = aiHandler.createSearchProductsTool();

      mockProductService.getAllProducts.mockReturnValue([
        {
          id: "netflix",
          name: "Netflix",
          price: 1,
          categoryLabel: "Premium",
          description: "Streaming",
        },
        {
          id: "spotify",
          name: "Spotify",
          price: 1,
          categoryLabel: "Music",
          description: "Music streaming",
        },
      ]);

      const result = tool.execute({ query: "netflix" });

      expect(result.found).toBe(true);
      expect(result.products.length).toBeGreaterThan(0);
      expect(result.products[0].name).toBe("Netflix");
    });

    test("should return not found for no matches", () => {
      const tool = aiHandler.createSearchProductsTool();

      mockProductService.getAllProducts.mockReturnValue([]);

      const result = tool.execute({ query: "nonexistent" });

      expect(result.found).toBe(false);
      expect(result.message).toContain("Tidak ada produk");
    });
  });

  describe("createGetProductInfoTool", () => {
    test("should return product details if found", () => {
      const tool = aiHandler.createGetProductInfoTool();

      mockProductService.getProductById.mockReturnValue({
        id: "netflix",
        name: "Netflix",
        price: 1,
        description: "Streaming service",
        stock: 10,
        categoryLabel: "Premium",
      });

      const result = tool.execute({ productId: "netflix" });

      expect(result.found).toBe(true);
      expect(result.product.name).toBe("Netflix");
      expect(result.product.price).toBe(1);
    });

    test("should return not found if product does not exist", () => {
      const tool = aiHandler.createGetProductInfoTool();

      mockProductService.getProductById.mockReturnValue(null);

      const result = tool.execute({ productId: "invalid" });

      expect(result.found).toBe(false);
      expect(result.message).toContain("tidak ditemukan");
    });
  });

  describe("createRecommendProductsTool", () => {
    beforeEach(() => {
      mockProductService.getAllProducts.mockReturnValue([
        { id: "netflix", name: "Netflix", price: 1, categoryLabel: "Video" },
        { id: "spotify", name: "Spotify", price: 1, categoryLabel: "Music" },
        { id: "disney", name: "Disney+", price: 1, categoryLabel: "Video" },
        {
          id: "vcc",
          name: "BCA VCC",
          price: 1,
          categoryLabel: "Virtual Cards",
        },
      ]);
    });

    test("should recommend music products for music preferences", () => {
      const tool = aiHandler.createRecommendProductsTool();

      const result = tool.execute({ preferences: "saya suka musik" });

      expect(result.count).toBeGreaterThan(0);
      expect(result.recommendations.some((p) => p.id === "spotify")).toBe(true);
    });

    test("should recommend video products for film preferences", () => {
      const tool = aiHandler.createRecommendProductsTool();

      const result = tool.execute({ preferences: "saya suka nonton film" });

      expect(result.count).toBeGreaterThan(0);
      const videoProducts = result.recommendations.filter((p) =>
        ["netflix", "disney"].includes(p.id)
      );
      expect(videoProducts.length).toBeGreaterThan(0);
    });

    test("should recommend VCC for card preferences", () => {
      const tool = aiHandler.createRecommendProductsTool();

      const result = tool.execute({
        preferences: "butuh vcc untuk belanja online",
      });

      expect(result.count).toBeGreaterThan(0);
      expect(result.recommendations.some((p) => p.id === "vcc")).toBe(true);
    });

    test("should provide default recommendations", () => {
      const tool = aiHandler.createRecommendProductsTool();

      const result = tool.execute({ preferences: "kasih saran dong" });

      expect(result.count).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeLessThanOrEqual(3);
    });
  });

  describe("generateProductDescription", () => {
    const productId = "netflix";

    beforeEach(() => {
      mockProductService.getProductById.mockReturnValue({
        id: "netflix",
        name: "Netflix Premium",
        price: 1,
        description: "Streaming service",
        categoryLabel: "Premium Account",
      });

      mockAIService.generateCompletion.mockResolvedValue({
        text: JSON.stringify({
          title: "Netflix Premium - Nonton Unlimited!",
          description: "Akses penuh ke semua film dan series.",
          features: ["4K Ultra HD", "Download offline", "4 devices"],
          cta: "Beli sekarang dan nikmati!",
        }),
      });
    });

    test("should generate product description successfully", async () => {
      const result = await aiHandler.generateProductDescription(productId);

      expect(result.success).toBe(true);
      expect(result.productName).toBe("Netflix Premium");
      expect(result.generated.title).toContain("Netflix");
      expect(result.generated.features).toHaveLength(3);
    });

    test("should return error for non-existent product", async () => {
      mockProductService.getProductById.mockReturnValue(null);

      const result = await aiHandler.generateProductDescription("invalid");

      expect(result.success).toBe(false);
      expect(result.error).toContain("tidak ditemukan");
    });

    test("should handle AI generation errors", async () => {
      mockAIService.generateCompletion.mockRejectedValue(
        new Error("API Error")
      );

      const result = await aiHandler.generateProductDescription(productId);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    test("should handle malformed JSON response", async () => {
      mockAIService.generateCompletion.mockResolvedValue({
        text: "This is not JSON but raw text",
      });

      const result = await aiHandler.generateProductDescription(productId);

      expect(result.success).toBe(true);
      expect(result.generated.raw).toBeTruthy();
    });
  });
});
