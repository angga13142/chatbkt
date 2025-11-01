/**
 * Chatbot Logic
 * Handles message processing and response generation
 */

const {
  formatProductList,
  getProductById,
  getAllProducts,
} = require("./config");
const QRISService = require("./qrisService");
const XenditService = require("./xenditService");

class ChatbotLogic {
  constructor(sessionManager) {
    this.sessionManager = sessionManager;
    this.qrisService = new QRISService();
    this.xenditService = XenditService;
  }

  /**
   * Process incoming message and generate response
   * @param {string} customerId
   * @param {string} message
   * @returns {Promise<string|Object>} Response message
   */
  async processMessage(customerId, message) {
    const step = this.sessionManager.getStep(customerId);
    const normalizedMessage = message.toLowerCase().trim();

    // Handle admin commands (check if user is admin)
    if (normalizedMessage.startsWith("/approve ")) {
      return await this.handleAdminApprove(customerId, normalizedMessage);
    }

    // Handle main menu commands from any step
    if (normalizedMessage === "menu" || normalizedMessage === "help") {
      this.sessionManager.setStep(customerId, "menu");
      return this.getMainMenu();
    }

    if (normalizedMessage === "cart") {
      return this.showCart(customerId);
    }

    // Process based on current step
    switch (step) {
      case "menu":
        return this.handleMenuSelection(customerId, normalizedMessage);

      case "browsing":
        return this.handleProductSelection(customerId, normalizedMessage);

      case "checkout":
        return await this.handleCheckout(customerId, normalizedMessage);

      case "select_payment":
        return await this.handlePaymentSelection(customerId, normalizedMessage);

      case "select_bank":
        return await this.handleBankSelection(customerId, normalizedMessage);

      case "awaiting_payment":
        return await this.handleAwaitingPayment(customerId, normalizedMessage);

      case "awaiting_admin_approval":
        return "⏱️ Menunggu verifikasi admin...\n\nPembayaran Anda sedang diverifikasi.\nMohon tunggu 5-15 menit.";

      default:
        return this.getMainMenu();
    }
  }

  /**
   * Get main menu message
   * @returns {string}
   */
  getMainMenu() {
    return `👋 *Selamat datang di Premium Shop!*

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
• Ketik *help* - Tampilkan menu ini`;
  }

  /**
   * Handle main menu selection
   * @param {string} customerId
   * @param {string} message
   * @returns {string}
   */
  handleMenuSelection(customerId, message) {
    if (message === "1" || message === "browse" || message === "products") {
      this.sessionManager.setStep(customerId, "browsing");
      return this.showProducts(customerId);
    }

    if (message === "2" || message === "cart") {
      return this.showCart(customerId);
    }

    if (message === "3" || message === "about") {
      return this.getAboutInfo();
    }

    if (message === "4" || message === "support" || message === "contact") {
      return this.getContactInfo();
    }

    return `❌ Pilihan tidak valid. Silakan ketik nomor (1-4) atau kata kunci.\n\n${this.getMainMenu()}`;
  }

  /**
   * Show available products
   * @param {string} customerId
   * @returns {string}
   */
  showProducts(customerId) {
    const productList = formatProductList();
    const allProducts = getAllProducts();

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
   * Handle product selection
   * @param {string} customerId
   * @param {string} message
   * @returns {string}
   */
  handleProductSelection(customerId, message) {
    const allProducts = getAllProducts();

    // Try to find product by ID
    let product = getProductById(message);

    // If not found by ID, try to find by name (partial match)
    if (!product) {
      product = allProducts.find(
        (p) =>
          p.name.toLowerCase().includes(message) ||
          p.id.toLowerCase().includes(message)
      );
    }

    if (product) {
      this.sessionManager.addToCart(customerId, product);
      return `✅ *Ditambahkan ke keranjang!*

📦 ${product.name}
💰 Rp ${(product.price * 15800).toLocaleString("id-ID")}

*Selanjutnya apa?*
• Tambah produk lain (ketik nama produk)
• Ketik *cart* untuk lihat keranjang dan checkout
• Ketik *menu* untuk menu utama`;
    }

    return `❌ Produk tidak ditemukan. Silakan cek daftar produk dan coba lagi.\n\nKetik *menu* untuk lihat semua produk.`;
  }

  /**
   * Show cart contents
   * @param {string} customerId
   * @returns {string}
   */
  showCart(customerId) {
    const cart = this.sessionManager.getCart(customerId);

    if (cart.length === 0) {
      return `🛒 *Keranjang Anda kosong*

Jelajahi produk kami dan tambahkan item ke keranjang!

Ketik *menu* untuk lihat menu utama`;
    }

    let message = "🛒 *YOUR CART*\n\n";
    let total = 0;

    cart.forEach((item, index) => {
      message += `${index + 1}. ${item.name}\n`;
      message += `   💰 Rp ${(item.price * 15800).toLocaleString("id-ID")}\n\n`;
      total += item.price;
    });

    message += "━━━━━━━━━━━━━━━━━━\n";
    message += `💵 *Total: Rp ${(total * 15800).toLocaleString("id-ID")}*\n\n`;
    message += "*Siap checkout?*\n";
    message += "• Ketik *checkout* untuk selesaikan pesanan\n";
    message += "• Ketik *clear* untuk kosongkan keranjang\n";
    message += "• Ketik *menu* untuk menu utama";

    this.sessionManager.setStep(customerId, "checkout");

    return message;
  }

  /**
   * Handle checkout process
   * @param {string} customerId
   * @param {string} message
   * @returns {Promise<Object>} Response with message and payment data
   */
  async handleCheckout(customerId, message) {
    if (message === "checkout" || message === "buy" || message === "order") {
      const cart = this.sessionManager.getCart(customerId);
      const totalUSD = cart.reduce((sum, item) => sum + item.price, 0);
      const orderId = `ORD-${Date.now()}-${customerId.slice(-4)}`;

      // Save order ID to session
      this.sessionManager.setOrderId(customerId, orderId);
      this.sessionManager.setStep(customerId, "select_payment");

      // Convert USD to IDR
      const totalIDR = this.xenditService.convertToIDR(totalUSD);

      let orderMessage = "✅ *PESANAN DIKONFIRMASI!*\n\n";
      orderMessage += `📋 Order ID: ${orderId}\n\n`;
      orderMessage += "*Ringkasan Pesanan:*\n";

      cart.forEach((item, index) => {
        orderMessage += `${index + 1}. ${item.name} - Rp ${(
          item.price * 15800
        ).toLocaleString("id-ID")}\n`;
      });

      orderMessage += `\n💵 *Total: Rp ${totalIDR.toLocaleString(
        "id-ID"
      )}*\n\n`;
      orderMessage += "━━━━━━━━━━━━━━━━━━\n\n";
      orderMessage += "💳 *PILIH METODE PEMBAYARAN*\n\n";
      orderMessage += "1️⃣ *QRIS* - Universal QR (semua e-wallet & bank)\n";
      orderMessage += "2️⃣ *DANA* - E-Wallet DANA\n";
      orderMessage += "3️⃣ *GoPay* - E-Wallet GoPay\n";
      orderMessage += "4️⃣ *ShopeePay* - E-Wallet ShopeePay\n";
      orderMessage += "5️⃣ *Transfer Bank* - Virtual Account\n\n";
      orderMessage += "━━━━━━━━━━━━━━━━━━\n\n";
      orderMessage += "Ketik nomor pilihan (1-5) untuk lanjut pembayaran";

      return {
        message: orderMessage,
        qrisData: null,
      };
    }

    if (message === "clear") {
      this.sessionManager.clearCart(customerId);
      this.sessionManager.setStep(customerId, "menu");
      return {
        message:
          "🗑️ Keranjang dikosongkan!\n\nKetik *menu* untuk lanjut belanja.",
        qrisData: null,
      };
    }

    return {
      message: `Silakan ketik *checkout* untuk selesaikan pesanan atau *clear* untuk kosongkan keranjang.\n\nKetik *menu* untuk menu utama.`,
      qrisData: null,
    };
  }

  /**
   * Handle payment method selection
   * @param {string} customerId
   * @param {string} choice
   * @returns {Promise<Object>} Response with payment data
   */
  async handlePaymentSelection(customerId, choice) {
    const session = this.sessionManager.getSession(customerId);
    const cart = session.cart;
    const totalUSD = cart.reduce((sum, item) => sum + item.price, 0);
    const totalIDR = this.xenditService.convertToIDR(totalUSD);
    const orderId = session.orderId;

    try {
      switch (choice) {
        case "1":
        case "qris":
          // QRIS Payment
          const qrisResult = await this.xenditService.createQrisPayment(
            totalIDR,
            orderId,
            { phone: customerId }
          );

          this.sessionManager.setPaymentMethod(
            customerId,
            "QRIS",
            qrisResult.invoiceId
          );
          this.sessionManager.setStep(customerId, "awaiting_payment");

          let qrisMessage = "✅ *QRIS PAYMENT*\n\n";
          qrisMessage += `📋 Order ID: ${orderId}\n`;
          qrisMessage += `💵 Total: Rp ${totalIDR.toLocaleString("id-ID")}\n\n`;
          qrisMessage += "━━━━━━━━━━━━━━━━━━\n\n";
          qrisMessage += "📸 QR Code akan dikirim\n";
          qrisMessage += "✅ Scan dengan e-wallet / bank apapun\n";
          qrisMessage += "(DANA, OVO, GoPay, ShopeePay, BCA, dll)\n\n";
          qrisMessage += "⏱️ QR Code berlaku 24 jam\n";
          qrisMessage += "🔍 Ketik *cek* untuk cek status pembayaran\n\n";
          qrisMessage += "💡 Pastikan nominal sesuai!";

          return {
            message: qrisMessage,
            qrisData: { qrCodePath: qrisResult.qrCodePath },
          };

        case "2":
        case "dana":
          // DANA Payment
          const danaResult = await this.xenditService.createEwalletPayment(
            totalIDR,
            orderId,
            "DANA",
            { phone: customerId }
          );

          this.sessionManager.setPaymentMethod(
            customerId,
            "DANA",
            danaResult.invoiceId
          );
          this.sessionManager.setStep(customerId, "awaiting_payment");

          return {
            message: `✅ *DANA PAYMENT*\n\n📋 Order ID: ${orderId}\n💵 Total: Rp ${totalIDR.toLocaleString(
              "id-ID"
            )}\n\n━━━━━━━━━━━━━━━━━━\n\n📱 Klik link ini untuk bayar:\n${
              danaResult.redirectUrl
            }\n\n⏱️ Link berlaku 24 jam\n🔍 Ketik *cek* untuk cek status`,
            qrisData: null,
          };

        case "3":
        case "gopay":
          // GoPay Payment
          const gopayResult = await this.xenditService.createEwalletPayment(
            totalIDR,
            orderId,
            "SHOPEEPAY",
            { phone: customerId }
          );

          this.sessionManager.setPaymentMethod(
            customerId,
            "GOPAY",
            gopayResult.invoiceId
          );
          this.sessionManager.setStep(customerId, "awaiting_payment");

          return {
            message: `✅ *GOPAY PAYMENT*\n\n📋 Order ID: ${orderId}\n💵 Total: Rp ${totalIDR.toLocaleString(
              "id-ID"
            )}\n\n━━━━━━━━━━━━━━━━━━\n\n📱 Klik link ini untuk bayar:\n${
              gopayResult.redirectUrl
            }\n\n⏱️ Link berlaku 24 jam\n🔍 Ketik *cek* untuk cek status`,
            qrisData: null,
          };

        case "4":
        case "shopeepay":
          // ShopeePay Payment
          const shopeeResult = await this.xenditService.createEwalletPayment(
            totalIDR,
            orderId,
            "SHOPEEPAY",
            { phone: customerId }
          );

          this.sessionManager.setPaymentMethod(
            customerId,
            "SHOPEEPAY",
            shopeeResult.invoiceId
          );
          this.sessionManager.setStep(customerId, "awaiting_payment");

          return {
            message: `✅ *SHOPEEPAY PAYMENT*\n\n📋 Order ID: ${orderId}\n💵 Total: Rp ${totalIDR.toLocaleString(
              "id-ID"
            )}\n\n━━━━━━━━━━━━━━━━━━\n\n📱 Klik link ini untuk bayar:\n${
              shopeeResult.redirectUrl
            }\n\n⏱️ Link berlaku 24 jam\n🔍 Ketik *cek* untuk cek status`,
            qrisData: null,
          };

        case "5":
        case "bank":
        case "transfer":
          // Virtual Account - Ask bank selection
          this.sessionManager.setStep(customerId, "select_bank");
          return {
            message: `🏦 *PILIH BANK*\n\n1️⃣ BCA\n2️⃣ BNI\n3️⃣ BRI\n4️⃣ Mandiri\n5️⃣ Permata\n\nKetik nomor bank (1-5)`,
            qrisData: null,
          };

        default:
          return {
            message: "❌ Pilihan tidak valid. Ketik nomor 1-6.",
            qrisData: null,
          };
      }
    } catch (error) {
      console.error("❌ Payment creation error:", error);
      return {
        message: `❌ Gagal membuat pembayaran.\n\nError: ${error.message}\n\nSilakan coba lagi atau ketik *menu*.`,
        qrisData: null,
      };
    }
  }

  /**
   * Handle bank selection for virtual account
   * @param {string} customerId
   * @param {string} choice
   * @returns {Promise<Object>} Response with VA details
   */
  async handleBankSelection(customerId, choice) {
    const session = this.sessionManager.getSession(customerId);
    const cart = session.cart;
    const totalUSD = cart.reduce((sum, item) => sum + item.price, 0);
    const totalIDR = this.xenditService.convertToIDR(totalUSD);
    const orderId = session.orderId;

    const bankMap = {
      1: "BCA",
      2: "BNI",
      3: "BRI",
      4: "MANDIRI",
      5: "PERMATA",
      bca: "BCA",
      bni: "BNI",
      bri: "BRI",
      mandiri: "MANDIRI",
      permata: "PERMATA",
    };

    const bankCode = bankMap[choice.toLowerCase()];

    if (!bankCode) {
      return {
        message: "❌ Pilihan tidak valid. Ketik nomor 1-5.",
        qrisData: null,
      };
    }

    try {
      const vaResult = await this.xenditService.createVirtualAccount(
        totalIDR,
        orderId,
        bankCode,
        { name: "Customer", phone: customerId }
      );

      this.sessionManager.setPaymentMethod(
        customerId,
        `VA_${bankCode}`,
        vaResult.invoiceId
      );
      this.sessionManager.setStep(customerId, "awaiting_payment");

      let vaMessage = `✅ *VIRTUAL ACCOUNT ${vaResult.bankName}*\n\n`;
      vaMessage += `📋 Order ID: ${orderId}\n`;
      vaMessage += `💵 Total: Rp ${totalIDR.toLocaleString("id-ID")}\n\n`;
      vaMessage += "━━━━━━━━━━━━━━━━━━\n\n";
      vaMessage += `🏦 Bank: ${vaResult.bankName}\n`;
      vaMessage += `💳 Nomor VA: ${vaResult.vaNumber}\n\n`;
      vaMessage += "━━━━━━━━━━━━━━━━━━\n\n";
      vaMessage += "📱 Cara Bayar:\n";
      vaMessage += "1. Buka mobile/internet banking\n";
      vaMessage += `2. Pilih Transfer ke ${vaResult.bankName}\n`;
      vaMessage += `3. Input nomor VA: ${vaResult.vaNumber}\n`;
      vaMessage += `4. Input jumlah: Rp ${totalIDR.toLocaleString("id-ID")}\n`;
      vaMessage += "5. Konfirmasi pembayaran\n\n";
      vaMessage += "⏱️ VA berlaku 24 jam\n";
      vaMessage += "🔍 Ketik *cek* untuk cek status\n\n";
      vaMessage += "💡 Pastikan nominal sesuai!";

      return {
        message: vaMessage,
        qrisData: null,
      };
    } catch (error) {
      console.error(`❌ VA creation error (${bankCode}):`, error);
      return {
        message: `❌ Gagal membuat Virtual Account ${bankCode}.\n\nError: ${error.message}\n\nSilakan coba lagi atau pilih bank lain.`,
        qrisData: null,
      };
    }
  }

  /**
   * Handle awaiting payment state
   * @param {string} customerId
   * @param {string} message
   * @returns {Promise<string>}
   */
  async handleAwaitingPayment(customerId, message) {
    if (message === "cek" || message === "check" || message === "status") {
      const paymentData = this.sessionManager.getPaymentMethod(customerId);

      if (!paymentData.invoiceId) {
        return "❌ Tidak ada invoice aktif.\n\nKetik *menu* untuk mulai belanja.";
      }

      try {
        // Check payment status via Xendit
        const paymentStatus = await this.xenditService.checkPaymentStatus(
          paymentData.invoiceId
        );

        if (paymentStatus.status === "SUCCEEDED") {
          // Payment confirmed!
          const orderId = this.sessionManager.getOrderId(customerId);
          const cart = this.sessionManager.getCart(customerId);

          // Deliver products automatically
          const ProductDelivery = require("./productDelivery");
          const productDelivery = new ProductDelivery();
          const deliveryResult = productDelivery.deliverProducts(
            customerId,
            orderId,
            cart
          );

          // Clear cart and reset session
          this.sessionManager.clearCart(customerId);
          this.sessionManager.setStep(customerId, "menu");

          if (!deliveryResult.success) {
            return `✅ *PEMBAYARAN BERHASIL!*\n\n📋 Order ID: ${orderId}\n💳 Metode: ${paymentData.method}\n\n❌ Namun produk tidak tersedia di database.\nSilakan hubungi admin.`;
          }

          let successMessage = "✅ *PEMBAYARAN BERHASIL!*\n\n";
          successMessage += `📋 Order ID: ${orderId}\n`;
          successMessage += `💳 Metode: ${paymentData.method}\n\n`;
          successMessage += "━━━━━━━━━━━━━━━━━━\n\n";
          successMessage += "🎁 *Produk Anda:*\n\n";
          successMessage += deliveryResult.message + "\n\n";
          successMessage += "━━━━━━━━━━━━━━━━━━\n\n";
          successMessage += "Terima kasih sudah berbelanja! 🎉\n\n";
          successMessage += "Ketik *menu* untuk belanja lagi.";

          return {
            message: successMessage,
            deliverToCustomer: true,
            products: deliveryResult.products,
          };
        } else if (paymentStatus.status === "EXPIRED") {
          this.sessionManager.setStep(customerId, "menu");
          return "❌ *PEMBAYARAN EXPIRED*\n\nSilakan mulai order baru. Ketik *menu*.";
        } else if (paymentStatus.status === "FAILED") {
          this.sessionManager.setStep(customerId, "menu");
          return "❌ *PEMBAYARAN GAGAL*\n\nSilakan mulai order baru. Ketik *menu*.";
        }

        return (
          "⏱️ *Status Pembayaran: PENDING*\n\n" +
          "Silakan selesaikan pembayaran Anda.\n\n" +
          "Ketik *cek* untuk cek status kembali."
        );
      } catch (error) {
        console.error("❌ Payment check error:", error);
        return "❌ Gagal mengecek status pembayaran.\n\nSilakan coba lagi.";
      }
    }

    return (
      "⏱️ Menunggu pembayaran...\n\n" +
      "✅ Selesaikan pembayaran Anda\n" +
      "🔍 Ketik *cek* untuk cek status pembayaran\n" +
      "📋 Ketik *menu* untuk kembali"
    );
  }

  /**
   * Handle payment proof upload (semi-automatic with admin approval)
   * @param {string} customerId
   * @returns {Object} Response with message and forward flag
   */
  handlePaymentProof(customerId) {
    const orderId = this.sessionManager.getOrderId(customerId);
    const cart = this.sessionManager.getCart(customerId);

    // Change state to awaiting admin approval (don't clear cart yet)
    this.sessionManager.setStep(customerId, "awaiting_admin_approval");

    let confirmMessage = "✅ *BUKTI PEMBAYARAN DITERIMA!*\n\n";
    confirmMessage += `📋 Order ID: ${orderId}\n\n`;
    confirmMessage += "━━━━━━━━━━━━━━━━━━\n\n";
    confirmMessage += "👨‍💼 Admin sedang memverifikasi pembayaran\n";
    confirmMessage += "⏱️ Estimasi: 5-15 menit\n";
    confirmMessage += "🎁 Produk akan dikirim otomatis setelah verifikasi\n\n";
    confirmMessage += "━━━━━━━━━━━━━━━━━━\n\n";
    confirmMessage += "📞 Butuh bantuan? Type *support*\n\n";
    confirmMessage += "Terima kasih sudah menunggu! 🎉";

    return {
      message: confirmMessage,
      forwardToAdmin: true,
      orderId: orderId,
      customerId: customerId,
      cart: cart,
    };
  }

  /**
   * Handle admin approval command
   * @param {string} adminId - Admin WhatsApp ID
   * @param {string} message - Command message
   * @returns {Promise<Object>} Response with delivery instructions
   */
  async handleAdminApprove(adminId, message) {
    // Check if user is admin
    const adminNumbers = [
      process.env.ADMIN_NUMBER_1,
      process.env.ADMIN_NUMBER_2,
      process.env.ADMIN_NUMBER_3,
    ].filter(Boolean);

    const isAdmin = adminNumbers.some((num) => adminId.includes(num));

    if (!isAdmin) {
      return "❌ Tidak diizinkan. Perintah khusus admin.";
    }

    // Parse command: /approve orderId
    const parts = message.split(" ");
    if (parts.length < 2) {
      return "❌ Format: /approve <order_id>\n\nContoh: /approve ORD-1730000000000-1234";
    }

    const approveOrderId = parts[1];

    // Find customer by order ID
    const targetCustomerId =
      this.sessionManager.findCustomerByOrderId(approveOrderId);

    if (!targetCustomerId) {
      return `❌ Order ID ${approveOrderId} tidak ditemukan.\n\nPastikan order ID benar.`;
    }

    // Check if customer has pending approval
    const step = this.sessionManager.getStep(targetCustomerId);
    if (step !== "awaiting_admin_approval") {
      return `❌ Order ${approveOrderId} tidak dalam status menunggu approval.`;
    }

    // Get cart details
    const cart = this.sessionManager.getCart(targetCustomerId);

    // Deliver products
    const ProductDelivery = require("./productDelivery");
    const productDelivery = new ProductDelivery();
    const deliveryResult = productDelivery.deliverProducts(
      targetCustomerId,
      approveOrderId,
      cart
    );

    if (!deliveryResult.success) {
      return `❌ Gagal mengirim produk untuk order ${approveOrderId}.\n\nTidak ada produk yang tersedia di database.`;
    }

    // Format delivery message for customer
    const customerMessage = productDelivery.formatDeliveryMessage(
      deliveryResult,
      approveOrderId
    );

    // Clear cart and reset session
    this.sessionManager.clearCart(targetCustomerId);
    this.sessionManager.setStep(targetCustomerId, "menu");

    // Return delivery instruction
    return {
      message: `✅ *APPROVED!*\n\nOrder ${approveOrderId} telah disetujui.\nProduk akan dikirim ke customer.`,
      deliverToCustomer: true,
      customerId: targetCustomerId,
      customerMessage: customerMessage,
    };
  }

  /**
   * Get about information
   * @returns {string}
   */
  getAboutInfo() {
    return `ℹ️ *TENTANG KAMI*

Selamat datang di Premium Shop! 🎉

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
   * Get contact information
   * @returns {string}
   */
  getContactInfo() {
    return `📞 *HUBUNGI DUKUNGAN*

Butuh bantuan? Kami siap membantu! 💬

⏰ Jam Kerja: 24/7
📱 WhatsApp: Nomor ini
📧 Email: support@premiumshop.com

Tim kami merespons dalam hitungan menit!

Ketik *menu* untuk kembali ke menu utama`;
  }
}

module.exports = ChatbotLogic;
