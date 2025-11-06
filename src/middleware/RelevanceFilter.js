/**
 * RelevanceFilter
 * Determines if message is relevant to shop/products
 * Only relevant messages will be sent to AI
 */

class RelevanceFilter {
  constructor() {
    // Keywords that indicate shop-related questions
    this.shopKeywords = [
      // Product names
      'netflix', 'spotify', 'youtube', 'disney', 'hotstar', 'vcc', 'virtual', 'card',
      
      // Shop terms
      'produk', 'product', 'harga', 'price', 'beli', 'buy', 'order', 'bayar', 'pay', 'pembayaran', 'payment',
      'cara', 'gimana', 'bagaimana', 'how', 'kenapa', 'why', 'mengapa',
      
      // Features
      'akun', 'account', 'premium', 'stok', 'stock', 'tersedia', 'available', 'duration', 'durasi',
      'garansi', 'warranty', 'refund', 'retur', 'return', 'komplain', 'complaint',
      
      // Question words
      'apa', 'what', 'berapa', 'how much', 'kapan', 'when', 'dimana', 'where', 'siapa', 'who',
      'bisa', 'can', 'ada', 'have', 'punya', 'got',
      
      // Comparison
      'beda', 'difference', 'lebih', 'better', 'bagus', 'good', 'vs', 'versus',
      
      // Actions
      'checkout', 'cart', 'keranjang', 'belanja', 'shop', 'wishlist', 'simpan', 'save',
    ];
    
    // Patterns that indicate questions
    this.questionPatterns = [
      /\?$/,                                    // Ends with ?
      /^(apa|berapa|kapan|gimana|bagaimana)/i, // Starts with question word
      /^(what|how|when|where|why)/i,            // English questions
      /bisa (gak|tidak|nggak|ga)/i,             // Can/cannot questions
      /ada (gak|tidak|nggak|ga)/i,              // Have/don't have
      /(kenapa|mengapa|why)/i,                  // Why questions
      /gimana (cara|caranya)/i,                 // How to...
      /bedanya (apa|apaan)/i,                   // What's the difference
    ];
    
    // Spam patterns to reject
    this.spamPatterns = [
      /^(hi|hello|hai|halo|hey|yo)$/i,         // Just greetings
      /^[a-z]$/i,                               // Single character
      /^\d+$/,                                  // Just numbers
      /^(ok|oke|ya|yes|no|ga|gak)$/i,          // Single word confirmations
      /^(test|testing|tes)$/i,                  // Test messages
      /^[\s\n\r]+$/,                            // Only whitespace
      /^[^a-zA-Z0-9\s]+$/,                      // Only special chars
    ];
  }

  /**
   * Check if message is relevant for AI
   * @param {string} message - User message
   * @returns {boolean}
   */
  isRelevant(message) {
    if (!message || typeof message !== 'string') {
      return false;
    }

    const normalized = message.toLowerCase().trim();
    
    // Must have minimum length
    if (normalized.length < 3) {
      return false;
    }
    
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

  /**
   * Check if message is spam
   * @param {string} message - Normalized message
   * @returns {boolean}
   */
  isSpam(message) {
    return this.spamPatterns.some(pattern => pattern.test(message));
  }

  /**
   * Check if message contains shop keywords
   * @param {string} message - Normalized message
   * @returns {boolean}
   */
  containsShopKeywords(message) {
    return this.shopKeywords.some(keyword => 
      message.includes(keyword.toLowerCase())
    );
  }

  /**
   * Check if message looks like a question
   * @param {string} message - Normalized message
   * @returns {boolean}
   */
  looksLikeQuestion(message) {
    return this.questionPatterns.some(pattern => pattern.test(message));
  }

  /**
   * Get relevance score (0-1)
   * Higher score = more relevant
   * @param {string} message - User message
   * @returns {number}
   */
  getRelevanceScore(message) {
    if (!this.isRelevant(message)) {
      return 0;
    }

    let score = 0.5; // Base score for passing basic relevance

    const normalized = message.toLowerCase();

    // Boost score for shop keywords
    const keywordMatches = this.shopKeywords.filter(k => 
      normalized.includes(k.toLowerCase())
    ).length;
    score += Math.min(keywordMatches * 0.1, 0.3); // Max +0.3

    // Boost score for question patterns
    if (this.looksLikeQuestion(normalized)) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }
}

module.exports = RelevanceFilter;
