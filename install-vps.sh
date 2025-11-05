#!/bin/bash

# WhatsApp Shopping Chatbot - VPS Installation Script
# For Ubuntu/Debian systems with 1 vCPU and 2GB RAM

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "WhatsApp Shopping Chatbot Installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "❌ Please run as root (use sudo)"
  exit 1
fi

# Repository URL (can be customized)
REPO_URL="${CHATBOT_REPO_URL:-https://github.com/benihutapea/chatbot.git}"

echo "📦 Updating system packages..."
apt update && apt upgrade -y

echo "📦 Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo "📦 Installing required dependencies for Chromium..."
apt install -y \
  gconf-service libasound2 libatk1.0-0 libc6 libcairo2 \
  libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 \
  libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 \
  libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 \
  libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 \
  libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 \
  libxss1 libxtst6 ca-certificates fonts-liberation \
  libappindicator1 libnss3 lsb-release xdg-utils wget \
  chromium-browser

echo "📦 Installing PM2 (Process Manager)..."
npm install -g pm2

echo "📦 Installing Git..."
apt install -y git

echo ""
echo "❓ Do you want to install Redis? (recommended for session persistence)"
echo "   Press 'y' for yes, any other key to skip..."
read -n 1 -t 10 redis_choice
echo ""

if [ "$redis_choice" = "y" ] || [ "$redis_choice" = "Y" ]; then
  echo "📦 Installing Redis..."
  apt install -y redis-server
  systemctl enable redis-server
  systemctl start redis-server
  echo "✅ Redis installed and started"
else
  echo "⏭️  Skipping Redis installation (will use in-memory sessions)"
fi

echo "✅ Installation complete!"
echo ""

# Security: Set restrictive permissions for sensitive directories
if [ -d "logs" ]; then
  echo "🔒 Setting restrictive permissions for log files..."
  chmod 700 logs/
  find logs/ -type f -name "*.log" -exec chmod 600 {} \;
  echo "✅ Log file permissions secured (700 for directory, 600 for files)"
fi

if [ -d "data" ]; then
  echo "🔒 Setting restrictive permissions for data directory..."
  chmod 700 data/
  find data/ -type f -exec chmod 600 {} \;
  echo "✅ Data file permissions secured"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1️⃣  Clone the repository:"
echo "    git clone ${REPO_URL}"
echo ""
echo "2️⃣  Navigate to directory:"
echo "    cd chatbot"
echo ""
echo "3️⃣  Copy environment file:"
echo "    cp .env.example .env"
echo ""
echo "4️⃣  Edit configuration:"
echo "    nano .env"
echo "    (Set your Xendit API key, admin numbers, etc.)"
echo ""
echo "5️⃣  Install dependencies:"
echo "    PUPPETEER_SKIP_DOWNLOAD=true npm install"
echo ""
echo "6️⃣  Start the bot with PM2:"
echo "    pm2 start index.js --name whatsapp-bot"
echo "    pm2 save"
echo "    pm2 startup"
echo ""
echo "7️⃣  View logs and scan QR code:"
echo "    pm2 logs whatsapp-bot"
echo "    (Scan QR code with WhatsApp app)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📚 Project Structure:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  chatbot/"
echo "  ├── index.js           # Main entry point"
echo "  ├── chatbotLogic.js    # Business logic (legacy)"
echo "  ├── sessionManager.js  # Session management (legacy)"
echo "  ├── config.js          # Product catalog (legacy)"
echo "  ├── src/               # Modular source code"
echo "  │   ├── handlers/      # Customer, Admin, AI handlers"
echo "  │   ├── services/      # AI, Payment, Session services"
echo "  │   ├── config/        # App, Products, Payment config"
echo "  │   └── utils/         # Utilities (FuzzySearch, etc.)"
echo "  ├── lib/               # Core modules (legacy support)"
echo "  ├── services/          # External services (Xendit, Webhook)"
echo "  ├── tests/             # 251 test suites (68.5% coverage)"
echo "  └── docs/              # Comprehensive documentation"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Useful PM2 Commands:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  pm2 logs whatsapp-bot    # View logs"
echo "  pm2 restart whatsapp-bot # Restart bot"
echo "  pm2 stop whatsapp-bot    # Stop bot"
echo "  pm2 status               # Check status"
echo "  pm2 monit                # Monitor resources"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Testing:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  npm test                 # Run test suite"
echo "  npm run lint             # Check code quality"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🤖 AI Features (Optional):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  To enable AI features:"
echo "  1. Get API key: https://aistudio.google.com/app/apikey"
echo "  2. Set in .env: AI_ENABLE=true"
echo "  3. Set GOOGLE_API_KEY=your_key_here"
echo "  4. Restart: pm2 restart whatsapp-bot"
echo ""
echo "  Features: Typo correction, Q&A, Recommendations"
echo "  Cost: ~$0.00005 per call (very cheap!)"
echo ""
echo "📖 Documentation: See docs/_DOCUMENTATION_INDEX.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
