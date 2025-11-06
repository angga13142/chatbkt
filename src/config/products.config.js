/**
 * Products Configuration
 * DYNAMIC: Auto-loads products from products_data/ folder
 * Product catalog and inventory
 */

const DynamicProductLoader = require("../utils/DynamicProductLoader");

// Load products dynamically from products_data/
const products = DynamicProductLoader.loadProducts();

// Export helper functions
const getProductById = (productId) => {
  return DynamicProductLoader.getProductById(productId);
};

const getAllProducts = () => {
  return [...products.premiumAccounts, ...products.virtualCards];
};

const refreshProducts = () => {
  const newProducts = DynamicProductLoader.loadProducts();
  products.premiumAccounts = newProducts.premiumAccounts;
  products.virtualCards = newProducts.virtualCards;
  return products;
};

module.exports = {
  products,
  DEFAULT_STOCK: 0, // Deprecated - use Redis stock manager
  VCC_STOCK: 0, // Deprecated - use Redis stock manager
  getProductById,
  getAllProducts,
  refreshProducts,
  DynamicProductLoader, // Export for advanced usage
};
