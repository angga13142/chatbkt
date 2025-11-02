# Payment System Documentation

## 🎯 System Overview

Bot ini menggunakan **hybrid payment system** yang mengoptimalkan biaya dan kemudahan:

- **QRIS**: Otomatis via Xendit (convenient untuk pelanggan)
- **E-Wallet & Bank Transfer**: Manual ke akun pribadi (biaya lebih rendah)

## 💳 Payment Methods

### 1. QRIS (Automated) ✅

**Provider:** Xendit  
**Flow:**

1. Customer pilih QRIS
2. Bot generate QR code unique (via Xendit API)
3. Customer scan & bayar
4. Xendit webhook otomatis verifikasi
5. Bot otomatis kirim produk

**Advantages:**

- Instant verification
- No manual work required
- Professional experience

**Configuration:**

```env
XENDIT_SECRET_KEY=xnd_development_...
XENDIT_WEBHOOK_TOKEN=...
WEBHOOK_URL=https://yourdomain.com
```

---

### 2. E-Wallet (Manual) 💰

**Supported:** DANA, GoPay, OVO, ShopeePay  
**Flow:**

1. Customer pilih e-wallet
2. Bot tampilkan nomor admin's e-wallet
3. Customer transfer manual
4. Customer kirim screenshot bukti
5. Admin verifikasi & approve: `/approve <orderId>`
6. Bot kirim produk

**Advantages:**

- Zero transaction fees
- Direct to owner's account
- No Xendit costs

**Configuration:**

```env
# E-Wallet Accounts
DANA_NUMBER=081234567890
DANA_NAME=John Doe
DANA_ENABLED=true

GOPAY_NUMBER=081234567890
GOPAY_NAME=John Doe
GOPAY_ENABLED=true

OVO_NUMBER=081234567890
OVO_NAME=John Doe
OVO_ENABLED=true

SHOPEEPAY_NUMBER=081234567890
SHOPEEPAY_NAME=John Doe
SHOPEEPAY_ENABLED=true
```

---

### 3. Bank Transfer (Manual) 🏦

**Supported:** BCA, BNI, BRI, Mandiri  
**Flow:**

1. Customer pilih bank
2. Bot tampilkan nomor rekening admin
3. Customer transfer via m-banking/ATM
4. Customer kirim screenshot bukti
5. Admin verifikasi & approve: `/approve <orderId>`
6. Bot kirim produk

**Advantages:**

- Lower fees than payment gateway
- Direct to owner's account
- Professional appearance

**Configuration:**

```env
# Bank Accounts
BCA_ACCOUNT=1234567890
BCA_NAME=John Doe
BCA_ENABLED=true

BNI_ACCOUNT=1234567890
BNI_NAME=John Doe
BNI_ENABLED=true

BRI_ACCOUNT=1234567890
BRI_NAME=John Doe
BRI_ENABLED=true

MANDIRI_ACCOUNT=1234567890
MANDIRI_NAME=John Doe
MANDIRI_ENABLED=true
```

---

## 🔧 Configuration Guide

### Step 1: Setup Payment Accounts

Edit `.env` file dengan akun pribadi Anda:

```bash
# E-Wallet - ganti dengan nomor Anda
DANA_NUMBER=0812XXXXXXXX
DANA_NAME=Nama Lengkap Anda
DANA_ENABLED=true  # Set false untuk disable

# Bank - ganti dengan rekening Anda
BCA_ACCOUNT=1234567890
BCA_NAME=Nama Lengkap Sesuai Rekening
BCA_ENABLED=true  # Set false untuk disable
```

### Step 2: Enable/Disable Methods

Untuk menonaktifkan metode pembayaran tertentu:

```bash
# Disable DANA
DANA_ENABLED=false

# Disable BCA
BCA_ENABLED=false
```

### Step 3: Test Payment Flow

```bash
# Start bot
npm start

# Test sebagai customer:
# 1. Browse produk
# 2. Add to cart
# 3. Checkout
# 4. Pilih metode pembayaran
# 5. Verifikasi instruksi muncul dengan benar
```

---

## 🛠️ Admin Workflow

### Manual Payment Verification

1. **Customer transfers** dan kirim screenshot
2. **Check payment** di aplikasi e-wallet/m-banking
3. **Verify amount** sesuai order ID
4. **Approve order:**
   ```
   /approve ORD-12345
   ```
5. Bot **otomatis kirim** produk ke customer

### Managing Payment Accounts

Via `/settings` command:

```
/settings
```

Select **"Pembayaran"** untuk:

- Update nomor e-wallet
- Update rekening bank
- Enable/disable metode pembayaran
- Update nama pemilik akun

---

## 📊 Cost Comparison

### QRIS (Xendit)

- **Fee:** ~0.7% per transaksi
- **Minimum:** Rp 1,000/transaksi
- **Example:** Order Rp 50,000 → Fee ~Rp 350

### Manual E-Wallet/Bank

- **Fee:** Rp 0 (direct to owner)
- **Benefit:** 100% profit
- **Example:** Order Rp 50,000 → Fee Rp 0

**Total savings:** ~0.7% per manual transaction

---

## 🚀 Migration from Old System

If migrating from full Xendit integration:

### Changes Made

1. **QRIS:** No changes (still Xendit)
2. **E-Wallet:** Removed Xendit API, now manual
3. **Bank Transfer:** Removed Virtual Account, now manual
4. **Removed:** PERMATA bank option

### Updated Files

- `config.js` - Added `paymentAccounts` configuration
- `lib/paymentHandlers.js` - Updated e-wallet/bank handlers
- `lib/paymentMessages.js` - Added manual payment templates
- `.env` - Added payment account variables

### Testing

Run test suite:

```bash
node tests/test-manual-payments.js
```

All 6 tests should pass:

- ✅ Payment accounts configuration
- ✅ E-wallet message templates
- ✅ Bank transfer message templates
- ✅ All 8 payment methods
- ✅ Disabled status checking
- ✅ Edge case handling

---

## 🔍 Troubleshooting

### Problem: Customer tidak terima instruksi pembayaran

**Solution:**

1. Check `.env` konfigurasi akun payment
2. Verify `*_ENABLED=true` untuk metode yang dipilih
3. Check logs: `tail -f logs/app.log`

### Problem: Admin tidak bisa approve payment

**Solution:**

1. Verify nomor admin di `.env`:
   ```
   ADMIN_NUMBER_1=628XXXXXXXXX
   ```
2. Check order ID: `/approve ORD-XXXXX`
3. Check session: Order harus ada di memory

### Problem: Message format tidak sesuai

**Solution:**

1. Check `lib/paymentMessages.js` templates
2. Verify format tidak corrupt (check quotes)
3. Test dengan: `node tests/test-manual-payments.js`

### Problem: QRIS masih pakai Xendit untuk e-wallet

**Solution:**

- QRIS tetap pakai Xendit (by design)
- E-wallet & Bank sekarang manual
- Check `handleEWalletPayment()` in `lib/paymentHandlers.js`

---

## 📝 Best Practices

### Security

1. **Never commit `.env`** dengan payment details asli
2. **Verify payments manually** sebelum approve
3. **Check amount matches** order total
4. **Validate customer** sebelum kirim produk

### Customer Experience

1. **Respond quickly** to payment proofs (target: <15 min)
2. **Clear instructions** in payment messages
3. **Friendly approval** messages
4. **Track common issues** and update docs

### Operations

1. **Daily reconciliation** - match orders dengan bank statements
2. **Enable notifications** untuk incoming transfers
3. **Backup order logs** regularly
4. **Monitor failed payments** dan follow up

---

## 📚 Related Documentation

- **Admin Commands:** [ADMIN_COMMANDS.md](./ADMIN_COMMANDS.md)
- **Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Deployment:** [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Xendit Setup:** [XENDIT_SETUP.md](./XENDIT_SETUP.md)

---

## 💡 Future Enhancements

Potential improvements:

1. **Auto-screenshot detection** - Detect image uploads, prompt for order ID
2. **Payment reminders** - Auto-remind after 30 min if no payment proof
3. **Multiple accounts** - Rotate between multiple owner accounts
4. **Receipt generation** - Auto-generate PDF receipts
5. **Analytics dashboard** - Track payment method usage

---

**Last Updated:** January 2025  
**Version:** 2.0 (Hybrid Payment System)
