# VPS Deployment Guide 🚀

Complete guide for deploying WhatsApp Shopping Chatbot on a VPS with 1 vCPU and 2GB RAM.

## Prerequisites

- VPS with Ubuntu 20.04/22.04 or Debian 11/12
- Root or sudo access
- At least 1 vCPU and 2GB RAM
- 10GB+ disk space
- Stable internet connection

## Recommended VPS Providers

- **DigitalOcean** - Droplet ($6/month for 1 vCPU, 2GB RAM)
- **Vultr** - Cloud Compute ($6/month)
- **Linode** - Shared CPU ($6/month)
- **Hetzner** - CX11 (~€4/month)
- **AWS Lightsail** - ($5/month)

## Quick Installation (Automated)

```bash
# Download and run the installation script
wget https://raw.githubusercontent.com/benihutapea/chatbot/main/install-vps.sh
sudo bash install-vps.sh

# Clone the repository
git clone https://github.com/benihutapea/chatbot.git
cd chatbot

# Install dependencies (skipping Chromium download)
PUPPETEER_SKIP_DOWNLOAD=true npm install

# Start the bot
pm2 start index.js --name whatsapp-bot

# View logs and scan QR code
pm2 logs whatsapp-bot
```

## Manual Installation (Step by Step)

### Step 1: Connect to VPS

```bash
ssh root@your-vps-ip
# or
ssh username@your-vps-ip
```

### Step 2: Update System

```bash
sudo apt update
sudo apt upgrade -y
```

### Step 3: Install Node.js

```bash
# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher
```

### Step 4: Install Chromium and Dependencies

```bash
sudo apt install -y \
  gconf-service libasound2 libatk1.0-0 libc6 libcairo2 \
  libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 \
  libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 \
  libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 \
  libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 \
  libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 \
  libxss1 libxtst6 ca-certificates fonts-liberation \
  libappindicator1 libnss3 lsb-release xdg-utils wget \
  chromium-browser
```

### Step 5: Install PM2 (Process Manager)

```bash
sudo npm install -g pm2

# Verify installation
pm2 --version
```

### Step 6: Clone Repository

```bash
# Install Git if not already installed
sudo apt install -y git

# Clone the repository
git clone https://github.com/benihutapea/chatbot.git
cd chatbot
```

### Step 7: Install Dependencies

```bash
# Install npm packages (skip Chromium download to use system Chromium)
PUPPETEER_SKIP_DOWNLOAD=true npm install
```

### Step 8: Configure the Bot (Optional)

```bash
# Copy example environment file
cp .env.example .env

# Edit configuration
nano .env
```

### Step 9: Start the Bot

```bash
# Start with PM2
pm2 start index.js --name whatsapp-bot

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the instructions shown
```

### Step 10: Connect WhatsApp

```bash
# View logs to see QR code
pm2 logs whatsapp-bot

# Scan the QR code with your WhatsApp:
# 1. Open WhatsApp on your phone
# 2. Go to Settings > Linked Devices
# 3. Tap "Link a Device"
# 4. Scan the QR code shown in logs
```

## Post-Installation

### Verify Bot is Running

```bash
pm2 status
```

You should see:

```
┌─────┬──────────────┬─────────────┬─────────┬─────────┬──────────┐
│ id  │ name         │ mode        │ ↺       │ status  │ cpu      │
├─────┼──────────────┼─────────────┼─────────┼─────────┼──────────┤
│ 0   │ whatsapp-bot │ fork        │ 0       │ online  │ 5%       │
└─────┴──────────────┴─────────────┴─────────┴─────────┴──────────┘
```

### Monitor Resource Usage

```bash
# View PM2 monitoring dashboard
pm2 monit

# Or use htop
sudo apt install htop
htop
```

### View Real-time Logs

```bash
pm2 logs whatsapp-bot --lines 50
```

## Security Hardening

### 1. Setup Firewall

```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH
sudo ufw allow ssh

# Check status
sudo ufw status
```

### 2. Create Non-Root User

```bash
# Create new user
sudo adduser chatbot

# Add to sudo group
sudo usermod -aG sudo chatbot

# Switch to new user
su - chatbot

# Then repeat steps 6-10 as this user
```

### 3. Disable Root Login (Optional)

```bash
sudo nano /etc/ssh/sshd_config

# Change this line:
# PermitRootLogin yes
# To:
# PermitRootLogin no

# Restart SSH
sudo systemctl restart sshd
```

### 4. Setup Swap (For 2GB RAM VPS)

```bash
# Create 2GB swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify
sudo swapon --show
free -h
```

## Maintenance

### Update the Bot

```bash
cd chatbot
git pull origin main
PUPPETEER_SKIP_DOWNLOAD=true npm install
pm2 restart whatsapp-bot
```

### Backup Session Data

```bash
# Backup WhatsApp session (important!)
cd chatbot
tar -czf whatsapp-session-backup.tar.gz .wwebjs_auth/

# Download to local machine
scp user@vps-ip:~/chatbot/whatsapp-session-backup.tar.gz ./
```

### Restore Session Data

```bash
cd chatbot
tar -xzf whatsapp-session-backup.tar.gz
pm2 restart whatsapp-bot
```

### Clear Old Logs

```bash
pm2 flush  # Clear all logs
```

## Useful PM2 Commands

```bash
# Start bot
pm2 start index.js --name whatsapp-bot

# Stop bot
pm2 stop whatsapp-bot

# Restart bot
pm2 restart whatsapp-bot

# Delete from PM2
pm2 delete whatsapp-bot

# View logs
pm2 logs whatsapp-bot

# View logs (last 100 lines)
pm2 logs whatsapp-bot --lines 100

# Monitor resource usage
pm2 monit

# Show all processes
pm2 list

# Show detailed info
pm2 show whatsapp-bot

# Save current PM2 list
pm2 save

# Resurrect saved processes
pm2 resurrect
```

## Troubleshooting

### Bot Won't Start

```bash
# Check Node.js version
node --version

# Reinstall dependencies
cd chatbot
rm -rf node_modules package-lock.json
PUPPETEER_SKIP_DOWNLOAD=true npm install

# Check logs
pm2 logs whatsapp-bot --err
```

### QR Code Not Appearing

```bash
# Check if Chromium is installed
which chromium-browser
chromium-browser --version

# Reinstall Chromium
sudo apt install --reinstall chromium-browser

# Restart bot
pm2 restart whatsapp-bot
pm2 logs whatsapp-bot
```

### High Memory Usage

```bash
# Check memory
free -h

# If needed, add/increase swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Restart bot
pm2 restart whatsapp-bot
```

### Connection Issues

```bash
# Check internet connection
ping google.com

# Check if port 443 is accessible
telnet web.whatsapp.com 443

# Restart networking
sudo systemctl restart networking
```

### Bot Disconnects Frequently

This can happen due to:

- Unstable internet connection
- WhatsApp detecting automation (rate limiting)
- VPS provider blocking WhatsApp traffic

Solutions:

```bash
# 1. Restart bot
pm2 restart whatsapp-bot

# 2. Clear session and re-authenticate
cd chatbot
rm -rf .wwebjs_auth/
pm2 restart whatsapp-bot
# Scan QR code again

# 3. Contact VPS provider if blocked
```

### Disk Space Full

```bash
# Check disk usage
df -h

# Clear PM2 logs
pm2 flush

# Clear system logs
sudo journalctl --vacuum-time=7d

# Clear package cache
sudo apt clean
```

## Performance Optimization

### For 1 vCPU, 2GB RAM VPS

The bot is already optimized with these settings in `index.js`:

```javascript
puppeteer: {
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
    ]
}
```

Expected resource usage:

- **Memory**: 300-500 MB (idle), 500-800 MB (active)
- **CPU**: 5-15% (idle), 30-60% (during active conversations)
- **Disk**: ~500 MB for application + ~200 MB for session data

### Additional Optimizations

1. **Limit PM2 Memory**

```bash
pm2 start index.js --name whatsapp-bot --max-memory-restart 800M
```

2. **Enable PM2 Auto-restart on Crash**

```bash
pm2 start index.js --name whatsapp-bot --exp-backoff-restart-delay=100
```

3. **Setup Log Rotation**

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## Monitoring

### Setup Monitoring Dashboard

```bash
# Install PM2 Plus (optional, for advanced monitoring)
pm2 plus

# Or use simple monitoring
pm2 monit
```

### Check Bot Health

```bash
# CPU and Memory usage
pm2 status

# Detailed metrics
pm2 show whatsapp-bot

# System resources
htop
```

## Scaling

If you need to handle more customers:

1. **Upgrade VPS**: 2 vCPU, 4GB RAM
2. **Multiple Bots**: Run multiple WhatsApp numbers
3. **Database**: Add Redis for session storage (see Redis Setup below)
4. **Load Balancer**: Distribute across multiple VPS

## Redis Setup (Session Persistence)

Redis enables session persistence across bot restarts and reduces memory usage.

### Install Redis

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y redis-server

# Start Redis service
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify Redis is running
redis-cli ping  # Should return: PONG
```

### Configure Redis for Production

Edit Redis configuration:

```bash
sudo nano /etc/redis/redis.conf
```

Recommended settings for VPS:

```conf
# Bind to localhost only (security)
bind 127.0.0.1

# Set password (replace YOUR_STRONG_PASSWORD)
requirepass YOUR_STRONG_PASSWORD

# Memory limit (adjust based on VPS RAM)
maxmemory 256mb
maxmemory-policy allkeys-lru

# Enable AOF persistence
appendonly yes
appendfsync everysec

# Disable RDB snapshots (AOF is enough)
save ""
```

Restart Redis:

```bash
sudo systemctl restart redis-server
```

### Configure Bot to Use Redis

Edit `.env` file:

```env
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=YOUR_STRONG_PASSWORD
SESSION_TTL=1800  # 30 minutes
```

### Verify Redis Connection

```bash
# Test Redis connection
redis-cli -a YOUR_STRONG_PASSWORD ping

# Monitor Redis in real-time
redis-cli -a YOUR_STRONG_PASSWORD monitor

# Check memory usage
redis-cli -a YOUR_STRONG_PASSWORD info memory
```

### Redis Benefits

- ✅ Sessions persist across bot restarts
- ✅ Reduced memory usage (TTL auto-expires old sessions)
- ✅ Better performance for multiple concurrent users
- ✅ Horizontal scaling ready (multiple bot instances can share Redis)

## Webhook Setup (Auto Payment Verification)

Webhook enables automatic product delivery when payment is confirmed, eliminating manual admin approval.

### Requirements

- Public domain or IP with SSL certificate (for production)
- Port 3000 accessible (or configure `WEBHOOK_PORT`)

### Configure Webhook

1. **Set webhook URL in `.env`:**

```env
WEBHOOK_URL=https://yourdomain.com
WEBHOOK_PORT=3000
XENDIT_WEBHOOK_TOKEN=your_webhook_token_from_xendit
```

2. **Setup Nginx reverse proxy (recommended):**

```bash
# Install Nginx
sudo apt install -y nginx certbot python3-certbot-nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/webhook
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /webhook/xendit {
        proxy_pass http://localhost:3000/webhook/xendit;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    location /health {
        proxy_pass http://localhost:3000/health;
    }
}
```

Enable site and get SSL:

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/webhook /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate (free from Let's Encrypt)
sudo certbot --nginx -d yourdomain.com
```

3. **Configure Xendit webhook in dashboard:**

- Go to: https://dashboard.xendit.co/settings/developers#webhooks
- Add webhook URL: `https://yourdomain.com/webhook/xendit`
- Copy webhook verification token to `XENDIT_WEBHOOK_TOKEN` in `.env`
- Select events: Invoice Paid, E-Wallet Paid, Virtual Account Paid

4. **Test webhook:**

```bash
# Check health endpoint
curl https://yourdomain.com/health

# Should return:
# {"status":"ok","timestamp":"...","redis":"connected","whatsapp":"connected"}
```

### Webhook Security

The webhook server automatically:

- ✅ Verifies Xendit signature (`X-Callback-Token` header)
- ✅ Validates payment status before delivery
- ✅ Logs all webhook events to `logs/transactions.json`
- ✅ Prevents duplicate deliveries

### Webhook Flow

1. Customer pays via Xendit (QRIS/E-Wallet/VA)
2. Xendit sends webhook to your server
3. Server verifies signature and payment status
4. If PAID/SUCCEEDED → auto-deliver products via WhatsApp
5. Session updated, cart cleared, transaction logged

### Without Webhook (Manual Mode)

If you don't setup webhook:

- Customer pays → Admin checks Xendit dashboard manually
- Admin runs `/approve ORDER_ID` command
- Payment verified via API → Products delivered

Webhook eliminates manual step, enabling 24/7 automated operation.

## Support

If you encounter issues:

1. Check logs: `pm2 logs whatsapp-bot`
2. Review troubleshooting section above
3. Restart bot: `pm2 restart whatsapp-bot`
4. Check system resources: `htop`, `free -h`, `df -h`
5. Open issue on GitHub

## License

MIT License - Free for commercial use

---

**Happy Deploying! 🚀**
