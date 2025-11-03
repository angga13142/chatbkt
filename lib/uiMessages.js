/**
 * UI Messages & Templates
 * Centralized user interface messages
 */

const config = require("../src/config/app.config");

class UIMessages {
  /**
   * Main menu
   */
  static mainMenu() {
    const shopName = config.shop.name;
    return `👋 *Selamat datang di ${shopName}!*

Saya asisten belanja Anda, siap membantu! 🛒

*Apa yang ingin Anda lakukan?*

1️⃣ 🛍️ Jelajahi Produk (Realtime Stock)
2️⃣ 🛒 Lihat Keranjang
3️⃣ ℹ️ Tentang Kami
4️⃣ 📞 Hubungi Dukungan

Ketik nomor atau kata kunci untuk melanjutkan.

━━━━━━━━━━━━━━━━━━
📖 *SEMUA PERINTAH CUSTOMER*

🏠 *Navigasi:*
• *menu* / *help* - Menu utama
• *browse* / *products* - Jelajahi produk
• *about* - Tentang toko
• *support* / *contact* - Hubungi kami

🛒 *Belanja:*
• *cart* - Lihat keranjang
• *checkout* / *buy* / *order* - Lanjut pembayaran
• *clear* - Kosongkan keranjang
• *promo <KODE>* - Gunakan kode promo

⭐ *Wishlist:*
• *wishlist* - Lihat produk favorit
• *simpan <produk>* / *⭐ <produk>* - Tambah favorit
• *hapus <produk>* - Hapus dari favorit

📦 *Tracking:*
• *history* - Riwayat pesanan lengkap
• *track* / */track <id>* - Lacak status pesanan
• *review <id> <rating> <teks>* - Beri review produk

💳 *Pembayaran:* (saat checkout)
• *qris* / *transfer* / *ovo* / *dana*
• *gopay* / *shopeepay* - Pilih metode
• *batal* - Batalkan pesanan

━━━━━━━━━━━━━━━━━━
💡 Tips:
• Ketik nama produk saat browsing untuk order
• Prefix / opsional (history = /history)
• Gunakan *help* kapan saja untuk menu ini

✨ *Fitur:*
• Stock realtime dari database
• 6 metode pembayaran (QRIS, e-wallet, bank)
• Promo code support dengan diskon
• Review & rating produk`;
  }

  /**
   * Product added to cart
   */
  static productAdded(productName, priceIDR) {
    return `✅ *BERHASIL DITAMBAHKAN!*

📦 ${productName}
💰 Rp ${priceIDR.toLocaleString("id-ID")}

━━━━━━━━━━━━━━━━━━

*Lanjut apa?*
• Tambah produk lain → Ketik nama produk
• *cart* → Lihat keranjang & checkout
• *simpan <produk>* → Tambah ke wishlist
• *menu* → Kembali ke menu utama

💡 Stock akan di-hold sampai checkout selesai`;
  }

  /**
   * Product browsing instructions
   */
  static browsingInstructions(productList) {
    let message = productList;
    message += "\n━━━━━━━━━━━━━━━━━━\n\n";
    message += "*Cara Memesan:*\n";
    message += "Ketik nama produk untuk tambahkan ke keranjang\n";
    message += 'Contoh: "netflix" atau "spotify"\n\n';
    message += "*Perintah Lainnya:*\n";
    message += "• 🛒 *cart* - Lihat keranjang\n";
    message += "• ⭐ *simpan <produk>* - Tambah ke wishlist\n";
    message += "• 🏠 *menu* - Kembali ke menu\n\n";
    message += "💡 *Tips:*\n";
    message += "• Stock ditampilkan realtime dari database\n";
    message += "• Produk stok habis tidak bisa dipesan\n";
    message += "• Gunakan fuzzy search jika typo (auto-correct)";
    return message;
  }

  /**
   * Cart view
   */
  /**
   * Order list view (for /track command)
   */
  static orderList(orders) {
    if (!orders || orders.length === 0) {
      return `📦 *Riwayat Pesanan Anda*

Anda belum memiliki pesanan yang tercatat.

Ketik *menu* untuk mulai berbelanja!`;
    }

    let message = "📦 *Riwayat Pesanan Anda*\n\n";

    orders.forEach((order, index) => {
      message += `${index + 1}. ${order.status}\n`;
      message += `   🔖 ID: ${order.orderId}\n`;
      message += `   📅 ${order.date}\n`;
      message += `   💰 Rp ${order.totalIDR.toLocaleString("id-ID")}\n`;
      message += `   📦 ${order.items.length} item(s)\n`;
      message += `   💳 ${order.paymentMethod}\n\n`;
    });

    message += "━━━━━━━━━━━━━━━━━━\n";
    message += `📊 Total: ${orders.length} pesanan\n\n`;
    message += "💡 *Filter berdasarkan status:*\n";
    message += "• Ketik */track pending* - Pesanan pending\n";
    message += "• Ketik */track completed* - Pesanan selesai\n\n";
    message += "Ketik *menu* untuk kembali ke menu utama";

    return message;
  }

  static cartView(cart, total) {
    let message = "🛒 *KERANJANG BELANJA ANDA*\n\n";

    cart.forEach((item, index) => {
      message += `${index + 1}. 📦 ${item.name}\n`;
      message += `   💰 Rp ${item.price.toLocaleString("id-ID")}\n\n`;
    });

    const totalIDR = total;
    message += "━━━━━━━━━━━━━━━━━━\n";
    message += `💵 *Total: Rp ${totalIDR.toLocaleString("id-ID")}*\n\n`;
    message += "━━━━━━━━━━━━━━━━━━\n\n";
    message += "*Siap checkout?*\n";
    message += "• Ketik *checkout* untuk lanjut pembayaran\n";
    message += "• Ketik *promo KODE* untuk pakai kode promo\n";
    message += "• Ketik *clear* untuk kosongkan keranjang\n";
    message += "• Ketik *menu* untuk menu utama\n\n";
    message += "💡 Punya kode promo? Gunakan sebelum checkout!";

    return message;
  }

  /**
   * Order summary
   */
  static orderSummary(
    orderId,
    cart,
    totalIDR,
    promoCode = null,
    discountAmount = 0
  ) {
    let message = "✅ *PESANAN DIKONFIRMASI!*\n\n";
    message += `📋 Order ID: ${orderId}\n\n`;
    message += "*Ringkasan Pesanan:*\n";

    cart.forEach((item, index) => {
      const priceIDR = item.price;
      message += `${index + 1}. ${item.name} - Rp ${priceIDR.toLocaleString(
        "id-ID"
      )}\n`;
    });

    message += `\n━━━━━━━━━━━━━━━━━━\n`;

    if (promoCode && discountAmount > 0) {
      const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
      message += `💵 Subtotal: Rp ${subtotal.toLocaleString("id-ID")}\n`;
      message += `🎟️ Promo (${promoCode}): -Rp ${discountAmount.toLocaleString(
        "id-ID"
      )}\n`;
      message += `━━━━━━━━━━━━━━━━━━\n`;
    }

    message += `💳 *Total: Rp ${totalIDR.toLocaleString("id-ID")}*\n\n`;

    return message;
  }

  /**
   * About page
   */
  static about() {
    const shopName = config.shop.name;
    return `ℹ️ *TENTANG KAMI*

Selamat datang di ${shopName}! 🎉

*Kami Spesialis Dalam:*
📺 Akun streaming premium (Netflix, Spotify, etc)
💳 Kartu kredit virtual (VCC)
⚡ Pengiriman otomatis & cepat (5-15 menit)
💯 Kualitas terjamin 100%
💰 Harga terjangkau (mulai Rp 15.800/item)

*Keunggulan Kami:*
✅ Stock realtime dari database
✅ 6 metode pembayaran (QRIS, E-wallet, Bank)
✅ Auto-delivery setelah pembayaran verified
✅ Support promo code & discount
✅ Review & rating system
✅ Order tracking realtime

*Sistem Pembayaran:*
• QRIS Universal (semua e-wallet & bank)
• E-Wallet: DANA, GoPay, OVO, ShopeePay
• Transfer Bank: BCA, BNI, BRI, Mandiri

Kami berkomitmen memberikan layanan terbaik! 🎯

Ketik *menu* untuk kembali ke menu utama`;
  }

  /**
   * Contact page
   */
  static contact() {
    const supportEmail = config.shop.supportEmail;
    const supportWhatsapp = config.shop.supportWhatsapp;
    const workingHours = config.shop.workingHours;
    return `📞 *HUBUNGI DUKUNGAN*

Butuh bantuan? Kami siap membantu! 💬

⏰ Jam Kerja: ${workingHours}
📱 WhatsApp: ${supportWhatsapp}
📧 Email: ${supportEmail}

Tim kami merespons dalam hitungan menit!

Ketik *menu* untuk kembali ke menu utama`;
  }

  /**
   * Error messages
   */
  static invalidOption() {
    return `❌ *Pilihan Tidak Valid*

*Menu Utama:*
1️⃣ Jelajahi Produk (realtime stock)
2️⃣ Lihat Keranjang
3️⃣ Tentang Kami
4️⃣ Hubungi Dukungan

*Perintah Cepat:*
• *menu* - Menu utama
• *cart* - Lihat keranjang
• *wishlist* - Lihat favorit
• *history* - Riwayat pesanan
• */track* - Lacak pesanan
• *help* - Bantuan

Ketik *help* untuk info lengkap.`;
  }

  static productNotFound(input = "") {
    return `❌ *Produk Tidak Ditemukan!*

${input ? `Pencarian: "${input}"\n\n` : ""}🔍 *Saran:*
• Cek ejaan nama produk
• Sistem sudah coba auto-correct dengan fuzzy search
• Ketik *browse* untuk lihat daftar lengkap
• Ketik *menu* untuk kembali ke menu utama

💡 *Contoh Produk:*
netflix, spotify, youtube, disney, vcc mastercard

Ketik *help* jika butuh bantuan.`;
  }

  static emptyCart() {
    return `🛒 *Keranjang Anda Kosong*

Belum ada produk di keranjang.

🛍️ *browse* - Jelajahi produk (realtime stock)
⭐ */wishlist* - Lihat wishlist Anda
🏠 *menu* - Kembali ke menu utama

💡 Semua produk dijamin original & auto-delivery!`;
  }

  static cartCleared() {
    return "🗑️ Keranjang dikosongkan!\n\nKetik *menu* untuk lanjut belanja.";
  }

  static checkoutPrompt() {
    return `💳 *Siap Checkout?*

• *checkout* - Lanjut ke pembayaran
• *promo KODE* - Gunakan kode promo
• *clear* - Kosongkan keranjang
• *menu* - Menu utama

🎁 Punya kode promo? Gunakan sebelum checkout!`;
  }

  /**
   * Admin messages
   */
  static unauthorized() {
    return `❌ *Akses Ditolak*

Anda tidak memiliki izin untuk perintah admin.

Ketik *help* untuk perintah customer atau *menu* untuk menu utama.`;
  }

  static adminApprovalFormat() {
    return "❌ Format: /approve <order_id>\n\nContoh: /approve ORD-1730000000000-1234";
  }

  static orderNotFound(orderId) {
    return `❌ Order ID ${orderId} tidak ditemukan.\n\nPastikan order ID benar.`;
  }

  static orderNotPending(orderId) {
    return `❌ Order ${orderId} tidak dalam status menunggu approval.`;
  }

  static deliveryFailed(orderId) {
    return `❌ Gagal mengirim produk untuk order ${orderId}.\n\nTidak ada produk yang tersedia di database.`;
  }

  static approvalSuccess(orderId) {
    return `✅ *APPROVED!*\n\nOrder ${orderId} telah disetujui.\nProduk akan dikirim ke customer.`;
  }

  /**
   * Waiting messages
   */
  static awaitingAdminApproval() {
    return "⏱️ Menunggu verifikasi admin...\n\nPembayaran Anda sedang diverifikasi.\nMohon tunggu 5-15 menit.";
  }

  /**
   * Wishlist view
   * @param {Array} wishlist - Array of wishlist items
   * @returns {string} Formatted wishlist message
   */
  static wishlistView(wishlist) {
    if (!wishlist || wishlist.length === 0) {
      return (
        "⭐ *Wishlist Anda*\n\n" +
        "Wishlist Anda masih kosong.\n\n" +
        "━━━━━━━━━━━━━━━━━━\n" +
        "*Cara Menambahkan:*\n" +
        "• Ketik: *simpan <nama produk>*\n" +
        "• Atau: *⭐ <nama produk>*\n\n" +
        "Contoh:\n" +
        "• simpan netflix\n" +
        "• ⭐ spotify\n\n" +
        "━━━━━━━━━━━━━━━━━━\n" +
        "💬 Ketik *browse* untuk melihat produk"
      );
    }

    let message = "⭐ *Wishlist Anda*\n\n";

    wishlist.forEach((item, index) => {
      const priceIDR = item.price * config.exchangeRate;
      const addedDate = new Date(item.addedAt).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      message += `${index + 1}. 📦 *${item.name}*\n`;
      message += `   💰 Rp ${priceIDR.toLocaleString("id-ID")}\n`;
      message += `   📅 Ditambahkan: ${addedDate}\n`;
      if (item.description) {
        message += `   📝 ${item.description}\n`;
      }
      message += `   🔖 ID: ${item.id}\n\n`;
    });

    message += "━━━━━━━━━━━━━━━━━━\n";
    message += `📊 Total: ${wishlist.length} produk\n\n`;
    message += "*Perintah:*\n";
    message += `• Ketik nama produk untuk tambah ke keranjang\n`;
    message += `• Ketik *hapus <nama produk>* untuk hapus dari wishlist\n`;
    message += `• Ketik *cart* untuk lihat keranjang\n`;
    message += `• Ketik *menu* untuk kembali ke menu utama`;

    return message;
  }
}

module.exports = UIMessages;
