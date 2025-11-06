# Crontab Setup Instructions

## How to Setup Daily Backup

### 1. Open crontab editor:

```bash
crontab -e
```

### 2. Add this line (backup daily at 2 AM):

```cron
0 2 * * * /home/senarokalie/Desktop/chatbot/scripts/backup-daily.sh >> /home/senarokalie/Desktop/chatbot/logs/backup.log 2>&1
```

### 3. Save and exit

- Press `Ctrl+O` to save
- Press `Enter` to confirm
- Press `Ctrl+X` to exit

### 4. Verify cron job is active:

```bash
crontab -l
```

## Alternative Schedules

**Every 6 hours:**

```cron
0 */6 * * * /home/senarokalie/Desktop/chatbot/scripts/backup-daily.sh
```

**Every day at 2 AM and 2 PM:**

```cron
0 2,14 * * * /home/senarokalie/Desktop/chatbot/scripts/backup-daily.sh
```

**Every Sunday at 3 AM:**

```cron
0 3 * * 0 /home/senarokalie/Desktop/chatbot/scripts/backup-daily.sh
```

## Manual Backup

Run anytime manually:

```bash
/home/senarokalie/Desktop/chatbot/scripts/backup-daily.sh
```

## Restore from Backup

```bash
# 1. Go to backup directory
cd ~/backups/chatbot

# 2. List backups
ls -lh chatbot-backup-*.tar.gz

# 3. Extract specific backup
tar -xzf chatbot-backup-YYYYMMDD-HHMMSS.tar.gz -C /tmp/restore

# 4. Copy files back
cp -r /tmp/restore/products_data/ /home/senarokalie/Desktop/chatbot/
cp -r /tmp/restore/data/ /home/senarokalie/Desktop/chatbot/
cp /tmp/restore/.env /home/senarokalie/Desktop/chatbot/

# 5. Restart bot
pm2 restart whatsapp-shop
```

## Backup Location

Backups are stored in:

```
~/backups/chatbot/chatbot-backup-YYYYMMDD-HHMMSS.tar.gz
```

## Retention Policy

- Backups older than 30 days are automatically deleted
- Adjust `RETENTION_DAYS` in script to change

## Monitoring

Check backup logs:

```bash
tail -f /home/senarokalie/Desktop/chatbot/logs/backup.log
```

## Important Notes

✅ Backups include:

- products_data/ (product credentials)
- data/ (orders, reviews, promos)
- .env (environment config)
- package.json (dependencies)

❌ Backups exclude:

- node_modules/ (can be reinstalled)
- .wwebjs_auth/ (too large, session data)
- coverage/ (test reports)
- \*.log (log files)

⚠️ **Security Warning:**
Backup files contain sensitive data (.env, product credentials).
Store in secure location with proper permissions:

```bash
chmod 600 ~/backups/chatbot/*.tar.gz
```
