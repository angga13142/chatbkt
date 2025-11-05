/**
 * Admin Review Handler
 * Handles review management and moderation for admins
 * Extracted from AdminHandler for better code organization
 */

const BaseHandler = require("./BaseHandler");

class AdminReviewHandler extends BaseHandler {
  constructor(reviewService, logger) {
    super();
    this.reviewService = reviewService;
    this.logger = logger;
  }

  /**
   * /reviews - View all reviews or filter by product
   * /reviews <productId> - View reviews for specific product
   */
  handleReviewStats(adminId, _productFilter = null) {
    try {
      const stats = this.reviewService.getStatistics();

      let response = "📊 *REVIEW STATISTICS*\n\n";
      response += `📝 Total Reviews: ${stats.totalReviews}\n`;
      response += `⭐ Average Rating: ${stats.averageRating}/5.0\n`;
      response += `✅ Active Reviews: ${stats.activeReviews}\n`;
      response += `❌ Deleted Reviews: ${stats.deletedReviews}\n\n`;
      response += `📈 *Rating Distribution:*\n`;
      response += `5⭐: ${stats.ratingDistribution[5] || 0} reviews\n`;
      response += `4⭐: ${stats.ratingDistribution[4] || 0} reviews\n`;
      response += `3⭐: ${stats.ratingDistribution[3] || 0} reviews\n`;
      response += `2⭐: ${stats.ratingDistribution[2] || 0} reviews\n`;
      response += `1⭐: ${stats.ratingDistribution[1] || 0} reviews\n\n`;

      if (stats.topRatedProducts && stats.topRatedProducts.length > 0) {
        response += `🏆 *Top Rated Products:*\n`;
        stats.topRatedProducts.forEach((product, index) => {
          response += `${index + 1}. ${product.productId}: ⭐ ${
            product.averageRating
          }/5.0 (${product.reviewCount} reviews)\n`;
        });
      }

      this.log(adminId, "view_review_stats", {
        totalReviews: stats.totalReviews,
      });

      return response;
    } catch (error) {
      this.logError(adminId, error, { action: "review_stats" });
      return "❌ Gagal menampilkan review statistics. Silakan coba lagi.";
    }
  }

  /**
   * /deletereview <reviewId> - Delete/moderate a review
   * Example: /deletereview REV-1234567890-abc
   */
  handleDeleteReview(adminId, message) {
    try {
      const reviewId = message.replace("/deletereview ", "").trim();

      if (!reviewId || !reviewId.startsWith("REV-")) {
        return (
          "❌ *Format salah!*\n\n" +
          "*Format:* `/deletereview <reviewId>`\n\n" +
          "*Contoh:*\n" +
          "• /deletereview REV-1234567890-abc\n\n" +
          "Review ID dapat dilihat dengan `/reviews <product>`"
        );
      }

      const review = this.reviewService.getReview(reviewId);
      if (!review) {
        return `❌ Review dengan ID "${reviewId}" tidak ditemukan.`;
      }

      // Soft delete (set isActive = false)
      const result = this.reviewService.deleteReview(reviewId);

      if (!result.success) {
        return result.message;
      }

      let response = "✅ *Review berhasil dihapus*\n\n";
      response += `📝 Review ID: ${reviewId}\n`;
      response += `📦 Product: ${review.productId}\n`;
      response += `⭐ Rating: ${review.rating}/5\n`;
      response += `💬 Text: "${review.reviewText}"\n\n`;
      response += `⚠️ Review di-soft delete (masih bisa dipulihkan)`;

      this.log(adminId, "delete_review", {
        reviewId,
        productId: review.productId,
        rating: review.rating,
      });

      return response;
    } catch (error) {
      this.logError(adminId, error, { action: "delete_review" });
      return "❌ Gagal menghapus review. Silakan coba lagi.";
    }
  }

  /**
   * /reviews <product> - View all reviews for a product
   * Example: /reviews netflix
   */
  handleViewReviews(adminId, message) {
    try {
      const productId = message.replace("/reviews ", "").trim().toLowerCase();

      if (!productId) {
        return (
          "❌ *Format salah!*\n\n" +
          "*Format:* `/reviews <productId>`\n\n" +
          "*Contoh:*\n" +
          "• /reviews netflix\n" +
          "• /reviews spotify"
        );
      }

      const reviews = this.reviewService.getProductReviews(productId, false);

      if (reviews.length === 0) {
        return `📝 *Reviews untuk ${productId}*\n\nBelum ada review untuk produk ini.`;
      }

      const avgRating = this.reviewService.getAverageRating(productId);
      const distribution = this.reviewService.getRatingDistribution(productId);

      let response = `📝 *Reviews untuk ${productId}*\n\n`;
      response += `⭐ *Rating:* ${avgRating.average}/5.0 (${avgRating.count} reviews)\n\n`;
      response += `📊 *Distribusi Rating:*\n`;
      response += `5⭐: ${distribution[5] || 0} | 4⭐: ${
        distribution[4] || 0
      } | 3⭐: ${distribution[3] || 0} | 2⭐: ${distribution[2] || 0} | 1⭐: ${
        distribution[1] || 0
      }\n\n`;
      response += `━━━━━━━━━━━━━━━━━━\n\n`;

      // Show last 10 reviews
      const recentReviews = reviews.slice(-10).reverse();
      recentReviews.forEach((review, index) => {
        response += this.reviewService.formatReview(review, true);
        if (index < recentReviews.length - 1) {
          response += "\n---\n\n";
        }
      });

      if (reviews.length > 10) {
        response += `\n\n📌 Showing ${recentReviews.length} of ${reviews.length} reviews`;
      }

      this.log(adminId, "view_reviews", { productId, count: reviews.length });

      return response;
    } catch (error) {
      this.logError(adminId, error, { action: "view_reviews" });
      return "❌ Gagal menampilkan reviews. Silakan coba lagi.";
    }
  }

  /**
   * Log action
   */
  log(adminId, action, data = {}) {
    if (this.logger) {
      this.logger.log("admin_review_action", {
        adminId: this._maskCustomerId(adminId),
        action,
        timestamp: new Date().toISOString(),
        ...data,
      });
    }
  }

  /**
   * Log error
   */
  logError(adminId, error, context = {}) {
    if (this.logger) {
      this.logger.error("admin_review_error", {
        adminId: this._maskCustomerId(adminId),
        error: error.message,
        stack: error.stack,
        ...context,
      });
    }
  }

  /**
   * Mask customer ID for privacy
   */
  _maskCustomerId(customerId) {
    if (!customerId) return "unknown";
    const parts = customerId.split("@");
    if (parts[0].length > 4) {
      return "***" + parts[0].slice(-4) + "@" + parts[1];
    }
    return customerId;
  }
}

module.exports = AdminReviewHandler;
