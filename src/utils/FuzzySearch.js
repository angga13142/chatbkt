/**
 * Fuzzy Search Utility
 * Levenshtein distance-based fuzzy matching for product search
 */

class FuzzySearch {
  /**
   * Search for product using fuzzy matching
   * @param {Array} products - Array of products
   * @param {string} query - Search query
   * @param {number} threshold - Maximum allowed distance (default: 3)
   * @returns {Object|null} Best matching product or null
   */
  static search(products, query, threshold = 3) {
    const queryLower = query.toLowerCase();

    // First try exact match
    const exactMatch = products.find(
      (p) =>
        p.id.toLowerCase() === queryLower || p.name.toLowerCase() === queryLower
    );
    if (exactMatch) return exactMatch;

    // Then try partial match (contains)
    const partialMatch = products.find(
      (p) =>
        p.name.toLowerCase().includes(queryLower) ||
        p.id.toLowerCase().includes(queryLower)
    );
    if (partialMatch) return partialMatch;

    // Finally try fuzzy matching with Levenshtein distance
    let bestMatch = null;
    let bestScore = Infinity;

    for (const product of products) {
      const nameLower = product.name.toLowerCase();
      const idLower = product.id.toLowerCase();

      const nameDistance = this.levenshteinDistance(nameLower, queryLower);
      const idDistance = this.levenshteinDistance(idLower, queryLower);

      const minDistance = Math.min(nameDistance, idDistance);

      if (minDistance === 0) {
        // Perfect match
        return product;
      }

      if (minDistance < bestScore && minDistance <= threshold) {
        bestScore = minDistance;
        bestMatch = product;
      }
    }

    return bestMatch;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1
   * @param {string} str2
   * @returns {number} Edit distance
   */
  static levenshteinDistance(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;

    // Create distance matrix
    const matrix = Array(len1 + 1)
      .fill(null)
      .map(() => Array(len2 + 1).fill(0));

    // Initialize first row and column
    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    // Fill matrix using dynamic programming
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;

        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Get similarity ratio between two strings (0-1)
   * @param {string} str1
   * @param {string} str2
   * @returns {number} Similarity ratio (1 = identical, 0 = completely different)
   */
  static similarityRatio(str1, str2) {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1.0;
    return 1.0 - distance / maxLen;
  }

  /**
   * Find multiple matches above similarity threshold
   * @param {Array} products
   * @param {string} query
   * @param {number} minSimilarity - Minimum similarity (0-1, default: 0.6)
   * @param {number} limit - Maximum results (default: 5)
   * @returns {Array} Array of {product, similarity} sorted by similarity
   */
  static findMatches(products, query, minSimilarity = 0.6, limit = 5) {
    const queryLower = query.toLowerCase();
    const matches = [];

    for (const product of products) {
      const nameSimilarity = this.similarityRatio(
        product.name.toLowerCase(),
        queryLower
      );
      const idSimilarity = this.similarityRatio(
        product.id.toLowerCase(),
        queryLower
      );

      const maxSimilarity = Math.max(nameSimilarity, idSimilarity);

      if (maxSimilarity >= minSimilarity) {
        matches.push({
          product,
          similarity: maxSimilarity,
        });
      }
    }

    // Sort by similarity (descending)
    matches.sort((a, b) => b.similarity - a.similarity);

    return matches.slice(0, limit);
  }
}

module.exports = FuzzySearch;
