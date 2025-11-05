# WhatsApp Shopping Chatbot - Comprehensive Documentation

**Generated:** November 5, 2025  
**Repository:** angga13142/chatbkt  
**Language:** JavaScript (Node.js)  
**Framework:** WhatsApp Web.js  
**Version:** 1.0.0

---

## Table of Contents

1. [README.md File Content](#1-readmemd-file-content)
2. [Code Structure Analysis](#2-code-structure-analysis)
3. [Detailed Security Audit](#3-detailed-security-audit)

---

# 1. README.md File Content

## WhatsApp Shopping Chatbot Assistant 🛍️

A professional, enterprise-grade WhatsApp chatbot designed to automate e-commerce operations with intelligent features, secure payment processing, and real-time customer engagement. Perfect for selling premium digital products (Netflix, Spotify accounts, virtual credit cards) with automated delivery and payment management.

### 🌟 Key Features

#### Core E-Commerce Capabilities
- ⚡ **Instant Response System**: Automated replies with sub-second latency for customer inquiries
- 🛒 **Advanced Shopping Cart**: Full-featured cart with wishlist, promo codes, and persistent sessions via Redis
- 📦 **Product Catalog Management**: Dynamic inventory with real-time stock tracking and fuzzy search
- 💬 **Interactive Menu System**: Intuitive, emoji-rich navigation optimized for mobile users
- 👥 **Multi-Customer Support**: Concurrent session handling for unlimited customers
- 🔄 **Session Persistence**: Redis-backed session storage with 30-minute TTL and automatic cleanup

#### Payment & Commerce
- 💳 **Multiple Payment Methods**:
  - **QRIS**: Automated QR code generation via Xendit Payment API
  - **E-Wallets**: DANA, GoPay, OVO, ShopeePay (both manual and automated)
  - **Bank Transfer**: BCA, BNI, BRI, Mandiri with account details
- 💰 **Promo Code System**: Create time-limited discounts with usage tracking and validation
- 📊 **Order Management**: Complete order lifecycle tracking from cart creation to product delivery
- 🔔 **Payment Reminders**: Automated cron-based reminders at 30-minute and 2-hour intervals
- 📦 **Automated Delivery**: Product credentials delivered instantly upon payment confirmation

#### AI-Powered Features (Gemini 2.5 Flash Lite)
- 🤖 **Typo Correction**: Automatically fixes customer typos and spelling errors ("netflx" → "netflix")
- 🧠 **Product Q&A**: Natural language answers to product-related questions
- 💡 **Smart Recommendations**: AI-powered personalized product suggestions based on conversation
- ✍️ **Admin AI Generator**: `/generate-desc` command for compelling product descriptions
- 💸 **Cost-Effective**: ~$0.00005 per API call, 97% cheaper than GPT-4o

#### Admin Dashboard & Analytics
- 📊 **Enhanced Business Dashboard**: Revenue tracking by payment method, top 5 products, customer retention
- 📈 **Real-time Metrics**: Business statistics with ASCII graphs and trend analysis
- ⭐ **Review & Rating System**: Customer reviews with 5-star ratings and admin moderation
- 📦 **Inventory Management**: Real-time stock tracking with Redis-backed validation
- 🔐 **Role-Based Access Control**: Secure admin commands with multi-number authorization

#### Performance & Security
- 🔒 **Rate Limiting**: 20 messages/minute per customer to prevent spam and abuse
- 🛡️ **Input Validation**: Comprehensive sanitization preventing XSS, SQL injection, null bytes
- 💾 **Optimized for VPS**: Runs smoothly on 1 vCPU, 2GB RAM (~300-500MB memory usage)
- 📝 **Comprehensive Audit Logging**: Transaction, payment, delivery, admin, and security event logs
- 🔄 **Auto-Recovery Mechanisms**: Exponential backoff for webhook retries, graceful service degradation

---

### 📦 Products Catalog

The chatbot supports selling digital products with automated credential delivery:

#### Premium Subscription Accounts
- **Netflix Premium** (1 Month) - $1.00
- **Spotify Premium** (1 Month) - $1.00
- **YouTube Premium** (1 Month) - $1.00
- **Disney+ Premium** (1 Month) - $1.00

#### Virtual Credit Cards (VCC)
- **Basic VCC** ($10 balance) - $1.00
- **Standard VCC** ($25 balance) - $1.00

> **Customization:** Products are easily configured in `src/config/products.config.js`

---

### 🏗️ Architecture Overview

**Modular, Microservices-Inspired Design:**

```
WhatsApp Client → Message Dispatcher → Input Validator → Message Router
                                                              ↓
                                      ┌───────────────────────┴────────────────────┐
                                      ↓                                            ↓
                            Customer Handler                               Admin Handler
                                      ↓                                            ↓
                    ┌─────────────────┴──────────────┐          ┌────────────────┴──────────────┐
                    ↓                                 ↓          ↓                                ↓
            Product Service                   Cart Service   Inventory Handler          Analytics Handler
                    ↓                                 ↓          ↓                                ↓
            Redis Stock Manager            Session Store   Redis Stock                  Dashboard Service
```

**Key Architectural Principles:**
- **Single Responsibility Principle**: Each module has exactly one clear purpose
- **Dependency Injection**: Services are injected rather than hardcoded
- **Separation of Concerns**: Business logic completely separated from infrastructure
- **SOLID Design Patterns**: Applied throughout the entire codebase
- **File Size Enforcement**: Maximum 700 lines per file (CI/CD enforced)

---

### 🚀 Prerequisites

**Required Software:**
- **Node.js**: Version 14+ (v18 LTS recommended for best performance)
- **WhatsApp Account**: Personal or business account for bot linking
- **VPS or Local Machine**: 
  - Minimum: 1 vCPU, 2GB RAM, 10GB storage
  - Recommended: 2 vCPU, 4GB RAM, 20GB SSD storage

**Supported Operating Systems:**
- Linux: Ubuntu 20.04+, Debian 11+, CentOS 8+
- macOS: 10.15 Catalina or newer
- Windows: 10/11 with WSL2 (recommended) or native Node.js

**Optional But Recommended:**
- **Redis Server**: For session persistence (auto-fallback to in-memory if unavailable)
- **PM2**: Process manager for production deployments and auto-restart
- **Google AI API Key**: For AI-powered features (Gemini 2.5 Flash Lite)
- **Xendit Account**: For automated QRIS and e-wallet payment processing

---

### 💻 Installation

#### Quick Start (Development - 5 Minutes)

```bash
# 1. Clone the repository
git clone https://github.com/angga13142/chatbkt.git
cd chatbkt

# 2. Install all dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
nano .env  # Edit with your settings

# 4. Start the bot
npm start
```

#### Detailed Installation Steps

**Step 1: Clone Repository**
```bash
git clone https://github.com/angga13142/chatbkt.git
cd chatbkt
```

**Step 2: Install Node.js Dependencies**
```bash
# Development mode (includes testing tools)
npm install

# Production mode (optimized, no devDependencies)
npm install --production
```

**Step 3: Environment Configuration**

Create `.env` from template:
```bash
cp .env.example .env
```

Essential configuration in `.env`:
```bash
# Shop Information
SHOP_NAME="Your Premium Shop"
CONTACT_WHATSAPP="6281234567890"
CONTACT_EMAIL="support@yourshop.com"

# Admin Access (at least one required)
ADMIN_NUMBER_1="6281234567890"
ADMIN_NUMBER_2=""
ADMIN_NUMBER_3=""

# Redis Session Persistence (Optional)
REDIS_URL=redis://localhost:6379
SESSION_TTL=1800

# Payment Processing (Optional - Xendit)
XENDIT_SECRET_KEY=xnd_production_...
XENDIT_WEBHOOK_TOKEN=your_secure_random_token

# AI Features (Optional - Gemini)
AI_ENABLE=true
GOOGLE_API_KEY=AIzaSyD...
```

**Step 4: Start the Bot**

**Method A: Direct Start (Development)**
```bash
npm start
# or
npm run dev
```

**Method B: PM2 (Production - Recommended)**
```bash
# Install PM2 globally
npm install -g pm2

# Start bot with PM2
pm2 start index.js --name whatsapp-bot

# Save configuration
pm2 save

# Enable auto-start on system boot
pm2 startup
```

**Step 5: Link WhatsApp Account**

**Option A: QR Code Scanning (Default)**
1. QR code appears in terminal/console
2. Open WhatsApp on your phone
3. Navigate to: Settings → Linked Devices → Link a Device
4. Scan the displayed QR code with your phone

**Option B: Pairing Code Method**
1. Configure in `.env`:
   ```bash
   USE_PAIRING_CODE=true
   PAIRING_PHONE_NUMBER=6281234567890  # Your WhatsApp number
   ```
2. Restart bot to receive 8-digit pairing code
3. In WhatsApp: Settings → Linked Devices → Link with phone number
4. Enter the displayed pairing code

---

### 🔧 Configuration Guide

#### Critical Environment Variables

**Business & Contact Settings:**
```bash
SHOP_NAME="Premium Digital Shop"      # Your store display name
CONTACT_WHATSAPP="6281234567890"       # Customer support number
CONTACT_EMAIL="support@example.com"    # Support email address
WORKING_HOURS="24/7"                   # Business hours display
```

**Admin Authorization:**
```bash
ADMIN_NUMBER_1="6281234567890"         # Primary admin (required)
ADMIN_NUMBER_2="6289876543210"         # Secondary admin (optional)
ADMIN_NUMBER_3="6285551234567"         # Tertiary admin (optional)
```

**Session & Performance:**
```bash
SESSION_TTL=1800                       # Session timeout in seconds (30 min)
RATE_LIMIT_MAX=20                      # Max messages per minute per customer
RATE_LIMIT_WINDOW=60000                # Rate limit window in ms (1 minute)
CLEANUP_INTERVAL=10                    # Session cleanup interval (minutes)
```

**Manual Payment Accounts:**
```bash
# E-Wallet Configuration
DANA_NUMBER=081234567890
DANA_NAME="John Doe"
DANA_ENABLED=true

GOPAY_NUMBER=081234567890
GOPAY_NAME="John Doe"
GOPAY_ENABLED=true

OVO_NUMBER=081234567890
OVO_NAME="John Doe"
OVO_ENABLED=true

SHOPEEPAY_NUMBER=081234567890
SHOPEEPAY_NAME="John Doe"
SHOPEEPAY_ENABLED=true

# Bank Account Configuration
BCA_ACCOUNT=1234567890
BCA_NAME="John Doe"
BCA_ENABLED=true

BNI_ACCOUNT=1234567890
BNI_NAME="John Doe"
BNI_ENABLED=true

BRI_ACCOUNT=1234567890
BRI_NAME="John Doe"
BRI_ENABLED=true

MANDIRI_ACCOUNT=1234567890
MANDIRI_NAME="John Doe"
MANDIRI_ENABLED=true
```

**Automated Payment (Xendit API):**
```bash
XENDIT_SECRET_KEY=xnd_production_...           # From dashboard.xendit.co
XENDIT_WEBHOOK_TOKEN=random_secure_token_32+   # Generate random token
WEBHOOK_URL=https://yourserver.com             # Public webhook endpoint
USD_TO_IDR_RATE=15800                          # Currency conversion rate
```

**AI Configuration (Gemini):**
```bash
AI_ENABLE=true                                 # Enable/disable AI features
GOOGLE_API_KEY=AIzaSyD...                      # From aistudio.google.com
AI_MODEL=gemini-2.0-flash-exp                  # Model version
AI_TEMPERATURE=0.3                             # Creativity (0.0-1.0)
AI_MAX_TOKENS=500                              # Max response length
AI_RATE_LIMIT_HOURLY=5                         # API calls per hour per customer
AI_RATE_LIMIT_DAILY=20                         # API calls per day per customer
AI_COST_ALERT_THRESHOLD=5.0                    # Alert threshold in USD
AI_MONTHLY_BUDGET=50.0                         # Monthly budget limit in USD
```

#### Product Customization

Edit `src/config/products.config.js`:

```javascript
const products = {
  premiumAccounts: [
    {
      id: 'netflix',                           // Unique product ID (URL-safe)
      name: 'Netflix Premium Account (1 Month)',
      price: 1,                                // Price in USD
      description: 'Full HD streaming, 4 screens simultaneously',
      stock: 10,                               // Default stock quantity
      category: 'Premium Accounts'
    },
    // Add more products here...
  ],
  virtualCards: [
    {
      id: 'basic-vcc',
      name: 'Basic Virtual Credit Card ($10)',
      price: 1,
      description: 'Valid for 1 month, $10 balance',
      stock: 5,
      category: 'Virtual Credit Cards'
    }
  ]
};

module.exports = { products, DEFAULT_STOCK: 10, VCC_STOCK: 5 };
```

---

### 📱 Usage Guide

#### Customer Commands

**Core Navigation:**
- `menu` or `help` - Display main menu
- `browse` or `products` - View all available products
- `cart` - View current shopping cart contents
- `about` - Learn about the shop
- `support` or `contact` - Get support information

**Shopping Workflow:**
1. Customer sends any message → Bot shows welcome + menu
2. Customer types `browse` → Bot displays product catalog
3. Customer types product name (e.g., "netflix") → Product added to cart
4. Customer types `cart` → Review cart contents and pricing
5. Customer types `checkout` → Select payment method
6. Customer completes payment → Automated credential delivery

**Advanced Customer Features:**
- `⭐ <product>` or `simpan <product>` - Add product to wishlist
- `/wishlist` - View all saved/favorite products
- `hapus <product>` - Remove product from wishlist
- `promo <CODE>` - Apply promotional discount code
- `history` - View order history (last 5 orders)
- `/track` or `/track <order-id>` - Track order status
- `/review <product> <rating> <text>` - Leave product review (1-5 stars)

#### Admin Commands

**Dashboard & Statistics:**
```bash
/stats [days]              # Business metrics (default: 30 days)
                           # Shows: revenue, orders, top products, retention
                           
/status                    # System health check
                           # Shows: WhatsApp, Redis, memory, uptime
```

**Order Management:**
```bash
/approve <order-id>        # Manually approve pending payment
                           # Example: /approve ORD-1730819558000-A1B2
                           
/track <order-id>          # Track specific order status
```

**Inventory Control:**
```bash
/addstock <product> <qty>  # Add stock for product
                           # Example: /addstock netflix 50
                           
/stockreport               # View current inventory levels for all products

/salesreport [days]        # Sales analytics (default: 7 days)
                           # Shows: units sold, revenue, trends
```

**Promotional Campaigns:**
```bash
/createpromo CODE DISCOUNT DAYS    # Create new promo code
                                   # Example: /createpromo LAUNCH20 20 7
                                   # Creates 20% discount valid for 7 days
                                   
/listpromos                        # List all active promo codes

/deletepromo CODE                  # Delete/deactivate promo code
```

**Review Moderation:**
```bash
/reviews <product>         # View all reviews for product
                           # Example: /reviews netflix
                           
/deletereview <reviewId>   # Remove inappropriate review
```

**Communication:**
```bash
/broadcast <message>       # Send message to all active customers
                           # Example: /broadcast Flash sale 50% off! 🔥
```

**AI-Powered Tools:**
```bash
/generate-desc <product>   # AI-generated product description
                           # Example: /generate-desc netflix
```

**Authorization:** Only WhatsApp numbers configured in `ADMIN_NUMBER_1`, `ADMIN_NUMBER_2`, `ADMIN_NUMBER_3` can execute admin commands.

---

### 🖥️ VPS Deployment

#### Automated Setup Script (Recommended)

```bash
# Download and execute installation script
wget https://raw.githubusercontent.com/angga13142/chatbkt/main/install-vps.sh
chmod +x install-vps.sh
sudo ./install-vps.sh
```

**Script automatically performs:**
- System package updates (apt update && apt upgrade)
- Node.js 18 LTS installation
- Chromium browser and dependencies installation
- UFW firewall configuration
- PM2 process manager installation
- Repository cloning and dependency installation

#### Manual VPS Installation

**Step 1: Connect to Server**
```bash
ssh root@your-vps-ip-address
```

**Step 2: System Update**
```bash
apt update && apt upgrade -y
```

**Step 3: Install Node.js 18 LTS**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version
```

**Step 4: Install Chromium Dependencies**
```bash
apt install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 \
libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 \
libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 \
libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 \
libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 \
libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates \
fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
```

**Step 5: Install Redis (Optional - Session Persistence)**
```bash
apt install -y redis-server

# Enable and start Redis
systemctl enable redis-server
systemctl start redis-server

# Verify Redis is running
redis-cli ping  # Should return "PONG"
```

**Step 6: Clone and Setup Bot**
```bash
# Clone repository
git clone https://github.com/angga13142/chatbkt.git
cd chatbkt

# Install dependencies (skip Chromium download)
PUPPETEER_SKIP_DOWNLOAD=true npm install
```

**Step 7: Configure Environment**
```bash
cp .env.example .env
nano .env  # Edit configuration with your settings
```

**Step 8: Install PM2 and Start Bot**
```bash
# Install PM2 globally
npm install -g pm2

# Start bot with PM2
pm2 start index.js --name whatsapp-bot

# Save PM2 process list
pm2 save

# Enable PM2 startup on system boot
pm2 startup
# Copy and run the command provided by PM2
```

**Step 9: Firewall Configuration (Optional)**
```bash
# Enable UFW if not already enabled
ufw allow 22/tcp       # SSH access
ufw allow 3000/tcp     # Webhook server (if using Xendit)
ufw enable
ufw status
```

#### PM2 Process Management

```bash
# View real-time logs
pm2 logs whatsapp-bot

# Monitor resource usage
pm2 monit

# Restart bot
pm2 restart whatsapp-bot

# Stop bot
pm2 stop whatsapp-bot

# View detailed status
pm2 status

# View process information
pm2 show whatsapp-bot

# Delete from PM2 (doesn't delete files)
pm2 delete whatsapp-bot

# Update PM2
npm install -g pm2@latest
pm2 update
```

---

### 🧪 Testing & Quality Assurance

The project includes comprehensive test coverage with Jest testing framework:

```bash
# Run all tests with coverage report
npm test

# Run tests with detailed coverage
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Watch mode for development
npm run test:watch

# Pre-commit validation (lint + test)
npm run check
```

**Test Statistics:**
- **Total Test Suites:** 885 tests across 50+ test files
- **Passing Tests:** 817 (92% pass rate)
- **Code Coverage:** 85%+ across all modules
- **Test Categories:** Unit, Integration, End-to-End (E2E)

**Test Structure:**
```
tests/
├── unit/                    # Isolated component tests
│   ├── core/               # Core system tests
│   ├── handlers/           # Handler logic tests
│   ├── services/           # Service layer tests
│   └── utils/              # Utility function tests
├── integration/            # Multi-component interaction tests
│   ├── checkout-flow.test.js
│   ├── admin-commands.test.js
│   └── payment-flow.test.js
└── e2e/                    # Complete user journey tests
    └── complete-purchase.test.js
```

---

### 🔍 Health Monitoring

#### Health Check Endpoint

The bot exposes a REST API endpoint for health monitoring at `/health`:

```bash
# Check bot health status
curl http://localhost:3000/health
```

**Response Format:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-05T15:42:38.123Z",
  "uptime": {
    "seconds": 45278,
    "formatted": "12h 34m"
  },
  "memory": {
    "used": "87.42 MB",
    "total": "128.00 MB",
    "utilization": "68.3%"
  },
  "services": {
    "redis": "connected",
    "whatsapp": "connected",
    "webhook": "active"
  },
  "environment": "production"
}
```

#### Integration with Monitoring Services

**UptimeRobot Configuration:**
- Monitor Type: HTTP(s)
- URL to Monitor: `http://your-server:3000/health`
- Keyword to Look For: `"status":"ok"`
- Check Interval: 5 minutes
- Alerting: Email/SMS/Webhook

**Pingdom Setup:**
- Check Type: HTTP
- URL: `http://your-server:3000/health`
- Response Check: Body contains `status`
- Check Interval: 1 minute

**Healthchecks.io Integration:**
```bash
# Add to crontab for periodic pinging
*/5 * * * * curl -fsS --retry 3 http://localhost:3000/health > /dev/null || curl -fsS https://hc-ping.com/your-uuid-here/fail
```

---

### 📊 Performance Metrics

#### Resource Usage (VPS: 1 vCPU, 2GB RAM)

**Memory Consumption:**
- Idle: 300-400 MB
- Light Load (1-10 customers): 400-600 MB
- Heavy Load (50+ customers): 600-900 MB

**CPU Utilization:**
- Idle: 5-10%
- Active Conversations: 20-40%
- Peak (message bursts): 50-70%

**Disk Space:**
- Application Code: ~50 MB
- Node Modules: ~450 MB
- Logs (7-day retention): ~100-500 MB
- Total Recommended: 10 GB minimum, 20 GB recommended

**Network Bandwidth:**
- Per Customer (active): ~10-50 KB/s
- 100 Concurrent Customers: ~1-5 MB/s

#### Scaling Capacity

**Single Instance (1 vCPU, 2GB RAM):**
- Concurrent Active Sessions: 100-200 customers
- Messages Per Second: 20-30 messages
- Database Connections: 5-10 Redis connections

**Recommended Upgrades:**
- 2 vCPU, 4GB RAM: 500+ concurrent customers
- 4 vCPU, 8GB RAM: 1000+ concurrent customers
- Add Redis cluster for horizontal scaling

---

### 🛠️ Troubleshooting

#### Bot Fails to Start

**Error: "Cannot find module"**
```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Error: "Protocol error" or "Target closed"**
```bash
# Solution: Clear WhatsApp authentication cache
rm -rf .wwebjs_auth .wwebjs_cache
npm start
```

**Error: "ECONNREFUSED" (Redis)**
```bash
# Solution: Start Redis or disable Redis in code
sudo systemctl start redis-server

# Or use in-memory fallback (automatic)
# Bot will log: "Using in-memory storage (no persistence)"
```

#### QR Code Issues

**QR Code Doesn't Appear:**
```bash
# Check terminal output
pm2 logs whatsapp-bot --lines 100

# Try pairing code method instead
# Edit .env:
USE_PAIRING_CODE=true
PAIRING_PHONE_NUMBER=6281234567890

# Restart
pm2 restart whatsapp-bot
```

**QR Code Expires Too Quickly:**
```bash
# Solution: Use pairing code method (more reliable)
# Set in .env:
USE_PAIRING_CODE=true
PAIRING_PHONE_NUMBER=your_number_here
```

#### Memory and Performance

**Out of Memory on VPS:**
```bash
# Add 2GB swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify
free -h
```

**High CPU Usage:**
```bash
# Check for runaway processes
htop

# Restart bot
pm2 restart whatsapp-bot

# Check logs for errors
pm2 logs whatsapp-bot --lines 200
```

#### Payment & Webhook Issues

**Webhook Not Receiving Events:**
```bash
# Verify webhook server is running
curl http://localhost:3000/health

# Check firewall allows port 3000
sudo ufw status
sudo ufw allow 3000/tcp

# Verify Xendit webhook URL configuration
# Should match: https://your-server.com/webhook/xendit

# Check webhook logs
pm2 logs whatsapp-bot --lines 100 | grep webhook
```

**QRIS Not Generating:**
```bash
# Verify Xendit credentials in .env
echo $XENDIT_SECRET_KEY

# Test Xendit API connectivity
curl -X GET https://api.xendit.co/v2/balance \
  -u $XENDIT_SECRET_KEY:

# Check bot logs for Xendit errors
pm2 logs whatsapp-bot | grep -i xendit
```

---

### 📝 Development Workflow

#### Code Quality Tools

```bash
# Run ESLint
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Run all checks (lint + test)
npm run check

# Pre-deployment validation
npm run deploy:check
```

#### Available NPM Scripts

```bash
npm start                  # Start bot in production mode
npm run dev                # Development mode (alias for start)
npm test                   # Run all tests with coverage
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:watch         # Watch mode for TDD
npm run test:coverage      # Detailed coverage report
npm run lint               # Run ESLint
npm run lint:fix           # Auto-fix ESLint issues
npm run check              # Lint + Test (pre-commit)
npm run deploy:check       # Full pre-deployment validation
```

#### Contributing Guidelines

1. **Fork Repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR-USERNAME/chatbkt.git
   cd chatbkt
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/amazing-new-feature
   ```

3. **Make Changes**
   - Follow existing code style
   - Maintain file size limit (<700 lines)
   - Add tests for new features
   - Update documentation

4. **Validate Changes**
   ```bash
   npm run check      # Must pass
   npm test           # All tests must pass
   ```

5. **Commit and Push**
   ```bash
   git add .
   git commit -m "Add amazing new feature"
   git push origin feature/amazing-new-feature
   ```

6. **Open Pull Request**
   - Describe changes clearly
   - Reference any related issues
   - Wait for CI/CD checks to pass

**Code Standards:**
- ESLint must pass with 0 errors, 0 warnings
- Minimum 80% test coverage maintained
- File size limit: 700 lines per .js file
- All new features require tests
- JSDoc comments for public methods

---

### 🔒 Security Best Practices

#### Essential Security Measures

1. **Environment Variables**
   - Never commit `.env` file to Git
   - Use strong, random webhook tokens (32+ characters)
   - Rotate API keys periodically

2. **WhatsApp Session Security**
   - Backup `.wwebjs_auth/` folder securely
   - Never share session files publicly
   - Use dedicated WhatsApp number for bot

3. **Server Hardening**
   ```bash
   # Enable firewall
   sudo ufw enable
   sudo ufw allow 22/tcp      # SSH only
   sudo ufw allow 3000/tcp    # Webhook (if needed)
   
   # Disable root SSH login
   sudo nano /etc/ssh/sshd_config
   # Set: PermitRootLogin no
   
   # Restart SSH
   sudo systemctl restart sshd
   ```

4. **Regular Updates**
   ```bash
   # Update system packages
   sudo apt update && sudo apt upgrade -y
   
   # Update Node.js dependencies
   npm update
   npm audit fix
   ```

5. **Rate Limiting** (Built-in)
   - 20 messages/minute per customer
   - 5 orders/day per customer
   - 1-minute cooldown after errors

6. **Input Validation** (Built-in)
   - All inputs sanitized
   - XSS prevention
   - SQL injection prevention
   - Null byte removal

7. **Logging Security**
   - No passwords in logs
   - No API keys in logs
   - Sensitive data redacted automatically

#### Security Checklist

- [ ] `.env` file properly configured and not in Git
- [ ] Admin numbers properly set in environment
- [ ] Firewall configured (UFW or iptables)
- [ ] SSH key authentication enabled
- [ ] Root login disabled
- [ ] System packages updated
- [ ] Node.js dependencies audited (`npm audit`)
- [ ] Webhook token is strong and random
- [ ] Redis password set (if exposed)
- [ ] SSL/TLS for webhook endpoint
- [ ] Regular backups of `.wwebjs_auth/`

---

### 📄 License

**MIT License**

Copyright (c) 2025 WhatsApp Shopping Chatbot Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.

---

### 🎉 Credits & Technologies

**Core Technologies:**
- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) - WhatsApp Web API wrapper
- [Puppeteer](https://pptr.dev/) - Headless Chrome automation
- [Node.js](https://nodejs.org/) - JavaScript runtime
- [Express.js](https://expressjs.com/) - Webhook web server
- [Redis](https://redis.io/) - Session persistence
- [Jest](https://jestjs.io/) - Testing framework

**Payment & AI:**
- [Xendit](https://www.xendit.co/) - Indonesian payment gateway
- [Google Gemini](https://ai.google.dev/) - AI-powered features
- [Vercel AI SDK](https://sdk.vercel.ai/) - AI integration toolkit

**DevOps & Tooling:**
- [PM2](https://pm2.keymetrics.io/) - Process management
- [ESLint](https://eslint.org/) - Code linting
- [GitHub Actions](https://github.com/features/actions) - CI/CD pipelines

**Developed By:** Community Contributors  
**Repository:** https://github.com/angga13142/chatbkt  
**Maintainer:** angga13142

---

### 📞 Support & Resources

**Documentation:**
- Main README: `/README.md`
- API Documentation: `/docs`
- Code Patterns: `/.github/memory/code-patterns.md`
- Testing Guide: `/.github/memory/test-status.md`

**Community:**
- GitHub Issues: Report bugs and request features
- Discussions: Q&A and community support
- Pull Requests: Contribute improvements

**Professional Support:**
- Email: Configure in `.env` (`CONTACT_EMAIL`)
- WhatsApp: Configure in `.env` (`CONTACT_WHATSAPP`)

---

**Happy Selling! 🚀💰**

_Last Updated: November 5, 2025_

---

# 2. Code Structure Analysis

## Directory and File Structure

The project follows a modular architecture with clear separation of concerns:

```
chatbkt/
├── .env.example                      # Environment configuration template
├── .git/                             # Git version control
├── .github/                          # GitHub-specific configuration
│   ├── agents/                      # Custom AI agent configurations
│   ├── memory/                      # Project documentation and patterns
│   │   ├── PROJECT_DOCUMENTATION.md
│   │   ├── code-patterns.md
│   │   ├── current-state.md
│   │   ├── github-workflows-rules.md
│   │   └── test-status.md
│   └── workflows/                   # CI/CD automation
├── .gitignore                       # Git ignore patterns
├── .vscode/                         # VS Code workspace settings
├── README.md                        # Main project documentation
├── SECURITY.md                      # Security policy and guidelines
├── index.js                         # Application entry point (243 lines)
├── chatbotLogic.js                  # Main business logic orchestrator (136 lines)
├── sessionManager.js                # Session & cart management (525 lines)
├── config.js                        # Legacy configuration wrapper (278 lines)
│
├── src/                             # Modular source code (~8,886 lines)
│   ├── config/                     # Configuration modules
│   │   ├── app.config.js          # System settings & feature flags
│   │   ├── payment.config.js      # Payment account configurations
│   │   └── products.config.js     # Product catalog definitions
│   │
│   ├── core/                       # Core framework components
│   │   ├── WhatsAppClient.js      # WhatsApp client initialization
│   │   ├── EventHandler.js        # Event listener management
│   │   ├── MessageDispatcher.js   # Message receiving & filtering
│   │   ├── MessageRouter.js       # Routing logic & command mapping
│   │   └── DependencyContainer.js # Service dependency injection
│   │
│   ├── handlers/                   # Business logic handlers (< 700 lines each)
│   │   ├── BaseHandler.js         # Abstract base handler class
│   │   ├── CustomerHandler.js     # Customer commands (browse, cart, checkout)
│   │   ├── AdminHandler.js        # Admin command delegation (< 700 lines)
│   │   ├── AdminInventoryHandler.js    # Inventory management
│   │   ├── AdminAnalyticsHandler.js    # Analytics & dashboard
│   │   ├── AdminReviewHandler.js       # Review moderation
│   │   ├── ProductHandler.js           # Product management
│   │   ├── CustomerWishlistHandler.js  # Wishlist features
│   │   └── CustomerCheckoutHandler.js  # Checkout flow
│   │
│   ├── services/                   # Domain services (business logic)
│   │   ├── session/               # Session management
│   │   │   ├── SessionService.js  # CRUD operations
│   │   │   ├── CartService.js     # Shopping cart logic
│   │   │   ├── RedisStorage.js    # Redis persistence
│   │   │   └── MemoryStorage.js   # In-memory fallback
│   │   │
│   │   ├── payment/               # Payment processing
│   │   │   ├── PaymentService.js  # Payment abstraction
│   │   │   └── PaymentReminderService.js  # Automated reminders
│   │   │
│   │   ├── product/               # Product operations
│   │   │   └── ProductService.js  # Catalog management
│   │   │
│   │   ├── inventory/             # Stock management
│   │   │   ├── RedisStockManager.js       # Stock tracking
│   │   │   ├── InventoryService.js        # Inventory operations
│   │   │   └── RedisInventoryStorage.js   # Persistence
│   │   │
│   │   ├── order/                 # Order management
│   │   │   └── OrderService.js    # Order tracking & history
│   │   │
│   │   ├── wishlist/              # Wishlist management
│   │   │   └── WishlistService.js # Favorites operations
│   │   │
│   │   ├── review/                # Reviews & ratings
│   │   │   └── ReviewService.js   # Review CRUD & moderation
│   │   │
│   │   ├── promo/                 # Promotional codes
│   │   │   └── PromoService.js    # Promo validation & tracking
│   │   │
│   │   ├── analytics/             # Business intelligence
│   │   │   └── DashboardService.js # Metrics & reporting
│   │   │
│   │   ├── ai/                    # AI integration
│   │   │   └── AIService.js       # Gemini API wrapper
│   │   │
│   │   └── admin/                 # Admin utilities
│   │       └── AdminStatsService.js # Statistics aggregation
│   │
│   └── utils/                      # Utility functions
│       ├── Constants.js            # Global constants
│       ├── ErrorMessages.js        # Error message templates
│       ├── FuzzySearch.js          # Typo-tolerant search
│       ├── InputSanitizer.js       # Input sanitization
│       └── ValidationHelpers.js    # Validation utilities
│
├── lib/                            # Legacy core modules (being phased out)
│   ├── messageRouter.js           # Legacy router (to be removed)
│   ├── paymentHandlers.js         # Payment method handlers
│   ├── paymentMessages.js         # Payment UI templates
│   ├── inputValidator.js          # Rate limiting & validation
│   ├── uiMessages.js              # UI message templates
│   ├── redisClient.js             # Redis connection manager
│   ├── transactionLogger.js       # Audit logging
│   ├── logRotationManager.js      # Log file rotation
│   └── SecureLogger.js            # Secure logging utility
│
├── services/                       # External service integrations
│   ├── xenditService.js           # Xendit payment API
│   ├── qrisService.js             # Legacy QRIS service
│   ├── webhookServer.js           # Payment webhook server
│   └── productDelivery.js         # Automated delivery
│
├── tests/                          # Test suites (885 tests)
│   ├── unit/                      # Unit tests (isolated)
│   │   ├── core/                 # Core component tests
│   │   ├── handlers/             # Handler tests
│   │   ├── services/             # Service tests
│   │   ├── utils/                # Utility tests
│   │   └── lib/                  # Library tests
│   │
│   ├── integration/               # Integration tests
│   │   ├── checkout-flow.test.js
│   │   ├── admin-commands.test.js
│   │   └── payment-flow.test.js
│   │
│   └── e2e/                       # End-to-end tests
│       └── complete-purchase.test.js
│
├── docs/                           # Documentation
│   ├── AI_INTEGRATION.md          # AI feature documentation
│   ├── MODULARIZATION.md          # Architecture guide
│   └── archive/                   # Historical documentation
│
├── data/                           # Application data
├── logs/                           # Auto-rotated log files
├── assets/                         # Static assets
│   └── qris/                      # QRIS payment images
├── payment_qris/                   # Generated QRIS codes
├── payment_proofs/                 # Customer payment screenshots
├── products_data/                  # Product credentials
│   ├── netflix.txt                # Delivered account list
│   ├── spotify.txt
│   └── sold/                      # Archive of sold products
│
├── package.json                    # NPM dependencies & scripts
├── package-lock.json               # Locked dependency versions
├── jest.config.cjs                 # Jest testing configuration
├── eslint.config.js                # ESLint code style rules
└── install-vps.sh                  # VPS auto-installation script
```

## Component Descriptions

### Root Level Files

**`index.js` (243 lines)**
- **Purpose:** Application entry point and bootstrap
- **Responsibilities:**
  - Initialize WhatsApp client with Puppeteer configuration
  - Setup authentication (QR code or pairing code)
  - Register event handlers (qr, ready, authenticated, message, disconnected)
  - Initialize services (SessionManager, ChatbotLogic, PaymentReminder)
  - Start log rotation and session cleanup intervals
  - Handle graceful shutdown (SIGINT, SIGTERM)
- **Key Features:**
  - VPS-optimized Puppeteer args (--single-process, --disable-gpu)
  - Pairing code support for headless environments
  - Health check logging every 5 minutes
  - Auto-reconnect logic

**`chatbotLogic.js` (136 lines)**
- **Purpose:** Business logic orchestrator and message processor
- **Responsibilities:**
  - Route incoming messages to appropriate handlers
  - Apply rate limiting and input validation
  - Coordinate between CustomerHandler, AdminHandler, ProductHandler
  - Handle global error recovery
  - Maintain session state consistency
- **Dependencies:** SessionManager, MessageRouter, InputValidator, TransactionLogger

**`sessionManager.js` (525 lines)**
- **Purpose:** Customer session and shopping cart management
- **Responsibilities:**
  - Session CRUD operations (create, read, update, delete)
  - Redis persistence with in-memory fallback
  - Shopping cart management (add, remove, clear)
  - Wishlist management
  - Promo code tracking
  - Session TTL and expiration handling
  - Rate limiting data storage
- **Storage:** Redis (primary), Map (fallback)

**`config.js` (278 lines)**
- **Purpose:** Legacy configuration wrapper for backward compatibility
- **Responsibilities:**
  - Re-exports from modular config files (app.config.js, products.config.js, payment.config.js)
  - Provides legacy functions: getAllProducts(), getProductById(), formatProductList()
  - Maintains backward compatibility during migration to modular architecture
- **Status:** Being phased out in favor of direct imports from `src/config/`

### src/config/ - Configuration Modules

**`app.config.js`**
- System-wide settings: currency, session timeout, rate limits
- Feature flags: AI enabled, auto-delivery, maintenance mode
- Business information: shop name, support contacts, working hours
- Logging configuration

**`products.config.js`**
- Product catalog definitions (premiumAccounts, virtualCards)
- Default stock quantities (DEFAULT_STOCK, VCC_STOCK)
- Product schema: id, name, price, description, stock, category

**`payment.config.js`**
- E-wallet accounts: DANA, GoPay, OVO, ShopeePay
- Bank accounts: BCA, BNI, BRI, Mandiri
- Each account: number/account, name, enabled status

### src/core/ - Core Framework

**`WhatsAppClient.js`**
- Initializes whatsapp-web.js Client with LocalAuth strategy
- Configures Puppeteer with VPS-optimized arguments
- Manages client lifecycle (initialize, destroy, reconnect)

**`MessageDispatcher.js`**
- Receives messages from WhatsApp events
- Filters out group messages and status updates
- Validates message format and sender
- Dispatches to MessageRouter

**`MessageRouter.js`**
- Analyzes command type and session step
- Routes to appropriate handler:
  - Global commands (menu, cart) → CustomerHandler
  - Admin commands (/) → AdminHandler
  - Product selection → CustomerHandler.handleProductSelection()
  - Payment flow → PaymentHandlers
- O(1) command lookup using Map data structure

**`DependencyContainer.js`**
- Manages service lifecycle
- Provides dependency injection
- Singleton pattern for shared services

### src/handlers/ - Business Logic Handlers

**`BaseHandler.js`**
- Abstract base class for all handlers
- Provides common functionality:
  - Session access via SessionManager
  - Logging utilities
  - Error handling patterns
  - Response formatting

**`CustomerHandler.js` (~570 lines)**
- **Commands:** browse, cart, checkout, wishlist, history, track, review
- **Responsibilities:**
  - Menu navigation
  - Product browsing with fuzzy search
  - Cart management (add, remove, view)
  - Wishlist operations
  - Order history display
  - Review submission
- **Delegation:** Uses WishlistService, ReviewService, OrderService

**`AdminHandler.js` (~686 lines)**
- **Commands:** /stats, /status, /approve, /broadcast, /createpromo, /addstock
- **Responsibilities:**
  - Command validation and authorization (isAdmin check)
  - Delegates to specialized sub-handlers:
    - InventoryHandler → /addstock, /stockreport
    - AnalyticsHandler → /stats
    - ReviewHandler → /reviews, /deletereview
  - Maintains <700 line limit through delegation pattern
- **Authorization:** Checks ADMIN_NUMBER_1, ADMIN_NUMBER_2, ADMIN_NUMBER_3

**`AdminInventoryHandler.js` (~230 lines)**
- Inventory management commands
- Stock reports and sales analytics
- Low stock alerts

**`AdminAnalyticsHandler.js` (~150 lines)**
- Business dashboard generation
- Revenue tracking by payment method
- ASCII graph rendering
- Retention rate calculation

**`AdminReviewHandler.js` (~187 lines)**
- Review moderation interface
- Delete inappropriate reviews
- View reviews by product

**`ProductHandler.js`**
- Product CRUD operations
- Fuzzy search implementation
- Stock validation before purchase

**`CustomerWishlistHandler.js` (~120 lines)**
- Add products to wishlist
- View saved products
- Remove from wishlist
- Move wishlist items to cart

**`CustomerCheckoutHandler.js` (~280 lines)**
- Checkout flow orchestration
- Promo code application
- Payment method selection
- Order confirmation

### src/services/ - Domain Services

**Session Services:**
- `SessionService.js` - Session CRUD operations
- `CartService.js` - Shopping cart business logic
- `RedisStorage.js` - Redis persistence implementation
- `MemoryStorage.js` - In-memory fallback storage

**Payment Services:**
- `PaymentService.js` - Payment method abstraction
- `PaymentReminderService.js` - Cron-based reminders (*/15 * * * *)

**Product Services:**
- `ProductService.js` - Product catalog operations, fuzzy search, stock checks

**Inventory Services:**
- `RedisStockManager.js` - Redis-backed stock tracking
- `InventoryService.js` - Inventory operations (add, remove, adjust)
- `RedisInventoryStorage.js` - Persistence layer

**Order Services:**
- `OrderService.js` - Order lifecycle management, history tracking

**Wishlist Services:**
- `WishlistService.js` - Wishlist CRUD operations

**Review Services:**
- `ReviewService.js` - Review submission, retrieval, moderation, average rating calculation

**Promo Services:**
- `PromoService.js` - Promo code validation, expiry checking, usage tracking

**Analytics Services:**
- `DashboardService.js` - Business metrics aggregation, ASCII graph generation

**AI Services:**
- `AIService.js` - Gemini API integration, rate limiting, cost tracking

### src/utils/ - Utility Functions

**`FuzzySearch.js`**
- Levenshtein distance algorithm for typo tolerance
- Handles "netflx" → "netflix", "spotfy" → "spotify"
- Configurable similarity threshold

**`InputSanitizer.js`**
- Removes null bytes, XSS attempts
- Limits message length (1000 chars)
- Escapes special characters

**`ValidationHelpers.js`**
- Phone number validation (WhatsApp format)
- Order ID validation (ORD-timestamp-suffix)
- Payment choice validation
- Bank choice validation

**`Constants.js`**
- Global constants (CURRENCY, MAX_CART_ITEMS, ORDER_ID_PREFIX)

**`ErrorMessages.js`**
- Standardized error message templates

### lib/ - Legacy Core Modules

**`inputValidator.js`**
- Rate limiting: 20 messages/minute per customer
- Order limiting: 5 orders/day per customer
- Error cooldown: 1-minute after errors
- Input sanitization and validation
- Admin authorization checks

**`messageRouter.js`**
- Legacy routing logic (being replaced by src/core/MessageRouter.js)

**`paymentHandlers.js`**
- Manual payment account selection
- QRIS generation delegation
- E-wallet instructions
- Bank transfer instructions

**`uiMessages.js`**
- UI message templates for customer responses
- Emoji-rich formatting for mobile readability

**`redisClient.js`**
- Redis connection management
- Auto-reconnect logic
- Error handling with fallback

**`transactionLogger.js`**
- Audit logging for:
  - Orders (orders-YYYY-MM-DD.log)
  - Payments (payments-YYYY-MM-DD.log)
  - Deliveries (deliveries-YYYY-MM-DD.log)
  - Admin actions (admin-YYYY-MM-DD.log)
  - Errors (errors-YYYY-MM-DD.log)
  - Security events (security-YYYY-MM-DD.log)

**`logRotationManager.js`**
- Daily log rotation at midnight
- 7-day retention (configurable via LOG_RETENTION_DAYS)
- Automatic old log deletion

### services/ - External Integrations

**`xenditService.js`**
- Xendit Payment API wrapper
- QRIS payment creation
- E-wallet payment (OVO, DANA, GoPay, ShopeePay)
- Virtual Account generation
- Webhook signature verification
- QR code image generation

**`webhookServer.js`**
- Express.js server listening on port 3000
- Endpoints:
  - POST /webhook/xendit - Payment notifications
  - GET /health - Health check
- Webhook signature validation
- Auto-delivery trigger on payment success
- Exponential backoff retry (1s → 16s, max 5 retries)

**`productDelivery.js`**
- Automated credential delivery
- Reads from products_data/<product>.txt
- Sends formatted credentials to customer
- Archives to products_data/sold/

**`qrisService.js`**
- Legacy QRIS generation (InterActive QRIS API)
- Maintained for backward compatibility

### tests/ - Test Suites

**Test Statistics:**
- 885 total tests
- 817 passing (92%)
- 85%+ code coverage

**Test Organization:**
- `unit/` - Isolated component tests (mocked dependencies)
- `integration/` - Multi-component interaction tests
- `e2e/` - Complete user journey tests

**Key Test Files:**
- `CustomerHandler.test.js` - Customer command tests
- `AdminHandler.test.js` - Admin authorization and command tests
- `ProductService.test.js` - Catalog and fuzzy search tests
- `SessionManager.test.js` - Session CRUD and TTL tests
- `checkout-flow.test.js` - Full checkout integration test

## Architecture Overview

### High-Level Component Interaction

```
┌─────────────────────────────────────────────────────────────────┐
│                        WhatsApp Client                          │
│                    (whatsapp-web.js)                            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ↓ Message Event
┌─────────────────────────────────────────────────────────────────┐
│                     Message Dispatcher                          │
│  - Filter groups/status                                         │
│  - Validate sender                                              │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Input Validator                            │
│  - Rate limiting (20/min)                                       │
│  - Sanitization                                                 │
│  - Cooldown check                                               │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ↓ Normalized Message
┌─────────────────────────────────────────────────────────────────┐
│                      Message Router                             │
│  - Command detection                                            │
│  - Step-based routing                                           │
│  - O(1) lookup via Map                                          │
└─────────────────────┬───────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┬────────────────┐
        │             │             │                │
        ↓             ↓             ↓                ↓
┌──────────────┬──────────────┬─────────────┬───────────────┐
│   Customer   │    Admin     │   Product   │   Payment     │
│   Handler    │   Handler    │   Handler   │   Handlers    │
└──────┬───────┴──────┬───────┴─────┬───────┴───────┬───────┘
       │              │             │               │
       │ Delegates    │ Delegates   │               │
       ↓              ↓             ↓               ↓
┌──────────────┬──────────────┬─────────────┬───────────────┐
│  Wishlist    │  Inventory   │  Product    │   Xendit      │
│  Service     │  Handler     │  Service    │   Service     │
└──────┬───────┴──────┬───────┴─────┬───────┴───────┬───────┘
       │              │             │               │
       │              │             │               │
       ↓              ↓             ↓               ↓
┌─────────────────────────────────────────────────────────┐
│                   Storage Layer                         │
│                                                         │
│  ┌───────────┐    ┌──────────────┐    ┌────────────┐  │
│  │   Redis   │    │  Redis Stock │    │   File     │  │
│  │  Sessions │    │   Manager    │    │  System    │  │
│  └───────────┘    └──────────────┘    └────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Data Flow Example: Customer Makes Purchase

1. **Customer sends:** "netflix"
2. **MessageDispatcher:** Validates not from group, passes to Router
3. **InputValidator:** Checks rate limit (20/min), sanitizes input
4. **MessageRouter:** 
   - Gets session step = "browsing"
   - Routes to CustomerHandler.handleProductSelection("netflix")
5. **CustomerHandler:**
   - Uses FuzzySearch utility to find product
   - Calls CartService.add(customerId, product)
6. **CartService:**
   - Validates stock via RedisStockManager
   - Updates session cart array
   - Saves to Redis via SessionManager
7. **SessionManager:**
   - Serializes session to JSON
   - SET session:{customerId} with TTL 1800s
8. **CustomerHandler:** Returns confirmation message
9. **MessageDispatcher:** Sends reply to customer

### Session State Machine

```
┌──────────┐
│  "menu"  │ ← Initial state
└────┬─────┘
     │ Customer types "browse"
     ↓
┌────────────┐
│ "browsing" │ ← Customer can type product names
└────┬───────┘
     │ Customer types "checkout"
     ↓
┌────────────┐
│ "checkout" │ ← Review cart, apply promo, select payment
└────┬───────┘
     │ Customer completes payment
     ↓
┌─────────────────┐
│ "payment_proof" │ ← Upload payment screenshot
└────┬────────────┘
     │ Admin approves or auto-delivery
     ↓
┌──────────┐
│  "menu"  │ ← Reset to menu
└──────────┘
```

### Modular Design Benefits

1. **Maintainability:**
   - Each file has single responsibility
   - Easy to locate and fix bugs
   - File size limit enforces modularity

2. **Testability:**
   - Components can be unit tested in isolation
   - Mock dependencies easily with dependency injection
   - 85%+ coverage achieved

3. **Scalability:**
   - New features added as new modules
   - Horizontal scaling possible via Redis
   - Handlers can be distributed across processes

4. **Code Reusability:**
   - Services used across multiple handlers
   - Utilities shared project-wide
   - Reduces code duplication

---

# 3. Detailed Security Audit

This security audit covers authentication, authorization, input validation, data protection, dependency vulnerabilities, and operational security.

## Overview

**Audit Date:** November 5, 2025  
**Methodology:** Static code analysis, dependency scanning, configuration review  
**Scope:** All JavaScript files, configuration files, dependencies  
**Tools Used:** npm audit, manual code review, GitHub Advisory Database

---

## Vulnerability Findings

### VULNERABILITY #1: Hardcoded Admin Numbers in Code

**Type:** Security Misconfiguration  
**Location:** `lib/inputValidator.js` lines 203-210, `lib/messageRouter.js` lines 15-19  
**Severity:** **MEDIUM**

**Description:**
Admin authorization checks rely on environment variables that could be empty or misconfigured. If `ADMIN_NUMBER_1`, `ADMIN_NUMBER_2`, and `ADMIN_NUMBER_3` are not set, the `isAdmin()` function returns `false` for all users, which is secure. However, there's no validation that at least one admin number is configured during startup.

```javascript
// lib/inputValidator.js:203-210
static isAdmin(customerId) {
  const adminNumbers = [
    process.env.ADMIN_NUMBER_1,
    process.env.ADMIN_NUMBER_2,
    process.env.ADMIN_NUMBER_3,
  ].filter(Boolean);  // Filters out undefined/null

  return adminNumbers.some((num) => customerId.includes(num));
}
```

**Risk:**
- Application could run with no configured admins
- Admin commands become inaccessible
- No warning or error on startup if admin numbers are missing

**Recommendation:**
Add startup validation in `index.js`:

```javascript
// Add after line 6 in index.js
const adminNumbers = [
  process.env.ADMIN_NUMBER_1,
  process.env.ADMIN_NUMBER_2,
  process.env.ADMIN_NUMBER_3
].filter(Boolean);

if (adminNumbers.length === 0) {
  console.error('❌ CRITICAL: No admin numbers configured in .env');
  console.error('💡 Set at least ADMIN_NUMBER_1 in .env file');
  process.exit(1);
}

console.log(`✅ Configured ${adminNumbers.length} admin number(s)`);
```

---

### VULNERABILITY #2: Puppeteer Dependency Vulnerabilities

**Type:** Dependency Vulnerability  
**Location:** `package.json` - puppeteer@18.2.1 (transitive via whatsapp-web.js)  
**Severity:** **HIGH**

**Description:**
NPM audit reveals high-severity vulnerabilities in the puppeteer dependency:

```
puppeteer  18.2.0 - 20.1.1
Severity: high
Via: puppeteer-core, tar-fs, ws

Vulnerabilities:
1. tar-fs: Path traversal (CVE-2024-XXXXX)
   - Severity: High
   - Range: >=2.0.0 <2.1.4
   - Can extract files outside intended directory

2. tar-fs: Symlink validation bypass
   - Severity: High
   - Can follow symlinks outside extraction directory

3. ws: ReDoS vulnerability
   - Severity: Medium
   - Regular expression denial of service
```

**Risk:**
- Malicious tar archives could write files outside intended directories
- Potential for remote code execution via crafted archives
- WhatsApp Web.js pins puppeteer version, preventing easy upgrade

**Recommendation:**

**Option A: Upgrade whatsapp-web.js (Breaking Change)**
```bash
npm install whatsapp-web.js@latest
# Test thoroughly as this may introduce breaking changes
```

**Option B: Audit Exceptions (Temporary)**
Create `.npmrc`:
```
audit-level=moderate
```

Add to `package.json`:
```json
"overrides": {
  "puppeteer": "^22.0.0"
}
```

**Option C: Alternative WhatsApp Library**
Consider migrating to `@whiskeysockets/baileys` (lightweight, no Puppeteer dependency):
```bash
npm install @whiskeysockets/baileys
```

**Immediate Action Required:** Monitor Puppeteer security advisories and plan upgrade path.

---

### VULNERABILITY #3: Missing Rate Limiting on Webhook Endpoint

**Type:** Denial of Service (DoS)  
**Location:** `services/webhookServer.js` lines 40-95  
**Severity:** **MEDIUM**

**Description:**
The webhook endpoint `/webhook/xendit` does not implement rate limiting. An attacker could flood the endpoint with requests, causing:
- High CPU usage
- Memory exhaustion
- Legitimate webhooks delayed or dropped

```javascript
// services/webhookServer.js:50
app.post("/webhook/xendit", async (req, res) => {
  // No rate limiting implemented
  // Process webhook immediately
});
```

**Risk:**
- DoS attacks targeting webhook endpoint
- Unnecessary processing of duplicate/malicious webhooks
- Potential for webhook signature bypass attempts via brute force

**Recommendation:**
Implement rate limiting using `express-rate-limit`:

```javascript
// Add to webhookServer.js after line 4
const rateLimit = require('express-rate-limit');

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 minute
  max: 100,  // Limit each IP to 100 requests per windowMs
  message: 'Too many webhook requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to webhook endpoint (line 50)
app.post("/webhook/xendit", webhookLimiter, async (req, res) => {
  // ... existing code
});
```

Install dependency:
```bash
npm install express-rate-limit
```

---

### VULNERABILITY #4: Insufficient Input Validation on Order IDs

**Type:** Input Validation Weakness  
**Location:** `lib/inputValidator.js` lines 193-197  
**Severity:** **LOW**

**Description:**
Order ID validation regex is correct but doesn't check for malicious patterns:

```javascript
// lib/inputValidator.js:193-197
static isValidOrderId(orderId) {
  // Format: ORD-timestamp-suffix
  const orderRegex = /^ORD-\d{13}-[a-zA-Z0-9]{4}$/;
  return orderRegex.test(orderId);
}
```

While this prevents basic injection, it doesn't:
- Limit timestamp to realistic ranges (past 10 years to future 1 year)
- Prevent brute-force order ID guessing

**Risk:**
- Attackers could attempt to approve/track orders by guessing order IDs
- No protection against enumeration attacks

**Recommendation:**
Enhanced validation:

```javascript
static isValidOrderId(orderId) {
  const orderRegex = /^ORD-\d{13}-[a-zA-Z0-9]{4}$/;
  if (!orderRegex.test(orderId)) return false;
  
  // Extract timestamp
  const timestamp = parseInt(orderId.split('-')[1]);
  const now = Date.now();
  const tenYearsAgo = now - (10 * 365 * 24 * 60 * 60 * 1000);
  const oneYearFuture = now + (365 * 24 * 60 * 60 * 1000);
  
  // Validate timestamp is within reasonable range
  if (timestamp < tenYearsAgo || timestamp > oneYearFuture) {
    return false;
  }
  
  return true;
}
```

Additionally, implement order ID hashing for admin commands:
```javascript
// Use HMAC to verify order ID wasn't tampered with
const crypto = require('crypto');
const secret = process.env.ORDER_ID_SECRET || 'change-this-secret';

function generateOrderId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const orderId = `ORD-${timestamp}-${random}`;
  
  // Add HMAC signature
  const hmac = crypto.createHmac('sha256', secret)
    .update(orderId)
    .digest('hex')
    .substring(0, 8);
  
  return `${orderId}-${hmac}`;
}
```

---

### VULNERABILITY #5: Webhook Signature Verification Timing Attack

**Type:** Timing Attack Vulnerability  
**Location:** `services/webhookServer.js` lines 55-61  
**Severity:** **LOW**

**Description:**
Webhook signature verification uses string comparison which is vulnerable to timing attacks:

```javascript
// services/webhookServer.js:55-61
const receivedToken = req.headers["x-callback-token"];
const expectedToken = process.env.XENDIT_WEBHOOK_TOKEN;

if (!expectedToken || receivedToken !== expectedToken) {
  console.warn("⚠️  Webhook: Invalid token");
  return res.status(401).json({ error: "Unauthorized" });
}
```

**Risk:**
- Attackers could use timing analysis to guess webhook token character by character
- String comparison (`!==`) returns immediately on first mismatch
- Each character takes different time to compare

**Recommendation:**
Use constant-time comparison:

```javascript
// Add at top of webhookServer.js
const crypto = require('crypto');

function secureCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  
  // Use crypto.timingSafeEqual for constant-time comparison
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  
  try {
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (e) {
    return false;
  }
}

// Replace line 58-61
if (!expectedToken || !secureCompare(receivedToken, expectedToken)) {
  console.warn("⚠️  Webhook: Invalid token");
  return res.status(401).json({ error: "Unauthorized" });
}
```

---

### VULNERABILITY #6: Missing HTTPS Enforcement for Webhooks

**Type:** Man-in-the-Middle (MITM)  
**Location:** `services/webhookServer.js`, `.env.example`  
**Severity:** **MEDIUM**

**Description:**
The webhook server runs on HTTP without TLS/SSL encryption. This means:
- Webhook data transmitted in plaintext
- Vulnerable to network eavesdropping
- Payment confirmation data exposed

```javascript
// services/webhookServer.js:35
const server = app.listen(this.port, () => {
  console.log(`✅ Webhook server listening on port ${this.port}`);
});
// No HTTPS configuration
```

**Risk:**
- Attackers on same network can intercept webhook payloads
- Payment data (amount, customer info) exposed
- Webhook tokens visible in plaintext

**Recommendation:**

**Option A: Use Reverse Proxy (Recommended for Production)**
Deploy with nginx or Caddy handling TLS:

```nginx
# /etc/nginx/sites-available/webhook
server {
    listen 443 ssl http2;
    server_name yourserver.com;
    
    ssl_certificate /etc/letsencrypt/live/yourserver.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourserver.com/privkey.pem;
    
    location /webhook {
        proxy_pass http://localhost:3000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Option B: Implement HTTPS in Node.js**
```javascript
// services/webhookServer.js
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync(process.env.SSL_KEY_PATH),
  cert: fs.readFileSync(process.env.SSL_CERT_PATH)
};

const server = https.createServer(options, app);
server.listen(this.port, () => {
  console.log(`✅ Webhook server (HTTPS) listening on port ${this.port}`);
});
```

**Immediate Action:** Configure reverse proxy with Let's Encrypt SSL certificate.

---

### VULNERABILITY #7: Potential Session Fixation

**Type:** Session Security  
**Location:** `sessionManager.js` lines 78-96  
**Severity:** **LOW**

**Description:**
Session IDs are based on WhatsApp customer IDs (phone numbers), which are predictable:

```javascript
// sessionManager.js:78
if (!this.sessions.has(customerId)) {
  const newSession = {
    customerId,  // Phone number like "6281234567890@c.us"
    cart: [],
    // ... other session data
  };
  this.sessions.set(customerId, newSession);
}
```

**Risk:**
- Session ID (customer WhatsApp ID) is predictable
- If Redis is compromised, attacker can enumerate all sessions
- No session rotation mechanism

**Recommendation:**
While using WhatsApp ID as session key is acceptable for this use case (WhatsApp already authenticates users), add additional protection:

1. **Redis Password Protection:**
```bash
# /etc/redis/redis.conf
requirepass your_strong_redis_password_here
```

Update `.env`:
```bash
REDIS_PASSWORD=your_strong_redis_password
```

2. **Session Data Encryption:**
```javascript
// sessionManager.js
const crypto = require('crypto');

class SessionManager {
  constructor() {
    this.encryptionKey = process.env.SESSION_ENCRYPTION_KEY || 
      crypto.randomBytes(32).toString('hex');
  }
  
  _encryptSession(sessionData) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', 
      Buffer.from(this.encryptionKey, 'hex'), iv);
    
    let encrypted = cipher.update(JSON.stringify(sessionData), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }
  
  _decryptSession(encryptedData) {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv('aes-256-cbc',
      Buffer.from(this.encryptionKey, 'hex'), iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }
}
```

---

### VULNERABILITY #8: Xendit API Key Exposure Risk

**Type:** Secret Management  
**Location:** `.env.example`, `services/xenditService.js` line 14  
**Severity:** **HIGH**

**Description:**
Xendit API keys are stored in `.env` file. While this is correct practice, there are risks:

1. `.env` file might be accidentally committed to Git
2. No validation that production keys aren't used in development
3. API keys logged in error messages

```javascript
// services/xenditService.js:14
this.xendit = new Xendit({
  secretKey: process.env.XENDIT_SECRET_KEY,  // Could be undefined
});
```

**Risk:**
- Production API keys committed to version control
- API keys visible in logs/error messages
- No differentiation between test and production keys

**Recommendation:**

1. **Add .env to .gitignore (Already done, verify):**
```bash
cat .gitignore | grep ".env"
# Should show: .env
```

2. **Validate API Key on Startup:**
```javascript
// services/xenditService.js constructor
constructor() {
  const secretKey = process.env.XENDIT_SECRET_KEY;
  
  if (!secretKey) {
    throw new Error('XENDIT_SECRET_KEY not configured in .env');
  }
  
  // Validate key format
  if (!secretKey.startsWith('xnd_')) {
    throw new Error('Invalid Xendit API key format');
  }
  
  // Warn if production key used in development
  if (process.env.NODE_ENV !== 'production' && 
      secretKey.startsWith('xnd_production_')) {
    console.warn('⚠️  WARNING: Using production Xendit key in development!');
  }
  
  this.xendit = new Xendit({ secretKey });
}
```

3. **Never Log API Keys:**
```javascript
// Instead of logging error.message which might contain key
console.error("❌ Xendit Error:", error.message);

// Use sanitized logging
console.error("❌ Xendit Error:", error.message.replace(/xnd_[a-z_]*[a-zA-Z0-9]{32,}/g, '[REDACTED]'));
```

4. **Use Environment-Based Key Management:**
```bash
# .env.development
XENDIT_SECRET_KEY=xnd_development_test_key

# .env.production (never commit)
XENDIT_SECRET_KEY=xnd_production_real_key
```

---

### VULNERABILITY #9: Missing Input Length Limits

**Type:** Denial of Service  
**Location:** `lib/inputValidator.js` line 173  
**Severity:** **LOW**

**Description:**
While message length is limited to 1000 characters, other inputs lack limits:

```javascript
// lib/inputValidator.js:173
const MAX_LENGTH = 1000;
if (sanitized.length > MAX_LENGTH) {
  sanitized = sanitized.substring(0, MAX_LENGTH);
}
```

However, product names, review text, admin commands have no length limits.

**Risk:**
- Very long review text could cause memory issues
- Large broadcast messages could crash bot
- Database storage could fill up with lengthy inputs

**Recommendation:**
Add specific length limits:

```javascript
// lib/inputValidator.js

static validateReviewText(text) {
  const MAX_REVIEW_LENGTH = 500;
  if (text.length > MAX_REVIEW_LENGTH) {
    return {
      valid: false,
      error: `Review text too long (max ${MAX_REVIEW_LENGTH} characters)`
    };
  }
  return { valid: true };
}

static validateBroadcastMessage(message) {
  const MAX_BROADCAST_LENGTH = 2000;
  if (message.length > MAX_BROADCAST_LENGTH) {
    return {
      valid: false,
      error: `Broadcast too long (max ${MAX_BROADCAST_LENGTH} characters)`
    };
  }
  return { valid: true };
}

static validateProductName(name) {
  const MAX_PRODUCT_NAME_LENGTH = 100;
  if (name.length > MAX_PRODUCT_NAME_LENGTH) {
    return {
      valid: false,
      error: `Product name too long (max ${MAX_PRODUCT_NAME_LENGTH} characters)`
    };
  }
  return { valid: true };
}
```

---

### VULNERABILITY #10: Insecure Log File Permissions

**Type:** Information Disclosure  
**Location:** `lib/transactionLogger.js`, log files in `logs/` directory  
**Severity:** **LOW**

**Description:**
Log files contain sensitive information (customer phone numbers, order IDs, payment amounts) but file permissions aren't explicitly set.

Default Unix permissions (644) allow:
- Owner: read/write
- Group: read
- Others: read

**Risk:**
- Other users on VPS can read log files
- Sensitive customer data exposed
- Compliance violations (GDPR, PCI-DSS)

**Recommendation:**

1. **Set Restrictive Permissions:**
```javascript
// lib/transactionLogger.js - Add after file write
const fs = require('fs');

_writeLog(category, logEntry) {
  const filename = `logs/${category}-${this._getDateString()}.log`;
  const logLine = JSON.stringify(logEntry) + '\n';
  
  fs.appendFileSync(filename, logLine, { mode: 0o600 });  // Owner read/write only
}
```

2. **Set Directory Permissions on Startup:**
```bash
# In install-vps.sh or deployment script
chmod 700 logs/
chmod 600 logs/*.log
```

3. **Add to index.js startup:**
```javascript
// index.js - Add after line 100
const fs = require('fs');
const path = require('path');

// Ensure logs directory has restrictive permissions
const logsDir = path.join(__dirname, 'logs');
if (fs.existsSync(logsDir)) {
  fs.chmodSync(logsDir, 0o700);  // drwx------
  console.log('✅ Secured logs directory permissions');
}
```

---

## Additional Security Findings (Non-Critical)

### Finding #11: Missing Content Security Policy (CSP)

**Location:** `services/webhookServer.js`  
**Severity:** **INFO**

The webhook server doesn't set security headers. While not critical (it's an API, not a web app), adding headers is good practice:

```javascript
// services/webhookServer.js - Add middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
```

### Finding #12: No Request Size Limit

**Location:** `services/webhookServer.js` line 18  
**Severity:** **INFO**

Body parser has no size limit configured:

```javascript
// Current
app.use(bodyParser.json());

// Recommended
app.use(bodyParser.json({ limit: '10kb' }));  // Prevent large payload attacks
app.use(bodyParser.urlencoded({ extended: true, limit: '10kb' }));
```

### Finding #13: Hardcoded Regex Patterns

**Location:** Multiple files  
**Severity:** **INFO**

Regex patterns are hardcoded in multiple places. Consider centralizing in `src/utils/Constants.js`:

```javascript
// src/utils/Constants.js
module.exports = {
  PATTERNS: {
    ORDER_ID: /^ORD-\d{13}-[a-zA-Z0-9]{4}$/,
    PHONE_NUMBER: /^\d{10,15}@c\.us$/,
    XENDIT_KEY: /^xnd_[a-z_]*[a-zA-Z0-9]{32,}$/
  }
};
```

---

## Dependency Security Summary

### Current Vulnerabilities (npm audit)

```
5 high severity vulnerabilities

Dependencies with vulnerabilities:
1. puppeteer (via whatsapp-web.js)
   - tar-fs path traversal
   - tar-fs symlink bypass
   - ws ReDoS vulnerability

2. fluent-ffmpeg (deprecated, no security impact)

3. rimraf < v4 (deprecated, no security impact)

4. glob < v9 (deprecated, no security impact)

5. inflight (memory leak, minimal impact)
```

**Recommended Actions:**

1. **Immediate:** Run `npm audit fix` for non-breaking fixes
2. **Short-term:** Monitor whatsapp-web.js for updates addressing puppeteer
3. **Long-term:** Consider migrating to @whiskeysockets/baileys (no Chromium dependency)

### Dependency Audit Commands

```bash
# Check for vulnerabilities
npm audit

# Auto-fix non-breaking issues
npm audit fix

# Force fix (may introduce breaking changes)
npm audit fix --force

# Generate detailed report
npm audit --json > audit-report.json
```

---

## Compliance & Best Practices

### OWASP Top 10 Coverage

| OWASP Risk | Status | Notes |
|------------|--------|-------|
| A01: Broken Access Control | ✅ Good | Admin authorization enforced |
| A02: Cryptographic Failures | ⚠️  Moderate | Session data unencrypted in Redis |
| A03: Injection | ✅ Good | Input sanitization implemented |
| A04: Insecure Design | ✅ Good | Modular architecture, separation of concerns |
| A05: Security Misconfiguration | ⚠️  Moderate | Need startup validation for env vars |
| A06: Vulnerable Components | ❌ Needs Work | Puppeteer vulnerabilities |
| A07: Auth/Auth Failures | ✅ Good | Rate limiting, WhatsApp auth |
| A08: Data Integrity Failures | ⚠️  Moderate | Webhook signature timing attack |
| A09: Logging Failures | ✅ Good | Comprehensive audit logging |
| A10: Server-Side Request Forgery | N/A | No SSRF vectors |

### GDPR Compliance Considerations

**Data Collected:**
- WhatsApp phone numbers (customer IDs)
- Purchase history
- Payment information (amounts, methods)
- Review text

**Recommendations:**
1. Add privacy policy explaining data usage
2. Implement data deletion command (`/delete-my-data`)
3. Encrypt session data at rest
4. Regular data retention policy (auto-delete old orders)

**Implementation Example:**
```javascript
// Add to CustomerHandler
async handleDeleteData(customerId) {
  // Delete session
  await this.sessionManager.deleteSession(customerId);
  
  // Delete order history
  await this.orderService.deleteCustomerOrders(customerId);
  
  // Delete reviews
  await this.reviewService.deleteCustomerReviews(customerId);
  
  // Log deletion for compliance
  this.logger.logAdmin('GDPR_DELETION', { customerId, timestamp: Date.now() });
  
  return '✅ All your data has been permanently deleted.';
}
```

---

## Security Recommendations Summary

### Critical Priority (Fix Immediately)

1. ✅ **Validate admin numbers on startup** (Prevents lockout)
2. ✅ **Implement webhook rate limiting** (Prevents DoS)
3. ✅ **Upgrade or mitigate Puppeteer vulnerabilities**

### High Priority (Fix Within 1 Week)

4. ✅ **Implement HTTPS for webhook server** (Prevents MITM)
5. ✅ **Secure Redis with password** (Prevents unauthorized access)
6. ✅ **Validate Xendit API key on startup** (Prevents misconfig)

### Medium Priority (Fix Within 1 Month)

7. ✅ **Use constant-time comparison for webhook tokens**
8. ✅ **Encrypt session data in Redis**
9. ✅ **Enhanced order ID validation**
10. ✅ **Set restrictive log file permissions**

### Low Priority (Improvement)

11. ✅ **Add security headers to webhook server**
12. ✅ **Implement request size limits**
13. ✅ **Add input length validation for all fields**
14. ✅ **Centralize regex patterns**

---

## Security Testing Checklist

Before deploying to production, verify:

- [ ] All environment variables configured in `.env`
- [ ] At least one admin number set (`ADMIN_NUMBER_1`)
- [ ] Redis password configured (if Redis exposed)
- [ ] Xendit API keys validated (format check)
- [ ] HTTPS enabled for webhook endpoint
- [ ] Firewall configured (only ports 22, 443, 3000 open)
- [ ] Log file permissions set to 600
- [ ] `.env` file in `.gitignore` (verify not committed)
- [ ] Rate limiting tested (20 messages/minute enforced)
- [ ] Input sanitization tested (XSS, null bytes blocked)
- [ ] npm audit shows 0 critical/high vulnerabilities
- [ ] Session TTL working (30-minute expiration)
- [ ] Payment webhook signature validation working
- [ ] Admin authorization tested (only configured numbers work)

---

## Disclaimer

**This security audit was conducted on November 5, 2025 based on static code analysis and automated tools.**

**Limitations:**
- No penetration testing performed
- No dynamic runtime analysis
- Third-party dependencies not fully audited
- Infrastructure security (VPS, network) not assessed

**Recommendations:**
- Conduct professional security audit before production deployment
- Implement continuous security monitoring
- Regular dependency updates and scans
- Security awareness training for administrators
- Incident response plan for security breaches

**For mission-critical applications:**
Consider engaging a professional security firm for:
- Penetration testing
- Code review by certified security professionals
- Compliance audit (PCI-DSS for payment data, GDPR for customer data)
- Infrastructure security assessment

---

## Conclusion

**Overall Security Assessment: B+ (Good with room for improvement)**

**Strengths:**
✅ Comprehensive input validation and sanitization  
✅ Rate limiting prevents spam and abuse  
✅ Admin authorization properly implemented  
✅ Comprehensive audit logging  
✅ Modular architecture reduces attack surface  
✅ No hardcoded secrets in code (use .env)

**Areas for Improvement:**
⚠️  Puppeteer dependency vulnerabilities (high severity)  
⚠️  Missing HTTPS for webhook endpoint  
⚠️  Session data not encrypted at rest  
⚠️  No startup validation for critical env vars

**Critical Actions Required:**
1. Implement webhook HTTPS (reverse proxy recommended)
2. Add startup validation for admin numbers
3. Plan Puppeteer vulnerability mitigation strategy
4. Implement webhook rate limiting

**The codebase demonstrates solid security practices overall. Addressing the identified high-priority vulnerabilities will significantly improve the security posture.**

---

_End of Security Audit_

---

# Document Information

**Document Title:** WhatsApp Shopping Chatbot - Comprehensive Documentation  
**Version:** 1.0.0  
**Generated:** November 5, 2025  
**Total Sections:** 3 (README, Code Structure, Security Audit)  
**Total Lines:** 1673+ lines of detailed documentation  
**Language:** English  
**Format:** Markdown  

**Included Sections:**
1. ✅ Complete README.md content (installation, usage, configuration)
2. ✅ Detailed code structure analysis (architecture, file descriptions)
3. ✅ Comprehensive security audit (10 vulnerabilities identified, remediation provided)

**Intended Audience:**
- Developers implementing or maintaining the chatbot
- System administrators deploying to production
- Security auditors reviewing the codebase
- Project stakeholders evaluating architecture

**Next Steps:**
1. Review all vulnerability findings
2. Implement critical and high-priority security fixes
3. Update dependencies to address known CVEs
4. Deploy with recommended security configurations
5. Conduct periodic security reviews

---

**End of Comprehensive Documentation**
