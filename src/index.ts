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

      if (payload.action === "released") {
        if (release?.assets && release?.assets?.length > 0) {
          message += `\n\n🔖 <b>Assets:</b>\n`
          for (const asset of release?.assets ?? []) {
            message += `\n\n🔖 <a href="${asset.url}">${escapeHtml(asset.name)}</a>`
          }
        }
      }

      const releaseResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
      if (releaseResponse) {
        additionals["telegramResponse"] = releaseResponse;
        additionals["message"] = message;
      }
      break;
    case "workflow_run":
      const workflowRun = payload.workflow_run
      if (workflowRun) {
        const statusEmoji = workflowRun.conclusion === 'success' ? '✅' : 
                           workflowRun.conclusion === 'failure' ? '❌' : 
                           workflowRun.conclusion === 'cancelled' ? '🚫' : 
                           workflowRun.status === 'in_progress' ? '🔄' : '⏳'
        
        var message: string = `${statusEmoji} <b>Workflow Run</b> <a href="${workflowRun.html_url}">${escapeHtml(workflowRun.name)}</a> ${workflowRun.status}`
        
        if (workflowRun.conclusion) {
          message += ` (${workflowRun.conclusion})`
        }
        
        message += ` by <b>${sender}</b> on ${repo}\n`
        message += `\n📋 <b>Branch:</b> <code>${escapeHtml(workflowRun.head_branch)}</code>\n`
        message += `🔢 <b>Run #:</b> ${workflowRun.run_number}\n`
        message += `🎯 <b>Event:</b> ${escapeHtml(workflowRun.event)}\n`
        
        if (workflowRun.head_commit) {
          message += `\n💾 <b>Commit:</b> <a href="${workflowRun.head_commit.url}">${escapeHtml(workflowRun.head_commit.id.slice(0, 7))}</a>\n`
          message += `📝 <b>Message:</b> <code>${escapeHtml(cutDownText(workflowRun.head_commit.message))}</code>`
        }
        
        const workflowRunResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
        if (workflowRunResponse) {
          additionals["telegramResponse"] = workflowRunResponse
          additionals["message"] = message
        }
      }
      break;
    case "workflow_dispatch":
      const workflowDispatch = payload.workflow_run
      if (workflowDispatch) {
        var message: string = `🚀 <b>Workflow Dispatched</b> <a href="${workflowDispatch.html_url}">${escapeHtml(workflowDispatch.name)}</a> by <b>${sender}</b> on ${repo}\n`
        message += `\n📋 <b>Branch:</b> <code>${escapeHtml(workflowDispatch.head_branch)}</code>\n`
        message += `🔢 <b>Run #:</b> ${workflowDispatch.run_number}\n`
        message += `🎯 <b>Event:</b> ${escapeHtml(workflowDispatch.event)}`
        
        if (workflowDispatch.head_commit) {
          message += `\n\n💾 <b>Commit:</b> <a href="${workflowDispatch.head_commit.url}">${escapeHtml(workflowDispatch.head_commit.id.slice(0, 7))}</a>\n`
          message += `📝 <b>Message:</b> <code>${escapeHtml(cutDownText(workflowDispatch.head_commit.message))}</code>`
        }
        
        const workflowDispatchResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
        if (workflowDispatchResponse) {
          additionals["telegramResponse"] = workflowDispatchResponse
          additionals["message"] = message
        }
      }
      break;
    case "workflow_job":
      const workflowJob = payload.workflow_job
      if (workflowJob) {
        const statusEmoji = workflowJob.conclusion === 'success' ? '✅' : 
                           workflowJob.conclusion === 'failure' ? '❌' : 
                           workflowJob.conclusion === 'cancelled' ? '🚫' : 
                           workflowJob.status === 'in_progress' ? '🔄' : '⏳'
        
        var message: string = `${statusEmoji} <b>Workflow Job</b> <a href="${workflowJob.html_url}">${escapeHtml(workflowJob.name)}</a> ${workflowJob.status}`
        
        if (workflowJob.conclusion) {
          message += ` (${workflowJob.conclusion})`
        }
        
        message += ` on ${repo}\n`
        message += `\n📋 <b>Workflow:</b> ${escapeHtml(workflowJob.workflow_name)}\n`
        message += `🌿 <b>Branch:</b> <code>${escapeHtml(workflowJob.head_branch)}</code>\n`
        message += `🤖 <b>Runner:</b> ${escapeHtml(workflowJob.runner_name)}`
        
        if (workflowJob.steps && workflowJob.steps.length > 0) {
          message += `\n\n📝 <b>Steps:</b>\n`
          for (const step of workflowJob.steps.slice(0, 5)) {
            const stepEmoji = step.conclusion === 'success' ? '✅' : 
                             step.conclusion === 'failure' ? '❌' : 
                             step.conclusion === 'cancelled' ? '🚫' : 
                             step.status === 'in_progress' ? '⏳' : '⏳'
            message += ` ${stepEmoji} ${escapeHtml(step.name)}\n`
          }
          
          if (workflowJob.steps.length > 5) {
            message += ` ... and ${workflowJob.steps.length - 5} more steps`
          }
        }
        
        const workflowJobResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
        if (workflowJobResponse) {
          additionals["telegramResponse"] = workflowJobResponse
          additionals["message"] = message
        }
      }
      break;
    case "pull_request_review":
      const review = payload.review
      if (review) {
        const reviewEmoji = review.state === 'approved' ? '✅' : 
                           review.state === 'changes_requested' ? '❌' : 
                           review.state === 'commented' ? '💬' : '⏳'
        
        var message: string = `${reviewEmoji} <b>Pull Request Review</b> <a href="${review.html_url}">${escapeHtml(review.state)}</a> by <b>${sender}</b> on ${repo}\n`
        
        if (review.body) {
          message += `\n\n<pre><code>${escapeHtml(review.body.slice(0, 1000))}`
          if (review.body.length > 1000) {
            message += `...</code></pre>\n\n<a href="${review.html_url}">View Full Review</a>`
          } else {
            message += `</code></pre>`
          }
        }
        
        const reviewResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
        if (reviewResponse) {
          additionals["telegramResponse"] = reviewResponse
          additionals["message"] = message
        }
      }
      break;

    case "pull_request_review_comment":
      const reviewComment = payload.review_comment
      if (reviewComment) {
        var message: string = `💬 <b>Review Comment</b> <a href="${reviewComment.html_url}">added</a> by <b>${sender}</b> on ${repo}\n`
        message += `\n📍 <b>File:</b> <code>${escapeHtml(reviewComment.path)}</code>\n`
        message += `📍 <b>Line:</b> ${reviewComment.position ?? 0}\n`
        
        if (reviewComment.body) {
          message += `\n\n<pre><code>${escapeHtml(reviewComment.body.slice(0, 1000))}`
          if (reviewComment.body.length > 1000) {
            message += `...</code></pre>\n\n<a href="${reviewComment.html_url}">View Full Comment</a>`
          } else {
            message += `</code></pre>`
          }
        }
        
        const reviewCommentResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
        if (reviewCommentResponse) {
          additionals["telegramResponse"] = reviewCommentResponse
          additionals["message"] = message
        }
      }
      break;

    case "commit_comment":
      const commitComment = payload.commit_comment
      if (commitComment) {
        var message: string = `💬 <b>Commit Comment</b> <a href="${commitComment.html_url}">added</a> by <b>${sender}</b> on ${repo}\n`
        message += `\n📍 <b>File:</b> <code>${escapeHtml(commitComment.path)}</code>\n`
        message += `📍 <b>Line:</b> ${commitComment.line}\n`
        
        if (commitComment.body) {
          message += `\n\n<pre><code>${escapeHtml(commitComment.body.slice(0, 1000))}`
          if (commitComment.body.length > 1000) {
            message += `...</code></pre>\n\n<a href="${commitComment.html_url}">View Full Comment</a>`
          } else {
            message += `</code></pre>`
          }
        }
        
        const commitCommentResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
        if (commitCommentResponse) {
          additionals["telegramResponse"] = commitCommentResponse
          additionals["message"] = message
        }
      }
      break;

    case "check_suite":
      const checkSuite = payload.check_suite
      if (checkSuite) {
        const statusEmoji = checkSuite.conclusion === 'success' ? '✅' : 
                           checkSuite.conclusion === 'failure' ? '❌' : 
                           checkSuite.conclusion === 'neutral' ? '⚪' : 
                           checkSuite.status === 'in_progress' ? '🔄' : '⏳'
        
        var message: string = `${statusEmoji} <b>Check Suite</b> ${checkSuite.status}`
        if (checkSuite.conclusion) {
          message += ` (${checkSuite.conclusion})`
        }
        message += ` on ${repo}\n`
        message += `\n🌿 <b>Branch:</b> <code>${escapeHtml(checkSuite.head_branch)}</code>\n`
        message += `💾 <b>Commit:</b> <a href="https://github.com/${payload.repository.full_name}/commit/${checkSuite.head_sha}">${escapeHtml(checkSuite.head_sha.slice(0, 7))}</a>\n`
        message += `🔢 <b>Checks:</b> ${checkSuite.latest_check_runs_count}`
        
        const checkSuiteResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
        if (checkSuiteResponse) {
          additionals["telegramResponse"] = checkSuiteResponse
          additionals["message"] = message
        }
      }
      break;

    case "check_run":
      const checkRun = payload.check_run
      if (checkRun) {
        const statusEmoji = checkRun.conclusion === 'success' ? '✅' : 
                           checkRun.conclusion === 'failure' ? '❌' : 
                           checkRun.conclusion === 'neutral' ? '⚪' : 
                           checkRun.status === 'in_progress' ? '🔄' : '⏳'
        
        var message: string = `${statusEmoji} <b>Check Run</b> <a href="${checkRun.html_url}">${escapeHtml(checkRun.name)}</a> ${checkRun.status}`
        if (checkRun.conclusion) {
          message += ` (${checkRun.conclusion})`
        }
        message += ` on ${repo}\n`
        
        if (checkRun.output && checkRun.output.title) {
          message += `\n📝 <b>Title:</b> ${escapeHtml(checkRun.output.title)}\n`
        }
        
        if (checkRun.output && checkRun.output.summary) {
          message += `\n📝 <b>Summary:</b> ${escapeHtml(checkRun.output.summary.slice(0, 500))}`
          if (checkRun.output.summary.length > 500) {
            message += `...`
          }
        }
        
        const checkRunResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
        if (checkRunResponse) {
          additionals["telegramResponse"] = checkRunResponse
          additionals["message"] = message
        }
      }
      break;

    case "discussion":
      const discussion = payload.discussion
      if (discussion) {
        const actionEmoji = payload.action === 'created' ? '💬' : 
                           payload.action === 'edited' ? '✏️' : 
                           payload.action === 'deleted' ? '📝' : '📝'
        
        var message: string = `${actionEmoji} <b>Discussion</b> <a href="${discussion.html_url}">${escapeHtml(discussion.title)}</a> ${payload.action} by <b>${sender}</b> on ${repo}\n`
        message += `\n📂 <b>Category:</b> ${escapeHtml(discussion.category.name)}\n`
        message += `💬 <b>Comments:</b> ${discussion.comments}`
        
        if (payload.action === 'created' && discussion.body) {
          message += `\n\n<pre><code>${escapeHtml(discussion.body.slice(0, 1000))}`
          if (discussion.body.length > 1000) {
            message += `...</code></pre>\n\n<a href="${discussion.html_url}">View Full Discussion</a>`
          } else {
            message += `</code></pre>`
          }
        }
        
        const discussionResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
        if (discussionResponse) {
          additionals["telegramResponse"] = discussionResponse
          additionals["message"] = message
        }
      }
      break;

    case "discussion_comment":
      const discussionComment = payload.discussion_comment
      if (discussionComment) {
        const actionEmoji = payload.action === 'created' ? '💬' : 
                           payload.action === 'edited' ? '✏️' : 
                           payload.action === 'deleted' ? '📝' : '📝'
        
        var message: string = `${actionEmoji} <b>Discussion Comment</b> <a href="${discussionComment.html_url}">${payload.action}</a> by <b>${sender}</b> on ${repo}\n`
        
        if (payload.action === 'created' && discussionComment.body) {
          message += `\n\n<pre><code>${escapeHtml(discussionComment.body.slice(0, 1000))}`
          if (discussionComment.body.length > 1000) {
            message += `...</code></pre>\n\n<a href="${discussionComment.html_url}">View Full Comment</a>`
          } else {
            message += `</code></pre>`
          }
        }
        
        const discussionCommentResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
        if (discussionCommentResponse) {
          additionals["telegramResponse"] = discussionCommentResponse
          additionals["message"] = message
        }
      }
      break;

    case "package":
      const pkg = payload.package
      if (pkg) {
        const actionEmoji = payload.action === 'published' ? '📦' : 
                           payload.action === 'updated' ? '🔄' : 
                           payload.action === 'deleted' ? '📝' : '📝'
        
        var message: string = `${actionEmoji} <b>Package</b> <a href="${pkg.html_url}">${escapeHtml(pkg.name)}</a> ${payload.action} by <b>${sender}</b> on ${repo}\n`
        message += `\n📦 <b>Type:</b> ${escapeHtml(pkg.package_type)}\n`
        message += `🏷️ <b>Version:</b> ${escapeHtml(pkg.version)}`
        
        if (pkg.description) {
          message += `\n\n📝 <b>Description:</b> ${escapeHtml(pkg.description)}`
        }
        
        const packageResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
        if (packageResponse) {
          additionals["telegramResponse"] = packageResponse
          additionals["message"] = message
        }
      }
      break;

    case "deployment":
      const deployment = payload.deployment
      if (deployment) {
        var message: string = `🚀 <b>Deployment</b> <a href="${deployment.url}">${escapeHtml(deployment.task)}</a> created by <b>${sender}</b> on ${repo}\n`
        message += `\n🌿 <b>Branch:</b> <code>${escapeHtml(deployment.ref)}</code>\n`
        message += `📝 <b>Environment:</b> ${escapeHtml(deployment.environment)}\n`
        message += `💾 <b>Commit:</b> <a href="https://github.com/${payload.repository.full_name}/commit/${deployment.sha}">${escapeHtml(deployment.sha.slice(0, 7))}</a>`
        
        if (deployment.description) {
          message += `\n\n📝 <b>Description:</b> ${escapeHtml(deployment.description)}`
        }
        
        const deploymentResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
        if (deploymentResponse) {
          additionals["telegramResponse"] = deploymentResponse
          additionals["message"] = message
        }
      }
      break;

    case "deployment_status":
      const deploymentStatus = payload.deployment_status
      if (deploymentStatus) {
        const statusEmoji = deploymentStatus.state === 'success' ? '✅' : 
                           deploymentStatus.state === 'failure' ? '❌' : 
                           deploymentStatus.state === 'pending' ? '⏳' : 
                           deploymentStatus.state === 'error' ? '🚨' : '🔄'
        
        var message: string = `${statusEmoji} <b>Deployment Status</b> ${deploymentStatus.state} by <b>${sender}</b> on ${repo}\n`
        message += `\n📝 <b>Environment:</b> ${escapeHtml(deploymentStatus.environment)}`
        
        if (deploymentStatus.description) {
          message += `\n\n📝 <b>Description:</b> ${escapeHtml(deploymentStatus.description)}`
        }
        
        if (deploymentStatus.target_url) {
          message += `\n\n🔗 <a href="${deploymentStatus.target_url}">View Deployment</a>`
        }
        
        const deploymentStatusResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
        if (deploymentStatusResponse) {
          additionals["telegramResponse"] = deploymentStatusResponse
          additionals["message"] = message
        }
      }
      break;

    case "milestone":
      const milestone = payload.milestone
      if (milestone) {
        const actionEmoji = payload.action === 'created' ? '🎯' : 
                           payload.action === 'edited' ? '✏️' : 
                           payload.action === 'closed' ? '✅' : 
                           payload.action === 'opened' ? '🔓' : '📝'
        
        var message: string = `${actionEmoji} <b>Milestone</b> <a href="${milestone.html_url}">${escapeHtml(milestone.title)}</a> ${payload.action} by <b>${sender}</b> on ${repo}\n`
        message += `\n📝 <b>Number:</b> #${milestone.number}\n`
        message += `📊 <b>State:</b> ${escapeHtml(milestone.state)}`
        
        if (milestone.description) {
          message += `\n\n📝 <b>Description:</b> ${escapeHtml(milestone.description)}`
        }
        
        const milestoneResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
        if (milestoneResponse) {
          additionals["telegramResponse"] = milestoneResponse
          additionals["message"] = message
        }
      }
      break;

    case "project":
      const project = payload.project
      if (project) {
        const actionEmoji = payload.action === 'created' ? '📋' : 
                           payload.action === 'edited' ? '✏️' : 
                           payload.action === 'closed' ? '✅' : 
                           payload.action === 'reopened' ? '🔓' : '📝'
        
        var message: string = `${actionEmoji} <b>Project</b> <a href="${project.html_url}">${escapeHtml(project.name)}</a> ${payload.action} by <b>${sender}</b> on ${repo}\n`
        message += `\n📝 <b>Number:</b> #${project.number}\n`
        message += `📊 <b>State:</b> ${escapeHtml(project.state)}`
        
        if (project.body) {
          message += `\n\n📝 <b>Description:</b> ${escapeHtml(project.body)}`
        }
        
        const projectResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
        if (projectResponse) {
          additionals["telegramResponse"] = projectResponse
          additionals["message"] = message
        }
      }
      break;

    case "project_card":
      const projectCard = payload.project_card
      if (projectCard) {
        const actionEmoji = payload.action === 'created' ? '📝' : 
                           payload.action === 'edited' ? '✏️' : 
                           payload.action === 'moved' ? '🔄' : 
                           payload.action === 'converted' ? '🔄' : '📋'
        
        var message: string = `${actionEmoji} <b>Project Card</b> ${payload.action} by <b>${sender}</b> on ${repo}\n`
        message += `\n📋 <b>Column:</b> ${escapeHtml(projectCard.column_name)}`
        
        if (projectCard.note) {
          message += `\n\n📝 <b>Note:</b> ${escapeHtml(projectCard.note)}`
        }
        
        const projectCardResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
        if (projectCardResponse) {
          additionals["telegramResponse"] = projectCardResponse
          additionals["message"] = message
        }
      }
      break;

    case "project_column":
      const projectColumn = payload.project_column
      if (projectColumn) {
        const actionEmoji = payload.action === 'created' ? '📋' : 
                           payload.action === 'edited' ? '✏️' : 
                           payload.action === 'moved' ? '🔄' : '📝'
        
        var message: string = `${actionEmoji} <b>Project Column</b> <a href="${projectColumn.url}">${escapeHtml(projectColumn.name)}</a> ${payload.action} by <b>${sender}</b> on ${repo}`
        
        const projectColumnResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
        if (projectColumnResponse) {
          additionals["telegramResponse"] = projectColumnResponse
          additionals["message"] = message
        }
      }
      break;

    case "security_advisory":
      const securityAdvisory = payload.security_advisory
      if (securityAdvisory) {
        const severityEmoji = securityAdvisory.severity === 'critical' ? '🚨' : 
                             securityAdvisory.severity === 'high' ? '⚠️' : 
                             securityAdvisory.severity === 'medium' ? '⚡' : 
                             securityAdvisory.severity === 'low' ? 'ℹ️' : '📝'
        
        var message: string = `${severityEmoji} <b>Security Advisory</b> ${payload.action} by <b>${sender}</b> on ${repo}\n`
        message += `\n🚨 <b>Severity:</b> ${escapeHtml(securityAdvisory.severity)}\n`
        message += `📝 <b>Summary:</b> ${escapeHtml(securityAdvisory.summary)}`
        
        if (securityAdvisory.description) {
          message += `\n\n📝 <b>Description:</b> ${escapeHtml(securityAdvisory.description.slice(0, 1000))}`
          if (securityAdvisory.description.length > 1000) {
            message += `...`
          }
        }
        
        const securityAdvisoryResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
        if (securityAdvisoryResponse) {
          additionals["telegramResponse"] = securityAdvisoryResponse
          additionals["message"] = message
        }
      }
      break;

    case "sponsorship":
      const sponsorship = payload.sponsorship
      if (sponsorship) {
        const actionEmoji = payload.action === 'created' ? '💖' : 
                           payload.action === 'cancelled' ? '💔' : 
                           payload.action === 'edited' ? '✏️' : '💝'
        
        var message: string = `${actionEmoji} <b>Sponsorship</b> ${payload.action} by <b>${sender}</b> on ${repo}\n`
        message += `\n📝 <b>Sponsor:</b> ${escapeHtml(sponsorship.sponsor.login)}\n`
        message += `🎯 <b>Sponsored:</b> ${escapeHtml(sponsorship.sponsee.login)}\n`
        message += `💰 <b>Tier:</b> ${escapeHtml(sponsorship.tier.name)}`
        
        if (sponsorship.tier.monthly_price_in_dollars > 0) {
          message += ` ($${sponsorship.tier.monthly_price_in_dollars}/month)`
        }
        
        const sponsorshipResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
        if (sponsorshipResponse) {
          additionals["telegramResponse"] = sponsorshipResponse
          additionals["message"] = message
        }
      }
      break;

    case "team":
      const team = payload.team
      if (team) {
        const actionEmoji = payload.action === 'created' ? '👥' : 
                           payload.action === 'edited' ? '✏️' : 
                           payload.action === 'deleted' ? '📝' : '📝'
        
        var message: string = `${actionEmoji} <b>Team</b> <a href="${team.html_url}">${escapeHtml(team.name)}</a> ${payload.action} by <b>${sender}</b> on ${repo}\n`
        message += `\n📝 <b>Privacy:</b> ${escapeHtml(team.privacy)}\n`
        message += `📝 <b>Description:</b> ${escapeHtml(team.description || 'No description')}`
        
        const teamResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
        if (teamResponse) {
          additionals["telegramResponse"] = teamResponse
          additionals["message"] = message
        }
      }
      break;

    case "label":
      const label = payload.label
      if (label) {
        const actionEmoji = payload.action === 'created' ? '🏷️' : 
                           payload.action === 'edited' ? '✏️' : 
                           payload.action === 'deleted' ? '📝' : '📝'
        
        var message: string = `${actionEmoji} <b>Label</b> <span style="color: #${label.color}">${escapeHtml(label.name)}</span> ${payload.action} by <b>${sender}</b> on ${repo}`
        
        if (label.description) {
          message += `\n\n📝 <b>Description:</b> ${escapeHtml(label.description)}`
        }
        
        const labelResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
        if (labelResponse) {
          additionals["telegramResponse"] = labelResponse
          additionals["message"] = message
        }
      }
      break;

    case "create":
      var message: string = `🎉 <b>${escapeHtml(payload.ref_type || 'item')}</b> <code>${escapeHtml(payload.ref || 'unknown')}</code> created by <b>${sender}</b> on ${repo}`
      
      const createResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
      if (createResponse) {
        additionals["telegramResponse"] = createResponse
        additionals["message"] = message
      }
      break;

    case "gollum":
      var message: string = `📚 <b>Wiki page</b> ${payload.action} by <b>${sender}</b> on ${repo}`
      
      const gollumResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
      if (gollumResponse) {
        additionals["telegramResponse"] = gollumResponse
        additionals["message"] = message
      }
      break;

    case "member":
      const member = payload.member
      if (member) {
        const actionEmoji = payload.action === 'added' ? '👋' : '👋'
        var message: string = `${actionEmoji} <b>Member</b> <a href="${member.html_url}">${escapeHtml(member.login)}</a> ${payload.action} by <b>${sender}</b> on ${repo}`
        
        const memberResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
        if (memberResponse) {
          additionals["telegramResponse"] = memberResponse
          additionals["message"] = message
        }
      }
      break;

    case "public":
      var message: string = `🌍 <b>Repository</b> ${repo} made public by <b>${sender}</b>`
      
      const publicResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
      if (publicResponse) {
        additionals["telegramResponse"] = publicResponse
        additionals["message"] = message
      }
      break;

    case "watch":
      const actionEmoji = payload.action === 'started' ? '👀' : '📝'
      var message: string = `${actionEmoji} <b>Repository</b> ${repo} ${payload.action} by <b>${sender}</b>`
      
      const watchResponse = await bot.sendMessage(Number(chatId), message, "HTML", true)
      if (watchResponse) {
        additionals["telegramResponse"] = watchResponse
        additionals["message"] = message
      }
      break;

    default:
      // Log unknown events for debugging
      console.log(`Unhandled GitHub event: ${event}`)
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
