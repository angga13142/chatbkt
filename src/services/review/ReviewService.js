/**
 * Review Service
 * Manages product reviews and ratings
 */

const fs = require("fs");
const path = require("path");

class ReviewService {
  constructor() {
    this.dataDir = path.join(process.cwd(), "data");
    this.reviewsFile = path.join(this.dataDir, "reviews.json");
    this._initialize();
  }

  /**
   * Initialize data directory and files
   * @private
   */
  _initialize() {
    try {
      // Create data directory if not exists
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      // Create reviews.json if not exists
      if (!fs.existsSync(this.reviewsFile)) {
        fs.writeFileSync(this.reviewsFile, JSON.stringify([], null, 2));
      }
    } catch (error) {
      console.error(`❌ ReviewService._initialize error: ${error.message}`);
    }
  }

  /**
   * Load reviews from file
   * @private
   * @returns {Array}
   */
  _loadReviews() {
    try {
      const data = fs.readFileSync(this.reviewsFile, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error(`❌ ReviewService._loadReviews error: ${error.message}`);
      return [];
    }
  }

  /**
   * Save reviews to file
   * @private
   * @param {Array} reviews
   */
  _saveReviews(reviews) {
    try {
      fs.writeFileSync(this.reviewsFile, JSON.stringify(reviews, null, 2));
    } catch (error) {
      console.error(`❌ ReviewService._saveReviews error: ${error.message}`);
    }
  }

  /**
   * Generate unique review ID
   * @private
   * @returns {string}
   */
  _generateReviewId() {
    return `REV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate rating (1-5 stars)
   * @param {number} rating
   * @returns {boolean}
   */
  validateRating(rating) {
    return Number.isInteger(rating) && rating >= 1 && rating <= 5;
  }

  /**
   * Validate review text
   * @param {string} text
   * @returns {Object} {valid: boolean, message: string}
   */
  validateReviewText(text) {
    if (!text || typeof text !== "string") {
      return {
        valid: false,
        message: "Review text tidak boleh kosong",
      };
    }

    const trimmed = text.trim();

    if (trimmed.length < 3) {
      return {
        valid: false,
        message: "Review minimal 3 karakter",
      };
    }

    if (trimmed.length > 500) {
      return {
        valid: false,
        message: "Review maksimal 500 karakter",
      };
    }

    return { valid: true, message: "" };
  }

  /**
   * Check if customer has already reviewed this product
   * @param {string} productId
   * @param {string} customerId
   * @returns {boolean}
   */
  hasReviewed(productId, customerId) {
    const reviews = this._loadReviews();
    return reviews.some(
      (r) => r.productId === productId && r.customerId === customerId
    );
  }

  /**
   * Add new review
   * @param {string} productId
   * @param {string} customerId
   * @param {number} rating - 1-5 stars
   * @param {string} reviewText
   * @param {string} orderId - Optional: link to order
   * @returns {Object} {success: boolean, message: string, reviewId?: string}
   */
  addReview(productId, customerId, rating, reviewText, orderId = null) {
    // Validate rating
    if (!this.validateRating(rating)) {
      return {
        success: false,
        message:
          "❌ Rating harus berupa angka 1-5\n\nContoh: /review netflix 5",
      };
    }

    // Validate review text
    const textValidation = this.validateReviewText(reviewText);
    if (!textValidation.valid) {
      return {
        success: false,
        message: `❌ ${textValidation.message}\n\nReview harus 3-500 karakter.`,
      };
    }

    // Check if already reviewed
    if (this.hasReviewed(productId, customerId)) {
      return {
        success: false,
        message:
          "❌ Anda sudah me-review produk ini.\n\nGunakan /editreview untuk mengubah review Anda.",
      };
    }

    // Create review
    const reviewId = this._generateReviewId();
    const review = {
      reviewId,
      productId,
      customerId,
      rating,
      reviewText: reviewText.trim(),
      orderId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isActive: true,
    };

    // Save review
    const reviews = this._loadReviews();
    reviews.push(review);
    this._saveReviews(reviews);

    return {
      success: true,
      message:
        "✅ *Review berhasil ditambahkan!*\n\n" +
        "Terima kasih atas feedback Anda. 🙏\n\n" +
        "Review Anda akan membantu customer lain.",
      reviewId,
    };
  }

  /**
   * Get reviews for a product
   * @param {string} productId
   * @param {boolean} activeOnly - Only get active reviews
   * @returns {Array}
   */
  getProductReviews(productId, activeOnly = true) {
    const reviews = this._loadReviews();
    return reviews.filter(
      (r) => r.productId === productId && (!activeOnly || r.isActive)
    );
  }

  /**
   * Get all reviews by customer
   * @param {string} customerId
   * @returns {Array}
   */
  getCustomerReviews(customerId) {
    const reviews = this._loadReviews();
    return reviews.filter((r) => r.customerId === customerId && r.isActive);
  }

  /**
   * Get single review by ID
   * @param {string} reviewId
   * @returns {Object|null}
   */
  getReview(reviewId) {
    const reviews = this._loadReviews();
    return reviews.find((r) => r.reviewId === reviewId) || null;
  }

  /**
   * Calculate average rating for a product
   * @param {string} productId
   * @returns {Object} {average: number, count: number}
   */
  getAverageRating(productId) {
    const reviews = this.getProductReviews(productId, true);

    if (reviews.length === 0) {
      return { average: 0, count: 0 };
    }

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const average = sum / reviews.length;

    return {
      average: parseFloat(average.toFixed(1)),
      count: reviews.length,
    };
  }

  /**
   * Get rating distribution for a product
   * @param {string} productId
   * @returns {Object} {5: count, 4: count, 3: count, 2: count, 1: count}
   */
  getRatingDistribution(productId) {
    const reviews = this.getProductReviews(productId, true);
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    reviews.forEach((r) => {
      if (distribution[r.rating] !== undefined) {
        distribution[r.rating]++;
      }
    });

    return distribution;
  }

  /**
   * Update review (edit rating and text)
   * @param {string} reviewId
   * @param {number} rating
   * @param {string} reviewText
   * @returns {Object} {success: boolean, message: string}
   */
  updateReview(reviewId, rating, reviewText) {
    // Validate rating
    if (!this.validateRating(rating)) {
      return {
        success: false,
        message: "❌ Rating harus berupa angka 1-5",
      };
    }

    // Validate review text
    const textValidation = this.validateReviewText(reviewText);
    if (!textValidation.valid) {
      return {
        success: false,
        message: `❌ ${textValidation.message}`,
      };
    }

    const reviews = this._loadReviews();
    const index = reviews.findIndex((r) => r.reviewId === reviewId);

    if (index === -1) {
      return {
        success: false,
        message: "❌ Review tidak ditemukan",
      };
    }

    // Update review
    reviews[index].rating = rating;
    reviews[index].reviewText = reviewText.trim();
    reviews[index].updatedAt = Date.now();

    this._saveReviews(reviews);

    return {
      success: true,
      message: "✅ Review berhasil diperbarui!",
    };
  }

  /**
   * Delete review (soft delete - set isActive to false)
   * @param {string} reviewId
   * @returns {Object} {success: boolean, message: string}
   */
  deleteReview(reviewId) {
    const reviews = this._loadReviews();
    const index = reviews.findIndex((r) => r.reviewId === reviewId);

    if (index === -1) {
      return {
        success: false,
        message: "❌ Review tidak ditemukan",
      };
    }

    // Soft delete
    reviews[index].isActive = false;
    reviews[index].updatedAt = Date.now();

    this._saveReviews(reviews);

    return {
      success: true,
      message: "✅ Review berhasil dihapus",
    };
  }

  /**
   * Hard delete review (permanent removal)
   * Admin only
   * @param {string} reviewId
   * @returns {Object} {success: boolean, message: string}
   */
  permanentDeleteReview(reviewId) {
    const reviews = this._loadReviews();
    const filtered = reviews.filter((r) => r.reviewId !== reviewId);

    if (reviews.length === filtered.length) {
      return {
        success: false,
        message: "❌ Review tidak ditemukan",
      };
    }

    this._saveReviews(filtered);

    return {
      success: true,
      message: "✅ Review berhasil dihapus permanen",
    };
  }

  /**
   * Get all reviews (admin)
   * @param {boolean} includeInactive
   * @returns {Array}
   */
  getAllReviews(includeInactive = false) {
    const reviews = this._loadReviews();
    return includeInactive ? reviews : reviews.filter((r) => r.isActive);
  }

  /**
   * Get review statistics
   * @returns {Object}
   */
  getStatistics() {
    const reviews = this.getAllReviews(true);
    const activeReviews = reviews.filter((r) => r.isActive);

    const totalRating = activeReviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating =
      activeReviews.length > 0 ? totalRating / activeReviews.length : 0;

    return {
      totalReviews: reviews.length,
      activeReviews: activeReviews.length,
      deletedReviews: reviews.length - activeReviews.length,
      averageRating: parseFloat(avgRating.toFixed(1)),
      ratingDistribution: this._getOverallDistribution(activeReviews),
    };
  }

  /**
   * Get overall rating distribution across all products
   * @private
   * @param {Array} reviews
   * @returns {Object}
   */
  _getOverallDistribution(reviews) {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    reviews.forEach((r) => {
      if (distribution[r.rating] !== undefined) {
        distribution[r.rating]++;
      }
    });

    return distribution;
  }

  /**
   * Format review for display
   * @param {Object} review
   * @param {boolean} showCustomerId - Show customer ID (admin only)
   * @returns {string}
   */
  formatReview(review, showCustomerId = false) {
    const stars = "⭐".repeat(review.rating);
    const date = new Date(review.createdAt).toLocaleDateString("id-ID");
    const customerLabel = showCustomerId
      ? `👤 ${review.customerId}`
      : `👤 ${this._maskCustomerId(review.customerId)}`;

    let formatted = `${stars} (${review.rating}/5)\n`;
    formatted += `${customerLabel} • ${date}\n`;
    formatted += `💬 "${review.reviewText}"\n`;

    if (review.updatedAt !== review.createdAt) {
      formatted += `_✏️ Edited_\n`;
    }

    return formatted;
  }

  /**
   * Mask customer ID for privacy
   * @private
   * @param {string} customerId
   * @returns {string}
   */
  _maskCustomerId(customerId) {
    // Remove @c.us suffix
    const phone = customerId.replace("@c.us", "");

    // Mask middle digits: 6281234567890 → 628123****890
    if (phone.length > 8) {
      const start = phone.substring(0, 6);
      const end = phone.substring(phone.length - 3);
      return `${start}****${end}`;
    }

    return phone;
  }
}

module.exports = ReviewService;
