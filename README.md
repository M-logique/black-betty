# Black Betty

A Telegram bot built with Cloudflare Workers and Hono that handles GitHub webhooks and provides inline functionality.

## Features

- **GitHub Webhook Integration**: Receives and processes GitHub events (push, pull requests, issues, etc.)
- **Telegram Bot**: Handles messages, inline queries, and callback queries
- **Modular Architecture**: Plugin-based handler system for easy extensibility

## Setup

1. **Environment Variables** (set in `wrangler.toml`):
   ```toml
   TELEGRAM_BOT_TOKEN = "your_bot_token"
   ALLOWED_USER_IDS = "123456,789012"
   WEBHOOK_SECRET = "optional_webhook_secret"
   ```

2. **Deploy**:
   ```bash
   npm install
   wrangler deploy
   ```

3. **Set Webhook URLs**:
   - Telegram: `https://your-worker.your-subdomain.workers.dev/webhook`
   - GitHub: `https://your-worker.your-subdomain.workers.dev/github/{bot_token}/{chat_id}`

## GitHub Events Supported

- `push` - Code pushes with commit details
- `pull_request` - PR creation, updates, merges
- `issues` - Issue creation and updates
- `issue_comment` - Comments on issues
- `star` - Repository starring/unstarring
- `fork` - Repository forking
- `release` - Release creation and updates
- `delete` - Branch/tag deletion
- And more...

## Development

```bash
npm run dev    # Local development
npm run deploy # Deploy to Cloudflare
```

## Project Structure

```
src/
├── index.ts              # Main application
├── types.ts              # TypeScript types
└── handlers/             # Message handlers
    ├── start.ts          # /start command
    ├── inline-calculator.ts
    └── default-inline.ts
```
