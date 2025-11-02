/**
 * AIHandler Unit Tests
 * Tests for AI fallback handler, tools, and admin description generator
 */

const { expect } = require("chai");
const sinon = require("sinon");

describe("AIHandler", () => {
  let AIHandler;
  let aiHandler;
  let mockAIService;
  let mockProductService;
  let mockLogger;

  before(() => {
    // Load module
    AIHandler = require("../../../src/handlers/AIHandler");
  });

  beforeEach(() => {
    // Mock logger
    mockLogger = {
      info: sinon.stub(),
      error: sinon.stub(),
      warn: sinon.stub(),
    };

    // Mock ProductService
    mockProductService = {
      getAllProducts: sinon.stub(),
      getProductById: sinon.stub(),
    };

    // Mock AIService
    mockAIService = {
      isEnabled: sinon.stub(),
      checkRateLimit: sinon.stub(),
      getCachedResponse: sinon.stub(),
      setCachedResponse: sinon.stub(),
      incrementRateLimit: sinon.stub(),
      generateCompletion: sinon.stub(),
      createTool: sinon.stub().callsFake((name, desc, schema, execute) => ({
        name,
        description: desc,
        execute,
      })),
    };

    aiHandler = new AIHandler(mockProductService, null, mockLogger);
    aiHandler.aiService = mockAIService;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("shouldHandleMessage", () => {
    beforeEach(() => {
      mockAIService.isEnabled.returns(true);
    });

    it("should return false if AI is disabled", () => {
      mockAIService.isEnabled.returns(false);
      expect(aiHandler.shouldHandleMessage("test message", 0.5)).to.equal(
        false
      );
    });

    it("should return false for very short messages", () => {
      expect(aiHandler.shouldHandleMessage("hi", 0.5)).to.equal(false);
    });

    it("should return true for low fuzzy score", () => {
      expect(aiHandler.shouldHandleMessage("netflx", 0.5)).to.equal(true);
    });

    it("should return true for question words", () => {
      expect(aiHandler.shouldHandleMessage("apa itu netflix?", 0)).to.equal(
        true
      );
      expect(aiHandler.shouldHandleMessage("bagaimana cara beli?", 0)).to.equal(
        true
      );
      expect(aiHandler.shouldHandleMessage("berapa harganya?", 0)).to.equal(
        true
      );
    });

    it("should return true for recommendation keywords", () => {
      expect(aiHandler.shouldHandleMessage("berikan rekomendasi", 0)).to.equal(
        true
      );
      expect(aiHandler.shouldHandleMessage("ada saran produk?", 0)).to.equal(
        true
      );
    });

    it("should return false for good match without triggers", () => {
      expect(aiHandler.shouldHandleMessage("netflix", 0.9)).to.equal(false);
    });
  });

  describe("detectIntent", () => {
    it("should detect recommendation intent", () => {
      expect(aiHandler.detectIntent("berikan rekomendasi")).to.equal(
        "recommendation"
      );
      expect(aiHandler.detectIntent("ada saran?")).to.equal("recommendation");
    });

    it("should detect question intent", () => {
      expect(aiHandler.detectIntent("apa itu netflix?")).to.equal("question");
      expect(aiHandler.detectIntent("bagaimana cara bayar?")).to.equal(
        "question"
      );
    });

    it("should default to typo intent", () => {
      expect(aiHandler.detectIntent("netflx")).to.equal("typo");
      expect(aiHandler.detectIntent("spotfy")).to.equal("typo");
    });
  });

  describe("handleFallback", () => {
    const customerId = "6281234567890@c.us";
    const message = "netflx";

    beforeEach(() => {
      mockAIService.isEnabled.returns(true);
      mockAIService.checkRateLimit.resolves({ allowed: true });
      mockAIService.getCachedResponse.resolves(null);
      mockAIService.generateCompletion.resolves({
        text: "Maksud kamu Netflix ya? Ini detailnya...",
        toolCalls: [],
        toolResults: [],
      });
    });

    it("should handle successful AI fallback", async () => {
      const response = await aiHandler.handleFallback({
        customerId,
        message,
        context: { step: "browsing" },
      });

      expect(response).to.equal("Maksud kamu Netflix ya? Ini detailnya...");
      expect(mockAIService.checkRateLimit).to.have.been.calledWith(customerId);
      expect(mockAIService.incrementRateLimit).to.have.been.calledWith(
        customerId
      );
      expect(mockAIService.setCachedResponse).to.have.been.called();
    });

    it("should return rate limit error if exceeded", async () => {
      mockAIService.checkRateLimit.resolves({
        allowed: false,
        reason: "hourly_limit",
      });

      const response = await aiHandler.handleFallback({
        customerId,
        message,
        context: {},
      });

      expect(response).to.include("terlalu banyak");
      expect(mockAIService.generateCompletion).not.to.have.been.called();
    });

    it("should return cached response if available", async () => {
      const cachedResponse = "Cached AI response";
      mockAIService.getCachedResponse.resolves(cachedResponse);

      const response = await aiHandler.handleFallback({
        customerId,
        message,
        context: {},
      });

      expect(response).to.equal(cachedResponse);
      expect(mockAIService.generateCompletion).not.to.have.been.called();
    });

    it("should handle API errors gracefully", async () => {
      mockAIService.generateCompletion.mockRejectedValue(
        new Error("API Error")
      );

      const response = await aiHandler.handleFallback({
        customerId,
        message,
        context: {},
      });

      expect(response).to.include("AI sedang sibuk");
      expect(mockLogger.error).to.have.been.called();
    });

    it("should include context in AI request", async () => {
      const context = {
        step: "browsing",
        cart: [{ name: "Netflix" }],
      };

      await aiHandler.handleFallback({ customerId, message, context });

      expect(mockAIService.generateCompletion).to.have.been.calledWith(
        expect.objectContaining({
          messages: expect.any(Array),
          tools: expect.any(Object),
          systemPrompt: expect.any(String),
        })
      );
    });
  });

  describe("buildContextMessage", () => {
    it("should build context with cart info", () => {
      const context = {
        step: "browsing",
        cart: [{ name: "Netflix" }, { name: "Spotify" }],
      };

      mockProductService.getAllProducts.returns([
        { id: "netflix", name: "Netflix", price: 1, categoryLabel: "Premium" },
      ]);

      const contextMsg = aiHandler.buildContextMessage(context);

      expect(contextMsg).to.include("Netflix, Spotify");
      expect(contextMsg).to.include("browsing");
      expect(contextMsg).to.include("Daftar produk");
    });

    it("should include order history if available", () => {
      const context = {
        orderHistory: ["Netflix", "Disney+"],
      };

      mockProductService.getAllProducts.returns([]);

      const contextMsg = aiHandler.buildContextMessage(context);

      expect(contextMsg).to.include("pernah beli");
      expect(contextMsg).to.include("Netflix");
    });
  });

  describe("createSearchProductsTool", () => {
    it("should search and return matching products", () => {
      const tool = aiHandler.createSearchProductsTool();

      mockProductService.getAllProducts.returns([
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

      expect(result.found).to.be.true;
      expect(result.products.length).toBeGreaterThan(0);
      expect(result.products[0].name).to.equal("Netflix");
    });

    it("should return not found for no matches", () => {
      const tool = aiHandler.createSearchProductsTool();

      mockProductService.getAllProducts.returns([]);

      const result = tool.execute({ query: "nonexistent" });

      expect(result.found).to.be.false;
      expect(result.message).to.include("Tidak ada produk");
    });
  });

  describe("createGetProductInfoTool", () => {
    it("should return product details if found", () => {
      const tool = aiHandler.createGetProductInfoTool();

      mockProductService.getProductById.returns({
        id: "netflix",
        name: "Netflix",
        price: 1,
        description: "Streaming service",
        stock: 10,
        categoryLabel: "Premium",
      });

      const result = tool.execute({ productId: "netflix" });

      expect(result.found).to.be.true;
      expect(result.product.name).to.equal("Netflix");
      expect(result.product.price).to.equal(1);
    });

    it("should return not found if product does not exist", () => {
      const tool = aiHandler.createGetProductInfoTool();

      mockProductService.getProductById.returns(null);

      const result = tool.execute({ productId: "invalid" });

      expect(result.found).to.be.false;
      expect(result.message).to.include("tidak ditemukan");
    });
  });

  describe("createRecommendProductsTool", () => {
    beforeEach(() => {
      mockProductService.getAllProducts.returns([
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

    it("should recommend music products for music preferences", () => {
      const tool = aiHandler.createRecommendProductsTool();

      const result = tool.execute({ preferences: "saya suka musik" });

      expect(result.count).toBeGreaterThan(0);
      expect(result.recommendations.some((p) => p.id === "spotify")).to.equal(
        true
      );
    });

    it("should recommend video products for film preferences", () => {
      const tool = aiHandler.createRecommendProductsTool();

      const result = tool.execute({ preferences: "saya suka nonton film" });

      expect(result.count).toBeGreaterThan(0);
      const videoProducts = result.recommendations.filter((p) =>
        ["netflix", "disney"].includes(p.id)
      );
      expect(videoProducts.length).toBeGreaterThan(0);
    });

    it("should recommend VCC for card preferences", () => {
      const tool = aiHandler.createRecommendProductsTool();

      const result = tool.execute({
        preferences: "butuh vcc untuk belanja online",
      });

      expect(result.count).toBeGreaterThan(0);
      expect(result.recommendations.some((p) => p.id === "vcc")).to.equal(true);
    });

    it("should provide default recommendations", () => {
      const tool = aiHandler.createRecommendProductsTool();

      const result = tool.execute({ preferences: "kasih saran dong" });

      expect(result.count).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeLessThanOrEqual(3);
    });
  });

  describe("generateProductDescription", () => {
    const productId = "netflix";

    beforeEach(() => {
      mockProductService.getProductById.returns({
        id: "netflix",
        name: "Netflix Premium",
        price: 1,
        description: "Streaming service",
        categoryLabel: "Premium Account",
      });

      mockAIService.generateCompletion.resolves({
        text: JSON.stringify({
          title: "Netflix Premium - Nonton Unlimited!",
          description: "Akses penuh ke semua film dan series.",
          features: ["4K Ultra HD", "Download offline", "4 devices"],
          cta: "Beli sekarang dan nikmati!",
        }),
      });
    });

    it("should generate product description successfully", async () => {
      const result = await aiHandler.generateProductDescription(productId);

      expect(result.success).to.be.true;
      expect(result.productName).to.equal("Netflix Premium");
      expect(result.generated.title).to.include("Netflix");
      expect(result.generated.features).toHaveLength(3);
    });

    it("should return error for non-existent product", async () => {
      mockProductService.getProductById.returns(null);

      const result = await aiHandler.generateProductDescription("invalid");

      expect(result.success).to.be.false;
      expect(result.error).to.include("tidak ditemukan");
    });

    it("should handle AI generation errors", async () => {
      mockAIService.generateCompletion.mockRejectedValue(
        new Error("API Error")
      );

      const result = await aiHandler.generateProductDescription(productId);

      expect(result.success).to.be.false;
      expect(result.error).toBeTruthy();
    });

    it("should handle malformed JSON response", async () => {
      mockAIService.generateCompletion.resolves({
        text: "This is not JSON but raw text",
      });

      const result = await aiHandler.generateProductDescription(productId);

      expect(result.success).to.be.true;
      expect(result.generated.raw).toBeTruthy();
    });
  });
});
