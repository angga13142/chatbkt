# WhatsApp Shopping Chatbot - Copilot Instructions

## AI Agent Guidelines

**CRITICAL - Read First:**

1. **Keep responses concise** - Save detailed summaries to agent memory instead of long replies
2. **Research before implementing** - Always check Context7 (#upstash/context7) for best practices when adding features
3. **Reference memory** - Check agent memory for project context and previous decisions
4. **Document in memory** - Update memory with implementation summaries, not user-facing responses

## Architecture Overview

This is a WhatsApp chatbot built on `whatsapp-web.js` with a stateful session manager pattern. The architecture is intentionally simple - no database, minimal dependencies - optimized for low-resource VPS deployment (1 vCPU, 2GB RAM).

**Core components:**

- `index.js` - WhatsApp client initialization, message routing, error handling, graceful shutdown
- `chatbotLogic.js` - Business logic implementing menu-driven conversation flow with step-based state machine
- `sessionManager.js` - In-memory session storage using Map, tracks cart and conversation state per customer (phone number)
- `config.js` - Product catalog with accessor functions; stock levels configurable via env vars

**Key insight:** Each customer's journey is tracked via a "step" (menu/browsing/checkout) that determines how their next message is interpreted. The `SessionManager` provides isolation - concurrent customers never interfere.

## Development Workflow

**Running locally:**

```bash
npm install
npm start  # Displays QR code - scan with WhatsApp to link
```

**Testing without WhatsApp:**

```bash
npm test  # Runs test.js - validates logic without WhatsApp connection
```

**VPS deployment:**

- Use `install-vps.sh` for automated setup (Node.js, Chromium, dependencies)
- Use PM2 for process management: `pm2 start index.js --name whatsapp-bot`
- Sessions auto-cleanup every 10 minutes; inactive sessions expire after 30 minutes

## Project-Specific Patterns

### Message Processing Flow

Messages follow a strict pipeline in `chatbotLogic.js`:

1. Normalize input (lowercase, trim)
2. Check for global commands (`menu`, `cart`) - always accessible regardless of step
3. Route to step-specific handler based on current session step
4. Update session state and return response string

**Example:** When customer types "netflix" during browsing step, `handleProductSelection()` uses fuzzy matching (partial name/ID match) to find product, adds to cart, returns confirmation message.

### Session State Machine

Three states in `sessionManager.js`:

- `menu` - Initial state, customer selects action (browse/cart/about/support)
- `browsing` - Customer can type product names to add to cart
- `checkout` - Customer reviews cart, can checkout or clear

**Critical:** Always call `sessionManager.setStep()` when transitioning states. The step determines which handler processes the next message.

### Product Configuration

Products in `config.js` have structure: `{ id, name, price, description, stock, category }`.

- Use `getProductById(id)` for exact matches
- `getAllProducts()` merges premium accounts + virtual cards with category labels
- Stock controlled by `DEFAULT_STOCK` and `VCC_STOCK` env vars

**Customization:** To add products, extend `products.premiumAccounts` or `products.virtualCards` arrays. Product ID must be unique and URL-safe (used for matching).

### Error Handling Pattern

All errors in `index.js` message handler:

1. Log to console with emoji prefix (❌)
2. Reply to customer with friendly message + support instructions
3. Never expose technical details to customers

### VPS Optimization

Puppeteer config in `index.js` disables GPU, 2D canvas, uses single-process mode for minimal memory footprint:

```javascript
args: [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--single-process",
  "--disable-gpu",
];
```

**Do not remove these flags** - they're essential for 2GB RAM constraint.

## Integration Points

**WhatsApp Web Protocol:**

- Uses `whatsapp-web.js` with `LocalAuth` strategy (stores session in `.wwebjs_auth/`)
- Two authentication methods:
  - **QR Code** (default): Scan QR code with WhatsApp phone app
  - **Pairing Code**: Enter 8-digit code in WhatsApp Linked Devices (set `USE_PAIRING_CODE=true` and `PAIRING_PHONE_NUMBER` in .env)
- Pairing code format: phone number without + or spaces (e.g., `6281234567890` for Indonesia)
- Code expires every 3 minutes and auto-refreshes
- Group messages and status updates are ignored in message handler

**No external APIs:** Payment is manual (customer receives instructions at checkout). To integrate payment, modify `handleCheckout()` in `chatbotLogic.js`.

### Payment Integration Patterns

Three payment tiers supported:

**1. Automatic QRIS (Recommended for scale):**

- Integrate QRIS payment gateway API (e.g., Midtrans, Xendit, Duitku)
- In `handleCheckout()`: generate unique QRIS code per order, send image via `message.reply(MessageMedia.fromUrl(qrisUrl))`
- Add new step `'awaiting_payment'` to session state
- Poll payment status via webhook or polling interval
- Auto-deliver product on payment confirmation
- Store order ID in session: `session.orderId = response.order_id`

**2. Semi-Automatic QRIS (Static QR per e-wallet):**

- Store static QRIS images in `/assets/qris/` (dana.jpg, ovo.jpg, gopay.jpg, shopeepay.jpg)
- In `handleCheckout()`: ask customer to select e-wallet (add `'select_payment'` step)
- Send corresponding static QR: `MessageMedia.fromFilePath('./assets/qris/dana.jpg')`
- Customer sends payment proof screenshot
- Add message handler for image messages: check `message.hasMedia` and `message.type === 'image'`
- Forward to admin or store in `/payment_proofs/` for manual verification
- Admin sends confirmation command to trigger delivery

**3. Manual (Current implementation):**

- Text-based payment instructions in `handleCheckout()`
- Customer contacts admin with proof
- No automation

**Implementation example (semi-auto):**

```javascript
// In chatbotLogic.js, add to handleCheckout()
if (message === "qris") {
  this.sessionManager.setStep(customerId, "upload_proof");
  return "Please send your payment proof screenshot.";
}

// In index.js message handler, check for images
if (message.hasMedia && message.type === "image") {
  const step = sessionManager.getStep(message.from);
  if (step === "upload_proof") {
    const media = await message.downloadMedia();
    // Save: fs.writeFileSync(`./proofs/${Date.now()}.jpg`, media.data, 'base64');
    await message.reply(
      "✅ Payment proof received! Admin will verify within 5-15 minutes."
    );
    // Notify admin via another WhatsApp number or webhook
  }
}
```

## Common Modifications

**Adding a new command:**

1. Add global command check in `processMessage()` (like `menu` and `cart`)
2. Or add to step-specific handler if only available in certain states

**Changing product prices:**
Edit `config.js` price field. All prices currently $1 for simplicity.

**Modifying messages:**
All customer-facing text is in `chatbotLogic.js` methods. Use emoji heavily (matches existing style) and keep messages concise for mobile readability.

**Session timeout:**
Modify `cleanupSessions()` interval (default: 10 min) or inactivity threshold (default: 30 min) in `index.js` and `sessionManager.js`.

**Rate limiting (prevent WhatsApp bans):**
Add message throttling in `sessionManager.js`:

```javascript
// Track messages per customer
this.messageCount = new Map(); // customerId -> {count, resetTime}

canSendMessage(customerId) {
  const limit = 20; // messages per minute
  const now = Date.now();
  const data = this.messageCount.get(customerId) || {count: 0, resetTime: now + 60000};

  if (now > data.resetTime) {
    data.count = 0;
    data.resetTime = now + 60000;
  }

  if (data.count >= limit) return false;
  data.count++;
  this.messageCount.set(customerId, data);
  return true;
}
```

In `index.js`, check before replying: `if (!sessionManager.canSendMessage(customerId)) return;`

**Admin commands:**
Add admin number whitelist in `config.js`:

```javascript
const ADMIN_NUMBERS = [process.env.ADMIN_NUMBER_1, process.env.ADMIN_NUMBER_2];

function isAdmin(customerId) {
  return ADMIN_NUMBERS.includes(customerId);
}
```

Admin commands in `chatbotLogic.js`:

- `/stats` - Show active sessions count, total orders today
- `/broadcast <message>` - Send to all active customers
- `/stock <productId> <quantity>` - Update product stock
- `/approve <orderId>` - Manually approve payment
- `/ban <number>` - Block customer

Implement in `processMessage()` before normal flow:

```javascript
if (message.startsWith("/") && isAdmin(customerId)) {
  return this.handleAdminCommand(customerId, message);
}
```

**Multi-language support:**
Create `messages/` directory with language files:

- `messages/id.js` - Bahasa Indonesia (default)
- `messages/en.js` - English

Structure:

```javascript
// messages/id.js
module.exports = {
  welcome: "👋 *Selamat datang di Premium Shop!*",
  menu: "*Apa yang ingin Anda lakukan?*",
  browse: "Jelajahi Produk",
  cart: "Lihat Keranjang",
  // ...
};
```

Store language preference in session: `session.language = 'id'`
Load messages: `const msg = require(`./messages/${session.language}.js`);`
Detect language from first message or add `/language` command

## Testing Strategy

`test.js` validates logic without WhatsApp:

- Creates mock sessions, simulates message sequences
- Tests session isolation (multiple customers don't interfere)
- Verifies cart operations and checkout flow

**Run tests after changes to core logic** - catches state machine errors before deployment.

## Critical Gotchas

1. **Session data is not persisted** - restarting the bot clears all carts. For production, use Redis:

   ```javascript
   // Install: npm install redis
   const redis = require('redis');
   const client = redis.createClient();

   // In sessionManager.js, replace Map with Redis:
   async getSession(customerId) {
     const data = await client.get(`session:${customerId}`);
     return data ? JSON.parse(data) : this.createSession(customerId);
   }

   async setSession(customerId, session) {
     await client.set(`session:${customerId}`, JSON.stringify(session), {
       EX: 1800 // 30 min TTL
     });
   }
   ```

   Redis auto-expires sessions and survives bot restarts.

2. **Product stock is decorative** - no enforcement. To add:
   - In `handleCheckout()`, check `product.stock > 0` before allowing purchase
   - Decrement in `config.js`: `product.stock--` after successful payment
   - Use Redis or DB for stock persistence: `await redis.decr(`stock:${productId}`)`
   - Add stock notifications: alert admin when `stock < 3`
3. **Payment is manual** - to automate delivery:
   - On payment confirmation, call `deliverProduct(customerId, productId)`
   - For accounts: read credentials from `products_data/${productId}.txt` (one per line)
   - Send to customer: `client.sendMessage(customerId, 'Your credentials:\nEmail: ...\nPassword: ...')`
   - For VCC: integrate with card issuer API or send pre-generated card details
   - Log delivery: append to `deliveries.log` for accounting
4. **WhatsApp rate limits** - too many messages too fast can trigger disconnects. The bot doesn't implement rate limiting.
5. **Group messages are ignored** - bot only responds to direct messages (1:1 chats).
6. **Media messages require special handling** - `message.hasMedia` must be checked separately. Download with `await message.downloadMedia()`. Send with `MessageMedia.fromFilePath(path)` or `MessageMedia.fromUrl(url)`. Supports images (QRIS), documents (invoices), audio (voice notes for support).
7. **WhatsApp Web session can expire** - monitor `disconnected` event. Implement auto-reconnect: `client.initialize()` with exponential backoff. Store QR auth in `.wwebjs_auth/` - backup this directory daily.
8. **Message order not guaranteed** - WhatsApp can deliver messages out of order under poor network. Use message IDs for idempotency: `const msgId = message.id._serialized;` Check if already processed before handling.

## File-Specific Notes

**index.js:** Entry point. Handles WhatsApp lifecycle (qr, ready, authenticated, disconnected, error events). Sets up SIGINT/SIGTERM handlers for graceful shutdown. PM2-friendly.

**chatbotLogic.js:** Pure business logic. No WhatsApp dependencies - receives message string, returns response string. This makes testing trivial.

**sessionManager.js:** Trivial key-value store wrapping a Map. Every method takes customerId (phone number like "1234567890@c.us"). Auto-updates lastActivity timestamp.

**config.js:** Static catalog. Uses `process.env` for stock defaults but has fallbacks. `formatProductList()` generates the browsing UI.

**test.js:** Standalone script (no test framework). Run with `node test.js`. All assertions are implicit (script succeeds or throws).
