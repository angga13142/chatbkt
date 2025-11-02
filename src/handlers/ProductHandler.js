/**
 * Product Handler
 * Handles product-related operations (CRUD, search, stock management)
 */

const BaseHandler = require("./BaseHandler");
const ProductService = require("../services/product/ProductService");
const FuzzySearch = require("../utils/FuzzySearch");

class ProductHandler extends BaseHandler {
  constructor(sessionManager, logger) {
    super(sessionManager, logger);
    this.productService = new ProductService();
    this.fuzzySearch = new FuzzySearch();
  }

  /**
   * Handle product operations
   * @param {string} customerId
   * @param {string} message
   * @param {Object} context
   * @returns {Promise<string>}
   */
  async handle(customerId, message, context = {}) {
    const { action, data } = context;

    switch (action) {
      case "search":
        return await this.searchProduct(customerId, message);
      case "list":
        return this.listProducts(data?.usdToIdrRate);
      case "getById":
        return this.getProductById(data?.productId);
      case "checkStock":
        return this.checkStock(data?.productId);
      default:
        return "Unknown product action";
    }
  }

  /**
   * Search for product using fuzzy matching
   * @param {string} customerId
   * @param {string} query
   * @returns {Object|null}
   */
  searchProduct(customerId, query) {
    const products = this.productService.getAllProducts();
    const result = this.fuzzySearch.search(products, query);

    if (result) {
      this.log(customerId, "product_search", { query, found: result.id });
      return result;
    }

    this.log(customerId, "product_search_failed", { query });
    return null;
  }

  /**
   * List all products
   * @param {number} usdToIdrRate
   * @returns {string}
   */
  listProducts(usdToIdrRate = 15800) {
    return this.productService.formatProductList(usdToIdrRate);
  }

  /**
   * Get product by ID
   * @param {string} productId
   * @returns {Object|null}
   */
  getProductById(productId) {
    return this.productService.getProductById(productId);
  }

  /**
   * Check product stock
   * @param {string} productId
   * @returns {Object}
   */
  checkStock(productId) {
    const stock = this.productService.getStock(productId);
    const inStock = this.productService.isInStock(productId);

    return { stock, inStock };
  }

  /**
   * Get all products
   * @returns {Array}
   */
  getAllProducts() {
    return this.productService.getAllProducts();
  }
}

module.exports = ProductHandler;
