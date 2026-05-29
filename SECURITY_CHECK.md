# Security Check

This file describes the basic security rules for the Project "X" repository.

## 1. Sensitive data

The repository must not contain:

- Telegram bot token
- Cloudflare API token
- real `.env` file
- `.dev.vars` file
- private admin credentials
- personal data of real users
- exported CSV files with real users
- screenshots containing private Telegram IDs or usernames without permission

## 2. Environment variables

All sensitive values must be stored only in Cloudflare Workers environment variables or secrets.

Required environment variables:

```env
BOT_TOKEN=your_telegram_bot_token
BOT_USERNAME=your_bot_username
ADMIN_IDS=123456789,987654321
