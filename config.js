/**
 * Product Catalog Configuration
 * Define all products available for sale
 */

// Stock values can be configured via environment variables
const DEFAULT_STOCK = process.env.DEFAULT_STOCK || 10;
const VCC_STOCK = process.env.VCC_STOCK || 5;

// System settings (configurable at runtime)
const systemSettings = {
  // Currency settings
  usdToIdrRate: parseInt(process.env.USD_TO_IDR_RATE) || 15800,
  currency: "IDR",

  // Session settings
  sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 30, // minutes

  // Rate limiting
  maxMessagesPerMinute: parseInt(process.env.MAX_MESSAGES_PER_MINUTE) || 20,

  // Business settings
  shopName: process.env.SHOP_NAME || "Premium Shop",
  supportEmail: process.env.SUPPORT_EMAIL || "support@premiumshop.com",
  supportWhatsapp: process.env.SUPPORT_WHATSAPP || "Nomor ini",

  // Auto-delivery settings
  autoDeliveryEnabled: process.env.AUTO_DELIVERY === "true",

  // Maintenance mode
  maintenanceMode: process.env.MAINTENANCE_MODE === "true",
  maintenanceMessage:
    process.env.MAINTENANCE_MESSAGE ||
    "🔧 Sistem sedang maintenance. Mohon coba lagi nanti.",

  // Welcome message
  welcomeMessageEnabled: process.env.WELCOME_MESSAGE_ENABLED !== "false",

  // Stock warnings
  lowStockThreshold: parseInt(process.env.LOW_STOCK_THRESHOLD) || 5,

  // Logging
  logLevel: process.env.LOG_LEVEL || "info",

  // Manual Payment Accounts (E-wallet & Bank Transfer)
  paymentAccounts: {
    dana: {
      enabled: process.env.DANA_ENABLED !== "false",
      number: process.env.DANA_NUMBER || "081234567890",
      name: process.env.DANA_NAME || "John Doe",
    },
    gopay: {
      enabled: process.env.GOPAY_ENABLED !== "false",
      number: process.env.GOPAY_NUMBER || "081234567890",
      name: process.env.GOPAY_NAME || "John Doe",
    },
    ovo: {
      enabled: process.env.OVO_ENABLED !== "false",
      number: process.env.OVO_NUMBER || "081234567890",
      name: process.env.OVO_NAME || "John Doe",
    },
    shopeepay: {
      enabled: process.env.SHOPEEPAY_ENABLED !== "false",
      number: process.env.SHOPEEPAY_NUMBER || "081234567890",
      name: process.env.SHOPEEPAY_NAME || "John Doe",
    },
    bca: {
      enabled: process.env.BCA_ENABLED !== "false",
      accountNumber: process.env.BCA_ACCOUNT || "1234567890",
      accountName: process.env.BCA_NAME || "John Doe",
    },
    bni: {
      enabled: process.env.BNI_ENABLED !== "false",
      accountNumber: process.env.BNI_ACCOUNT || "1234567890",
      accountName: process.env.BNI_NAME || "John Doe",
    },
    bri: {
      enabled: process.env.BRI_ENABLED !== "false",
      accountNumber: process.env.BRI_ACCOUNT || "1234567890",
      accountName: process.env.BRI_NAME || "John Doe",
    },
    mandiri: {
      enabled: process.env.MANDIRI_ENABLED !== "false",
      accountNumber: process.env.MANDIRI_ACCOUNT || "1234567890",
      accountName: process.env.MANDIRI_NAME || "John Doe",
    },
  },
};

const products = {
  premiumAccounts: [
    {
      id: "netflix",
      name: "Netflix Premium Account (1 Month)",
      price: 1,
      description: "Full HD streaming, 4 screens",
      stock: DEFAULT_STOCK,
    },
    {
      id: "spotify",
      name: "Spotify Premium Account (1 Month)",
      price: 1,
      description: "Ad-free music, offline download",
      stock: DEFAULT_STOCK,
    },
    {
      id: "youtube",
      name: "YouTube Premium Account (1 Month)",
      price: 1,
      description: "Ad-free videos, background play",
      stock: DEFAULT_STOCK,
    },
    {
      id: "disney",
      name: "Disney+ Premium Account (1 Month)",
      price: 1,
      description: "HD streaming, all content",
      stock: DEFAULT_STOCK,
    },
  ],
  virtualCards: [
    {
      id: "vcc-basic",
      name: "Virtual Credit Card - Basic",
      price: 1,
      description: "Pre-loaded $10 balance",
      stock: VCC_STOCK,
    },
    {
      id: "vcc-standard",
      name: "Virtual Credit Card - Standard",
      price: 1,
      description: "Pre-loaded $25 balance",
      stock: VCC_STOCK,
    },
  ],
};

/**
 * Get all available products
 * @returns {Array} List of all products
 */
function getAllProducts() {
  return [
    ...products.premiumAccounts.map((p) => ({
      ...p,
      category: "Premium Account",
    })),
    ...products.virtualCards.map((p) => ({ ...p, category: "Virtual Card" })),
  ];
}

/**
 * Get product by ID
 * @param {string} productId
 * @returns {Object|null} Product object or null if not found
 */
function getProductById(productId) {
  // Search directly in the original arrays to enable stock modification
  const premiumProduct = products.premiumAccounts.find(
    (p) => p.id === productId
  );
  if (premiumProduct) return premiumProduct;

  const vccProduct = products.virtualCards.find((p) => p.id === productId);
  if (vccProduct) return vccProduct;

  return null;
}

/**
 * Format product list for display
 * @returns {string} Formatted product list
 */
function formatProductList() {
  const USD_TO_IDR = process.env.USD_TO_IDR_RATE || 15800;

  let message = "🛍️ *KATALOG PRODUK* 🛍️\n\n";

  message += "📺 *Akun Premium:*\n";
  products.premiumAccounts.forEach((product, index) => {
    const priceIDR = (product.price * USD_TO_IDR).toLocaleString("id-ID");
    message += `${index + 1}. ${product.name}\n`;
    message += `   💰 Harga: Rp ${priceIDR}\n`;
    message += `   📝 ${product.description}\n`;
    message += `   📦 Stok: ${product.stock} tersedia\n\n`;
  });

  message += "💳 *Kartu Kredit Virtual:*\n";
  products.virtualCards.forEach((product, index) => {
    const priceIDR = (product.price * USD_TO_IDR).toLocaleString("id-ID");
    message += `${index + 1}. ${product.name}\n`;
    message += `   💰 Harga: Rp ${priceIDR}\n`;
    message += `   📝 ${product.description}\n`;
    message += `   📦 Stok: ${product.stock} tersedia\n\n`;
  });

  return message;
}

/**
 * Decrement stock for a product
 */
function decrementStock(productId) {
  const product = getProductById(productId);
  if (product && product.stock > 0) {
    product.stock--;
    return true;
  }
  return false;
}

/**
 * Check if product is in stock
 */
function isInStock(productId) {
  const product = getProductById(productId);
  return product && product.stock > 0;
}

/**
 * Set stock for a product (Admin only)
 * @param {string} productId - Product ID
 * @param {number} quantity - New stock quantity
 * @returns {Object} Result with success status and message
 */
function setStock(productId, quantity) {
  const product = getProductById(productId);

  if (!product) {
    return {
      success: false,
      message: `❌ Produk tidak ditemukan: ${productId}`,
    };
  }

  const qty = parseInt(quantity);
  if (isNaN(qty) || qty < 0) {
    return {
      success: false,
      message: `❌ Jumlah tidak valid: ${quantity}`,
    };
  }

  const oldStock = product.stock;
  product.stock = qty;

  return {
    success: true,
    product: product,
    oldStock: oldStock,
    newStock: qty,
    message: `✅ Stok ${product.name} diupdate: ${oldStock} → ${qty}`,
  };
}

/**
 * Get all product IDs (for validation)
 * @returns {Array} List of all product IDs
 */
function getAllProductIds() {
  return [
    ...products.premiumAccounts.map((p) => p.id),
    ...products.virtualCards.map((p) => p.id),
  ];
}

/**
 * Add new product to catalog (Admin only)
 * @param {Object} productData - { id, name, price, description, stock, category }
 * @returns {Object} Result with success status and message
 */
function addProduct(productData) {
  const { id, name, price, description, stock, category } = productData;

  // Validation
  if (
    !id ||
    !name ||
    !price ||
    !description ||
    stock === undefined ||
    !category
  ) {
    return {
      success: false,
      message: "❌ Data produk tidak lengkap. Semua field wajib diisi.",
    };
  }

  // Check if product ID already exists
  if (getProductById(id)) {
    return {
      success: false,
      message: `❌ Produk dengan ID "${id}" sudah ada.`,
    };
  }

  // Validate price and stock
  const priceNum = parseFloat(price);
  const stockNum = parseInt(stock);

  if (isNaN(priceNum) || priceNum <= 0) {
    return {
      success: false,
      message: "❌ Harga tidak valid (harus angka > 0).",
    };
  }

  if (isNaN(stockNum) || stockNum < 0) {
    return {
      success: false,
      message: "❌ Stok tidak valid (harus angka >= 0).",
    };
  }

  const newProduct = {
    id: id.toLowerCase(),
    name,
    price: priceNum,
    description,
    stock: stockNum,
  };

  // Add to appropriate category
  if (
    category.toLowerCase() === "premium" ||
    category.toLowerCase() === "premium account"
  ) {
    products.premiumAccounts.push(newProduct);
  } else if (
    category.toLowerCase() === "vcc" ||
    category.toLowerCase() === "virtual card"
  ) {
    products.virtualCards.push(newProduct);
  } else {
    return {
      success: false,
      message: "❌ Kategori tidak valid. Gunakan: 'premium' atau 'vcc'.",
    };
  }

  return {
    success: true,
    product: newProduct,
    message: `✅ Produk "${name}" berhasil ditambahkan!`,
  };
}

/**
 * Remove product from catalog (Admin only)
 * @param {string} productId - Product ID to remove
 * @returns {Object} Result with success status and message
 */
function removeProduct(productId) {
  const product = getProductById(productId);

  if (!product) {
    return {
      success: false,
      message: `❌ Produk dengan ID "${productId}" tidak ditemukan.`,
    };
  }

  // Remove from premiumAccounts
  const premiumIndex = products.premiumAccounts.findIndex(
    (p) => p.id === productId
  );
  if (premiumIndex !== -1) {
    products.premiumAccounts.splice(premiumIndex, 1);
    return {
      success: true,
      product,
      message: `✅ Produk "${product.name}" berhasil dihapus!`,
    };
  }

  // Remove from virtualCards
  const vccIndex = products.virtualCards.findIndex((p) => p.id === productId);
  if (vccIndex !== -1) {
    products.virtualCards.splice(vccIndex, 1);
    return {
      success: true,
      product,
      message: `✅ Produk "${product.name}" berhasil dihapus!`,
    };
  }

  return {
    success: false,
    message: "❌ Gagal menghapus produk.",
  };
}

/**
 * Update product details (Admin only)
 * @param {string} productId - Product ID to update
 * @param {Object} updates - Fields to update (name, price, description)
 * @returns {Object} Result with success status and message
 */
function updateProduct(productId, updates) {
  const product = getProductById(productId);

  if (!product) {
    return {
      success: false,
      message: `❌ Produk dengan ID "${productId}" tidak ditemukan.`,
    };
  }

  const oldData = { ...product };

  // Update fields if provided
  if (updates.name) product.name = updates.name;
  if (updates.description) product.description = updates.description;

  if (updates.price !== undefined) {
    const priceNum = parseFloat(updates.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      return {
        success: false,
        message: "❌ Harga tidak valid (harus angka > 0).",
      };
    }
    product.price = priceNum;
  }

  return {
    success: true,
    product,
    oldData,
    message: `✅ Produk "${product.name}" berhasil diupdate!`,
  };
}

/**
 * Get system setting value
 * @param {string} key - Setting key
 * @returns {any} Setting value
 */
function getSetting(key) {
  return systemSettings[key];
}

/**
 * Update system setting
 * @param {string} key - Setting key
 * @param {any} value - New value
 * @returns {Object} Result with success status
 */
function updateSetting(key, value) {
  if (!(key in systemSettings)) {
    return {
      success: false,
      message: `❌ Setting "${key}" tidak ditemukan.`,
    };
  }

  const oldValue = systemSettings[key];

  // Type validation and conversion
  if (typeof oldValue === "number") {
    const numValue = parseInt(value);
    if (isNaN(numValue)) {
      return {
        success: false,
        message: `❌ Nilai harus berupa angka.`,
      };
    }
    systemSettings[key] = numValue;
  } else if (typeof oldValue === "boolean") {
    systemSettings[key] = value === "true" || value === true;
  } else {
    systemSettings[key] = value;
  }

  return {
    success: true,
    key,
    oldValue,
    newValue: systemSettings[key],
    message: `✅ Setting "${key}" berhasil diupdate.`,
  };
}

/**
 * Get all system settings
 * @returns {Object} All settings
 */
function getAllSettings() {
  return { ...systemSettings };
}

module.exports = {
  products,
  getAllProducts,
  getProductById,
  formatProductList,
  decrementStock,
  isInStock,
  setStock,
  getAllProductIds,
  addProduct,
  removeProduct,
  updateProduct,
  getSetting,
  updateSetting,
  getAllSettings,
};
