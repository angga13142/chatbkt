# AI Fallback & Product Assistant Implementation Plan

**Date:** November 6, 2025  
**Feature:** AI-powered fallback handler + Product Q&A assistant  
**Priority:** HIGH  
**Estimated Time:** 4-6 hours

---

## 📋 **EXECUTIVE SUMMARY**

Implementasi AI (Gemini 2.5 Flash) sebagai:

1. **Fallback Handler** - Menjawab pesan yang tidak match dengan command
2. **Product Assistant** - Membantu user dengan pertanyaan tentang produk
3. **Smart Filter** - Hanya aktif untuk pertanyaan relevan dengan toko

**Key Benefits:**

- ✅ Meningkatkan user experience (jawab pertanyaan non-standard)
- ✅ Reduce customer confusion (AI explain products)
- ✅ Cost-effective (~$0.00005 per call dengan Gemini Flash)
- ✅ Maintain bot reliability (AI hanya fallback, bukan primary)

---

## 🎯 **REQUIREMENTS**

### Functional Requirements

1. **AI harus dipanggil HANYA jika:**

   - Pesan tidak match dengan command apapun
   - Pesan terlihat seperti pertanyaan (contains `?` atau kata tanya)
   - Pesan relevan dengan toko/produk (bukan spam)

2. **AI harus bisa menjawab:**

   - Pertanyaan tentang produk (fitur, durasi, cara pakai)
   - Pertanyaan tentang cara order/pembayaran
   - Pertanyaan umum tentang toko
   - Request perbandingan produk

3. **AI TIDAK boleh:**
   - Menjawab spam/irrelevant messages
   - Memberikan informasi sensitif (password, API keys)
   - Mengklaim bisa melakukan action (order, payment, dll)
   - Override existing commands

### Non-Functional Requirements

- Response time: < 3 detik
- Cost per call: < $0.0001
- Rate limit: 5 calls/hour per user
- Fallback gracefully jika AI error

---

## 🏗️ **ARCHITECTURE**

### Current Flow (Before AI)

```
User Message
    ↓
MessageRouter.route()
    ↓
Match command? → YES → CustomerHandler/AdminHandler
    ↓
    NO
    ↓
Return "Perintah tidak dikenali" ❌
```

### New Flow (With AI Fallback)

```
User Message
    ↓
MessageRouter.route()
    ↓
Match command? → YES → CustomerHandler/AdminHandler
    ↓
    NO
    ↓
Is relevant question? → NO → Return "Perintah tidak dikenali"
    ↓
   YES
    ↓
AIFallbackHandler.handle()
    ↓
Check rate limit → EXCEEDED → Return "Rate limit" message
    ↓
   OK
    ↓
Classify intent (product_qa, order_help, general_info)
    ↓
Generate context-aware prompt
    ↓
Call Gemini API
    ↓
Return AI response ✅
```

---

## 📂 **FILE STRUCTURE**

### New Files to Create

```
src/handlers/
├── AIFallbackHandler.js         # NEW - Main AI fallback handler

src/services/ai/
├── AIService.js                  # EXISTING - Already implemented
├── AIIntentClassifier.js         # NEW - Classify user intent
├── AIPromptBuilder.js            # NEW - Build context-aware prompts
└── AIResponseFormatter.js        # NEW - Format AI response

src/middleware/
├── RelevanceFilter.js            # NEW - Filter spam/irrelevant messages

tests/unit/handlers/
├── AIFallbackHandler.test.js    # NEW - Test AI fallback

docs/
└── AI_FALLBACK_IMPLEMENTATION_PLAN.md  # THIS FILE
```

### Files to Modify

```
src/core/MessageRouter.js         # Add AI fallback routing
src/handlers/CustomerHandler.js   # Integrate AI product Q&A
src/config/ai.config.js           # Add fallback prompts
chatbotLogic.js                   # Wire AI fallback handler
```

---

## 🔧 **IMPLEMENTATION STEPS**

### **Phase 1: Relevance Filtering (Priority: CRITICAL)**

**File:** `src/middleware/RelevanceFilter.js`

```javascript
/**
 * RelevanceFilter
 * Determines if message is relevant to shop/products
 */

class RelevanceFilter {
  constructor() {
    // Keywords that indicate shop-related questions
    this.shopKeywords = [
      // Product names
      "netflix",
      "spotify",
      "youtube",
      "disney",
      "vcc",
      "virtual card",

      // Shop terms
      "produk",
      "harga",
      "beli",
      "order",
      "bayar",
      "pembayaran",
      "cara",
      "gimana",
      "bagaimana",
      "kenapa",
      "mengapa",

      // Features
      "akun",
      "premium",
      "stok",
      "tersedia",
      "duration",
      "durasi",
      "garansi",
      "refund",
      "retur",
      "komplain",

      // Questions words
      "apa",
      "berapa",
      "kapan",
      "dimana",
      "siapa",
      "what",
      "how",
      "when",
      "where",
      "why",
    ];

    // Patterns that indicate questions
    this.questionPatterns = [
      /\?$/, // Ends with ?
      /^(apa|berapa|kapan|gimana)/i, // Starts with question word
      /bisa (gak|tidak|nggak)/i, // Can/cannot questions
      /ada (gak|tidak|nggak)/i, // Have/don't have
    ];

    // Spam patterns to reject
    this.spamPatterns = [
      /^(hi|hello|hai|halo|test)$/i, // Just greetings
      /^[a-z]$/i, // Single character
      /^\d+$/, // Just numbers
      /^(ok|oke|ya|yes|no)$/i, // Single word confirmations
    ];
  }

  /**
   * Check if message is relevant for AI
   * @param {string} message - User message
   * @returns {boolean}
   */
  isRelevant(message) {
    const normalized = message.toLowerCase().trim();

    // Reject spam
    if (this.isSpam(normalized)) {
      return false;
    }

    // Accept if contains shop keywords
    if (this.containsShopKeywords(normalized)) {
      return true;
    }

    // Accept if looks like a question
    if (this.looksLikeQuestion(normalized)) {
      return true;
    }

    return false;
  }

  isSpam(message) {
    return this.spamPatterns.some((pattern) => pattern.test(message));
  }

  containsShopKeywords(message) {
    return this.shopKeywords.some((keyword) =>
      message.includes(keyword.toLowerCase())
    );
  }

  looksLikeQuestion(message) {
    return this.questionPatterns.some((pattern) => pattern.test(message));
  }
}

module.exports = RelevanceFilter;
```

**Tests:** `tests/unit/middleware/RelevanceFilter.test.js`

---

### **Phase 2: Intent Classification (Priority: HIGH)**

**File:** `src/services/ai/AIIntentClassifier.js`

```javascript
/**
 * AIIntentClassifier
 * Classifies user intent for context-aware responses
 */

class AIIntentClassifier {
  constructor() {
    this.intents = {
      PRODUCT_QA: "product_qa", // Questions about products
      ORDER_HELP: "order_help", // How to order/pay
      COMPARISON: "comparison", // Compare products
      PRICING: "pricing", // Price questions
      AVAILABILITY: "availability", // Stock questions
      GENERAL_INFO: "general_info", // About shop
      TROUBLESHOOT: "troubleshoot", // Problems/complaints
    };
  }

  /**
   * Classify user intent
   * @param {string} message - User message
   * @returns {string} - Intent type
   */
  classify(message) {
    const normalized = message.toLowerCase();

    // Product comparison
    if (this.isComparison(normalized)) {
      return this.intents.COMPARISON;
    }

    // Product questions (features, usage, etc)
    if (this.isProductQuestion(normalized)) {
      return this.intents.PRODUCT_QA;
    }

    // Pricing questions
    if (this.isPricingQuestion(normalized)) {
      return this.intents.PRICING;
    }

    // Stock/availability
    if (this.isAvailabilityQuestion(normalized)) {
      return this.intents.AVAILABILITY;
    }

    // How to order/pay
    if (this.isOrderHelp(normalized)) {
      return this.intents.ORDER_HELP;
    }

    // Troubleshooting
    if (this.isTroubleshooting(normalized)) {
      return this.intents.TROUBLESHOOT;
    }

    // Default: general info
    return this.intents.GENERAL_INFO;
  }

  isComparison(message) {
    const patterns = [
      /beda(nya)?.*antara/i,
      /lebih bagus/i,
      /vs|versus/i,
      /pilih.*atau/i,
      /compare|comparison|bandingkan/i,
    ];
    return patterns.some((p) => p.test(message));
  }

  isProductQuestion(message) {
    const patterns = [
      /fitur/i,
      /cara (pakai|gunakan|menggunakan)/i,
      /(bisa|dapat) (apa|untuk)/i,
      /keuntungan|benefit/i,
      /deskripsi|penjelasan/i,
    ];
    return patterns.some((p) => p.test(message));
  }

  isPricingQuestion(message) {
    const patterns = [/harga/i, /berapa/i, /mahal|murah/i, /diskon|promo/i];
    return patterns.some((p) => p.test(message));
  }

  isAvailabilityQuestion(message) {
    const patterns = [
      /stok|stock/i,
      /tersedia|available/i,
      /ada (gak|tidak|nggak)/i,
      /ready/i,
    ];
    return patterns.some((p) => p.test(message));
  }

  isOrderHelp(message) {
    const patterns = [
      /cara (order|beli|bayar)/i,
      /gimana (order|beli|bayar)/i,
      /bagaimana (order|beli|bayar)/i,
      /pembayaran/i,
    ];
    return patterns.some((p) => p.test(message));
  }

  isTroubleshooting(message) {
    const patterns = [
      /gak bisa|tidak bisa/i,
      /error|gagal/i,
      /masalah|problem/i,
      /kenapa|mengapa/i,
      /komplain|refund/i,
    ];
    return patterns.some((p) => p.test(message));
  }
}

module.exports = AIIntentClassifier;
```

---

### **Phase 3: Prompt Builder (Priority: HIGH)**

**File:** `src/services/ai/AIPromptBuilder.js`

```javascript
/**
 * AIPromptBuilder
 * Builds context-aware prompts for AI
 */

const { getAllProducts } = require("../../../config");

class AIPromptBuilder {
  constructor() {
    this.shopContext = this.buildShopContext();
  }

  buildShopContext() {
    const products = getAllProducts();

    return {
      shopName: "Premium Shop",
      description: "Toko akun premium & virtual card terpercaya",
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.category || "premium",
        description: p.description || "",
      })),
      paymentMethods: ["QRIS", "DANA", "OVO", "GoPay", "Bank Transfer"],
      policies: {
        refund: "Refund jika akun tidak bisa digunakan dalam 24 jam",
        guarantee: "Garansi 30 hari untuk akun premium",
        support: "Customer support 24/7",
      },
    };
  }

  /**
   * Build prompt based on intent
   * @param {string} intent - User intent
   * @param {string} userMessage - Original user message
   * @returns {string} - Formatted prompt
   */
  buildPrompt(intent, userMessage) {
    const basePrompt = this.getBasePrompt();
    const intentPrompt = this.getIntentPrompt(intent);

    return `${basePrompt}

${intentPrompt}

User Question: "${userMessage}"

Instructions:
- Answer in Bahasa Indonesia
- Be friendly and helpful
- Keep response under 200 words
- Use emojis moderately (2-3 max)
- If unsure, suggest contacting admin
- DO NOT make up information
- DO NOT promise actions (ordering, payment, etc)
- Stay within shop context

Your response:`;
  }

  getBasePrompt() {
    const products = this.shopContext.products
      .map((p) => `- ${p.name} (${p.category}): $${p.price}`)
      .join("\n");

    return `You are a helpful assistant for ${this.shopContext.shopName}.

Our Products:
${products}

Payment Methods: ${this.shopContext.paymentMethods.join(", ")}

Policies:
- Refund: ${this.shopContext.policies.refund}
- Guarantee: ${this.shopContext.policies.guarantee}
- Support: ${this.shopContext.policies.support}`;
  }

  getIntentPrompt(intent) {
    const prompts = {
      product_qa: `The user is asking about product features or usage. 
Explain the product clearly and highlight its benefits.`,

      comparison: `The user wants to compare products. 
Provide objective comparison based on features, price, and use cases.`,

      pricing: `The user is asking about pricing or discounts.
Provide accurate pricing information and mention any available promos.`,

      availability: `The user is asking about stock availability.
Let them know products are generally available and they can check with 'belanja' command.`,

      order_help: `The user needs help with ordering or payment.
Explain the process: menu → belanja → pilih produk → checkout → bayar.`,

      troubleshoot: `The user has a problem or complaint.
Be empathetic and suggest contacting admin for specific issues.`,

      general_info: `The user has a general question about the shop.
Provide helpful information and guide them to relevant commands.`,
    };

    return prompts[intent] || prompts.general_info;
  }
}

module.exports = AIPromptBuilder;
```

---

### **Phase 4: AI Fallback Handler (Priority: CRITICAL)**

**File:** `src/handlers/AIFallbackHandler.js`

```javascript
/**
 * AIFallbackHandler
 * Handles unrecognized messages with AI
 */

const AIService = require("../services/ai/AIService");
const RelevanceFilter = require("../middleware/RelevanceFilter");
const AIIntentClassifier = require("../services/ai/AIIntentClassifier");
const AIPromptBuilder = require("../services/ai/AIPromptBuilder");

class AIFallbackHandler {
  constructor(redisClient = null, logger = console) {
    this.aiService = new AIService(redisClient, logger);
    this.relevanceFilter = new RelevanceFilter();
    this.intentClassifier = new AIIntentClassifier();
    this.promptBuilder = new AIPromptBuilder();
    this.logger = logger;
  }

  /**
   * Handle unrecognized message
   * @param {string} customerId - Customer WhatsApp ID
   * @param {string} message - User message
   * @returns {Promise<string|null>} - AI response or null if not relevant
   */
  async handle(customerId, message) {
    try {
      // Step 1: Check if AI is enabled
      if (!this.aiService.isEnabled()) {
        this.logger.log("[AIFallback] AI disabled, returning null");
        return null;
      }

      // Step 2: Check relevance
      if (!this.relevanceFilter.isRelevant(message)) {
        this.logger.log("[AIFallback] Message not relevant, returning null");
        return null;
      }

      // Step 3: Check rate limit
      const rateLimitCheck = await this.aiService.checkRateLimit(customerId);
      if (!rateLimitCheck.allowed) {
        this.logger.log("[AIFallback] Rate limit exceeded");
        return this.getRateLimitMessage(rateLimitCheck);
      }

      // Step 4: Classify intent
      const intent = this.intentClassifier.classify(message);
      this.logger.log(`[AIFallback] Intent: ${intent}`);

      // Step 5: Build prompt
      const prompt = this.promptBuilder.buildPrompt(intent, message);

      // Step 6: Get AI response
      const aiResponse = await this.aiService.generateResponse(prompt);

      if (!aiResponse || !aiResponse.success) {
        this.logger.error(
          "[AIFallback] AI generation failed:",
          aiResponse?.error
        );
        return this.getFallbackMessage();
      }

      // Step 7: Format and return
      return this.formatResponse(aiResponse.text, intent);
    } catch (error) {
      this.logger.error("[AIFallback] Error:", error);
      return this.getFallbackMessage();
    }
  }

  formatResponse(aiText, intent) {
    // Add AI indicator
    let response = `🤖 **AI Assistant**\n\n${aiText}\n\n`;

    // Add relevant commands based on intent
    if (intent === "product_qa" || intent === "comparison") {
      response += `\n📱 Lihat produk: ketik \`belanja\``;
    } else if (intent === "order_help") {
      response += `\n🛒 Mulai order: ketik \`menu\``;
    }

    response += `\n💬 Butuh bantuan admin: ketik \`help\``;

    return response;
  }

  getRateLimitMessage(rateLimitCheck) {
    const resetMinutes = Math.ceil(rateLimitCheck.resetIn / 60000);

    return (
      `⏳ **AI Rate Limit**\n\n` +
      `Anda telah mencapai batas penggunaan AI (${rateLimitCheck.limit} pertanyaan/jam).\n\n` +
      `Coba lagi dalam ${resetMinutes} menit.\n\n` +
      `Atau hubungi admin: ketik \`help\``
    );
  }

  getFallbackMessage() {
    return (
      `❓ **Perintah Tidak Dikenali**\n\n` +
      `Maaf, saya tidak mengerti perintah Anda.\n\n` +
      `**Coba:**\n` +
      `• \`menu\` - Lihat menu utama\n` +
      `• \`belanja\` - Lihat produk\n` +
      `• \`help\` - Bantuan\n\n` +
      `💬 Untuk pertanyaan spesifik, hubungi admin.`
    );
  }
}

module.exports = AIFallbackHandler;
```

---

### **Phase 5: Integration with MessageRouter (Priority: CRITICAL)**

**File:** `src/core/MessageRouter.js` (Modify)

```javascript
// At the top, add import
const AIFallbackHandler = require("../handlers/AIFallbackHandler");

class MessageRouter {
  constructor(client, sessionManager, chatbotLogic) {
    this.client = client;
    this.sessionManager = sessionManager;
    this.chatbotLogic = chatbotLogic;

    // Add AI fallback handler
    this.aiFallbackHandler = new AIFallbackHandler(
      chatbotLogic.redisClient,
      console
    );
  }

  async route(customerId, message) {
    // ... existing routing logic ...

    // At the end, before returning "command not found":

    // Try AI fallback for unrecognized messages
    const aiResponse = await this.aiFallbackHandler.handle(customerId, message);

    if (aiResponse) {
      return aiResponse;
    }

    // If AI also can't handle, return default message
    return this.getDefaultNotFoundMessage();
  }

  getDefaultNotFoundMessage() {
    return (
      `❓ **Perintah Tidak Dikenali**\n\n` +
      `**Menu Utama:**\n` +
      `• \`menu\` - Tampilkan menu\n` +
      `• \`belanja\` - Lihat produk\n` +
      `• \`cart\` - Keranjang belanja\n` +
      `• \`help\` - Bantuan`
    );
  }
}
```

---

### **Phase 6: Update AI Config (Priority: MEDIUM)**

**File:** `src/config/ai.config.js` (Modify)

```javascript
// Add fallback configuration
const AI_CONFIG = {
  // ... existing config ...

  // Fallback Handler Settings
  fallback: {
    enabled: process.env.AI_FALLBACK_ENABLED === "true" || true,
    relevanceThreshold: 0.6, // Confidence threshold
    maxResponseLength: 200, // Max words in response
  },

  // Intent Classification
  intents: {
    product_qa: { priority: "high", responseStyle: "detailed" },
    comparison: { priority: "high", responseStyle: "objective" },
    order_help: { priority: "medium", responseStyle: "instructional" },
    pricing: { priority: "medium", responseStyle: "concise" },
    availability: { priority: "low", responseStyle: "quick" },
    troubleshoot: { priority: "high", responseStyle: "empathetic" },
    general_info: { priority: "low", responseStyle: "friendly" },
  },

  // Response Formatting
  formatting: {
    addAIIndicator: true,
    addCommandSuggestions: true,
    maxEmojis: 3,
    language: "id", // Bahasa Indonesia
  },
};
```

---

## 🧪 **TESTING STRATEGY**

### Unit Tests

**1. RelevanceFilter Tests**

```javascript
describe("RelevanceFilter", () => {
  test("should accept shop-related questions", () => {
    expect(filter.isRelevant("Berapa harga Netflix?")).toBe(true);
    expect(filter.isRelevant("Cara order gimana?")).toBe(true);
  });

  test("should reject spam", () => {
    expect(filter.isRelevant("hi")).toBe(false);
    expect(filter.isRelevant("test")).toBe(false);
  });
});
```

**2. Intent Classification Tests**

```javascript
describe("AIIntentClassifier", () => {
  test("should classify product questions", () => {
    expect(classifier.classify("Netflix punya fitur apa?")).toBe("product_qa");
  });

  test("should classify comparisons", () => {
    expect(classifier.classify("Lebih bagus Netflix atau Disney?")).toBe(
      "comparison"
    );
  });
});
```

**3. AIFallbackHandler Tests**

```javascript
describe("AIFallbackHandler", () => {
  test("should return null for irrelevant messages", async () => {
    const result = await handler.handle("customer@c.us", "hi");
    expect(result).toBeNull();
  });

  test("should call AI for relevant questions", async () => {
    const result = await handler.handle(
      "customer@c.us",
      "Apa bedanya Netflix dan Disney?"
    );
    expect(result).toContain("🤖");
  });
});
```

### Integration Tests

**File:** `tests/integration/ai-fallback-flow.test.js`

```javascript
describe("AI Fallback Flow", () => {
  test("should handle product question", async () => {
    // User asks: "Netflix bisa dipakai berapa orang?"
    const response = await messageRouter.route(
      "customer@c.us",
      "Netflix bisa dipakai berapa orang?"
    );

    expect(response).toContain("🤖");
    expect(response.toLowerCase()).toContain("netflix");
  });

  test("should fallback to default for spam", async () => {
    const response = await messageRouter.route("customer@c.us", "hi");
    expect(response).toContain("Perintah Tidak Dikenali");
  });
});
```

### E2E Tests

**Scenarios:**

1. User asks product question → AI responds
2. User asks irrelevant question → Default message
3. User exceeds rate limit → Rate limit message
4. AI fails → Graceful fallback

---

## 📊 **MONITORING & METRICS**

### Metrics to Track

```javascript
// Add to AIService
class AIService {
  async trackMetrics(customerId, intent, success, responseTime) {
    const metrics = {
      timestamp: new Date().toISOString(),
      customerId: this.maskCustomerId(customerId),
      intent,
      success,
      responseTime, // ms
      cost: this.calculateCost(),
    };

    // Store in Redis or log file
    await this.logger.logMetric("ai_fallback", metrics);
  }
}
```

**Dashboard Metrics:**

- Total AI calls/day
- Success rate
- Average response time
- Cost per day
- Most common intents
- Rate limit hits

---

## 💰 **COST ESTIMATION**

**Gemini 2.5 Flash Pricing:**

- Input: $0.000001875 per 1K tokens
- Output: $0.0000075 per 1K tokens

**Average Call:**

- Input: ~500 tokens (context + prompt)
- Output: ~150 tokens (response)
- **Cost per call: ~$0.00002**

**Monthly Estimate (100 users):**

- 100 users × 5 calls/day × 30 days = 15,000 calls
- 15,000 × $0.00002 = **$0.30/month**

**Extremely affordable!** ✅

---

## 🚀 **DEPLOYMENT PLAN**

### Step 1: Development (Day 1-2)

- [ ] Create all new files
- [ ] Write unit tests
- [ ] Local testing

### Step 2: Testing (Day 2-3)

- [ ] Integration tests
- [ ] E2E testing
- [ ] Rate limit testing

### Step 3: Staging (Day 3)

- [ ] Deploy to staging environment
- [ ] Test with real users (small group)
- [ ] Monitor metrics

### Step 4: Production (Day 4)

- [ ] Feature flag rollout (10% → 50% → 100%)
- [ ] Monitor costs and performance
- [ ] Gather user feedback

---

## ⚙️ **CONFIGURATION**

### Environment Variables

```bash
# .env
AI_FALLBACK_ENABLED=true
AI_RATE_LIMIT_PER_HOUR=5
AI_MAX_RESPONSE_LENGTH=200
AI_RELEVANCE_THRESHOLD=0.6
```

### Feature Flags

```javascript
// config.js
const FEATURES = {
  AI_FALLBACK: process.env.AI_FALLBACK_ENABLED === "true",
  AI_PRODUCT_QA: true,
  AI_COMPARISON: true,
  AI_ORDER_HELP: true,
};
```

---

## 📝 **EXAMPLES**

### Example 1: Product Question

**User:** "Netflix bisa dipake berapa device?"

**AI Response:**

```
🤖 AI Assistant

Netflix Premium biasanya mendukung multiple devices (2-4 devices)
tergantung paket. Untuk detail spesifik paket kami, silakan hubungi admin.

Kami menyediakan Netflix Premium dengan harga $1/bulan yang
sangat terjangkau! 🎬

📱 Lihat produk: ketik `belanja`
💬 Butuh bantuan admin: ketik `help`
```

### Example 2: Comparison

**User:** "Lebih bagus Netflix atau Disney?"

**AI Response:**

```
🤖 AI Assistant

Keduanya bagus, tergantung preferensi:

**Netflix** 🎬
• Konten original banyak
• Series & film internasional
• Harga: $1/bulan

**Disney+** 🎪
• Film Disney, Marvel, Star Wars
• Cocok untuk keluarga
• Harga: $1/bulan

Pilih sesuai selera Anda! Kedua akun premium kami berkualitas tinggi.

📱 Lihat produk: ketik `belanja`
💬 Butuh bantuan admin: ketik `help`
```

### Example 3: Order Help

**User:** "Gimana cara bayarnya?"

**AI Response:**

```
🤖 AI Assistant

Cara order & bayar sangat mudah:

1. Ketik `menu` → Pilih Belanja
2. Pilih produk (misal: `netflix`)
3. Ketik `checkout` untuk review
4. Pilih metode pembayaran (QRIS/Transfer)
5. Bayar sesuai instruksi
6. Kirim bukti bayar
7. Akun dikirim otomatis! ✅

Metode pembayaran: QRIS, DANA, OVO, GoPay, Bank Transfer

🛒 Mulai order: ketik `menu`
💬 Butuh bantuan admin: ketik `help`
```

---

## ⚠️ **RISKS & MITIGATIONS**

| Risk                | Impact | Probability | Mitigation                             |
| ------------------- | ------ | ----------- | -------------------------------------- |
| AI gives wrong info | High   | Low         | Add disclaimers, suggest admin contact |
| High costs          | Medium | Low         | Rate limiting (5/hour), monitoring     |
| Slow response       | Medium | Low         | Use Gemini Flash (fast), set timeout   |
| AI unavailable      | Low    | Medium      | Graceful fallback to default message   |
| Spam abuse          | Medium | Medium      | Relevance filter, rate limiting        |

---

## 📈 **SUCCESS METRICS**

**Week 1:**

- [ ] AI fallback handles 20%+ of "command not found" cases
- [ ] User satisfaction increase (measure via surveys)
- [ ] Cost stays under $1/day

**Month 1:**

- [ ] Reduce admin workload by 30%
- [ ] Improve conversion rate (users who complete purchase)
- [ ] Positive user feedback

---

## 🎯 **CONCLUSION**

This implementation plan provides:
✅ **Smart AI integration** - Only activates when needed
✅ **Cost-effective** - ~$0.30/month for 100 users
✅ **User-friendly** - Natural conversation experience
✅ **Safe** - Rate limiting, relevance filtering
✅ **Scalable** - Easy to extend with new intents

**Estimated Time:** 4-6 hours for full implementation
**ROI:** High (improve UX, reduce support load, minimal cost)

**Ready to implement?** Let's start with Phase 1! 🚀

---

**Questions or modifications needed?** Let me know!
