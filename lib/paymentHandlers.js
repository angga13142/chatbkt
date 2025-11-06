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
   * Handle payment method selection - DYNAMIC
   */
  async handlePaymentSelection(customerId, choice) {
    const session = await this.sessionManager.getSession(customerId);
    const cart = session.cart;
    const totalIDR = cart.reduce((sum, item) => sum + item.price, 0);
    const orderId = session.orderId;

    // Get selected payment method dynamically
    const paymentMethod = PaymentMessages.getPaymentMethodByIndex(choice);

    if (!paymentMethod) {
      const maxChoice = PaymentMessages.getPaymentMethodCount();
      return {
        message: `❌ Pilihan tidak valid. Ketik nomor 1-${maxChoice}.`,
        qrisData: null,
      };
    }

    try {
      // Route to appropriate handler based on payment ID
      switch (paymentMethod.id) {
        case "qris":
          return await this.handleQRISPayment(customerId, orderId, totalIDR);

        case "dana":
          return await this.handleEWalletPayment(
            customerId,
            orderId,
            totalIDR,
            "DANA"
          );

        case "gopay":
          return await this.handleEWalletPayment(
            customerId,
            orderId,
            totalIDR,
            "GOPAY"
          );

        case "ovo":
          return await this.handleEWalletPayment(
            customerId,
            orderId,
            totalIDR,
            "OVO"
          );

        case "shopeepay":
          return await this.handleEWalletPayment(
            customerId,
            orderId,
            totalIDR,
            "SHOPEEPAY"
          );

        case "transfer":
          return this.handleBankSelection(customerId, orderId, totalIDR);

        default:
          return {
            message: `❌ Metode pembayaran tidak tersedia.`,
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
    const { systemSettings } = require("../config");
    const paymentAccounts = systemSettings.paymentAccounts;

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
   * Handle bank selection for Manual Bank Transfer - DYNAMIC
   */
  async handleBankChoice(customerId, choice) {
    const session = await this.sessionManager.getSession(customerId);
    const cart = session.cart;
    const totalIDR = cart.reduce((sum, item) => sum + item.price, 0);
    const orderId = session.orderId;

    // Get selected bank dynamically
    const selectedBank = PaymentMessages.getBankByIndex(choice);

    if (!selectedBank) {
      const maxChoice = PaymentMessages.getBankCount();
      return {
        message: `❌ Pilihan tidak valid. Ketik nomor 1-${maxChoice}.`,
        qrisData: null,
      };
    }

    try {
      // Update session with payment metadata
      session.paymentMethod = `bank_${selectedBank.id}`;
      session.paymentAccount = selectedBank.accountNumber;
      session.paymentStatus = "awaiting_proof";
      session.paymentInitiatedAt = Date.now();
      session.paymentMetadata = {
        type: "manual_bank_transfer",
        provider: selectedBank.id,
        accountNumber: selectedBank.accountNumber,
        accountName: selectedBank.accountName,
        bankCode: selectedBank.code,
        amount: totalIDR,
        orderId: orderId,
        initiatedAt: new Date().toISOString(),
      };
      await this.sessionManager.setStep(customerId, "awaiting_admin_approval");

      // Log transaction
      if (this.logger) {
        this.logger.logTransaction(
          customerId,
          "payment_manual_initiated",
          orderId,
          {
            method: `bank_${selectedBank.id}`,
            amount: totalIDR,
            accountNumber: selectedBank.accountNumber,
            accountName: selectedBank.accountName,
            bankCode: selectedBank.code,
            paymentType: "manual_bank_transfer",
            timestamp: new Date().toISOString(),
          }
        );
      }

      return {
        message: PaymentMessages.manualBankTransferInstructions(
          selectedBank.code,
          selectedBank.accountNumber,
          selectedBank.accountName,
          totalIDR,
          orderId
        ),
        qrisData: null,
      };
    } catch (error) {
      console.error(`❌ Bank transfer error (${selectedBank.code}):`, error);

      // Log payment failure
      if (this.logger) {
        this.logger.logPaymentFailure(
          customerId,
          orderId,
          `BANK_${selectedBank.code}`,
          error.message
        );
      }

      return {
        message: `❌ Gagal setup transfer ${selectedBank.code}.\n\nError: ${error.message}\n\nSilakan coba lagi atau pilih bank lain.`,
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
