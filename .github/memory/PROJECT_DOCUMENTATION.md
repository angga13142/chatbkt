# WhatsApp Shopping Chatbot - Project Documentation Memory

**Last Updated:** November 3, 2025  
**Purpose:** Critical reference for AI agents and developers

---

## 🏗️ Architecture Overview

### Current Structure (Post-Refactoring)

**Main Components:**

```
chatbot/
├── index.js (212 lines)        # Bootstrap, WhatsApp client, event handling
├── chatbotLogic.js             # Legacy: Main business logic (being phased out)
├── sessionManager.js (523 lines) # Session & cart management, Redis
├── config.js (179 lines)       # Products catalog, system settings
├── src/
│   ├── core/                   # Framework components
│   │   ├── WhatsAppClient.js
│   │   ├── EventHandler.js
│   │   ├── MessageDispatcher.js
│   │   ├── MessageRouter.js
│   │   └── DependencyContainer.js
│   ├── handlers/               # Business logic handlers
│   │   ├── AdminHandler.js (614 lines) ✅ < 700
│   │   ├── CustomerHandler.js (554 lines) ✅ < 700
│   │   ├── AdminReviewHandler.js (206 lines)
│   │   ├── AdminAnalyticsHandler.js (153 lines)
│   │   ├── AdminOrderHandler.js (155 lines)
│   │   ├── AdminInventoryHandler.js
│   │   ├── CustomerWishlistHandler.js (180 lines)
│   │   └── CustomerCheckoutHandler.js (210 lines)
│   ├── services/               # Domain services
│   │   ├── session/            # Session, Cart services
│   │   ├── payment/            # Payment services
│   │   ├── product/            # Product services
│   │   ├── promo/              # Promo code services
│   │   ├── review/             # Review services
│   │   ├── order/              # Order tracking
│   │   └── wishlist/           # Wishlist management
│   ├── models/                 # Data models
│   ├── middleware/             # Cross-cutting concerns
│   └── utils/                  # Utilities
│       ├── ErrorMessages.js (NEW - from PR #1)
│       └── ValidationHelpers.js (NEW - from PR #1)
└── lib/                        # Legacy libraries (being phased out)
```

### Key Design Patterns

1. **Delegation Pattern** - Main handlers delegate to specialized handlers
2. **Dependency Injection** - Services injected via constructors
3. **O(1) Command Routing** - Map-based routing instead of sequential if/else
4. **Single Responsibility** - Each handler has ONE clear purpose

---

## 🎯 Critical Constraints

### GitHub Actions File Size Limits

- **BLOCKING:** All files in `src/` must be < 700 lines
- **Current Status:** ✅ All handlers compliant
  - AdminHandler: 614 lines (was 966)
  - CustomerHandler: 554 lines (was 854)

### VPS Resource Constraints

- **Environment:** 1 vCPU, 2GB RAM
- **Puppeteer Config:** Single process, no GPU, no 2D canvas
- **Memory Management:** Cleanup intervals, session TTL

### Testing Requirements

- **BLOCKING:** All 251 unit tests must pass
- **Current Status:** ✅ 251/251 passing (100%)
- **Run:** `npm test`

---

## 📊 Current Features

### Phase 1: Core Features ✅

- Product browsing with fuzzy search
- Shopping cart management
- Multi-payment support (QRIS, E-wallet, Bank Transfer)
- Order tracking
- Rate limiting (20 msg/min per customer)
- Payment reminders (cron-based)

### Phase 2: Advanced Features ✅

- **Wishlist System** - Save, view, remove, move to cart
- **Promo Code System** - Create, list, delete, apply discounts
- **Review System** - Add reviews, view stats, delete (admin)
- **Inventory Management** - Stock tracking, bulk add, sales reports
- **Enhanced Dashboard** - Revenue analytics, top products

### Phase 3: Optimizations (Recent - Nov 3, 2025) ✅

- **O(1) Command Routing** - Map-based lookup (from PR #1)
- **Memory Leak Fix** - Proper interval cleanup
- **Bug Fixes** - getAllSettings(), null handling
- **Utility Classes** - ErrorMessages, ValidationHelpers

---

## 🔧 Configuration

### Environment Variables (.env)

```bash
# Admin
ADMIN_NUMBER=628...         # Admin WhatsApp number

# Stock
DEFAULT_STOCK=50           # Premium accounts stock
VCC_STOCK=100             # Virtual card stock

# Session
SESSION_TIMEOUT_MINUTES=30

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Payment
XENDIT_SECRET_KEY=xnd_...
WEBHOOK_URL=https://...

# Features
ENABLE_CACHE=false
ENABLE_PERFORMANCE_MONITORING=false
LOG_LEVEL=INFO
```

### Product Catalog (config.js)

```javascript
products: {
  premiumAccounts: [
    { id: 'netflix', name: 'Netflix Premium', price: 15800, ... },
    { id: 'spotify', name: 'Spotify Premium', price: 15800, ... },
    { id: 'youtube', name: 'YouTube Premium', price: 15800, ... }
  ],
  virtualCards: [
    { id: 'vcc-1month', name: 'VCC 1 Bulan', price: 15800, ... },
    ...
  ]
}
```

---

## 🚀 Deployment

### Quick Start (VPS)

```bash
# 1. Clone and setup
git clone https://github.com/benihutapea/chatbot.git
cd chatbot
npm install

# 2. Configure
cp .env.example .env
# Edit .env with your credentials

# 3. Run with PM2
pm2 start index.js --name whatsapp-shop
pm2 save
pm2 logs whatsapp-shop
```

### Authentication Methods

1. **QR Code** (default): Scan with WhatsApp app
2. **Pairing Code**: Set `USE_PAIRING_CODE=true` + `PAIRING_PHONE_NUMBER`

### Monitoring

```bash
pm2 status                    # Check status
pm2 logs whatsapp-shop       # View logs
pm2 restart whatsapp-shop    # Restart bot
```

---

## 🧪 Testing

### Test Structure

```
tests/
├── unit/                      # Unit tests (251 tests)
│   ├── handlers/             # Handler tests
│   ├── services/             # Service tests
│   └── utils/                # Utility tests
├── integration/              # Integration tests
└── comprehensive-transaction-simulation.js  # End-to-end simulation
```

### Run Tests

```bash
npm test                      # All 251 unit tests
node tests/comprehensive-transaction-simulation.js  # E2E simulation
```

### Test Coverage

- ✅ 251/251 unit tests passing
- ✅ 23/24 E2E scenarios passing (95.8%)
- ⚠️ 1 minor issue: Cart total calculation (test expectation, not bug)

---

## 📝 Recent Changes (Nov 3, 2025)

### Commits

1. **0d8692b** - Refactoring complete: handlers < 700 lines
2. **1e41522** - Cherry-pick fixes from PR #1 (Copilot agent)

### PR #1 Integration

**From:** GitHub Copilot coding agent  
**Status:** ✅ Cherry-picked (adapted to refactored architecture)

**Changes Applied:**

1. ✅ Bug Fix: Added `getAllSettings()` export in config.js
2. ✅ Bug Fix: Null/undefined handling in AdminHandler
3. ✅ Bug Fix: Memory leak - proper interval cleanup
4. ✅ Performance: O(1) command routing with Map
5. ✅ New Utilities: ErrorMessages.js, ValidationHelpers.js

**Skipped (Optional):**

- PerformanceMonitor.js
- CacheManager.js
- Logger.js

---

## 🎯 Development Guidelines

### File Size Management

- **ALWAYS** check file size before commit
- **SPLIT** handlers when approaching 650 lines
- **EXTRACT** to specialized handlers using delegation pattern

### Adding New Commands

1. Add to command routing map (`_initializeCommandRoutes()`)
2. Create handler method or delegate to specialized handler
3. Add tests (unit + integration)
4. Run `npm test` before commit

### Code Quality

```bash
npm run lint          # ESLint check
npm test             # Run all tests
git add .
git commit -m "..."
git push origin main
git push chatwhatsapp main  # Push to both repos
```

---

## 📚 Key Documentation Files

### Active Documentation (Keep Updated)

- `README.md` - Quick start, features, deployment
- `REFACTORING_COMPLETE.md` - Handler extraction summary
- `.github/copilot-instructions.md` - AI agent guidelines
- `docs/ARCHITECTURE.md` - System architecture
- `docs/MODULARIZATION.md` - Code structure details
- `docs/ADMIN_COMMANDS.md` - 13+ admin commands
- `docs/TESTING_SUITE.md` - Testing strategy
- `docs/PAYMENT_SYSTEM.md` - Payment integration
- `docs/WISHLIST_FEATURE.md` - Wishlist implementation
- `docs/INVENTORY_MANAGEMENT.md` - Stock tracking
- `docs/XENDIT_SETUP.md` - Payment gateway setup

### Archived Documentation

- `docs/archive/testing/` - Historical test reports
- `docs/archive/bug-reports/` - Fixed bug analyses

---

## 🔗 Repositories

### Primary

- **benihutapea/chatbot** - Main development repository
- **URL:** https://github.com/benihutapea/chatbot

### Fork

- **yunaamelia/chatwhatsapp** - Production fork
- **URL:** https://github.com/yunaamelia/chatwhatsapp
- **Sync:** Push to both repos after changes

---

## ⚠️ Known Issues

### Minor Issues

1. **Test Expectation Mismatch** - Cart total test expects USD $1, products use IDR Rp 15,800
   - **Impact:** Low (test configuration, not application bug)
   - **Status:** Documented, low priority fix

### Resolved Issues

1. ✅ File size violations - FIXED (handlers < 700 lines)
2. ✅ getAllSettings() missing - FIXED (PR #1)
3. ✅ Memory leaks - FIXED (interval cleanup)
4. ✅ Null handling - FIXED (AdminHandler validation)

---

## 📈 Performance Metrics

### Current Performance

- **Command Routing:** O(1) map lookup
- **Session Cleanup:** Every 10 minutes
- **Rate Limiting:** 20 messages/minute per customer
- **Memory:** ~14.3 MB (PM2 process)
- **Response Time:** < 100ms average

### Resource Usage (VPS)

- **CPU:** < 10% average
- **RAM:** ~50MB base + 14MB per process
- **Disk:** ~200MB (node_modules + code)

---

## 🎯 Future Enhancements (Planned)

### High Priority

1. TypeScript migration (type safety)
2. Database migration (PostgreSQL for persistence)
3. Webhook retry mechanism improvements

### Medium Priority

1. Multi-language support (extend beyond Indonesian)
2. Advanced analytics dashboard
3. A/B testing framework

### Low Priority

1. Automated E2E testing with Puppeteer
2. Customer segmentation
3. Revenue forecasting

---

**Status:** ✅ Production Ready  
**Version:** 1.0 (Post-Refactoring + PR #1 Integration)  
**Last Test:** November 3, 2025 - 251/251 passing
