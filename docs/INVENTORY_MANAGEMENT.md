# Inventory Management via WhatsApp

## Overview

Sistem inventory management yang memungkinkan admin menambahkan product credentials (email:password) langsung dari WhatsApp, tanpa perlu edit file manual di server.

## Features

### 1. Add Single Credential

Admin dapat menambahkan 1 akun sekaligus.

**Command:**

```
/addstock <product-id> <email:password>
```

**Examples:**

```
/addstock netflix premium@netflix.com:Password123!
/addstock spotify music@domain.com:Spotify456!
/addstock youtube-premium yt@gmail.com:YT2024!
```

**Supported Formats:**

- `email:password` (recommended)
- `email|password`
- `email,password`

**Response:**

```
✅ Credentials berhasil ditambahkan!

📦 Produk: netflix
📊 Stok sekarang: 15

💾 Credentials tersimpan dan siap dijual!
```

---

### 2. Bulk Add Credentials

Admin dapat menambahkan banyak akun sekaligus (multi-line input).

**Command:**

```
/addstock-bulk <product-id>
```

**Example:**

```
/addstock-bulk netflix
```

**Bot Response:**

```
📝 Mode Bulk Add untuk: netflix

Silakan kirim credentials sekarang (satu per baris):

Format per baris:
`email:password` atau `email|password`

Contoh:
```

premium1@netflix.com:Pass123!
premium2@netflix.com:Secret456!
premium3@netflix.com:Secure789!

```

Kirim "done" atau "selesai" jika sudah selesai.
```

**Admin Sends:**

```
premium1@netflix.com:Pass123!
premium2@netflix.com:Secret456!
premium3@netflix.com:Secure789!
premium4@netflix.com:Password456!
premium5@netflix.com:Secure2024!
```

**Bot Response:**

```
✅ Bulk add berhasil!

📦 Produk: netflix
✅ Berhasil: 5
❌ Gagal: 0
📊 Total stok: 20

Kirim lagi untuk tambah, atau "done" untuk selesai.
```

**Admin Sends:** `done`

**Bot Response:**

```
✅ Bulk add selesai! Gunakan /stockreport untuk melihat stok.
```

---

### 3. Stock Report

Lihat stok semua produk.

**Command:**

```
/stockreport
```

**Response:**

```
📊 LAPORAN STOK

🟢 netflix: 20
🟡 spotify: 4
🔴 youtube-premium: 0
🟢 canva-pro: 12
🟢 chatgpt-plus: 8

📦 Total stok: 44
```

**Stock Indicators:**

- 🔴 = 0 (habis)
- 🟡 = 1-4 (low stock)
- 🟢 = 5+ (available)

---

### 4. Sales Report

Laporan penjualan dalam periode tertentu.

**Command:**

```
/salesreport [days]
```

**Examples:**

```
/salesreport          # Default: 7 days
/salesreport 30       # Last 30 days
/salesreport 1        # Today only
```

**Response:**

```
📊 SALES REPORT
Last 7 days

💰 Total penjualan: 23

Breakdown per produk:
📦 netflix: 12
📦 spotify: 6
📦 chatgpt-plus: 5
```

---

## Technical Details

### File Structure

```
chatbot/
├── src/
│   └── services/
│       └── inventory/
│           └── InventoryManager.js       # Core inventory management
├── products_data/
│   ├── netflix.txt                       # Netflix credentials (FIFO queue)
│   ├── spotify.txt                       # Spotify credentials
│   ├── youtube-premium.txt               # YouTube Premium credentials
│   └── sold/                             # Archived sold credentials
│       ├── netflix_ORD-xxx_timestamp.txt
│       └── spotify_ORD-yyy_timestamp.txt
├── logs/
│   └── inventory_transactions.log        # Transaction audit log
└── services/
    └── productDelivery.js                # Delivery service (integrated)
```

### How It Works

**Adding Credentials:**

1. Admin sends `/addstock netflix email:password`
2. System validates:
   - Admin authorization (checks against ADMIN_NUMBER_1/2/3)
   - Product ID exists
   - Credential format correct
3. Credential appended to `products_data/netflix.txt`
4. Transaction logged with unique ID
5. Stock count updated

**Selling Credentials:**

1. Customer completes checkout
2. `productDelivery.js` reads first line of `netflix.txt`
3. Credential sent to customer
4. Line removed from `netflix.txt` (FIFO)
5. Credential archived to `products_data/sold/netflix_ORD-xxx.txt`
6. Sales ledger updated

### Security Features

**1. Input Sanitization:**

- Product ID sanitized to prevent path traversal
- Only alphanumeric, dash, and underscore allowed
- Example: `../../../etc/passwd` → `etcpasswd`

**2. Admin Authorization:**

- Commands only work for whitelisted admin numbers
- Checked against env vars: `ADMIN_NUMBER_1`, `ADMIN_NUMBER_2`, `ADMIN_NUMBER_3`

**3. Transaction Logging:**

- Every inventory operation logged with unique transaction ID
- Uses Node.js `AsyncLocalStorage` for transaction tracking
- Format: `[TXN-timestamp-random] action: {data}`

**4. Credential Validation:**

- Must contain separator (`:`, `|`, or `,`)
- Minimum length: 10 characters
- Cannot be empty

### Transaction Log Format

Located in: `logs/inventory_transactions.log`

```json
{"transactionId":"TXN-1762112164658-dcb59406","timestamp":"2024-11-02T10:30:15.658Z","action":"ADD_CREDENTIALS","productId":"netflix","adminId":"6281234567890@c.us","stockCount":15,"credentialsLength":33}
{"transactionId":"TXN-1762112164667-d155d3bf","timestamp":"2024-11-02T10:30:15.667Z","action":"ADD_BULK_CREDENTIALS","productId":"spotify","adminId":"6281234567890@c.us","validCount":5,"invalidCount":1,"stockCount":20}
{"transactionId":"TXN-1762112164678-84821591","timestamp":"2024-11-02T10:35:42.678Z","action":"ARCHIVE_SOLD","productId":"netflix","orderId":"ORD-1762110987875-c.us","customerId":"6289876543210@c.us"}
```

### Sales Ledger Format

Located in: `products_data/sold/`

**Filename:** `<product-id>_<order-id>_<timestamp>.txt`

**Content (JSON):**

```json
{
  "productId": "netflix",
  "orderId": "ORD-1762110987875-c.us",
  "customerId": "6289876543210@c.us",
  "credentials": "premium@netflix.com:Password123!",
  "soldAt": "2024-11-02T10:35:42.000Z",
  "transactionId": "TXN-1762112164678-84821591"
}
```

---

## API Reference

### InventoryManager Class

Located: `src/services/inventory/InventoryManager.js`

#### Methods

**`addCredentials(productId, credentials, adminId)`**

- Add single credential
- Returns: `{ success: bool, productId, stockCount, message, error? }`

**`addBulkCredentials(productId, credentialsList, adminId)`**

- Add multiple credentials
- Returns: `{ success: bool, productId, validCount, invalidCount, stockCount, errors?, message }`

**`getStockCount(productId)`**

- Get current stock for one product
- Returns: `number`

**`getAllStockCounts()`**

- Get stock for all products
- Returns: `{ productId: count, ... }`

**`archiveSoldCredential(productId, credentials, orderId, customerId)`**

- Archive sold credential to sales ledger
- Returns: `{ success: bool, error? }`

**`getSalesReport(days)`**

- Get sales report for specified period
- Returns: `{ period, totalSales, salesByProduct }`

**`validateCredentials(credentials)`**

- Validate credential format
- Returns: `{ valid: bool, error? }`

**`sanitizeProductId(productId)`**

- Sanitize product ID (security)
- Returns: `string` (safe product ID)

---

## Best Practices

### For Admins

1. **Use descriptive emails:**

   ```
   ✅ premium-01@netflix.com:Pass123!
   ❌ a@b.com:x
   ```

2. **Strong passwords:**

   - Mix uppercase, lowercase, numbers, symbols
   - Minimum 8 characters

3. **Bulk add for efficiency:**

   - Use `/addstock-bulk` for 5+ accounts
   - Prepare list in text editor first
   - Copy-paste to WhatsApp

4. **Monitor stock:**

   - Check `/stockreport` daily
   - Restock before reaching 0
   - Set alerts for low stock

5. **Review sales:**
   - Check `/salesreport` weekly
   - Identify best-selling products
   - Plan inventory accordingly

### For Developers

1. **Never expose credentials in logs:**

   - Log only metadata (count, product ID)
   - Credentials only in encrypted files

2. **Validate all inputs:**

   - Sanitize product IDs
   - Validate credential formats
   - Check admin authorization

3. **Use transactions:**

   - Wrap operations in AsyncLocalStorage
   - Log all state changes
   - Enable audit trails

4. **Handle concurrency:**

   - File operations are atomic
   - FIFO queue prevents race conditions
   - Use file locking if needed

5. **Backup regularly:**
   - Archive sold credentials
   - Back up transaction logs
   - Keep `products_data/` in version control (gitignored)

---

## Troubleshooting

### Problem: "Invalid format" error

**Cause:** Missing separator or invalid format

**Solution:**

```
❌ email password        # Missing separator
❌ email:                # Missing password
✅ email:password        # Correct
✅ email|password        # Also correct
```

---

### Problem: Credential not delivered

**Possible causes:**

1. File doesn't exist → Check `products_data/netflix.txt`
2. File is empty → Run `/stockreport` to verify
3. Wrong product ID → Product ID must match exactly

**Solution:**

```bash
# Check if file exists
ls -la products_data/netflix.txt

# Check contents
cat products_data/netflix.txt

# Add credentials
/addstock netflix test@test.com:Pass123!
```

---

### Problem: Admin command not working

**Cause:** Not in admin whitelist

**Solution:** Add your number to `.env`:

```
ADMIN_NUMBER_1=6281234567890
ADMIN_NUMBER_2=6289876543210
ADMIN_NUMBER_3=6285555555555
```

Restart bot after changing `.env`.

---

### Problem: Bulk add shows errors

**Example:**

```
⚠️ Error (3 pertama):
• Line 1: Credentials too short
• Line 3: Credentials must include separator
• Line 5: Credentials cannot be empty
```

**Solution:** Fix invalid lines and resend. Valid lines are still added.

---

## Testing

Test suite: `tests/test-inventory-management.js`

**Run tests:**

```bash
npm test -- tests/test-inventory-management.js
```

**Test coverage:**

- ✅ Add single credential
- ✅ Add bulk credentials
- ✅ Get stock count
- ✅ Get all stock counts
- ✅ Validate credentials format
- ✅ Archive sold credential
- ✅ Get sales report
- ✅ Sanitize product ID (security)

**Success rate:** 100% (8/8 passed)

---

## Migration Guide

### From Manual File Editing

**Before:**

```bash
ssh user@server
cd /path/to/chatbot
nano products_data/netflix.txt
# Add lines manually
# Save and exit
```

**After:**

```
# From WhatsApp
/addstock netflix premium@netflix.com:Pass123!
```

**Benefits:**

- ⚡ Faster (no SSH needed)
- 📱 Mobile-friendly
- 🔒 Secure (admin-only)
- 📊 Auto-tracked
- 📝 Audit trail

---

## Roadmap

### Completed ✅

- [x] Add single credential via WhatsApp
- [x] Add bulk credentials
- [x] Stock reporting
- [x] Sales ledger
- [x] Transaction logging
- [x] Security validation
- [x] Test suite

### Planned 🔄

- [ ] Low stock alerts (automatic notifications)
- [ ] Scheduled stock reports (daily digest)
- [ ] Export sales report (CSV/Excel)
- [ ] Credential expiry tracking
- [ ] Multi-admin approval for bulk add
- [ ] Integration with Google Sheets

---

## Support

For issues or questions:

1. Check troubleshooting section above
2. Review transaction logs: `logs/inventory_transactions.log`
3. Run test suite: `npm test -- tests/test-inventory-management.js`
4. Contact developer

**Admin commands help:**

```
/help
```

---

**Last updated:** November 2, 2024  
**Version:** 1.0.0  
**Test status:** ✅ All tests passing (8/8)
