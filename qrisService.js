const axios = require("axios");
const QRCode = require("qrcode");
const fs = require("fs");

class QRISService {
  constructor() {
    this.apiKey = process.env.QRIS_APIKEY;
    this.mID = process.env.QRIS_MID;
    this.baseUrl = "https://qris.interactive.co.id/restapi/qris";
  }

  /**
   * Generate QRIS invoice
   * @param {string} orderId - Order ID from your system
   * @param {number} amount - Amount in IDR
   * @returns {Promise<Object>} QRIS data
   */
  async createInvoice(orderId, amount) {
    try {
      const params = {
        do: "create-invoice",
        apikey: this.apiKey,
        mID: this.mID,
        cliTrxNumber: orderId,
        cliTrxAmount: amount,
        useTip: "no",
      };

      const response = await axios.get(`${this.baseUrl}/show_qris.php`, {
        params,
        timeout: 15000,
      });

      if (response.data.status === "success") {
        return {
          success: true,
          qrisContent: response.data.data.qris_content,
          invoiceId: response.data.data.qris_invoiceid,
          nmid: response.data.data.qris_nmid,
          requestDate: response.data.data.qris_request_date,
        };
      }

      return {
        success: false,
        error: response.data.data.qris_status,
      };
    } catch (error) {
      console.error("❌ Error creating QRIS invoice:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate QR code image from QRIS content
   * @param {string} qrisContent - QRIS content string
   * @param {string} filename - Output filename
   * @returns {Promise<string>} File path
   */
  async generateQRImage(qrisContent, filename) {
    try {
      const filepath = `./payment_qris/${filename}`;

      // Generate QR code as data URL
      const qrDataUrl = await QRCode.toDataURL(qrisContent, {
        errorCorrectionLevel: "M",
        type: "image/png",
        width: 400,
        margin: 2,
      });

      // Convert data URL to buffer and save
      const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, "");
      fs.writeFileSync(filepath, base64Data, "base64");

      return filepath;
    } catch (error) {
      console.error("❌ Error generating QR image:", error.message);
      throw error;
    }
  }

  /**
   * Check QRIS payment status
   * @param {string} invoiceId - Invoice ID from createInvoice
   * @param {number} amount - Transaction amount
   * @param {string} date - Transaction date (YYYY-MM-DD)
   * @returns {Promise<Object>} Payment status
   */
  async checkPaymentStatus(invoiceId, amount, date) {
    try {
      const params = {
        do: "checkStatus",
        apikey: this.apiKey,
        mID: this.mID,
        invid: invoiceId,
        trxvalue: amount,
        trxdate: date,
      };

      const response = await axios.get(`${this.baseUrl}/checkpaid_qris.php`, {
        params,
        timeout: 15000,
      });

      if (response.data.status === "success") {
        return {
          success: true,
          paid: response.data.data.qris_status === "paid",
          customerName: response.data.data.qris_payment_customername,
          paymentMethod: response.data.data.qris_payment_methodby,
        };
      }

      return {
        success: true,
        paid: false,
      };
    } catch (error) {
      console.error("❌ Error checking payment status:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Poll payment status with retries
   * @param {string} invoiceId
   * @param {number} amount
   * @param {string} date
   * @param {number} maxRetries
   * @param {number} intervalSeconds
   * @returns {Promise<Object>}
   */
  async pollPaymentStatus(
    invoiceId,
    amount,
    date,
    maxRetries = 3,
    intervalSeconds = 15
  ) {
    for (let i = 0; i < maxRetries; i++) {
      const result = await this.checkPaymentStatus(invoiceId, amount, date);

      if (result.success && result.paid) {
        return result;
      }

      if (i < maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, intervalSeconds * 1000)
        );
      }
    }

    return {
      success: false,
      paid: false,
      error: "Payment not confirmed after retries",
    };
  }

  /**
   * Convert USD to IDR (approximate rate)
   * @param {number} usd
   * @returns {number} IDR amount
   */
  convertToIDR(usd) {
    const rate = parseInt(process.env.USD_TO_IDR_RATE || "15000");
    return Math.round(usd * rate);
  }
}

module.exports = QRISService;
