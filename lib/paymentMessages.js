/**
 * Payment Message Templates
 * Centralized payment-related messages
 */

class PaymentMessages {
  /**
   * QRIS payment message
   */
  static qrisPayment(orderId, totalIDR) {
    let message = "✅ *QRIS PAYMENT*\n\n";
    message += `📋 Order ID: ${orderId}\n`;
    message += `💵 Total: Rp ${totalIDR.toLocaleString("id-ID")}\n\n`;
    message += "━━━━━━━━━━━━━━━━━━\n\n";
    message += "📸 QR Code akan dikirim\n";
    message += "✅ Scan dengan e-wallet / bank apapun\n";
    message += "(DANA, OVO, GoPay, ShopeePay, BCA, dll)\n\n";
    message += "⏱️ QR Code berlaku 24 jam\n";
    message += "🔍 Ketik *cek* untuk cek status pembayaran\n\n";
    message += "💡 Pastikan nominal sesuai!";
    return message;
  }

  /**
   * E-Wallet payment message
   */
  static ewalletPayment(walletType, orderId, totalIDR, redirectUrl) {
    return `✅ *${walletType.toUpperCase()} PAYMENT*\n\n📋 Order ID: ${orderId}\n💵 Total: Rp ${totalIDR.toLocaleString(
      "id-ID"
    )}\n\n━━━━━━━━━━━━━━━━━━\n\n📱 Klik link ini untuk bayar:\n${redirectUrl}\n\n⏱️ Link berlaku 24 jam\n🔍 Ketik *cek* untuk cek status`;
  }

  /**
   * Virtual Account payment message
   */
  static virtualAccount(bankName, vaNumber, orderId, totalIDR) {
    let message = `✅ *VIRTUAL ACCOUNT ${bankName}*\n\n`;
    message += `📋 Order ID: ${orderId}\n`;
    message += `💵 Total: Rp ${totalIDR.toLocaleString("id-ID")}\n\n`;
    message += "━━━━━━━━━━━━━━━━━━\n\n";
    message += `🏦 Bank: ${bankName}\n`;
    message += `💳 Nomor VA: ${vaNumber}\n\n`;
    message += "━━━━━━━━━━━━━━━━━━\n\n";
    message += "📱 Cara Bayar:\n";
    message += "1. Buka mobile/internet banking\n";
    message += `2. Pilih Transfer ke ${bankName}\n`;
    message += `3. Input nomor VA: ${vaNumber}\n`;
    message += `4. Input jumlah: Rp ${totalIDR.toLocaleString("id-ID")}\n`;
    message += "5. Konfirmasi pembayaran\n\n";
    message += "⏱️ VA berlaku 24 jam\n";
    message += "🔍 Ketik *cek* untuk cek status\n\n";
    message += "💡 Pastikan nominal sesuai!";
    return message;
  }

  /**
   * Bank selection menu
   */
  static bankSelection(orderId, totalIDR) {
    let message = "🏦 *PILIH BANK TRANSFER*\n\n";
    message += `📋 Order ID: ${orderId}\n`;
    message += `💵 Total: Rp ${totalIDR.toLocaleString("id-ID")}\n\n`;
    message += "━━━━━━━━━━━━━━━━━━\n\n";
    message += "Pilih bank untuk Virtual Account:\n\n";
    message += "1️⃣ BCA\n";
    message += "2️⃣ BNI\n";
    message += "3️⃣ BRI\n";
    message += "4️⃣ Mandiri\n";
    message += "5️⃣ Permata\n\n";
    message += "━━━━━━━━━━━━━━━━━━\n\n";
    message += "Ketik nomor pilihan (1-5)";
    return message;
  }

  /**
   * Payment method selection menu
   */
  static paymentMethodSelection(orderId) {
    let message = "✅ *PESANAN DIKONFIRMASI!*\n\n";
    message += `📋 Order ID: ${orderId}\n\n`;
    message += "━━━━━━━━━━━━━━━━━━\n\n";
    message += "💳 *PILIH METODE PEMBAYARAN*\n\n";
    message += "1️⃣ *QRIS* - Universal QR (semua e-wallet & bank)\n";
    message += "2️⃣ *DANA* - E-Wallet DANA\n";
    message += "3️⃣ *GoPay* - E-Wallet GoPay\n";
    message += "4️⃣ *ShopeePay* - E-Wallet ShopeePay\n";
    message += "5️⃣ *Transfer Bank* - Virtual Account\n\n";
    message += "━━━━━━━━━━━━━━━━━━\n\n";
    message += "Ketik nomor pilihan (1-5) untuk lanjut pembayaran";
    return message;
  }

  /**
   * Payment success message
   */
  static paymentSuccess(orderId, paymentMethod, deliveryMessage) {
    let message = "✅ *PEMBAYARAN BERHASIL!*\n\n";
    message += `📋 Order ID: ${orderId}\n`;
    message += `💳 Metode: ${paymentMethod}\n\n`;
    message += "━━━━━━━━━━━━━━━━━━\n\n";
    message += "🎁 *Produk Anda:*\n\n";
    message += deliveryMessage + "\n\n";
    message += "━━━━━━━━━━━━━━━━━━\n\n";
    message += "Terima kasih sudah berbelanja! 🎉\n\n";
    message += "Ketik *menu* untuk belanja lagi.";
    return message;
  }

  /**
   * Payment status messages
   */
  static paymentPending() {
    return (
      "⏱️ *Status Pembayaran: PENDING*\n\n" +
      "Silakan selesaikan pembayaran Anda.\n\n" +
      "Ketik *cek* untuk cek status kembali."
    );
  }

  static paymentExpired() {
    return "❌ *PEMBAYARAN EXPIRED*\n\nSilakan mulai order baru. Ketik *menu*.";
  }

  static paymentFailed() {
    return "❌ *PEMBAYARAN GAGAL*\n\nSilakan mulai order baru. Ketik *menu*.";
  }

  static awaitingPayment() {
    return (
      "⏱️ Menunggu pembayaran...\n\n" +
      "✅ Selesaikan pembayaran Anda\n" +
      "🔍 Ketik *cek* untuk cek status pembayaran\n" +
      "📋 Ketik *menu* untuk kembali"
    );
  }

  /**
   * Error messages
   */
  static paymentError(errorMessage) {
    return `❌ Gagal membuat pembayaran.\n\nError: ${errorMessage}\n\nSilakan coba lagi atau ketik *menu*.`;
  }

  static invalidBankChoice() {
    return "❌ Pilihan tidak valid. Ketik nomor 1-4.";
  }

  static noActiveInvoice() {
    return "❌ Tidak ada invoice aktif.\n\nKetik *menu* untuk mulai belanja.";
  }

  static checkStatusError() {
    return "❌ Gagal mengecek status pembayaran.\n\nSilakan coba lagi.";
  }

  /**
   * Manual E-Wallet payment instructions
   */
  static manualEWalletInstructions(
    walletType,
    accountNumber,
    accountName,
    totalIDR,
    orderId
  ) {
    let message = `✅ *TRANSFER ${walletType.toUpperCase()}*\n\n`;
    message += `📋 Order ID: ${orderId}\n`;
    message += `💵 Total: Rp ${totalIDR.toLocaleString("id-ID")}\n\n`;
    message += "━━━━━━━━━━━━━━━━━━\n\n";
    message += `📱 Transfer ke nomor ${walletType}:\n`;
    message += `💳 ${accountNumber}\n`;
    message += `👤 a.n. ${accountName}\n\n`;
    message += "━━━━━━━━━━━━━━━━━━\n\n";
    message += "📝 *Langkah-langkah:*\n";
    message += `1. Buka aplikasi ${walletType}\n`;
    message += "2. Pilih menu Transfer\n";
    message += `3. Input nomor: ${accountNumber}\n`;
    message += `4. Input jumlah: Rp ${totalIDR.toLocaleString("id-ID")}\n`;
    message += "5. Selesaikan transfer\n\n";
    message += "⚠️ *PENTING:*\n";
    message += `• Transfer TEPAT: Rp ${totalIDR.toLocaleString("id-ID")}\n`;
    message += "• Screenshot bukti transfer\n";
    message += `• Catat Order ID: ${orderId}\n\n`;
    message += "━━━━━━━━━━━━━━━━━━\n\n";
    message += "📸 Setelah transfer, kirim screenshot bukti + Order ID\n\n";
    message += "⏱️ Admin akan verifikasi dalam 5-15 menit\n";
    message += "✅ Produk otomatis dikirim setelah diverifikasi\n\n";
    message += "💡 Butuh bantuan? Ketik *support*";
    return message;
  }

  /**
   * Manual Bank Transfer instructions
   */
  static manualBankTransferInstructions(
    bankCode,
    accountNumber,
    accountName,
    totalIDR,
    orderId
  ) {
    let message = `✅ *TRANSFER BANK ${bankCode}*\n\n`;
    message += `📋 Order ID: ${orderId}\n`;
    message += `💵 Total: Rp ${totalIDR.toLocaleString("id-ID")}\n\n`;
    message += "━━━━━━━━━━━━━━━━━━\n\n";
    message += `🏦 Transfer ke rekening ${bankCode}:\n`;
    message += `💳 ${accountNumber}\n`;
    message += `👤 a.n. ${accountName}\n\n`;
    message += "━━━━━━━━━━━━━━━━━━\n\n";
    message += "📝 *Cara Transfer:*\n\n";
    message += "📱 *Via Mobile Banking:*\n";
    message += "1. Buka aplikasi m-banking\n";
    message += "2. Pilih Transfer > Antar Bank / Dalam Bank\n";
    message += `3. Pilih Bank: ${bankCode}\n`;
    message += `4. Input rekening: ${accountNumber}\n`;
    message += `5. Input jumlah: Rp ${totalIDR.toLocaleString("id-ID")}\n`;
    message += "6. Konfirmasi transfer\n\n";
    message += "🏧 *Via ATM:*\n";
    message += "1. Masukkan kartu ATM\n";
    message += "2. Pilih Transfer\n";
    message += `3. Pilih ke Bank ${bankCode}\n`;
    message += `4. Input rekening: ${accountNumber}\n`;
    message += `5. Input jumlah: Rp ${totalIDR.toLocaleString("id-ID")}\n`;
    message += "6. Konfirmasi\n\n";
    message += "⚠️ *PENTING:*\n";
    message += `• Transfer TEPAT: Rp ${totalIDR.toLocaleString("id-ID")}\n`;
    message += "• Screenshot / foto bukti transfer\n";
    message += `• Catat Order ID: ${orderId}\n\n`;
    message += "━━━━━━━━━━━━━━━━━━\n\n";
    message += "📸 Setelah transfer, kirim bukti + Order ID\n\n";
    message += "⏱️ Admin akan verifikasi dalam 5-15 menit\n";
    message += "✅ Produk otomatis dikirim setelah diverifikasi\n\n";
    message += "💡 Butuh bantuan? Ketik *support*";
    return message;
  }
}

module.exports = PaymentMessages;
