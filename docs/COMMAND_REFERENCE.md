# Command Reference - WhatsApp Shopping Chatbot

📅 **Last Updated:** November 3, 2025  
📖 **Purpose:** Comprehensive command reference for both admin and customer users

---

## 🎯 Quick Access

- **Customer:** Type `help` or `menu` anytime
- **Admin:** Type `/help` anytime
- **Total Commands:** 22 Admin + 35+ Customer commands

---

## 👨‍💼 ADMIN COMMANDS (22 Total)

All admin commands require `/` prefix and admin authorization.

### 📦 Order & Communication (2 commands)

```
/approve <order-id>         Approve payment and deliver products
/broadcast <message>        Send message to all active customers
```

### 📊 Analytics & Stats (2 commands)

```
/stats [days]              Dashboard analytics (default: 30 days)
                           Shows revenue, orders, conversion, top products
/status                    System status (RAM, uptime, Redis, logs)
```

### 🏷️ Product Management (5 commands)

```
/stock [id] [qty]          View all stock or update specific product
/addproduct <data>         Add new product (id|name|price|desc|category)
/editproduct <id> <field>  Edit product field (price, name, description)
/removeproduct <id>        Remove product from catalog
/generate-desc <id>        AI-generate product description
```

### 📦 Inventory Management (5 commands)

```
/addstock <id> <cred>      Add single credential to product
/addstock-bulk <id>        Enter bulk add mode for multiple credentials
/syncstock                 Sync stock from products_data/ folder
/stockreport               View stock report for all products
/salesreport [days]        Sales report with revenue (default: 30 days)
```

### 🎟️ Promo Management (4 commands)

```
/createpromo <CODE> <disc%> <days>   Create promo code
                                     Example: /createpromo DISC10 10 30
/listpromos                          List all active promos
/deletepromo <CODE>                  Delete promo code
/promostats [CODE]                   Promo usage statistics
```

### ⭐ Review Management (3 commands)

```
/reviews <product-id>      View all reviews for product
/reviewstats               Overall review statistics
/deletereview <id> <idx>   Delete review by index
```

### ⚙️ Settings (1 command)

```
/settings [key] [value]    View or update bot settings
```

---

## 🛒 CUSTOMER COMMANDS (35+ Total)

Customer commands do NOT require `/` prefix (but `/` is optional for some commands).

### 🏠 Navigation (5 commands)

```
menu                       Return to main menu
help                       Show main menu (alias for menu)
browse / products         Browse product catalog
about                     About the shop
support / contact         Contact support information
```

**Alternative formats:**

- Numbers: `1` (browse), `2` (cart), `3` (about), `4` (support)
- With slash: `/menu`, `/help` (optional)

### 🛒 Shopping (6 commands)

```
cart                      View shopping cart
checkout / buy / order    Proceed to payment
clear                     Clear shopping cart
promo <CODE>              Apply promo code (during checkout)
<product-name>            Add product to cart (while browsing)
```

**Examples:**

- `netflix` - Add Netflix to cart
- `spotify premium` - Fuzzy search for Spotify
- `promo DISC10` - Apply 10% discount

### ⭐ Wishlist/Favorites (4 commands)

```
wishlist / /wishlist      View wishlist
simpan <product>          Add product to wishlist (Indonesian)
⭐ <product>              Add product to wishlist (emoji shortcut)
hapus <product>           Remove product from wishlist (Indonesian)
```

**Examples:**

- `simpan netflix`
- `⭐ spotify`
- `hapus disney`

**English alternatives (also work):**

- `save <product>`
- `remove <product>`

### 📦 Order Tracking (3 commands)

```
history / /history        View order history (all orders)
track / /track <id>       Track specific order by ID
review <id> <rating> <text>   Add product review (1-5 stars)
```

**Examples:**

- `track ORD-1234567890123-c.us`
- `/track` (shows all orders)
- `review netflix 5 Bagus banget!`

### 💳 Payment Methods (7 commands - during checkout)

```
qris                      Pay via QRIS (any e-wallet)
transfer / bank           Pay via bank transfer
ovo                       Pay via OVO
dana                      Pay via DANA
gopay                     Pay via GoPay
shopeepay                 Pay via ShopeePay
batal                     Cancel current order
```

---

## 🔄 Command Aliases

Many commands have multiple aliases for flexibility:

| Primary Command | Aliases                         |
| --------------- | ------------------------------- |
| `menu`          | `help`                          |
| `browse`        | `products`, `produk`, `1`       |
| `cart`          | `keranjang`, `2`                |
| `about`         | `3`                             |
| `support`       | `contact`, `4`                  |
| `checkout`      | `buy`, `order`, `beli`, `pesan` |
| `history`       | `/history`, `riwayat`           |
| `track`         | `/track`, `lacak`               |
| `wishlist`      | `/wishlist`, `favorit`          |
| `simpan`        | `save`, `⭐`                    |
| `hapus`         | `remove`, `delete`              |
| `clear`         | `hapus`, `kosongkan`            |

---

## 💡 Best Practices

### For Customers:

1. **Natural Language:** Just type product names while browsing

   - ✅ `netflix`
   - ✅ `spotify premium`
   - ✅ `virtual credit card` (fuzzy search works!)

2. **Quick Commands:** Use shortcuts

   - ✅ `1` instead of `browse`
   - ✅ `2` instead of `cart`
   - ✅ `⭐ netflix` to save to wishlist

3. **Optional Prefix:** Use `/` if you prefer

   - ✅ `history` = `/history`
   - ✅ `track` = `/track`

4. **Case Insensitive:** Commands work in any case
   - ✅ `MENU` = `menu` = `Menu`

### For Admins:

1. **Always use `/` prefix** - Required for security

   - ✅ `/approve ORD-123`
   - ❌ `approve ORD-123` (won't work)

2. **Use /help** - Shows complete command list

   ```
   /help
   ```

3. **Bulk Operations** - Use bulk commands for efficiency

   ```
   /addstock-bulk netflix
   /syncstock
   /salesreport 7
   ```

4. **Regular Checks** - Monitor system health
   ```
   /status        (check system)
   /stockreport   (check inventory)
   /stats 7       (weekly dashboard)
   ```

---

## 🔍 Command Discovery

### Finding Available Commands:

1. **Customer:**

   - Type `help` or `menu` at any time
   - Menu shows all available commands organized by category
   - Commands are context-aware (different commands available at different steps)

2. **Admin:**
   - Type `/help` at any time
   - Shows all 22 admin commands with descriptions
   - Commands organized into 7 categories

### Step-Based Commands:

Customer commands availability depends on current step:

| Step          | Available Commands                                 |
| ------------- | -------------------------------------------------- |
| **MENU**      | browse, cart, about, support + all global          |
| **BROWSING**  | <product-name>, simpan, hapus + all global         |
| **CHECKOUT**  | checkout, clear, promo + all global                |
| **PAYMENT**   | qris, transfer, ovo, dana, gopay, shopeepay, batal |
| **ALL STEPS** | menu, help, cart, wishlist, history, track, review |

---

## 🚀 Command Flow Examples

### Example 1: Customer Shopping Flow

```
Customer: menu
Bot: [Shows main menu with all commands]

Customer: 1
Bot: [Shows product catalog with stock]

Customer: netflix
Bot: ✅ Netflix added to cart

Customer: simpan spotify
Bot: ✅ Spotify added to wishlist

Customer: cart
Bot: [Shows cart: Netflix, total Rp 15.800]

Customer: checkout
Bot: [Shows payment options]

Customer: qris
Bot: [Generates QRIS code]

[Customer uploads payment proof]

Admin: /approve ORD-123
Bot: ✅ Delivers Netflix credentials to customer
```

### Example 2: Admin Management Flow

```
Admin: /help
Bot: [Shows all 22 admin commands]

Admin: /stats 7
Bot: [Shows weekly dashboard with revenue, orders, etc.]

Admin: /stockreport
Bot: [Shows stock for all products]

Admin: /syncstock
Bot: ✅ Synced from products_data/: 2 updated, 4 unchanged

Admin: /addstock-bulk netflix
Bot: [Enters bulk add mode]

Admin: email1:pass1
Admin: email2:pass2
Admin: done
Bot: ✅ Added 2 credentials for Netflix
```

---

## 📝 Notes

1. **Command Consistency:**

   - Admin: Always use `/` prefix
   - Customer: Prefix optional (natural language preferred)

2. **Language Mix:**

   - Admin: All English commands
   - Customer: Mix of Indonesian (`simpan`, `hapus`) and English (`menu`, `cart`)
   - Both languages supported for better UX

3. **Fuzzy Search:**

   - Customer can type approximate product names
   - Bot auto-corrects typos and finds closest match
   - Example: "netfix" → Netflix, "spotif" → Spotify

4. **Case Insensitivity:**

   - All commands work regardless of case
   - `MENU` = `menu` = `Menu`

5. **Context Awareness:**
   - Bot understands context based on current step
   - Same word can mean different things in different steps
   - Global commands always accessible

---

## 🔧 Implementation Details

### Admin Command Routing

Admin commands use **Map-based O(1) lookup** for performance:

```javascript
this.commandRoutes = {
  "/help": () => this.showAdminHelp(),
  "/approve": (adminId, msg) => this.orderHandler.handleApprove(adminId, msg),
  // ... 20 more commands
};
```

### Customer Command Routing

Customer commands use **step-based routing** with fuzzy matching:

1. Check global commands (menu, cart, help, etc.)
2. Route to step-specific handler
3. Use fuzzy search for product names
4. AI fallback for ambiguous queries

---

## 📚 Related Documentation

- **Admin Commands:** See `docs/ADMIN_COMMANDS.md`
- **Command Consistency:** See `docs/COMMAND_CONSISTENCY_ANALYSIS.md`
- **Architecture:** See `docs/ARCHITECTURE.md`
- **Implementation:** See `docs/MODULARIZATION.md`

---

**Status:** ✅ Complete - All commands documented and tested  
**Author:** GitHub Copilot + benihutapea  
**Version:** 1.0 (November 3, 2025)
