/**
 * AIHandler - AI-powered fallback handler for customer queries
 * Handles typo correction, product Q&A, and recommendations using Gemini 2.5 Flash Lite
 */

const { z } = require("zod");
const AIService = require("../services/ai/AIService");
const AI_CONFIG = require("../config/ai.config");
const ProductService = require("../services/product/ProductService");
const FuzzySearch = require("../utils/FuzzySearch");

class AIHandler {
  constructor(
    productService = new ProductService(),
    redisClient = null,
    logger = console
  ) {
    this.productService = productService;
    this.aiService = new AIService(redisClient, logger);
    this.fuzzySearch = new FuzzySearch();
    this.logger = logger;
  }

  /**
   * Check if AI should handle this message
   * @param {string} message - Customer message
   * @param {number} fuzzyScore - FuzzySearch confidence score (0-1)
   * @returns {boolean}
   */
  shouldHandleMessage(message, fuzzyScore = 0) {
    if (!this.aiService.isEnabled()) return false;

    // Check message length
    if (message.length < AI_CONFIG.fallbackTriggers.minMessageLength) {
      return false;
    }

    // Trigger on low fuzzy search confidence
    if (
      fuzzyScore > 0 &&
      fuzzyScore < AI_CONFIG.fallbackTriggers.fuzzySearchThreshold
    ) {
      return true;
    }

    // Trigger on question words
    const lowerMessage = message.toLowerCase();
    const hasQuestionWord = AI_CONFIG.fallbackTriggers.questionWords.some(
      (word) => lowerMessage.includes(word)
    );
    if (hasQuestionWord) return true;

    // Trigger on recommendation keywords
    const hasRecommendationKeyword =
      AI_CONFIG.fallbackTriggers.recommendationKeywords.some((word) =>
        lowerMessage.includes(word)
      );
    if (hasRecommendationKeyword) return true;

    return false;
  }

  /**
   * Handle customer message with AI fallback
   * @param {Object} params
   * @returns {Promise<string>} AI response
   */
  async handleFallback({ customerId, message, context = {} }) {
    try {
      // Check rate limit
      const rateLimitCheck = await this.aiService.checkRateLimit(customerId);
      if (!rateLimitCheck.allowed) {
        this.logger.warn(
          `AI rate limit exceeded for ${customerId}: ${rateLimitCheck.reason}`
        );
        return AI_CONFIG.errorMessages.rateLimitExceeded;
      }

      // Check cache
      const cacheKey = `${customerId}:${message.toLowerCase().trim()}`;
      const cachedResponse = await this.aiService.getCachedResponse(cacheKey);
      if (cachedResponse) {
        return cachedResponse;
      }

      // Determine intent and select appropriate prompt
      const intent = this.detectIntent(message);
      const systemPrompt = this.getSystemPrompt(intent);

      // Build context message
      const contextMessage = this.buildContextMessage(context);

      // Define tools for AI
      const tools = {
        searchProducts: this.createSearchProductsTool(),
        getProductInfo: this.createGetProductInfoTool(),
        recommendProducts: this.createRecommendProductsTool(),
      };

      // Generate AI response
      const result = await this.aiService.generateCompletion({
        messages: [
          { role: "user", content: contextMessage },
          { role: "user", content: message },
        ],
        tools,
        systemPrompt,
        maxSteps: 3,
      });

      // Increment rate limit
      await this.aiService.incrementRateLimit(customerId);

      // Cache response
      if (result.text) {
        await this.aiService.setCachedResponse(cacheKey, result.text);
      }

      return result.text || AI_CONFIG.errorMessages.noResults;
    } catch (error) {
      this.logger.error("AI fallback error:", error);
      return AI_CONFIG.errorMessages.apiError;
    }
  }

  /**
   * Detect customer intent
   * @param {string} message
   * @returns {string} Intent: typo, question, recommendation
   */
  detectIntent(message) {
    const lowerMessage = message.toLowerCase();

    // Check recommendation keywords first
    if (
      AI_CONFIG.fallbackTriggers.recommendationKeywords.some((word) =>
        lowerMessage.includes(word)
      )
    ) {
      return "recommendation";
    }

    // Check question words
    if (
      AI_CONFIG.fallbackTriggers.questionWords.some((word) =>
        lowerMessage.includes(word)
      )
    ) {
      return "question";
    }

    // Default to typo correction
    return "typo";
  }

  /**
   * Get system prompt based on intent
   * @param {string} intent
   * @returns {string}
   */
  getSystemPrompt(intent) {
    const basePrompt = AI_CONFIG.prompts.customer.system;

    switch (intent) {
      case "typo":
        return `${basePrompt}\n\n${AI_CONFIG.prompts.customer.typoCorrection}`;
      case "question":
        return `${basePrompt}\n\n${AI_CONFIG.prompts.customer.productQA}`;
      case "recommendation":
        return `${basePrompt}\n\n${AI_CONFIG.prompts.customer.recommendations}`;
      default:
        return basePrompt;
    }
  }

  /**
   * Build context message for AI
   * @param {Object} context
   * @returns {string}
   */
  buildContextMessage(context) {
    const parts = [];

    if (context.step) {
      parts.push(`Customer sedang di step: ${context.step}`);
    }

    if (context.cart && context.cart.length > 0) {
      const cartItems = context.cart.map((item) => item.name).join(", ");
      parts.push(`Cart customer: ${cartItems}`);
    }

    if (context.orderHistory && context.orderHistory.length > 0) {
      parts.push(`Customer pernah beli: ${context.orderHistory.join(", ")}`);
    }

    // Always include product catalog
    const allProducts = this.productService.getAllProducts();
    const productList = allProducts
      .map((p) => `${p.name} (${p.categoryLabel}) - $${p.price}`)
      .join("\n");
    parts.push(`\nDaftar produk yang tersedia:\n${productList}`);

    return parts.join("\n");
  }

  /**
   * Create searchProducts tool for AI
   * @returns {Object} Tool definition
   */
  createSearchProductsTool() {
    return this.aiService.createTool(
      "searchProducts",
      "Search for products by name or category with fuzzy matching",
      z.object({
        query: z
          .string()
          .describe("Product name or category to search (handle typos)"),
      }),
      ({ query }) => {
        this.logger.info(`AI Tool: searchProducts("${query}")`);

        // Use fuzzy search to find products
        const allProducts = this.productService.getAllProducts();
        const matches = this.fuzzySearch.search(query, allProducts);

        if (matches.length === 0) {
          return { found: false, message: "Tidak ada produk yang cocok" };
        }

        // Return top 3 matches
        const topMatches = matches.slice(0, 3).map((match) => ({
          id: match.item.id,
          name: match.item.name,
          price: match.item.price,
          category: match.item.categoryLabel,
          description: match.item.description,
          score: match.score.toFixed(2),
        }));

        return {
          found: true,
          count: matches.length,
          products: topMatches,
        };
      }
    );
  }

  /**
   * Create getProductInfo tool for AI
   * @returns {Object} Tool definition
   */
  createGetProductInfoTool() {
    return this.aiService.createTool(
      "getProductInfo",
      "Get detailed information about a specific product by ID",
      z.object({
        productId: z.string().describe("Product ID (e.g., netflix, spotify)"),
      }),
      ({ productId }) => {
        this.logger.info(`AI Tool: getProductInfo("${productId}")`);

        const product = this.productService.getProductById(productId);

        if (!product) {
          return {
            found: false,
            message: `Produk dengan ID "${productId}" tidak ditemukan`,
          };
        }

        return {
          found: true,
          product: {
            id: product.id,
            name: product.name,
            price: product.price,
            description: product.description,
            stock: product.stock,
            category: product.categoryLabel || "N/A",
          },
        };
      }
    );
  }

  /**
   * Create recommendProducts tool for AI
   * @returns {Object} Tool definition
   */
  createRecommendProductsTool() {
    return this.aiService.createTool(
      "recommendProducts",
      "Generate personalized product recommendations based on customer preferences",
      z.object({
        preferences: z
          .string()
          .describe(
            'Customer preferences or context (e.g., "suka musik", "streaming video")'
          ),
      }),
      ({ preferences }) => {
        this.logger.info(`AI Tool: recommendProducts("${preferences}")`);

        const allProducts = this.productService.getAllProducts();

        // Simple keyword-based recommendation
        const lowerPrefs = preferences.toLowerCase();
        let recommendations = [];

        if (lowerPrefs.includes("musik") || lowerPrefs.includes("music")) {
          recommendations = allProducts.filter((p) =>
            ["spotify", "youtube-premium"].includes(p.id)
          );
        } else if (
          lowerPrefs.includes("film") ||
          lowerPrefs.includes("movie") ||
          lowerPrefs.includes("series")
        ) {
          recommendations = allProducts.filter((p) =>
            ["netflix", "disney-plus", "youtube-premium"].includes(p.id)
          );
        } else if (lowerPrefs.includes("vcc") || lowerPrefs.includes("card")) {
          recommendations = allProducts.filter(
            (p) => p.categoryLabel === "Virtual Cards"
          );
        } else {
          // Default: recommend top 3 popular products
          recommendations = allProducts.slice(0, 3);
        }

        return {
          count: recommendations.length,
          recommendations: recommendations.map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            category: p.categoryLabel,
            description: p.description,
          })),
        };
      }
    );
  }

  /**
   * Generate product description for admin
   * @param {string} productId - Product ID
   * @returns {Promise<Object>} Generated description
   */
  async generateProductDescription(productId) {
    try {
      const product = this.productService.getProductById(productId);
      if (!product) {
        return {
          success: false,
          error: `Produk dengan ID "${productId}" tidak ditemukan`,
        };
      }

      const systemPrompt = AI_CONFIG.prompts.admin.descriptionGenerator;

      const result = await this.aiService.generateCompletion({
        messages: [
          {
            role: "user",
            content: `Generate a compelling product description for:
            
Product Name: ${product.name}
Current Description: ${product.description}
Price: $${product.price}
Category: ${product.categoryLabel || "Premium Account"}

Return the result as JSON with this structure:
{
  "title": "...",
  "description": "...",
  "features": ["...", "...", "..."],
  "cta": "..."
}`,
          },
        ],
        tools: {},
        systemPrompt,
        maxSteps: 1,
      });

      // Parse JSON response
      try {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const generated = JSON.parse(jsonMatch[0]);
          return {
            success: true,
            productId,
            productName: product.name,
            generated,
          };
        }
      } catch {
        // Fallback: return raw text if JSON parsing fails
        return {
          success: true,
          productId,
          productName: product.name,
          generated: { raw: result.text },
        };
      }

      return {
        success: false,
        error: "Gagal mengparse response AI",
      };
    } catch (error) {
      this.logger.error("Generate description error:", error);
      return {
        success: false,
        error: AI_CONFIG.errorMessages.apiError,
      };
    }
  }
}

module.exports = AIHandler;
