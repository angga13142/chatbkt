/**
 * Payment Configuration
 * E-wallet and bank transfer account settings
 */

const paymentConfig = {
  // E-wallet accounts
  ewallet: {
    dana: {
      enabled: process.env.DANA_ENABLED === "true" && !!process.env.DANA_NUMBER,
      number: process.env.DANA_NUMBER || "",
      name: process.env.DANA_NAME || "",
    },
    gopay: {
      enabled: process.env.GOPAY_ENABLED === "true" && !!process.env.GOPAY_NUMBER,
      number: process.env.GOPAY_NUMBER || "",
      name: process.env.GOPAY_NAME || "",
    },
    ovo: {
      enabled: process.env.OVO_ENABLED === "true" && !!process.env.OVO_NUMBER,
      number: process.env.OVO_NUMBER || "",
      name: process.env.OVO_NAME || "",
    },
    shopeepay: {
      enabled: process.env.SHOPEEPAY_ENABLED === "true" && !!process.env.SHOPEEPAY_NUMBER,
      number: process.env.SHOPEEPAY_NUMBER || "",
      name: process.env.SHOPEEPAY_NAME || "",
    },
  },

  // Bank accounts
  banks: {
    bca: {
      enabled: process.env.BCA_ENABLED === "true" && !!process.env.BCA_ACCOUNT,
      accountNumber: process.env.BCA_ACCOUNT || "",
      accountName: process.env.BCA_NAME || "",
      code: "BCA",
    },
    bni: {
      enabled: process.env.BNI_ENABLED === "true" && !!process.env.BNI_ACCOUNT,
      accountNumber: process.env.BNI_ACCOUNT || "",
      accountName: process.env.BNI_NAME || "",
      code: "BNI",
    },
    bri: {
      enabled: process.env.BRI_ENABLED === "true" && !!process.env.BRI_ACCOUNT,
      accountNumber: process.env.BRI_ACCOUNT || "",
      accountName: process.env.BRI_NAME || "",
      code: "BRI",
    },
    mandiri: {
      enabled: process.env.MANDIRI_ENABLED === "true" && !!process.env.MANDIRI_ACCOUNT,
      accountNumber: process.env.MANDIRI_ACCOUNT || "",
      accountName: process.env.MANDIRI_NAME || "",
      code: "MANDIRI",
    },
  },

  // Payment gateway settings
  xendit: {
    enabled: !!process.env.XENDIT_SECRET_KEY,
    apiKey: process.env.XENDIT_SECRET_KEY || "",
    webhookUrl: process.env.WEBHOOK_URL || "",
    callbackToken: process.env.XENDIT_WEBHOOK_TOKEN || "",
  },
};

/**
 * Get available payment methods
 */
paymentConfig.getAvailablePayments = function () {
  const available = [];

  // QRIS always available if Xendit configured
  if (this.xendit.enabled) {
    available.push({
      id: "qris",
      name: "QRIS",
      description: "Universal QR (semua e-wallet & bank)",
      emoji: "📱",
    });
  }

  // E-wallets
  Object.entries(this.ewallet).forEach(([key, wallet]) => {
    if (wallet.enabled) {
      available.push({
        id: key,
        name: key.charAt(0).toUpperCase() + key.slice(1),
        description: `E-Wallet ${key.toUpperCase()}`,
        emoji: "💳",
      });
    }
  });

  // Banks
  const enabledBanks = Object.values(this.banks).filter((b) => b.enabled);
  if (enabledBanks.length > 0) {
    available.push({
      id: "transfer",
      name: "Transfer Bank",
      description: "Virtual Account / Manual Transfer",
      emoji: "🏦",
    });
  }

  return available;
};

/**
 * Get available banks for transfer
 */
paymentConfig.getAvailableBanks = function () {
  return Object.entries(this.banks)
    .filter(([, bank]) => bank.enabled)
    .map(([key, bank]) => ({
      id: key,
      code: bank.code,
      name: bank.code,
      accountNumber: bank.accountNumber,
      accountName: bank.accountName,
    }));
};

module.exports = paymentConfig;
