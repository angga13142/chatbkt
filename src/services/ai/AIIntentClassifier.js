/**
 * AIIntentClassifier
 * Classifies user intent for context-aware AI responses
 */

class AIIntentClassifier {
  constructor() {
    this.intents = {
      PRODUCT_QA: 'product_qa',           // Questions about products
      ORDER_HELP: 'order_help',           // How to order/pay
      COMPARISON: 'comparison',           // Compare products
      PRICING: 'pricing',                 // Price questions
      AVAILABILITY: 'availability',       // Stock questions
      GENERAL_INFO: 'general_info',       // About shop
      TROUBLESHOOT: 'troubleshoot',       // Problems/complaints
      FEATURES: 'features',               // Product features
    };

    // Product names for context
    this.products = [
      'netflix', 'spotify', 'youtube', 'disney', 'hotstar',
      'vcc', 'virtual card', 'card'
    ];
  }

  /**
   * Classify user intent
   * @param {string} message - User message
   * @returns {string} - Intent type
   */
  classify(message) {
    if (!message || typeof message !== 'string') {
      return this.intents.GENERAL_INFO;
    }

    const normalized = message.toLowerCase().trim();
    
    // Order of classification matters - check most specific first
    
    // Troubleshooting (check early - contains error keywords)
    if (this.isTroubleshooting(normalized)) {
      return this.intents.TROUBLESHOOT;
    }
    
    // Product comparison (highest priority for complex queries)
    if (this.isComparison(normalized)) {
      return this.intents.COMPARISON;
    }
    
    // Features/usage questions
    if (this.isFeaturesQuestion(normalized)) {
      return this.intents.FEATURES;
    }
    
    // Product questions (general)
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
    
    // Default: general info
    return this.intents.GENERAL_INFO;
  }

  /**
   * Check if message is a comparison
   * @param {string} message - Normalized message
   * @returns {boolean}
   */
  isComparison(message) {
    const patterns = [
      /beda(nya)?/i,                 // bedanya, beda
      /lebih bagus/i,
      /lebih baik/i,
      /mending/i,
      /vs|versus/i,
      /pilih.*atau/i,
      /compare|comparison|bandingkan/i,
      /atau.*\?/i,  // "A atau B?"
    ];
    return patterns.some(p => p.test(message));
  }

  /**
   * Check if message is about product features
   * @param {string} message - Normalized message
   * @returns {boolean}
   */
  isFeaturesQuestion(message) {
    const patterns = [
      /fitur/i,
      /bisa.*apa/i,
      /dapat.*apa/i,
      /kegunaan/i,
      /fungsi/i,
      /cara (pakai|gunakan|menggunakan|pake)/i,
      /bagaimana (pakai|gunakan|menggunakan|pake)/i,
      /gimana (pakai|gunakan|menggunakan|pake)/i,
      /support.*device/i,
      /berapa.*device/i,
      /berapa.*orang/i,
    ];
    return patterns.some(p => p.test(message));
  }

  /**
   * Check if message is a product question
   * @param {string} message - Normalized message
   * @returns {boolean}
   */
  isProductQuestion(message) {
    // Must mention a product
    const hasProduct = this.products.some(p => message.includes(p));
    
    if (!hasProduct) {
      return false;
    }

    const patterns = [
      /apa itu/i,
      /penjelasan/i,
      /deskripsi/i,
      /keuntungan|benefit/i,
      /kelebihan/i,
      /recommended|rekomen/i,
    ];
    return patterns.some(p => p.test(message));
  }

  /**
   * Check if message is about pricing
   * @param {string} message - Normalized message
   * @returns {boolean}
   */
  isPricingQuestion(message) {
    const patterns = [
      /harga/i,
      /berapa.*\$/i,
      /berapa.*rp/i,
      /mahal|murah/i,
      /diskon|promo/i,
      /biaya/i,
      /cost|price/i,
    ];
    return patterns.some(p => p.test(message));
  }

  /**
   * Check if message is about availability
   * @param {string} message - Normalized message
   * @returns {boolean}
   */
  isAvailabilityQuestion(message) {
    const patterns = [
      /stok|stock/i,
      /tersedia|available/i,
      /ada (gak|tidak|nggak|ga)/i,
      /ready/i,
      /masih ada/i,
      /habis/i,
    ];
    return patterns.some(p => p.test(message));
  }

  /**
   * Check if message is about ordering/payment
   * @param {string} message - Normalized message
   * @returns {boolean}
   */
  isOrderHelp(message) {
    const patterns = [
      /cara (order|beli|bayar|pesan)/i,
      /gimana (order|beli|bayar|pesan)/i,
      /bagaimana (order|beli|bayar|pesan)/i,
      /pembayaran/i,
      /metode.*bayar/i,
      /checkout/i,
      /proses.*order/i,
    ];
    return patterns.some(p => p.test(message));
  }

  /**
   * Check if message is troubleshooting
   * @param {string} message - Normalized message
   * @returns {boolean}
   */
  isTroubleshooting(message) {
    const patterns = [
      /gak bisa|tidak bisa|ga bisa/i,
      /error|gagal/i,
      /masalah|problem/i,
      /kenapa.*tidak|mengapa.*tidak/i,
      /komplain|refund/i,
      /rusak|broken/i,
      /help|tolong|bantuan/i,
    ];
    return patterns.some(p => p.test(message));
  }

  /**
   * Get all available intents
   * @returns {Object} - Intent constants
   */
  getIntents() {
    return { ...this.intents };
  }
}

module.exports = AIIntentClassifier;
