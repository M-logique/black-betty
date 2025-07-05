import { Hono } from 'hono'
import { TelegramBot,
   TelegramMessage, 
   MessageHandler,
   TelegramUpdate, 
   TelegramInlineQuery, 
   InlineQueryHandler, 
   TelegramCallbackQuery, 
   CallbackQueryHandler } from './types/telegram'
import { CloudflareBindings } from './types/cloudflare'
import { GithubPayload } from './types/github'

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

  async processMessage(message: TelegramMessage, bot: TelegramBot, allowedIds: number[]) {
    for (const handler of this.handlers) {
      if (handler.canHandle(message)) {
        if (handler.requiredAuth !== false) {
          if (!message.from || !allowedIds.includes(message.from.id)) {
            return
          }
        }
        await handler.handle(message, bot)
        break
      }
    }
  }

  async processInlineQuery(query: TelegramInlineQuery, bot: TelegramBot, allowedIds: number[]) {
    for (const handler of this.inlineHandlers) {
      if (handler.canHandle(query)) {

        if (handler.requiredAuth !== false) {
          if (!query.from || !allowedIds.includes(query.from.id)) {
            return
          }
        }
        await handler.handle(query, bot)
        break // Only execute first matching handler
      }
    }
  }

  async processCallbackQuery(callbackQuery: TelegramCallbackQuery, bot: TelegramBot, allowedIds: number[]) {
    for (const handler of this.callbackHandlers) {
      if (handler.canHandle(callbackQuery)) {
        if (handler.requiredAuth !== false) {
          if (!callbackQuery.from || !allowedIds.includes(callbackQuery.from.id)) {
            return
          }
        }
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
    
    const allowedIds = c.env.ALLOWED_USER_IDS.split(',').map(id => parseInt(id.trim()))
    // Handle different types of updates
    if (update.message) {
      const message = update.message
      if (message.chat.type !== 'private') return c.json({ ok: true })
      
      
      try {
        await registry.processMessage(message, bot, allowedIds)
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
      
      
      try {
        await registry.processInlineQuery(query, bot, allowedIds)
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
      
      
      try {
        await registry.processCallbackQuery(callbackQuery, bot, allowedIds)
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
  // registry.register(setGroupHandler)
  
  // Load inline query handlers manually
  const { inlineCalculatorHandler } = await import('./handlers/inline-calculator')
  const { defaultInlineHandler } = await import('./handlers/default-inline')

  registry.registerInline(inlineCalculatorHandler)
  registry.registerInline(defaultInlineHandler)

  
  // Load callback query handlers manually
}

app.post("/github/:botToken/:chatId", async (c) => {
  const botToken = c.req.param('botToken')
  const chatId = c.req.param('chatId')
  const event = c.req.header('X-GitHub-Event') ?? ""
  var additionals: any = {}
  const payload: GithubPayload = await c.req.json()
  const bot = new TelegramBot(botToken, c)

  var sender: string = "Unknown"

  if (payload.sender && payload.sender?.html_url) {
    sender = `<a href="${payload.sender?.html_url}">${escapeHtml(payload.sender?.login)}</a>`
  } else if (payload.sender) {
    sender = escapeHtml(payload.sender?.login)
  }

  const repo = `<a href="${payload.repository.html_url}">${escapeHtml(payload.repository.full_name)}</a>`

  switch (event) {
    case 'push':
      if (payload.ref.includes("refs/tags")) break  ;
      var message: string = `🚀 <b>Push to</b> <b>${repo}</b>\n`

      message += `👨‍🌾 <b>from</b>: <b>${sender}</b>\n\n`


      const totalCommits: number = payload.commits?.length ?? 0

      message += `total <b>${totalCommits}</b> commit${(totalCommits > 1 && "s") || ""} on <b>${escapeHtml(payload.ref)}</b>\n`
      if (payload.commits) {
        for (const commit of payload.commits.slice(0, 7)) {
          message += ` • <b><a href="${commit.url}">[${escapeHtml(commit.id.slice(0, 7))}]</a></b>: ${escapeHtml(commit.author.username ?? commit.author.name)} <code>${escapeHtml(cutDownText(commit.message))}</code>\n`
        }
      }

      if (totalCommits > 7) {
        message += ` • And ${totalCommits - 7} more\n`
      }

      if (payload.compare) {
        message += `\n 🔍 <a href="${payload.compare}">Compare Changes</a>`
      }
      
      const pushResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
      if (pushResponse) {
        additionals["telegramResponse"] = pushResponse
        additionals["message"] = message
      }
      break
    
    case "star":
      const action: string = payload.action === "created" ? "added" : "removed";
      const idk: string = payload.action === "created" ? "to" : "from";


      var message: string = `⭐ ${sender} <b>${action}</b> a star ${idk} ${repo}`
      const starResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
      if (starResponse) {
        additionals["telegramResponse"] = starResponse
        additionals["message"] = message
      }
      break

      case "delete":
        var message: string = `💀 <b>Delete</b> <b>${escapeHtml(payload.ref)}</b> by <b>${sender}</b>\n`
        const deleteResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
        if (deleteResponse) {
          additionals["telegramResponse"] = deleteResponse
          additionals["message"] = message
        }
        break
    
    case "pull_request":
      const pullRequest = payload.pull_request
      const prUrl = pullRequest?.html_url ?? ""
      var message: string = `🔄 <a href="${prUrl}">Pull Request</a> ${payload.action ?? ""} <b>${escapeHtml(pullRequest?.title ?? "")}</b> by <b>${sender}</b> on ${repo}\n`

      if (pullRequest?.body) {
        message += `\n\n<pre><code>${escapeHtml(pullRequest?.body.slice(0, 1000))}`
        if (pullRequest?.body.length > 1000) {
          message += `...</code></pre>\n\n<a href="${prUrl}">View Full Pull Request</a>`
        } else {
          message += `</code></pre>`
        }
      }

      const pullRequestResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
      if (pullRequestResponse) {
        additionals["telegramResponse"] = pullRequestResponse
        additionals["message"] = message
      }
      break
    case "fork":
      var message: string = `🔄 ${sender} created a <a href="${payload.forkee?.html_url ?? ""}">fork</a> from ${repo}`
      const forkResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
      if (forkResponse) {
        additionals["telegramResponse"] = forkResponse
        additionals["message"] = message
      }
      break
    case "issues":
      const issue = payload.issue
      var message: string = `🔄 Issue <a href="${issue?.html_url ?? ""}">${escapeHtml(issue?.title ?? "")}</a> ${payload.action ?? ""} by <b>${sender}</b> on ${repo}\n`

      
      if (payload.action === "opened") {
        if (issue?.body) {
          message += `\n\n<pre><code>${escapeHtml(issue?.body.slice(0, 1000))}`
        }
        if (issue?.body && issue?.body?.length > 1000) {
          message += `...</code></pre>`
        } else {
          message += `</code></pre>`
        }
        
        if (issue?.labels && issue?.labels?.length > 0) {
          message += `\n\n🔖 <b>Labels:</b> ${issue?.labels.map(label => `<a href="${label.url}">${escapeHtml(label.name)}</a>`).join(", ")}`
        }
      }

      const issueResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
      if (issueResponse) {
        additionals["telegramResponse"] = issueResponse
        additionals["message"] = message
      }

      break
    case "issue_comment":
      const comment = payload.comment
      const commentAction = payload.action === "created" ? "added" : "removed";
      var message: string = `💬 <a href="${comment?.html_url ?? ""}">Comment</a> ${commentAction} by <b>${sender}</b> on ${repo}\n`

      if (commentAction === "added") {
        if (comment?.body) {
          message += `\n\n<pre><code>${escapeHtml(comment?.body.slice(0, 1000))}`
        }
  
        if (comment?.body && comment?.body?.length > 1000) {
          message += `...</code></pre>`
        } else {
          message += `</code></pre>`
        }
      }

      const commentResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
      if (commentResponse) {
        additionals["telegramResponse"] = commentResponse
        additionals["message"] = message
      }
      break
    case "release":
      const release = payload.release
      var message: string = `🔄 Release <a href="${release?.html_url ?? ""}">${escapeHtml(release?.tag_name ?? "")}</a> ${payload.action ?? ""} by <b>${sender}</b> on ${repo}\n`

      const releaseResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
      if (releaseResponse) {
        additionals["telegramResponse"] = releaseResponse
        additionals["message"] = message
      }
      break;
    case "workflow_run":
      break;
    case "workflow_dispatch":
      break;
    case "workflow_job":
      break;
    default:
      break;
  }

  return c.json({ ok: true, event: event, additionals: additionals})
})

// app.post("/git/:chatId", async (c) => {
//   const chatId = c.req.param('chatId')
//   const event = c.req.header('X-GitHub-Event') ?? ""
//   var response

//   switch (event) {
//     case 'push':
//       const payload: GithubPayload = await c.req.json()
//       const bot = new TelegramBot(c.env.TELEGRAM_BOT_TOKEN, c)
//       var message = `\\-\\> Push to [${escapeMarkdown(payload.repository.full_name)}](${escapeMarkdown(payload.repository.html_url)})\n`
//       if (payload.commits) {
//         for (const commit of payload.commits) {
//           message += `\\- [${escapeMarkdown(commit.id.slice(0, 7))}](${escapeMarkdown(commit.url)}): \`${escapeMarkdown(commit.message)}\`\n`
//         }
//       }
//       if (payload.compare) {
//         message += `[Compare Changes](${payload.compare})`
//       }
//       // message = escapeMarkdown(message)
       
//       response = await bot.sendMessage(Number(chatId), message, "MarkdownV2")
//       // c.json({ ok: true, event: event, messageId: response.result?.message_id, response: response })
//       break
//     default:
//       break
//   }

//   return c.json({ ok: true, event: event, telegramResponse: response ?? null})

// })



function escapeMarkdown(text: string) {
  return text
    .replace(/_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/~/g, '\\~')
    .replace(/`/g, '\\`')
    .replace(/>/g, '\\>')
    .replace(/#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/-/g, '\\-')
    .replace(/=/g, '\\=')
    .replace(/\|/g, '\\|')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\./g, '\\.')
    .replace(/!/g, '\\!');
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cutDownText(text: string) {
  var cuttedText = text.split("\n")[0].slice(0, 100)
  if (cuttedText !== text) {
    cuttedText+= "..."
  }
  return cuttedText
}

app.notFound((c) => {
  return c.text(`${c.req.method} - ${c.req.path} not found (404)`, 404)
})

export default app
