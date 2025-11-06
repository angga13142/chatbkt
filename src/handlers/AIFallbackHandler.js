/**
 * AIFallbackHandler
 * Handles unrecognized messages with AI when relevant
 */

const AIService = require('../services/ai/AIService');
const RelevanceFilter = require('../middleware/RelevanceFilter');
const AIIntentClassifier = require('../services/ai/AIIntentClassifier');
const AIPromptBuilder = require('../services/ai/AIPromptBuilder');

class AIFallbackHandler {
  constructor(redisClient = null, logger = console) {
    this.aiService = new AIService(redisClient, logger);
    this.relevanceFilter = new RelevanceFilter();
    this.intentClassifier = new AIIntentClassifier();
    this.promptBuilder = new AIPromptBuilder();
    this.logger = logger;
  }

  /**
   * Handle unrecognized message with AI
   * @param {string} customerId - Customer WhatsApp ID
   * @param {string} message - User message
   * @returns {Promise<string|null>} - AI response or null if not relevant
   */
  async handle(customerId, message) {
    try {
      this.logger.log(`[AIFallback] Processing message from ${this.maskCustomerId(customerId)}`);

      // Step 1: Check if AI is enabled
      if (!this.aiService.isEnabled()) {
        this.logger.log('[AIFallback] AI disabled, returning null');
        return null;
      }

      // Step 2: Check relevance
      if (!this.relevanceFilter.isRelevant(message)) {
        this.logger.log('[AIFallback] Message not relevant, returning null');
        return null;
      }

      this.logger.log('[AIFallback] Message is relevant, proceeding with AI');

      // Step 3: Check rate limit
      const rateLimitCheck = await this.aiService.checkRateLimit(customerId);
      if (!rateLimitCheck.allowed) {
        this.logger.log('[AIFallback] Rate limit exceeded');
        return this.getRateLimitMessage(rateLimitCheck);
      }

      // Step 4: Classify intent
      const intent = this.intentClassifier.classify(message);
      this.logger.log(`[AIFallback] Classified intent: ${intent}`);

      // Step 5: Build prompt
      const prompt = this.promptBuilder.buildPrompt(intent, message);

      // Step 6: Get AI response
      this.logger.log('[AIFallback] Calling AI service...');
      const aiResponse = await this.aiService.generateText(prompt, {
        maxTokens: 200,
        temperature: 0.3,
      });

      if (!aiResponse || !aiResponse.success) {
        this.logger.error('[AIFallback] AI generation failed:', aiResponse?.error);
        return this.getFallbackMessage();
      }

      this.logger.log('[AIFallback] AI response received successfully');

      // Step 7: Format and return
      return this.formatResponse(aiResponse.text, intent);

    } catch (error) {
      this.logger.error('[AIFallback] Error:', error.message);
      return this.getFallbackMessage();
    }
  }

  /**
   * Format AI response for user
   * @param {string} aiText - AI generated text
   * @param {string} intent - User intent
   * @returns {string} - Formatted response
   */
  formatResponse(aiText, intent) {
    // Add AI indicator
    let response = `🤖 **AI Assistant**\n\n${aiText}\n\n`;
    
    response += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    
    // Add relevant commands based on intent
    if (intent === 'product_qa' || intent === 'features' || intent === 'comparison') {
      response += `📱 Lihat produk: ketik \`belanja\`\n`;
    } else if (intent === 'order_help') {
      response += `🛒 Mulai order: ketik \`menu\`\n`;
    } else if (intent === 'pricing') {
      response += `💰 Lihat harga: ketik \`belanja\`\n`;
    } else if (intent === 'availability') {
      response += `📦 Cek stok: ketik \`belanja\`\n`;
    }
    
    response += `💬 Butuh bantuan admin: ketik \`help\``;
    
    return response;
  }

  /**
   * Get rate limit message
   * @param {Object} rateLimitCheck - Rate limit check result
   * @returns {string}
   */
  getRateLimitMessage(rateLimitCheck) {
    const resetMinutes = Math.ceil(rateLimitCheck.resetIn / 60000);
    
    return `⏳ **AI Rate Limit**\n\n` +
      `Anda telah mencapai batas penggunaan AI (${rateLimitCheck.limit} pertanyaan/jam).\n\n` +
      `Coba lagi dalam ${resetMinutes} menit.\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💬 Atau hubungi admin: ketik \`help\``;
  }

  /**
   * Get fallback message when AI fails
   * @returns {string}
   */
  getFallbackMessage() {
    return `❓ **Perintah Tidak Dikenali**\n\n` +
      `Maaf, saya tidak mengerti perintah Anda.\n\n` +
      `**Coba:**\n` +
      `• \`menu\` - Lihat menu utama\n` +
      `• \`belanja\` - Lihat produk\n` +
      `• \`help\` - Bantuan\n\n` +
      `💬 Untuk pertanyaan spesifik, hubungi admin dengan ketik \`help\``;
  }

  /**
   * Mask customer ID for privacy
   * @param {string} customerId - Customer WhatsApp ID
   * @returns {string} - Masked ID
   */
  maskCustomerId(customerId) {
    if (!customerId || customerId.length < 8) {
      return '***@c.us';
    }
    return `${customerId.substring(0, 4)}***${customerId.substring(customerId.length - 4)}`;
  }

  /**
   * Get relevance score for message
   * @param {string} message - User message
   * @returns {number} - Relevance score (0-1)
   */
  getRelevanceScore(message) {
    return this.relevanceFilter.getRelevanceScore(message);
  }
}

module.exports = AIFallbackHandler;
