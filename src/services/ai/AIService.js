/**
 * AIService - Wrapper for Vercel AI SDK with Gemini 2.5 Flash Lite
 * Handles AI completions, tool calling, streaming, error handling, and rate limiting
 */

const { generateText, streamText, tool } = require("ai");
const { google } = require("@ai-sdk/google");
const AI_CONFIG = require("../../config/ai.config");

class AIService {
  constructor(redisClient = null, logger = console) {
    this.redisClient = redisClient;
    this.logger = logger;
    this.model = google(AI_CONFIG.model.name);

    // Initialize cost tracking
    this.costTracker = {
      dailyCalls: 0,
      dailyCost: 0,
      monthlyCost: 0,
      lastReset: new Date().toISOString().split("T")[0], // YYYY-MM-DD
    };
  }

  /**
   * Check if AI features are enabled
   */
  isEnabled() {
    return AI_CONFIG.features.enabled;
  }

  /**
   * Check rate limit for customer
   * @param {string} customerId - Customer phone number
   * @returns {Promise<{allowed: boolean, remaining: number}>}
   */
  async checkRateLimit(customerId) {
    if (!this.redisClient) {
      // Fallback: allow if Redis unavailable
      return { allowed: true, remaining: AI_CONFIG.rateLimit.maxCallsPerHour };
    }

    try {
      const hourKey = `ai:ratelimit:hour:${customerId}`;
      const dayKey = `ai:ratelimit:day:${customerId}`;

      // Check hourly limit
      const hourCalls = await this.redisClient.get(hourKey);
      if (
        hourCalls &&
        parseInt(hourCalls) >= AI_CONFIG.rateLimit.maxCallsPerHour
      ) {
        return { allowed: false, remaining: 0, reason: "hourly_limit" };
      }

      // Check daily limit
      const dayCalls = await this.redisClient.get(dayKey);
      if (
        dayCalls &&
        parseInt(dayCalls) >= AI_CONFIG.rateLimit.maxCallsPerDay
      ) {
        return { allowed: false, remaining: 0, reason: "daily_limit" };
      }

      const remaining =
        AI_CONFIG.rateLimit.maxCallsPerHour - (parseInt(hourCalls) || 0);
      return { allowed: true, remaining };
    } catch (error) {
      this.logger.error("Rate limit check error:", error);
      return { allowed: true, remaining: AI_CONFIG.rateLimit.maxCallsPerHour };
    }
  }

  /**
   * Increment rate limit counter
   * @param {string} customerId - Customer phone number
   */
  async incrementRateLimit(customerId) {
    if (!this.redisClient) return;

    try {
      const hourKey = `ai:ratelimit:hour:${customerId}`;
      const dayKey = `ai:ratelimit:day:${customerId}`;

      // Increment hourly counter (expires in 1 hour)
      await this.redisClient.incr(hourKey);
      await this.redisClient.expire(hourKey, 3600);

      // Increment daily counter (expires in 24 hours)
      await this.redisClient.incr(dayKey);
      await this.redisClient.expire(dayKey, 86400);
    } catch (error) {
      this.logger.error("Rate limit increment error:", error);
    }
  }

  /**
   * Get cached AI response
   * @param {string} cacheKey - Cache key
   * @returns {Promise<string|null>}
   */
  async getCachedResponse(cacheKey) {
    if (!AI_CONFIG.cache.enabled || !this.redisClient) return null;

    try {
      const cached = await this.redisClient.get(
        `${AI_CONFIG.cache.keyPrefix}${cacheKey}`
      );
      if (cached) {
        this.logger.info(`AI cache hit: ${cacheKey}`);
      }
      return cached;
    } catch (error) {
      this.logger.error("Cache get error:", error);
      return null;
    }
  }

  /**
   * Set cached AI response
   * @param {string} cacheKey - Cache key
   * @param {string} response - Response to cache
   */
  async setCachedResponse(cacheKey, response) {
    if (!AI_CONFIG.cache.enabled || !this.redisClient) return;

    try {
      await this.redisClient.setex(
        `${AI_CONFIG.cache.keyPrefix}${cacheKey}`,
        AI_CONFIG.cache.ttl,
        response
      );
      this.logger.info(`AI cache set: ${cacheKey}`);
    } catch (error) {
      this.logger.error("Cache set error:", error);
    }
  }

  /**
   * Track AI call cost
   * @param {number} inputTokens - Number of input tokens
   * @param {number} outputTokens - Number of output tokens
   */
  trackCost(inputTokens, outputTokens) {
    // Gemini 2.5 Flash Lite pricing (approximate)
    // Input: $0.00001 per 1K tokens
    // Output: $0.00003 per 1K tokens
    const inputCost = (inputTokens / 1000) * 0.00001;
    const outputCost = (outputTokens / 1000) * 0.00003;
    const totalCost = inputCost + outputCost;

    this.costTracker.dailyCalls++;
    this.costTracker.dailyCost += totalCost;
    this.costTracker.monthlyCost += totalCost;

    // Alert if daily threshold exceeded
    if (
      AI_CONFIG.costTracking.enabled &&
      this.costTracker.dailyCost > AI_CONFIG.costTracking.alertThreshold
    ) {
      this.logger.warn(
        `⚠️ AI daily cost threshold exceeded: $${this.costTracker.dailyCost.toFixed(
          4
        )}`
      );
    }

    this.logger.info(
      `AI cost: ${totalCost.toFixed(
        6
      )} | Daily: $${this.costTracker.dailyCost.toFixed(4)} | Calls: ${
        this.costTracker.dailyCalls
      }`
    );
  }

  /**
   * Generate AI completion with tools (non-streaming)
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - AI response with text and tool results
   */
  async generateCompletion({ messages, tools, systemPrompt, maxSteps = 3 }) {
    try {
      const result = await generateText({
        model: this.model,
        system: systemPrompt,
        messages,
        tools,
        temperature: AI_CONFIG.model.temperature,
        maxTokens: AI_CONFIG.model.maxTokens,
        topP: AI_CONFIG.model.topP,
        maxSteps, // Multi-step tool calling
      });

      // Track usage
      if (result.usage) {
        this.trackCost(
          result.usage.promptTokens,
          result.usage.completionTokens
        );
      }

      return {
        text: result.text,
        toolCalls: result.toolCalls || [],
        toolResults: result.toolResults || [],
        finishReason: result.finishReason,
        usage: result.usage,
      };
    } catch (error) {
      this.logger.error("AI generation error:", error);
      throw error;
    }
  }

  /**
   * Generate AI completion with streaming (for real-time responses)
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Streaming result
   */
  async streamCompletion({ messages, tools, systemPrompt, maxSteps = 3 }) {
    try {
      const result = await streamText({
        model: this.model,
        system: systemPrompt,
        messages,
        tools,
        temperature: AI_CONFIG.model.temperature,
        maxTokens: AI_CONFIG.model.maxTokens,
        topP: AI_CONFIG.model.topP,
        maxSteps,
      });

      return result;
    } catch (error) {
      this.logger.error("AI streaming error:", error);
      throw error;
    }
  }

  /**
   * Create tool definition for Vercel AI SDK
   * @param {string} name - Tool name
   * @param {string} description - Tool description
   * @param {Object} schema - Zod schema
   * @param {Function} execute - Tool execution function
   * @returns {Object} - Tool definition
   */
  createTool(name, description, schema, execute) {
    return tool({
      description,
      parameters: schema,
      execute,
    });
  }

  /**
   * Reset daily cost tracker (called at midnight)
   */
  resetDailyCost() {
    const today = new Date().toISOString().split("T")[0];
    if (this.costTracker.lastReset !== today) {
      this.costTracker.dailyCalls = 0;
      this.costTracker.dailyCost = 0;
      this.costTracker.lastReset = today;
      this.logger.info("AI daily cost tracker reset");
    }
  }

  /**
   * Get cost statistics
   * @returns {Object} - Cost tracker data
   */
  getCostStats() {
    this.resetDailyCost();
    return { ...this.costTracker };
  }
}

module.exports = AIService;
