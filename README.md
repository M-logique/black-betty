# Black Betty - Extensible Telegram Bot

A modular Telegram bot built with Cloudflare Workers and Hono that allows you to easily add new message handlers.

## Architecture

The bot uses a plugin-based architecture where each message type is handled by a separate handler file:

- `src/index.ts` - Main application with handler registry
- `src/types.ts` - Shared types and TelegramBot class
- `src/handlers/` - Directory containing individual handlers

## Adding New Handlers

To add a new handler, create a new file in `src/handlers/`:

```typescript
// src/handlers/audio.ts
import { MessageHandler, TelegramBot, TelegramMessage } from '../types'

export const audioHandler: MessageHandler = {
  name: 'audio',
  canHandle: (message: TelegramMessage) => !!message.audio,
  handle: async (message: TelegramMessage, bot: TelegramBot) => {
    const fileId = message.audio!.file_id
    const fileInfo = await bot.getFile(fileId)
    if (fileInfo.ok) {
      const filePath = fileInfo.result.file_path
      const link = `https://api.telegram.org/file/bot${bot.getToken()}/${filePath}`
      await bot.sendMessage(message.chat.id, link)
    }
  }
}
```

Then register it in `src/index.ts`:

```typescript
async function loadHandlers(registry: HandlerRegistry) {
  // ... existing handlers
  const { audioHandler } = await import('./handlers/audio')
  registry.register(audioHandler)
}
```

## Handler Interface

Each handler must implement:

- `name`: String identifier for the handler
- `canHandle(message)`: Returns true if this handler can process the message
- `handle(message, bot)`: Processes the message and sends response

## Setup

1. Set your environment variables in `wrangler.jsonc`
2. Deploy with `wrangler deploy`
3. Set your webhook URL to `https://your-worker.your-subdomain.workers.dev/webhook`

## Current Handlers

- **Document**: Sends direct download links for documents
- **Photo**: Sends direct download links for photos (largest size)
- **Video**: Sends direct download links for videos

```txt
npm install
npm run dev
```

```txt
npm run deploy
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiation `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```
