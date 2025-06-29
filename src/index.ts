import { Hono } from 'hono'
import { TelegramBot, TelegramMessage, MessageHandler, TelegramUpdate, TelegramInlineQuery, InlineQueryHandler, CloudflareBindings } from './types'

// Handler registry
class HandlerRegistry {
  private handlers: MessageHandler[] = []
  private inlineHandlers: InlineQueryHandler[] = []

  register(handler: MessageHandler) {
    this.handlers.push(handler)
  }

  registerInline(handler: InlineQueryHandler) {
    this.inlineHandlers.push(handler)
  }

  async processMessage(message: TelegramMessage, bot: TelegramBot) {
    for (const handler of this.handlers) {
      if (handler.canHandle(message)) {
        await handler.handle(message, bot)
        break // Only execute first matching handler
      }
    }
  }

  async processInlineQuery(query: TelegramInlineQuery, bot: TelegramBot) {
    for (const handler of this.inlineHandlers) {
      if (handler.canHandle(query)) {
        await handler.handle(query, bot)
        break // Only execute first matching handler
      }
    }
  }
}

// Initialize Hono app with Cloudflare Workers bindings
const app = new Hono<{ Bindings: CloudflareBindings }>()

// Health check endpoint
app.get('/', (c) => c.text('OK'))

// Main webhook endpoint - Telegram will send updates here
app.post('/webhook', async (c) => {
  // Validate webhook secret if provided
  const webhookSecret = c.req.header('X-Telegram-Bot-Api-Secret-Token')
  if (c.env.WEBHOOK_SECRET && webhookSecret !== c.env.WEBHOOK_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const update: TelegramUpdate = await c.req.json()
  const bot = new TelegramBot(c.env.TELEGRAM_BOT_TOKEN)
  const registry = new HandlerRegistry()
  
  // Load handlers dynamically
  await loadHandlers(registry)
  
  // Handle different types of updates
  if (update.message) {
    const message = update.message
    if (message.chat.type !== 'private') return c.json({ ok: true })
    
    // Check if user is allowed
    const allowedIds = c.env.ALLOWED_USER_IDS.split(',').map(id => parseInt(id.trim()))
    if (!message.from || !allowedIds.includes(message.from.id)) {
      return c.json({ ok: true })
    }
    
    await registry.processMessage(message, bot)
  }
  
  if (update.inline_query) {
    const query = update.inline_query
    
    // Check if user is allowed for inline queries too
    const allowedIds = c.env.ALLOWED_USER_IDS.split(',').map(id => parseInt(id.trim()))
    if (!allowedIds.includes(query.from.id)) {
      return c.json({ ok: true })
    }
    
    await registry.processInlineQuery(query, bot)
  }
  
  if (update.chosen_inline_result) {
    // Handle when user selects an inline result
    // You can log this or perform actions
    console.log('Chosen inline result:', update.chosen_inline_result)
  }
  
  return c.json({ ok: true })
})

// Function to load handlers dynamically
async function loadHandlers(registry: HandlerRegistry) {
  // Load message handlers manually
  const { startHandler } = await import('./handlers/start')
  
  registry.register(startHandler)

  // Load inline query handlers manually
  const { inlineCalculatorHandler } = await import('./handlers/inline-calculator')
  
  registry.registerInline(inlineCalculatorHandler)
}

export default app
