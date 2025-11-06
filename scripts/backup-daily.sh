#!/bin/bash
# Daily Backup Script for WhatsApp Shopping Bot
# Backs up critical data: products, session data, .env, logs

set -e

# Configuration
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="$HOME/backups/chatbot"
PROJECT_DIR="/home/senarokalie/Desktop/chatbot"
RETENTION_DAYS=30

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔄 Starting backup...${NC}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Change to project directory
cd "$PROJECT_DIR"

# Create backup archive
BACKUP_FILE="$BACKUP_DIR/chatbot-backup-$DATE.tar.gz"

echo "📦 Creating backup archive..."
tar -czf "$BACKUP_FILE" \
  --exclude='node_modules' \
  --exclude='.wwebjs_auth' \
  --exclude='.wwebjs_cache' \
  --exclude='coverage' \
  --exclude='*.log' \
  products_data/ \
  data/ \
  .env \
  package.json \
  package-lock.json \
  2>/dev/null || true

# Check if backup was created
if [ -f "$BACKUP_FILE" ]; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo -e "${GREEN}✅ Backup created: $(basename $BACKUP_FILE) ($SIZE)${NC}"
else
  echo "❌ Backup failed!"
  exit 1
fi

# Clean old backups (keep last 30 days)
echo "🧹 Cleaning old backups..."
find "$BACKUP_DIR" -name "chatbot-backup-*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete

# Count remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "chatbot-backup-*.tar.gz" -type f | wc -l)
echo "📊 Total backups: $BACKUP_COUNT"

# Backup info
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✨ Backup Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 Location: $BACKUP_DIR"
echo "📦 File: $(basename $BACKUP_FILE)"
echo "💾 Size: $SIZE"
echo "🗓️  Date: $(date)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Optional: Send notification to admin (if bot is running)
# Uncomment if you want WhatsApp notification
# node -e "
#   const client = require('./index.js').client;
#   if (client) {
#     client.sendMessage('${ADMIN_NUMBER}', '✅ Daily backup completed: $(basename $BACKUP_FILE) ($SIZE)');
#   }
# " 2>/dev/null || true

exit 0
