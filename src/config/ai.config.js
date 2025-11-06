/**
 * AI Configuration
 * Settings for Gemini 2.5 Flash Lite integration
 */

const AI_CONFIG = {
  // Model Settings
  model: {
    provider: "google",
    name: "gemini-2.0-flash-exp", // Ultra-fast, very cheap
    temperature: 0.3, // Low for consistent responses
    maxTokens: 500, // Limit to control costs
    topP: 0.95,
  },

  // Feature Flags
  features: {
    enabled: process.env.AI_ENABLE === "true",
    typoCorrection: true,
    productQA: true,
    recommendations: true,
    adminDescriptionGenerator: true,
    fallbackHandler: true, // NEW: AI fallback for unrecognized messages
  },

  // Rate Limiting
  rateLimit: {
    maxCallsPerHour: 5, // Per customer
    maxCallsPerDay: 20, // Per customer
    adminMaxCallsPerDay: 50, // Higher limit for admin
  },

  // Cost Tracking
  costTracking: {
    enabled: true,
    alertThreshold: 5.0, // Alert if daily cost > $5
    monthlyBudget: 50.0, // $50/month
  },

  // System Prompts
  prompts: {
    customer: {
      system: `Kamu adalah asisten AI untuk toko online premium accounts dan virtual cards.
      
KONTEKS:
- Toko menjual: Netflix, Spotify, YouTube Premium, Disney+, dan Virtual Credit Cards
- Harga semua produk: $1 (sangat terjangkau)
- Bahasa: Gunakan Bahasa Indonesia casual dan ramah
- Emoji: Gunakan emoji yang relevan untuk membuat percakapan lebih friendly

TUGAS KAMU:
1. Koreksi typo customer dan bantu mereka menemukan produk yang tepat
2. Jawab pertanyaan tentang produk dengan jelas dan detail
3. Berikan rekomendasi produk berdasarkan preferensi dan cart mereka

RULES:
- Selalu ramah dan helpful
- Jangan buat-buat informasi - gunakan data produk yang ada
- Jika tidak yakin, arahkan customer ke admin
- Gunakan tool yang tersedia untuk akses informasi produk
- Jawaban maksimal 3-4 kalimat (ringkas dan jelas)`,

      typoCorrection: `Customer mengetik typo. Tugas kamu:
1. Pahami maksud customer (misal: "netflx" → "netflix")
2. Cari produk yang sesuai menggunakan tool searchProducts
3. Konfirmasi dengan ramah: "Maksud kamu [PRODUK] ya? Ini detailnya: [INFO]"`,

      productQA: `Customer bertanya tentang produk. Tugas kamu:
1. Gunakan tool getProductInfo untuk ambil detail produk
2. Jawab pertanyaan dengan jelas dan detail
3. Tambahkan nilai jual (contoh: "Akun Netflix shared, bisa 4 orang nonton bareng!")
4. Akhiri dengan CTA soft: "Mau saya tambahkan ke cart?"`,

      recommendations: `Customer minta rekomendasi. Tugas kamu:
1. Lihat context: cart, history, kategori favorit
2. Gunakan tool recommendProducts
3. Berikan 2-3 rekomendasi dengan alasan singkat
4. Contoh: "Karena kamu suka streaming, coba Disney+ juga! Ada Marvel dan Star Wars 🎬"`,
    },

    admin: {
      descriptionGenerator: `Kamu adalah copywriter profesional untuk toko online.

TUGAS: Buat deskripsi produk yang menarik dan persuasif.

FORMAT OUTPUT (JSON):
{
  "title": "Judul menarik (max 60 karakter)",
  "description": "Deskripsi detail dengan bullet points (3-5 poin)",
  "features": ["Fitur 1", "Fitur 2", "Fitur 3"],
  "cta": "Call to action yang kuat"
}

GUIDELINES:
- Fokus pada benefit, bukan hanya fitur
- Gunakan power words: "Premium", "Unlimited", "Eksklusif"
- Tambahkan social proof: "Sudah 1000+ customer puas"
- Urgency: "Stok terbatas" atau "Harga spesial"
- Emoji relevan untuk visual appeal

CONTOH PRODUK:
- Premium accounts: Netflix, Spotify, YouTube Premium, Disney+
- Virtual Cards: BCA VCC, Mandiri VCC
- Semua harga: $1 (highlight value for money)`,
    },
  },

  // Tool Definitions
  tools: {
    searchProducts: {
      name: "searchProducts",
      description:
        "Search for products by name or category with fuzzy matching",
      enabled: true,
    },
    getProductInfo: {
      name: "getProductInfo",
      description: "Get detailed information about a specific product",
      enabled: true,
    },
    recommendProducts: {
      name: "recommendProducts",
      description:
        "Generate personalized product recommendations based on customer context",
      enabled: true,
    },
    generateDescription: {
      name: "generateDescription",
      description: "Generate compelling product description for admin",
      enabled: true,
    },
  },

  // Error Messages
  errorMessages: {
    rateLimitExceeded:
      "⚠️ Kamu sudah menggunakan AI terlalu banyak hari ini. Silakan coba lagi nanti atau hubungi admin.",
    apiError:
      "🔧 Sistem AI sedang sibuk. Silakan coba lagi dalam beberapa saat.",
    noResults:
      "😕 Maaf, saya tidak menemukan produk yang kamu cari. Coba kata kunci lain atau ketik *menu* untuk lihat semua produk.",
    disabled: "⚠️ Fitur AI sedang dalam maintenance.",
  },

  // Fallback Triggers (when to use AI)
  fallbackTriggers: {
    // Trigger AI when FuzzySearch confidence is low
    fuzzySearchThreshold: 0.6,

    // Question words that trigger AI Q&A
    questionWords: [
      "apa",
      "bagaimana",
      "berapa",
      "kapan",
      "dimana",
      "kenapa",
      "siapa",
      "mana",
      "gimana",
      "bisa",
      "boleh",
    ],

    // Keywords that trigger recommendations
    recommendationKeywords: [
      "rekomendasi",
      "rekomen",
      "saran",
      "usul",
      "recommend",
    ],

    // Minimum message length to consider AI (avoid short typos like "hi")
    minMessageLength: 3,
  },

  // Caching (reduce API calls and cost)
  cache: {
    enabled: true,
    ttl: 3600, // 1 hour in seconds
    keyPrefix: "ai:cache:",
  },
};

module.exports = AI_CONFIG;
