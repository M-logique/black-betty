import { Hono } from 'hono'
import { TelegramBot, TelegramMessage, MessageHandler, TelegramUpdate, TelegramInlineQuery, InlineQueryHandler, TelegramCallbackQuery, CallbackQueryHandler, CloudflareBindings } from './types'

// Handler registry
class HandlerRegistry {
  private handlers: MessageHandler[] = []
  private inlineHandlers: InlineQueryHandler[] = []
  private callbackHandlers: CallbackQueryHandler[] = []

  register(handler: MessageHandler) {
    this.handlers.push(handler)
  }

  registerInline(handler: InlineQueryHandler) {
    this.inlineHandlers.push(handler)
  }

  registerCallback(handler: CallbackQueryHandler) {
    this.callbackHandlers.push(handler)
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

  async processCallbackQuery(callbackQuery: TelegramCallbackQuery, bot: TelegramBot) {
    for (const handler of this.callbackHandlers) {
      if (handler.canHandle(callbackQuery)) {
        await handler.handle(callbackQuery, bot)
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
  try {
    // Validate webhook secret if provided
    const webhookSecret = c.req.header('X-Telegram-Bot-Api-Secret-Token')
    if (c.env.WEBHOOK_SECRET && webhookSecret !== c.env.WEBHOOK_SECRET) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const update: TelegramUpdate = await c.req.json()
    const bot = new TelegramBot(c.env.TELEGRAM_BOT_TOKEN, c)
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
      
      try {
        await registry.processMessage(message, bot)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error('Message handler error:', error)
        
        // Send error message to user
        await bot.sendMessage(message.chat.id, 
          `❌ *Error occurred while processing your message*\n\n*Error:* \`${errorMessage}\`\n\nPlease try again or contact support if the problem persists.`,
          "MarkdownV2"
        )
      }
    }
    
    if (update.inline_query) {
      const query = update.inline_query
      
      // Check if user is allowed for inline queries too
      const allowedIds = c.env.ALLOWED_USER_IDS.split(',').map(id => parseInt(id.trim()))
      if (!allowedIds.includes(query.from.id)) {
        return c.json({ ok: true })
      }
      
      try {
        await registry.processInlineQuery(query, bot)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error('Inline query handler error:', error)
        
        // Answer inline query with error
        await bot.answerInlineQuery(query.id, [{
          type: 'article',
          id: 'error',
          title: '❌ Error occurred',
          description: 'An error occurred while processing your request',
          input_message_content: {
            message_text: `❌ *Error occurred while processing your request*\n\n*Error:* \`${errorMessage}\`\n\nPlease try again or contact support if the problem persists.`,
            parse_mode: "MarkdownV2"
          }
        }])
      }
    }
    
    if (update.callback_query) {
      const callbackQuery = update.callback_query
      
      // Check if user is allowed for callback queries too
      const allowedIds = c.env.ALLOWED_USER_IDS.split(',').map(id => parseInt(id.trim()))
      if (!allowedIds.includes(callbackQuery.from.id)) {
        return c.json({ ok: true })
      }
      
      try {
        await registry.processCallbackQuery(callbackQuery, bot)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error('Callback query handler error:', error)
        
        // Answer callback query with error
        await bot.answerCallbackQuery(callbackQuery.id, 
          `❌ Error: ${errorMessage}`
        )
        
        // Send detailed error message if possible
        if (callbackQuery.message) {
          await bot.sendMessage(callbackQuery.message.chat.id,
            `❌ *Error occurred while processing your request*\n\n*Error:* \`${errorMessage}\`\n\nPlease try again or contact support if the problem persists.`,
            "MarkdownV2"
          )
        }
      }
    }
    
    if (update.chosen_inline_result) {
      // Handle when user selects an inline result
      // You can log this or perform actions
      console.log('Chosen inline result:', update.chosen_inline_result)
    }
    
    return c.json({ ok: true })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Webhook error:', error)
    
    // Return error response
    return c.json({ 
      ok: false, 
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, 500)
  }
})

// Function to load handlers dynamically
async function loadHandlers(registry: HandlerRegistry) {
  // Load message handlers manually
  const { startHandler } = await import('./handlers/start')
  
  registry.register(startHandler)
  
  // Load inline query handlers manually
  const { inlineNotesGet, inlineNotesSet } = await import('./handlers/notes')
  const { inlineCalculatorHandler } = await import('./handlers/inline-calculator')
  
  registry.registerInline(inlineNotesGet)
  registry.registerInline(inlineNotesSet)
  registry.registerInline(inlineCalculatorHandler)
  
  // Load callback query handlers manually
  const { callbackNotesDelete, callbackNotesCreate } = await import('./handlers/notes')
  
  registry.registerCallback(callbackNotesDelete)
  registry.registerCallback(callbackNotesCreate)
}

export default app
