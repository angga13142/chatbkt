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

echo "📦 Updating system packages..."
apt update && apt upgrade -y

echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
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

echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Clone the repository: git clone https://github.com/benihutapea/chatbot.git"
echo "2. Navigate to directory: cd chatbot"
echo "3. Install dependencies: PUPPETEER_SKIP_DOWNLOAD=true npm install"
echo "4. Start the bot: pm2 start index.js --name whatsapp-bot"
echo "5. View logs: pm2 logs whatsapp-bot"
echo "6. Scan QR code with WhatsApp"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
