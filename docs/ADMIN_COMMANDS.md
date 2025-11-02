# Admin Commands Reference

## 📋 Overview

Panduan lengkap perintah admin untuk mengelola chatbot WhatsApp Premium Shop.

## 🔐 Akses Admin

Hanya nomor WhatsApp yang terdaftar di file `.env` yang bisa menggunakan perintah admin:

```
ADMIN_NUMBER_1=6281234567890
ADMIN_NUMBER_2=6289876543210
```

---

## 💳 Sistem Pembayaran

Bot ini menggunakan **sistem hybrid** untuk pembayaran:

### QRIS (Otomatis via Xendit)

- Xendit menghasilkan QR code unik per pesanan
- Pembayaran terverifikasi otomatis via webhook
- Produk dikirim otomatis setelah pembayaran sukses

### E-Wallet & Bank Transfer (Manual)

- Pelanggan transfer ke akun pribadi admin
- Pelanggan kirim bukti transfer (screenshot)
- Admin verifikasi manual dan approve pesanan
- Produk dikirim setelah `/approve`

**Keuntungan sistem manual:**

- Biaya lebih rendah (tidak ada fee Xendit)
- Uang langsung masuk ke akun pribadi
- Kontrol penuh atas verifikasi pembayaran

**Konfigurasi akun pembayaran:**
Edit file `.env` untuk mengatur akun e-wallet dan bank:

```env
# E-Wallet Accounts
DANA_NUMBER=081234567890
DANA_NAME=Your Name
DANA_ENABLED=true

# Bank Accounts
BCA_ACCOUNT=1234567890
BCA_NAME=Your Name
BCA_ENABLED=true
```

---

## 📦 Manajemen Produk

### 1. Tambah Produk Baru

**Command:** `/addproduct`

**Format:**

```
/addproduct <id> | <name> | <price> | <description> | <stock> | <category>
```

**Contoh:**

```
/addproduct hbo | HBO Max Premium (1 Month) | 1.2 | Full HD streaming, all content | 10 | premium

/addproduct vcc-gold | Virtual Credit Card - Gold | 3 | Pre-loaded $100 balance | 5 | vcc
```

**Kategori yang valid:**

- `premium` - Akun premium (Netflix, Spotify, dll)
- `vcc` - Virtual credit card

**Catatan:**

- ID harus unik (tidak boleh sama dengan produk lain)
- Harga dalam USD
- Stok harus angka >= 0

---

### 2. Edit Produk

**Command:** `/editproduct`

**Format:**

```
/editproduct <id> | <field> | <newValue>
```

**Field yang bisa diedit:**

- `name` - Nama produk
- `price` - Harga (USD)
- `description` - Deskripsi

**Contoh:**

```
/editproduct netflix | name | Netflix Premium HD (1 Month)

/editproduct spotify | price | 1.5

/editproduct youtube | description | Ad-free, 4K quality, background play
```

---

### 3. Hapus Produk

**Command:** `/removeproduct`

**Format:**

```
/removeproduct <productId>
```

**Contoh:**

```
/removeproduct hbo

/removeproduct vcc-gold
```

**⚠️ PERHATIAN:** Produk yang dihapus tidak bisa dikembalikan!

---

### 4. Kelola Stok

**Command:** `/stock`

**Format untuk melihat semua stok:**

```
/stock
```

**Format untuk update stok:**

```
/stock <productId> <jumlah>
```

**Contoh:**

```
/stock netflix 50

/stock spotify 0
```

**Indikator stok:**

- ✅ Stok > 10 (Aman)
- ⚠️ Stok 1-10 (Menipis)
- ❌ Stok 0 (Habis)

---

### 5. Settings & Konfigurasi

**Command:** `/settings`

**Format untuk melihat semua settings:**

```
/settings
```

**Format untuk melihat panduan:**

```
/settings help
```

**Format untuk update setting:**

```
/settings <key> <value>
```

**Kategori Settings:**

**� Currency & Pricing:**

- `usdToIdrRate` - Kurs USD ke IDR

```
/settings usdToIdrRate 16000
```

**⏱️ Session & Rate Limit:**

- `sessionTimeout` - Timeout session dalam menit
- `maxMessagesPerMinute` - Batas pesan per menit

```
/settings sessionTimeout 45
/settings maxMessagesPerMinute 30
```

**🏪 Business Info:**

- `shopName` - Nama toko
- `supportEmail` - Email support
- `supportWhatsapp` - Nomor WA support

```
/settings shopName "Toko Voucher ID"
/settings supportEmail support@toko.com
```

**📦 Delivery & Stock:**

- `autoDeliveryEnabled` - Auto kirim produk (true/false)
- `lowStockThreshold` - Batas stok rendah

```
/settings autoDeliveryEnabled true
/settings lowStockThreshold 10
```

**🔧 System:**

- `maintenanceMode` - Mode maintenance (true/false)
- `welcomeMessageEnabled` - Welcome message (true/false)
- `logLevel` - Level logging (info/debug/error)

```
/settings maintenanceMode false
/settings logLevel debug
```

**⚠️ Catatan:**

- Settings bersifat temporary (hilang saat restart)
- Untuk permanent, edit file `.env` dan restart bot
- Gunakan `/settings help` untuk panduan lengkap

---

## �📊 Monitoring & Statistik

### 6. Lihat Statistik

**Command:** `/stats`

Menampilkan:

- Total order hari ini
- Total revenue hari ini
- Jumlah customer aktif
- Status sistem (uptime, memory)

---

### 7. Cek Status Bot

**Command:** `/status`

Menampilkan:

- Status koneksi WhatsApp
- Uptime bot
- Jumlah session aktif
- Status Redis (jika digunakan)

---

## 💳 Manajemen Order

### 8. Approve Order

**Command:** `/approve`

**Format:**

```
/approve <order_id>
```

**Contoh:**

```
/approve ORD-1730000000000-1234
```

**Fungsi:**

- Approve pembayaran manual
- Trigger pengiriman produk otomatis ke customer
- Update status order ke "completed"

---

## 📢 Komunikasi

### 9. Broadcast Message

**Command:** `/broadcast`

**Format:**

```
/broadcast <pesan>
```

**Contoh:**

```
/broadcast Promo spesial! Diskon 20% semua produk hari ini! 🎉

/broadcast Server maintenance dalam 30 menit. Mohon selesaikan transaksi Anda.
```

**Fungsi:**

- Kirim pesan ke semua customer yang punya session aktif
- Berguna untuk promo, pengumuman, maintenance notice

---

## 📝 Best Practices

### Manajemen Produk

1. **Gunakan ID yang jelas dan konsisten**

   - ✅ `netflix-hd`, `spotify-premium`, `vcc-basic`
   - ❌ `prod1`, `test123`, `xyz`

2. **Set harga dalam USD (akan dikonversi ke IDR otomatis)**

   - 1 USD = Rp 15.800 (default)
   - Bisa diubah di `.env`: `USD_TO_IDR_RATE=16000`

3. **Deskripsi harus informatif**

   - ✅ "Full HD streaming, 4 screens, offline download"
   - ❌ "Netflix account"

4. **Monitor stok secara berkala**
   - Gunakan `/stock` setiap pagi
   - Set alert ketika stok < 5

### Manajemen Order

1. **Approve order dalam 5-15 menit**

   - Response time penting untuk customer satisfaction
   - Gunakan `/approve` setelah verifikasi pembayaran

2. **Gunakan transaction log untuk audit**
   - Semua action tercatat di `logs/transactions-YYYY-MM-DD.log`
   - Review log setiap minggu

### Security

1. **Jangan share credentials admin**

   - Admin number harus rahasia
   - Ganti nomor jika terexpose

2. **Backup data berkala**
   - Backup `.wwebjs_auth/` folder (session WhatsApp)
   - Backup `products_data/` folder (kredensial produk)
   - Backup `logs/` folder

---

## 🚨 Troubleshooting

### Error: "Tidak diizinkan"

- **Penyebab:** Nomor tidak terdaftar sebagai admin
- **Solusi:** Tambahkan nomor ke `.env` dan restart bot

### Produk tidak muncul setelah ditambah

- **Penyebab:** Customer masih di step lama
- **Solusi:** Suruh customer ketik `menu` untuk refresh

### Stock tidak update

- **Penyebab:** Redis connection issue (jika pakai Redis)
- **Solusi:** Check Redis service, atau restart bot

### Broadcast tidak terkirim

- **Penyebab:** Rate limit WhatsApp
- **Solusi:** Kurangi frekuensi broadcast, max 1x per jam

---

## 📞 Support

Jika ada masalah atau pertanyaan, check:

- `docs/` folder untuk dokumentasi lengkap
- `logs/` folder untuk error logs
- GitHub Issues untuk bug report

---

**Last Updated:** November 2, 2025
**Version:** 1.0.0 (Production Ready)
