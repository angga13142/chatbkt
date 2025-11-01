# Product Database Setup

This directory contains product credentials for automatic delivery.

## File Format

Each product should have a corresponding `.txt` file named after the product ID.

### Format Options:

1. **Email:Password format** (for streaming accounts):

```
email1@example.com:password123
email2@example.com:password456
```

2. **Pipe separator** (alternative):

```
email1@example.com|password123
email2@example.com|password456
```

3. **Single line format** (for VCC or other data):

```
CardNumber|CVV|ExpDate
1234567890123456|123|12/25
```

## How It Works

- When an order is approved by admin, the system reads the first line from the product file
- That line is sent to the customer
- The line is removed from the file (consumed)
- Stock is automatically tracked based on remaining lines

## Managing Stock

To add more stock:

```bash
echo "newemail@example.com:newpassword" >> products_data/netflix.txt
```

To check stock:

```bash
wc -l products_data/netflix.txt
```

## Product ID Reference

Match filenames with product IDs in `config.js`:

- `netflix.txt` → netflix
- `spotify.txt` → spotify
- `disney-plus.txt` → disney-plus
- `youtube-premium.txt` → youtube-premium
- etc.

## Security

⚠️ **IMPORTANT**: Keep this directory secure!

- Add `products_data/` to `.gitignore`
- Set proper file permissions: `chmod 600 *.txt`
- Backup regularly
- Never commit to public repositories
