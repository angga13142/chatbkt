# Project Structure

```
chatbot/
├── index.js                 # Main entry point - WhatsApp client initialization
├── chatbotLogic.js          # Core business logic & message processing
├── sessionManager.js        # Session & cart state management
├── config.js                # Product catalog configuration
├── package.json             # Dependencies & npm scripts
├── .env                     # Environment variables (not in git)
├── .env.example             # Example environment configuration
├── eslint.config.js         # ESLint configuration
├── install-vps.sh           # VPS deployment script
│
├── lib/                     # Core library modules
│   ├── inputValidator.js    # Input validation & sanitization
│   ├── logRotationManager.js # Automatic log cleanup
│   ├── messageRouter.js     # Message routing logic
│   ├── paymentHandlers.js   # Payment processing handlers
│   ├── paymentMessages.js   # Payment UI templates
│   ├── redisClient.js       # Redis connection manager
│   ├── transactionLogger.js # Transaction audit logging
│   └── uiMessages.js        # UI message templates
│
├── services/                # External service integrations
│   ├── xenditService.js     # Xendit payment gateway (PRIMARY)
│   ├── qrisService.js       # QRIS payment service
│   ├── webhookServer.js     # Webhook server for payment callbacks
│   └── productDelivery.js   # Product delivery automation
│
├── tests/                   # Test suites
│   ├── test.js              # Main test suite
│   ├── test-admin-commands.js
│   ├── test-fuzzy-comprehensive.js
│   ├── test-log-rotation.js
│   ├── test-redis.js
│   ├── test-session.js
│   ├── test-sprint4.js
│   ├── test-webhook.js
│   └── test-xendit.js
│
├── docs/                    # Documentation
│   ├── ARCHITECTURE.md
│   ├── BUG_ANALYSIS_REPORT.md
│   ├── BUG_FIXES_REPORT.md
│   ├── DEPLOYMENT.md
│   ├── DEV_ROADMAP.md
│   ├── MIDTRANS.md
│   ├── REFACTORING_SUMMARY.md
│   ├── SECURITY_IMPLEMENTATION.md
│   ├── SPRINT3_IMPLEMENTATION.md
│   ├── SPRINT4_IMPLEMENTATION.md
│   ├── SUMMARY.md
│   ├── TESTING_RESULTS.md
│   ├── TESTING_RESULTS_SPRINT2.md
│   └── XENDIT_SETUP.md
│
├── archive/                 # Archived/old files
│   ├── chatbotLogic.old.js
│   ├── index.old.js
│   └── lint-results.txt
│
├── assets/                  # Static assets
│   └── qris/                # Static QRIS images
│
├── logs/                    # Application logs (auto-rotated)
├── payment_proofs/          # Payment proof uploads
├── payment_qris/            # Generated QRIS codes
├── products_data/           # Product credentials database
│   ├── netflix.txt
│   ├── spotify.txt
│   └── README.md
│
├── .github/                 # GitHub configuration
│   ├── copilot-instructions.md
│   └── instructions/
│
├── .wwebjs_auth/            # WhatsApp session data (not in git)
└── .wwebjs_cache/           # WhatsApp cache (not in git)
```

## Key Directories

### `/lib` - Core Library

Modular components for core functionality:

- Input validation & rate limiting
- Message routing
- Payment handling
- UI templates
- Transaction logging
- Redis integration
- Log rotation

### `/services` - External Services

Third-party integrations and services:

- **xenditService.js**: Primary payment gateway (QRIS, E-Wallet, VA)
- **qrisService.js**: Legacy QRIS service
- **webhookServer.js**: Payment callback handler
- **productDelivery.js**: Auto-delivery system

### `/tests` - Test Suites

Comprehensive testing:

- Unit tests
- Integration tests
- Payment gateway tests
- Admin command tests

### `/docs` - Documentation

All project documentation including:

- Architecture diagrams
- Deployment guides
- Sprint reports
- Bug analysis
- Testing results

### `/archive` - Historical Files

Old versions and deprecated files for reference.

## Running the Project

```bash
# Install dependencies
npm install

# Run locally
npm start

# Run tests
npm test

# Lint code
npm run lint
npm run lint:fix
```

## Import Patterns

```javascript
// Core modules (from root)
const SessionManager = require("./sessionManager");
const ChatbotLogic = require("./chatbotLogic");
const config = require("./config");

// Library modules
const MessageRouter = require("./lib/messageRouter");
const UIMessages = require("./lib/uiMessages");

// Services
const XenditService = require("./services/xenditService");
const WebhookServer = require("./services/webhookServer");

// From tests/ or services/ folders (going up one level)
const SessionManager = require("../sessionManager");
const XenditService = require("../services/xenditService");
```

## Configuration Files

- `.env` - Environment variables (API keys, settings)
- `config.js` - Product catalog
- `eslint.config.js` - Code quality rules
- `package.json` - Dependencies & scripts
- `.gitignore` - Files excluded from git

## Data Persistence

- **Redis**: Session data (optional, falls back to memory)
- **File System**: Logs, transaction records, product credentials
- **WhatsApp**: `.wwebjs_auth/` for session persistence
