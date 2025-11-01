# Xendit Integration Quick Start

## Setup (5 menit)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Required for Xendit
XENDIT_SECRET_KEY=xnd_development_your_key_here
USD_TO_IDR_RATE=15800

# Optional
XENDIT_WEBHOOK_TOKEN=your_webhook_token
WEBHOOK_URL=https://yourdomain.com
```

### 3. Get Xendit API Key

1. Register: https://dashboard.xendit.co/register
2. Verify email
3. Go to **Settings → Developers → API Keys**
4. Copy **Secret Key** (sandbox mode)
5. Paste to `.env` as `XENDIT_SECRET_KEY`

### 4. Start Bot

```bash
npm start
```

## Payment Flow

**Customer Experience:**

```
1. Customer: "checkout"
   Bot: Payment method menu (QRIS/OVO/DANA/GoPay/ShopeePay/Bank)

2. Customer: "1" (QRIS)
   Bot: Sends QR code image

3. Customer: Scans & pays

4. Customer: "cek"
   Bot: "✅ Payment SUCCESS! Here are your products..."
   Auto-delivers credentials
```

## Supported Payment Methods

✅ **QRIS** - Universal QR (all e-wallets + banks)  
✅ **OVO** - E-Wallet OVO  
✅ **DANA** - E-Wallet DANA  
✅ **GoPay** - E-Wallet GoPay  
✅ **ShopeePay** - E-Wallet ShopeePay  
✅ **Bank Transfer** - BCA, BNI, BRI, Mandiri, Permata

## Testing

### Test QRIS (Sandbox)

1. Customer types "checkout" → "1" (QRIS)
2. Bot sends QR code
3. Use Xendit simulator: https://dashboard.xendit.co/
4. Mark payment as SUCCESS in dashboard
5. Customer types "cek"
6. Bot auto-delivers products

### Test E-Wallet (Sandbox)

1. Customer types "checkout" → "2" (OVO)
2. Bot sends payment link
3. Click link → Use test credentials from Xendit docs
4. Complete payment
5. Customer types "cek"
6. Bot auto-delivers

## File Structure

```
chatbot/
├── xenditService.js       # Xendit API integration
├── chatbotLogic.js        # Updated with payment selection
├── sessionManager.js      # Payment tracking
├── index.js               # QR code & delivery handler
├── .env                   # Configuration
├── MIDTRANS.md           # Alternative gateway docs
└── payment_qris/         # Generated QR codes
```

## Production Checklist

- [ ] Get Xendit production API key
- [ ] Update `XENDIT_SECRET_KEY` in `.env`
- [ ] Test all payment methods
- [ ] Setup webhook (optional but recommended)
- [ ] Monitor transactions in Xendit dashboard
- [ ] Add products to `products_data/` directory

## Troubleshooting

**Error: "XENDIT_SECRET_KEY not configured"**
→ Add `XENDIT_SECRET_KEY=xnd_...` to `.env`

**QR code not sending**
→ Check `payment_qris/` directory permissions: `chmod 755 payment_qris`

**Payment status always PENDING**
→ In sandbox, manually mark as SUCCESS in Xendit dashboard

**"Failed to create payment"**
→ Check Xendit dashboard for error details
→ Verify API key is correct

## Support

- **Xendit Docs**: https://docs.xendit.co/
- **API Reference**: https://developers.xendit.co/api-reference/
- **Dashboard**: https://dashboard.xendit.co/
- **Support**: support@xendit.co

## Next: Add Midtrans (Optional)

See `MIDTRANS.md` for Midtrans Snap API integration (credit card support, all-in-one UI).
