/**
 * AIPromptBuilder
 * Builds context-aware prompts for AI based on intent
 */

const config = require('../../../config');

class AIPromptBuilder {
  constructor() {
    this.shopContext = this.buildShopContext();
  }

  /**
   * Build shop context from config
   * @returns {Object} - Shop context object
   */
  buildShopContext() {
    const products = config.getAllProducts();
    
    return {
      shopName: "Premium Shop",
      description: "Toko akun premium & virtual card terpercaya",
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.category || 'premium',
        description: p.description || '',
      })),
      paymentMethods: ['QRIS', 'DANA', 'OVO', 'GoPay', 'ShopeePay', 'Bank Transfer (BCA, Mandiri, BRI, BNI)'],
      policies: {
        refund: "Refund jika akun tidak bisa digunakan dalam 24 jam pertama",
        guarantee: "Garansi penggantian jika ada masalah teknis",
        support: "Customer support tersedia via chat",
        delivery: "Akun dikirim otomatis setelah pembayaran dikonfirmasi",
      }
    };
  }

  /**
   * Build prompt based on intent
   * @param {string} intent - User intent
   * @param {string} userMessage - Original user message
   * @returns {string} - Formatted prompt for AI
   */
  buildPrompt(intent, userMessage) {
    const basePrompt = this.getBasePrompt();
    const intentPrompt = this.getIntentPrompt(intent);
    const guidelines = this.getGuidelines();
    
    return `${basePrompt}

${intentPrompt}

User Question: "${userMessage}"

${guidelines}

Your response:`;
  }

  /**
   * Get base prompt with shop context
   * @returns {string}
   */
  getBasePrompt() {
    const products = this.shopContext.products
      .map(p => `- ${p.name} (${p.category}): $${p.price} - ${p.description}`)
      .join('\n');

    return `You are a helpful AI assistant for ${this.shopContext.shopName}, ${this.shopContext.description}.

Our Products:
${products}

Payment Methods: ${this.shopContext.paymentMethods.join(', ')}

Shop Policies:
- Refund: ${this.shopContext.policies.refund}
- Guarantee: ${this.shopContext.policies.guarantee}
- Support: ${this.shopContext.policies.support}
- Delivery: ${this.shopContext.policies.delivery}`;
  }

  /**
   * Get intent-specific prompt
   * @param {string} intent - Intent type
   * @returns {string}
   */
  getIntentPrompt(intent) {
    const prompts = {
      product_qa: `Context: The user is asking about a specific product.
Task: Explain the product clearly, highlighting its benefits and how it works.`,

      features: `Context: The user wants to know about product features or usage.
Task: Provide detailed explanation of features and how to use the product.`,

      comparison: `Context: The user wants to compare products.
Task: Provide objective comparison based on features, price, and typical use cases. Help them make an informed decision.`,

      pricing: `Context: The user is asking about pricing or discounts.
Task: Provide accurate pricing information. Mention that all premium accounts are $1/month and VCC varies by type.`,

      availability: `Context: The user is asking about stock availability.
Task: Explain that products are generally available. They can check current stock by typing 'belanja' command.`,

      order_help: `Context: The user needs help with ordering or payment process.
Task: Explain the ordering process step-by-step: menu → belanja → select product → checkout → choose payment → send proof → receive product.`,

      troubleshoot: `Context: The user has a problem or complaint.
Task: Be empathetic and understanding. Provide basic troubleshooting if possible, but ultimately suggest contacting admin for specific technical issues.`,

      general_info: `Context: The user has a general question about the shop.
Task: Provide helpful information about the shop and guide them to relevant commands (menu, belanja, help).`,
    };

    return prompts[intent] || prompts.general_info;
  }

  /**
   * Get response guidelines
   * @returns {string}
   */
  getGuidelines() {
    return `Response Guidelines:
- Answer in Bahasa Indonesia (friendly, casual tone)
- Keep response concise (maximum 150 words)
- Use emojis sparingly (2-3 maximum)
- If you're unsure about specific details, suggest contacting admin
- DO NOT make up information or prices
- DO NOT promise actions you cannot perform (like processing orders)
- Stay within shop context - don't discuss unrelated topics
- End with a helpful command suggestion if relevant (e.g., "Ketik 'belanja' untuk lihat produk")`;
  }

  /**
   * Build simple prompt (for quick responses)
   * @param {string} userMessage - User message
   * @returns {string}
   */
  buildSimplePrompt(userMessage) {
    return `You are a helpful assistant for a premium account & virtual card shop.

User Question: "${userMessage}"

Instructions:
- Answer in Bahasa Indonesia
- Be concise (max 100 words)
- Suggest relevant commands if helpful
- Stay within shop context

Your response:`;
  }
}

module.exports = AIPromptBuilder;
