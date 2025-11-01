# Midtrans Payment Gateway Integration (Optional)

## Overview

Midtrans adalah payment gateway alternatif untuk Indonesia dengan **Snap API** yang menyediakan UI pembayaran all-in-one. Dokumentasi ini menjelaskan cara implementasi Midtrans sebagai alternatif atau tambahan dari Xendit.

## Features

- ✅ **Snap API** - Single endpoint dengan UI lengkap
- ✅ **E-Wallet** - GoPay, DANA, ShopeePay
- ✅ **Bank Transfer** - BCA, BNI, BRI, Mandiri, Permata, CIMB
- ✅ **QRIS** - Universal QR code
- ✅ **Credit Card** - Visa, Mastercard, JCB
- ✅ **Auto-retry** - Built-in payment retry mechanism
- ✅ **Mobile SDK** - Native Android/iOS support

## When to Use Midtrans

**Use Midtrans if:**

- Anda menginginkan UI pembayaran yang sudah jadi (Snap)
- Butuh support kartu kredit
- Prefer payment page yang hosted di Midtrans
- Ingin implementasi paling cepat (single endpoint)

**Use Xendit if:**

- Butuh kontrol penuh atas payment flow di WhatsApp
- Coverage e-wallet lebih lengkap (LinkAja, dll)
- Prefer direct API tanpa redirect

## Installation

```bash
npm install midtrans-client
```

## Environment Configuration

Add to `.env`:

```env
# Midtrans Configuration
MIDTRANS_SERVER_KEY=your_server_key
MIDTRANS_CLIENT_KEY=your_client_key
MIDTRANS_IS_PRODUCTION=false
```

## Implementation

### 1. Create Midtrans Service

Create `midtransService.js`:

```javascript
/**
 * Midtrans Payment Service (Optional Alternative to Xendit)
 */
const midtransClient = require("midtrans-client");

class MidtransService {
  constructor() {
    this.snap = new midtransClient.Snap({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY,
    });

    this.usdToIdrRate = parseFloat(process.env.USD_TO_IDR_RATE || "15800");
  }

  convertToIDR(usdAmount) {
    return Math.ceil(usdAmount * this.usdToIdrRate);
  }

  /**
   * Create Snap transaction (all payment methods)
   */
  async createTransaction(orderId, cart, customerPhone) {
    try {
      const totalUSD = cart.reduce((sum, item) => sum + item.price, 0);
      const totalIDR = this.convertToIDR(totalUSD);

      const parameter = {
        transaction_details: {
          order_id: orderId,
          gross_amount: totalIDR,
        },
        customer_details: {
          first_name: "Customer",
          phone: customerPhone.replace("@c.us", "").replace(/[^0-9]/g, ""),
        },
        item_details: cart.map((item) => ({
          id: item.id,
          price: this.convertToIDR(item.price),
          quantity: 1,
          name: item.name,
        })),
        enabled_payments: [
          "qris",
          "gopay",
          "shopeepay",
          "other_qris",
          "bca_va",
          "bni_va",
          "bri_va",
          "permata_va",
          "other_va",
        ],
      };

      const transaction = await this.snap.createTransaction(parameter);

      return {
        success: true,
        token: transaction.token,
        redirectUrl: transaction.redirect_url,
        orderId: orderId,
      };
    } catch (error) {
      console.error("❌ Midtrans Error:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check transaction status
   */
  async checkStatus(orderId) {
    try {
      const status = await this.snap.transaction.status(orderId);

      return {
        success: true,
        status: status.transaction_status, // capture, settlement, pending, deny, cancel, expire
        fraudStatus: status.fraud_status,
        paymentType: status.payment_type,
        paidAt: status.transaction_time,
      };
    } catch (error) {
      console.error("❌ Midtrans Status Check Error:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Handle webhook notification
   */
  async handleNotification(notificationJson) {
    try {
      const statusResponse = await this.snap.transaction.notification(
        notificationJson
      );

      const orderId = statusResponse.order_id;
      const transactionStatus = statusResponse.transaction_status;
      const fraudStatus = statusResponse.fraud_status;

      let isPaid = false;

      if (transactionStatus === "capture") {
        isPaid = fraudStatus === "accept";
      } else if (transactionStatus === "settlement") {
        isPaid = true;
      }

      return {
        success: true,
        orderId: orderId,
        isPaid: isPaid,
        status: transactionStatus,
        fraudStatus: fraudStatus,
        paymentType: statusResponse.payment_type,
      };
    } catch (error) {
      console.error("❌ Midtrans Notification Error:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new MidtransService();
```

### 2. Update chatbotLogic.js

Add Midtrans as payment option:

```javascript
const MidtransService = require("./midtransService");

class ChatbotLogic {
  constructor(sessionManager) {
    this.sessionManager = sessionManager;
    this.xenditService = require("./xenditService");
    this.midtransService = MidtransService; // Add this
  }

  async handlePaymentSelection(customerId, choice) {
    // Add option 7 for Midtrans Snap
    if (choice === "7" || choice === "snap" || choice === "midtrans") {
      const session = this.sessionManager.getSession(customerId);
      const orderId = session.orderId;
      const cart = session.cart;

      const result = await this.midtransService.createTransaction(
        orderId,
        cart,
        customerId
      );

      if (!result.success) {
        return {
          message: `❌ Gagal membuat pembayaran.\n\nError: ${result.error}`,
          qrisData: null,
        };
      }

      this.sessionManager.setPaymentMethod(
        customerId,
        "MIDTRANS_SNAP",
        orderId
      );
      this.sessionManager.setStep(customerId, "awaiting_payment");

      const totalUSD = cart.reduce((sum, item) => sum + item.price, 0);
      const totalIDR = this.midtransService.convertToIDR(totalUSD);

      let snapMessage = "✅ *MIDTRANS PAYMENT*\n\n";
      snapMessage += `📋 Order ID: ${orderId}\n`;
      snapMessage += `💵 Total: Rp ${totalIDR.toLocaleString("id-ID")}\n\n`;
      snapMessage += "━━━━━━━━━━━━━━━━━━\n\n";
      snapMessage += "📱 Klik link ini untuk bayar:\n";
      snapMessage += `${result.redirectUrl}\n\n`;
      snapMessage += "💳 Metode pembayaran tersedia:\n";
      snapMessage += "• QRIS (semua e-wallet & bank)\n";
      snapMessage += "• GoPay, ShopeePay\n";
      snapMessage += "• Transfer Bank (BCA, BNI, BRI, dll)\n";
      snapMessage += "• Kartu Kredit/Debit\n\n";
      snapMessage += "⏱️ Link berlaku 24 jam\n";
      snapMessage += "🔍 Ketik *cek* untuk cek status";

      return {
        message: snapMessage,
        qrisData: null,
      };
    }

    // ... existing Xendit logic ...
  }

  async handleCheckout(customerId, message) {
    // Update payment menu to include Midtrans
    if (message === "checkout" || message === "buy" || message === "order") {
      // ... existing code ...

      orderMessage += "7️⃣ *Midtrans Snap* - Semua metode (UI lengkap)\n\n";

      // ... rest of code ...
    }
  }
}
```

### 3. Add Webhook Handler (Optional)

For automatic payment verification via webhook:

```javascript
// index.js or create separate webhook server
const express = require("express");
const app = express();

app.use(express.json());

app.post("/midtrans-webhook", async (req, res) => {
  const notification = req.body;
  const midtransService = require("./midtransService");

  const result = await midtransService.handleNotification(notification);

  if (result.success && result.isPaid) {
    const customerId = sessionManager.findCustomerByOrderId(result.orderId);

    if (customerId) {
      // Auto-deliver products
      const session = sessionManager.getSession(customerId);
      const ProductDelivery = require("./productDelivery");
      const productDelivery = new ProductDelivery();

      const deliveryResult = productDelivery.deliverProducts(
        customerId,
        result.orderId,
        session.cart
      );

      if (deliveryResult.success) {
        // Send products via WhatsApp
        for (const product of deliveryResult.products) {
          let msg = `🎁 *${product.name}*\n\n`;
          msg += `📧 Email: ${product.email}\n`;
          msg += `🔐 Password: ${product.password}`;

          await client.sendMessage(customerId, msg);
        }
      }

      sessionManager.clearCart(customerId);
      sessionManager.setStep(customerId, "menu");
    }
  }

  res.sendStatus(200);
});

app.listen(3000, () => {
  console.log("Webhook server running on port 3000");
});
```

## Testing

### Sandbox Credentials

Get from: https://dashboard.midtrans.com/ (Sandbox mode)

**Test Cards:**

- Card Number: `4811 1111 1111 1114`
- Expiry: Any future date
- CVV: `123`

**Test E-Wallets:**

- GoPay: Use Midtrans simulator
- ShopeePay: Use Midtrans simulator

## Production Deployment

1. **Change to Production Keys**:

   ```env
   MIDTRANS_IS_PRODUCTION=true
   MIDTRANS_SERVER_KEY=your_production_server_key
   MIDTRANS_CLIENT_KEY=your_production_client_key
   ```

2. **Setup Webhook** (optional but recommended):

   - Go to Dashboard → Settings → Configuration
   - Add webhook URL: `https://yourdomain.com/midtrans-webhook`
   - Save

3. **Test Production**:
   - Use real payment methods
   - Monitor Dashboard for transactions

## Comparison: Xendit vs Midtrans

| Feature                  | Xendit    | Midtrans |
| ------------------------ | --------- | -------- |
| **QRIS**                 | ✅        | ✅       |
| **OVO**                  | ✅        | ❌       |
| **DANA**                 | ✅        | ✅       |
| **GoPay**                | ✅        | ✅       |
| **ShopeePay**            | ✅        | ✅       |
| **LinkAja**              | ✅        | ❌       |
| **Bank VA**              | ✅        | ✅       |
| **Credit Card**          | ❌        | ✅       |
| **Snap UI**              | ❌        | ✅       |
| **Direct API**           | ✅        | ✅       |
| **Node SDK**             | ✅        | ✅       |
| **WhatsApp Integration** | Excellent | Good     |

## Recommendation

**Use Xendit (current implementation)** for:

- Pure WhatsApp experience (no redirect)
- Better e-wallet coverage (OVO, LinkAja)
- More control over UI/UX

**Add Midtrans** if you need:

- Credit card support
- All-in-one Snap payment page
- Easiest integration (single endpoint)

## Support

- **Midtrans Docs**: https://docs.midtrans.com/
- **API Reference**: https://api-docs.midtrans.com/
- **Support**: https://midtrans.com/contact-us

## Notes

- Midtrans Snap requires redirect, less seamless than Xendit in WhatsApp
- For WhatsApp-first experience, Xendit is recommended (current implementation)
- Midtrans is best for web/app integrations, can be added as alternative payment option
