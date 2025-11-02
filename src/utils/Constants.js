/**
 * Constants and Enums
 * Shared constants across the application
 */

/**
 * Session steps enum
 */
const SessionSteps = {
  MENU: "menu",
  BROWSING: "browsing",
  CHECKOUT: "checkout",
  SELECT_PAYMENT: "select_payment",
  SELECT_BANK: "select_bank",
  AWAITING_PAYMENT: "awaiting_payment",
  AWAITING_ADMIN_APPROVAL: "awaiting_admin_approval",
  UPLOAD_PROOF: "upload_proof",
};

/**
 * Payment methods enum
 */
const PaymentMethods = {
  QRIS: "QRIS",
  DANA: "DANA",
  GOPAY: "GOPAY",
  OVO: "OVO",
  SHOPEEPAY: "SHOPEEPAY",
  BCA: "BCA",
  BNI: "BNI",
  BRI: "BRI",
  MANDIRI: "MANDIRI",
};

/**
 * Payment status enum
 */
const PaymentStatus = {
  PENDING: "pending",
  AWAITING_PROOF: "awaiting_proof",
  AWAITING_APPROVAL: "awaiting_admin_approval",
  PAID: "paid",
  EXPIRED: "expired",
  FAILED: "failed",
};

/**
 * Admin commands
 */
const AdminCommands = {
  APPROVE: "/approve",
  BROADCAST: "/broadcast",
  STATS: "/stats",
  STATUS: "/status",
  STOCK: "/stock",
  ADD_PRODUCT: "/addproduct",
  EDIT_PRODUCT: "/editproduct",
  REMOVE_PRODUCT: "/removeproduct",
  SETTINGS: "/settings",
};

/**
 * Global commands (accessible from any step)
 */
const GlobalCommands = {
  MENU: "menu",
  HELP: "help",
  CART: "cart",
  HISTORY: "history",
};

/**
 * Product categories
 */
const ProductCategories = {
  PREMIUM_ACCOUNTS: "premium_accounts",
  VIRTUAL_CARDS: "virtual_cards",
};

/**
 * Error messages
 */
const ErrorMessages = {
  RATE_LIMIT:
    "⚠️ Terlalu banyak pesan. Mohon tunggu sebentar sebelum mengirim lagi.",
  INVALID_INPUT: "❌ Input tidak valid. Silakan coba lagi.",
  SYSTEM_ERROR: "❌ Terjadi kesalahan sistem. Silakan hubungi admin.",
  PRODUCT_NOT_FOUND: "❌ Produk tidak ditemukan. Silakan cek daftar produk.",
  EMPTY_CART:
    "🛒 Keranjang Anda kosong.\n\nKetik *menu* untuk mulai berbelanja!",
  UNAUTHORIZED: "❌ Anda tidak memiliki akses untuk perintah ini.",
};

/**
 * Success messages
 */
const SuccessMessages = {
  PRODUCT_ADDED: "✅ Produk berhasil ditambahkan ke keranjang!",
  CART_CLEARED: "🗑️ Keranjang telah dikosongkan.",
  ORDER_PLACED: "✅ Pesanan berhasil dibuat!",
  PAYMENT_RECEIVED: "✅ Pembayaran diterima!",
};

/**
 * Rate limiting configuration
 */
const RateLimits = {
  MAX_MESSAGES_PER_MINUTE: 20,
  COOLDOWN_DURATION: 60000, // 1 minute in ms
  ERROR_COOLDOWN: 300000, // 5 minutes in ms
};

/**
 * Session configuration
 */
const SessionConfig = {
  DEFAULT_TTL: 1800, // 30 minutes in seconds
  CLEANUP_INTERVAL: 600000, // 10 minutes in ms
  MAX_CART_ITEMS: 50,
};

/**
 * Validation patterns
 */
const ValidationPatterns = {
  ORDER_ID: /^ORD-\d{13}$/,
  PHONE_NUMBER: /^\d{10,15}$/,
  AMOUNT: /^\d+$/,
};

module.exports = {
  SessionSteps,
  PaymentMethods,
  PaymentStatus,
  AdminCommands,
  GlobalCommands,
  ProductCategories,
  ErrorMessages,
  SuccessMessages,
  RateLimits,
  SessionConfig,
  ValidationPatterns,
};
