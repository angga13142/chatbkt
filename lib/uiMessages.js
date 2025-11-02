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

1️⃣ Jelajahi Produk
2️⃣ Lihat Keranjang
3️⃣ Tentang Kami
4️⃣ Hubungi Dukungan

Ketik nomor atau kata kunci untuk melanjutkan.

💡 *Perintah Cepat:*
• Ketik *menu* - Kembali ke menu utama
• Ketik *cart* - Lihat keranjang Anda
• Ketik *history* - Lihat riwayat pesanan
• Ketik *help* - Tampilkan menu ini`;
  }

  /**
   * Product added to cart
   */
  static productAdded(productName, priceIDR) {
    return `✅ *Ditambahkan ke keranjang!*

📦 ${productName}
💰 Rp ${priceIDR.toLocaleString("id-ID")}

*Selanjutnya apa?*
• Tambah produk lain (ketik nama produk)
• Ketik *cart* untuk lihat keranjang dan checkout
• Ketik *menu* untuk menu utama`;
  }

  /**
   * Product browsing instructions
   */
  static browsingInstructions(productList) {
    let message = productList;
    message += "\n━━━━━━━━━━━━━━━━━━\n\n";
    message += "*Cara memesan:*\n";
    message += "Ketik nama produk atau ID untuk menambahkan ke keranjang\n";
    message += 'Contoh: "netflix" atau "spotify"\n\n';
    message += "📦 Ketik *cart* untuk melihat keranjang\n";
    message += "🏠 Ketik *menu* untuk kembali ke menu utama";
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
    let message = "🛒 *YOUR CART*\n\n";

    cart.forEach((item, index) => {
      message += `${index + 1}. ${item.name}\n`;
      message += `   💰 Rp ${item.price.toLocaleString("id-ID")}\n\n`;
    });

    const totalIDR = total;
    message += "━━━━━━━━━━━━━━━━━━\n";
    message += `💵 *Total: Rp ${totalIDR.toLocaleString("id-ID")}*\n\n`;
    message += "*Siap checkout?*\n";
    message += "• Ketik *checkout* untuk selesaikan pesanan\n";
    message += "• Ketik *promo KODE* untuk gunakan kode promo\n";
    message += "• Ketik *clear* untuk kosongkan keranjang\n";
    message += "• Ketik *menu* untuk menu utama";

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

Kami spesialis dalam:
📺 Akun streaming premium
💳 Kartu kredit virtual
⚡ Pengiriman cepat (5-15 menit)
💯 Kualitas terjamin
💰 Harga terjangkau (mulai Rp 15.800/item)

Kami berkomitmen memberikan layanan terbaik untuk pelanggan!

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
    return "❌ Pilihan tidak valid. Silakan ketik nomor (1-4) atau kata kunci.";
  }

  static productNotFound() {
    return "❌ Produk tidak ditemukan. Silakan cek daftar produk dan coba lagi.\n\nKetik *menu* untuk lihat semua produk.";
  }

  static emptyCart() {
    return "🛒 *Keranjang Anda kosong*\n\nJelajahi produk kami dan tambahkan item ke keranjang!\n\nKetik *menu* untuk lihat menu utama";
  }

  static cartCleared() {
    return "🗑️ Keranjang dikosongkan!\n\nKetik *menu* untuk lanjut belanja.";
  }

  static checkoutPrompt() {
    return "Silakan ketik *checkout* untuk selesaikan pesanan atau *clear* untuk kosongkan keranjang.\n\nKetik *menu* untuk menu utama.";
  }

  /**
   * Admin messages
   */
  static unauthorized() {
    return "❌ Tidak diizinkan. Perintah khusus admin.";
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
