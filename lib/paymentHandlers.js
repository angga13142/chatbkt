/**
 * Payment Handlers
 * Modular payment processing logic
 */

const PaymentMessages = require("./paymentMessages");

class PaymentHandlers {
  constructor(xenditService, sessionManager, logger = null) {
    this.xenditService = xenditService;
    this.sessionManager = sessionManager;
    this.logger = logger;
  }

  /**
   * Handle payment method selection
   */
  async handlePaymentSelection(customerId, choice) {
    const session = await this.sessionManager.getSession(customerId);
    const cart = session.cart;
    const totalUSD = cart.reduce((sum, item) => sum + item.price, 0);
    const totalIDR = this.xenditService.convertToIDR(totalUSD);
    const orderId = session.orderId;

    try {
      switch (choice) {
        case "1":
        case "qris":
          return await this.handleQRISPayment(customerId, orderId, totalIDR);

        case "2":
        case "dana":
          return await this.handleEWalletPayment(
            customerId,
            orderId,
            totalIDR,
            "DANA"
          );

        case "3":
        case "gopay":
          return await this.handleEWalletPayment(
            customerId,
            orderId,
            totalIDR,
            "SHOPEEPAY"
          );

        case "4":
        case "shopeepay":
          return await this.handleEWalletPayment(
            customerId,
            orderId,
            totalIDR,
            "SHOPEEPAY"
          );

        case "5":
        case "bank":
        case "transfer":
          return this.handleBankSelection(customerId, orderId, totalIDR);

        default:
          return {
            message: "❌ Pilihan tidak valid. Ketik nomor 1-5.",
            qrisData: null,
          };
      }
    } catch (error) {
      console.error("❌ Payment creation error:", error);
      return {
        message: PaymentMessages.paymentError(error.message),
        qrisData: null,
      };
    }
  }

  /**
   * Handle QRIS payment
   */
  async handleQRISPayment(customerId, orderId, totalIDR) {
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

    // Log payment initiation
    if (this.logger) {
      this.logger.logPaymentInit(
        customerId,
        orderId,
        "QRIS",
        totalIDR,
        qrisResult.invoiceId
      );
    }

    return {
      message: PaymentMessages.qrisPayment(orderId, totalIDR),
      qrisData: { qrCodePath: qrisResult.qrCodePath },
    };
  }

  /**
   * Handle E-Wallet payment (DANA, GoPay, OVO, ShopeePay) - Manual Transfer
   */
  async handleEWalletPayment(customerId, orderId, totalIDR, walletType) {
    const { getSetting } = require("../config");
    const paymentAccounts = getSetting("paymentAccounts");

    const walletKey = walletType.toLowerCase();
    const account = paymentAccounts[walletKey];

    if (!account || !account.enabled) {
      return {
        message: `❌ Metode pembayaran ${walletType} sedang tidak tersedia.\n\nSilakan pilih metode lain.`,
        qrisData: null,
      };
    }

    // Update session with payment metadata (Best Practice: Complete state tracking)
    const session = await this.sessionManager.getSession(customerId);
    session.paymentMethod = walletKey;
    session.paymentAccount = account.number;
    session.paymentStatus = "awaiting_proof"; // Track payment status
    session.paymentInitiatedAt = Date.now(); // Timestamp for timeout handling
    session.paymentMetadata = {
      type: "manual_ewallet",
      provider: walletKey,
      accountNumber: account.number,
      accountName: account.name,
      amount: totalIDR,
      orderId: orderId,
      initiatedAt: new Date().toISOString(),
    };
    await this.sessionManager.setStep(customerId, "awaiting_admin_approval");

    // Log transaction with complete context (Best Practice: Audit trail)
    if (this.logger) {
      this.logger.logTransaction(
        customerId,
        "payment_manual_initiated",
        orderId,
        {
          method: walletKey,
          amount: totalIDR,
          accountNumber: account.number,
          accountName: account.name,
          paymentType: "manual_ewallet",
          timestamp: new Date().toISOString(),
        }
      );
    }

    return {
      message: PaymentMessages.manualEWalletInstructions(
        walletType,
        account.number,
        account.name,
        totalIDR,
        orderId
      ),
      qrisData: null,
    };
  }

  /**
   * Show bank selection menu
   */
  handleBankSelection(customerId, orderId, totalIDR) {
    this.sessionManager.setStep(customerId, "select_bank");
    return {
      message: PaymentMessages.bankSelection(orderId, totalIDR),
      qrisData: null,
    };
  }

  /**
   * Handle bank selection for Manual Bank Transfer
   */
  async handleBankChoice(customerId, choice) {
    const session = await this.sessionManager.getSession(customerId);
    const cart = session.cart;
    const totalUSD = cart.reduce((sum, item) => sum + item.price, 0);
    const totalIDR = this.xenditService.convertToIDR(totalUSD);
    const orderId = session.orderId;

    const bankMap = {
      1: "BCA",
      2: "BNI",
      3: "BRI",
      4: "MANDIRI",
      bca: "BCA",
      bni: "BNI",
      bri: "BRI",
      mandiri: "MANDIRI",
    };

    const bankCode = bankMap[choice.toLowerCase()];

    if (!bankCode) {
      return {
        message: PaymentMessages.invalidBankChoice(),
        qrisData: null,
      };
    }

    const { getSetting } = require("../config");
    const paymentAccounts = getSetting("paymentAccounts");
    const bankKey = bankCode.toLowerCase();
    const account = paymentAccounts[bankKey];

    if (!account || !account.enabled) {
      return {
        message: `❌ Bank ${bankCode} sedang tidak tersedia.\n\nSilakan pilih bank lain.`,
        qrisData: null,
      };
    }

    try {
      // Update session with payment metadata (Best Practice: Complete state tracking)
      session.paymentMethod = `bank_${bankKey}`;
      session.paymentAccount = account.accountNumber;
      session.paymentStatus = "awaiting_proof"; // Track payment status
      session.paymentInitiatedAt = Date.now(); // Timestamp for timeout handling
      session.paymentMetadata = {
        type: "manual_bank_transfer",
        provider: bankKey,
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        bankCode: bankCode,
        amount: totalIDR,
        orderId: orderId,
        initiatedAt: new Date().toISOString(),
      };
      await this.sessionManager.setStep(customerId, "awaiting_admin_approval");

      // Log transaction with complete context (Best Practice: Audit trail)
      if (this.logger) {
        this.logger.logTransaction(
          customerId,
          "payment_manual_initiated",
          orderId,
          {
            method: `bank_${bankKey}`,
            amount: totalIDR,
            accountNumber: account.accountNumber,
            accountName: account.accountName,
            bankCode: bankCode,
            paymentType: "manual_bank_transfer",
            timestamp: new Date().toISOString(),
          }
        );
      }

      return {
        message: PaymentMessages.manualBankTransferInstructions(
          bankCode,
          account.accountNumber,
          account.accountName,
          totalIDR,
          orderId
        ),
        qrisData: null,
      };
    } catch (error) {
      console.error(`❌ VA creation error (${bankCode}):`, error);

      // Log payment failure
      if (this.logger) {
        this.logger.logPaymentFailure(
          customerId,
          orderId,
          `VA_${bankCode}`,
          error.message
        );
      }

      return {
        message: `❌ Gagal membuat Virtual Account ${bankCode}.\n\nError: ${error.message}\n\nSilakan coba lagi atau pilih bank lain.`,
        qrisData: null,
      };
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(customerId) {
    const paymentData = await this.sessionManager.getPaymentMethod(customerId);

    if (!paymentData.invoiceId) {
      return PaymentMessages.noActiveInvoice();
    }

    try {
      const paymentStatus = await this.xenditService.checkPaymentStatus(
        paymentData.invoiceId
      );

      if (paymentStatus.status === "SUCCEEDED") {
        // Log payment success
        const orderId = await this.sessionManager.getOrderId(customerId);
        if (this.logger) {
          this.logger.logPaymentSuccess(
            customerId,
            orderId,
            paymentData.method,
            paymentStatus.amount,
            paymentData.invoiceId
          );
        }
        return await this.handlePaymentSuccess(customerId, paymentData);
      } else if (paymentStatus.status === "EXPIRED") {
        this.sessionManager.setStep(customerId, "menu");
        return PaymentMessages.paymentExpired();
      } else if (paymentStatus.status === "FAILED") {
        this.sessionManager.setStep(customerId, "menu");
        return PaymentMessages.paymentFailed();
      }

      return PaymentMessages.paymentPending();
    } catch (error) {
      console.error("❌ Payment check error:", error);
      return PaymentMessages.checkStatusError();
    }
  }

  /**
   * Handle successful payment
   */
  async handlePaymentSuccess(customerId, paymentData) {
    const orderId = await this.sessionManager.getOrderId(customerId);
    const cart = await this.sessionManager.getCart(customerId);

    // Deliver products automatically
    const ProductDelivery = require("../services/productDelivery");
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

    return {
      message: PaymentMessages.paymentSuccess(
        orderId,
        paymentData.method,
        deliveryResult.message
      ),
      deliverToCustomer: true,
      products: cart,
    };
  }
}

module.exports = PaymentHandlers;
