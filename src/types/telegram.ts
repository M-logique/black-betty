import { Context } from "hono"
import { CloudflareBindings } from "./cloudflare"

// Types for Telegram Bot API
export interface TelegramMessage {
  message_id: number
  chat: { id: number; type: string }
  document?: { file_id: string }
  photo?: { file_id: string; file_size?: number }[]
  video?: { file_id: string }
  audio?: { file_id: string }
  voice?: { file_id: string }
  text?: string
  from?: { first_name?: string; id: number }
}

// Inline query types
export interface TelegramInlineQuery {
  id: string
  from: { id: number; first_name?: string }
  query: string
  offset: string
}

export interface TelegramChosenInlineResult {
  result_id: string
  from: { id: number; first_name?: string }
  inline_message_id?: string
  query: string
}

// Callback query types
export interface TelegramCallbackQuery {
  id: string
  from: { id: number; first_name?: string }
  message?: TelegramMessage
  inline_message_id?: string
  chat_instance: string
  data: string
}

// Update type that includes inline queries and callback queries
export interface TelegramUpdate {
  update_id: number

  message?: TelegramMessage
  channel_post?: TelegramMessage

  inline_query?: TelegramInlineQuery
  chosen_inline_result?: TelegramChosenInlineResult
  callback_query?: TelegramCallbackQuery
}

// Telegram Bot API client
export class TelegramBot {
  private token: string
  private baseUrl: string
  public context: Context<{Bindings: CloudflareBindings}>

  constructor(token: string, c: Context<{Bindings: CloudflareBindings}>) {
    this.token = token
    this.baseUrl = `https://api.telegram.org/bot${token}`
    this.context = c
  }

  async getFile(fileId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/getFile?file_id=${fileId}`)
    return response.json()
  }

  async sendMessage(chatId: number, text: string, parseMode?: string, disableWebPagePreview?: boolean): Promise<any> {
    const body: any = { chat_id: chatId, text }
    if (parseMode) body.parse_mode = parseMode
    if (disableWebPagePreview !== undefined) body.disable_web_page_preview = disableWebPagePreview
    
    const response = await fetch(`${this.baseUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (response.status > 299) {
      console.log(`status code: ${response.status}`)
    }
    return response.json()
  }

  async answerInlineQuery(inlineQueryId: string, results: TelegramInlineQueryResult[]): Promise<any> {
    const body = { inline_query_id: inlineQueryId, results }
    const response = await fetch(`${this.baseUrl}/answerInlineQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    return response.json()
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<any> {
    const body: any = { callback_query_id: callbackQueryId }
    if (text) body.text = text
    
    const response = await fetch(`${this.baseUrl}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    return response.json()
  }

  async editMessageText(chatId: number, messageId: number, text: string, replyMarkup?: any, parseMode?: string): Promise<any> {
    const body: any = { chat_id: chatId, message_id: messageId, text }
    if (replyMarkup) body.reply_markup = replyMarkup
    if (parseMode) body.parse_mode = parseMode
    
    const response = await fetch(`${this.baseUrl}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    return response.json()
  }

  async editInlineMessageText(inlineMessageId: string, text: string, replyMarkup?: any, parseMode?: string): Promise<any> {
    const body: any = { inline_message_id: inlineMessageId, text }
    if (replyMarkup) body.reply_markup = replyMarkup
    if (parseMode) body.parse_mode = parseMode
    
    const response = await fetch(`${this.baseUrl}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    return response.json()
  }

  async getChatMember(chatId: number, userId: number): Promise<any> {
    const response = await fetch(`${this.baseUrl}/getChatMember?chat_id=${chatId}&user_id=${userId}`)
    return response.json()
  }
  async getMe(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/getMe`)
    return response.json()
  }

  getToken(): string {
    return this.token
  }
}

// Handler interface
export interface MessageHandler {
  name: string
  canHandle: (message: TelegramMessage) => boolean
  handle: (message: TelegramMessage, bot: TelegramBot) => Promise<void>
  requiredAuth?: boolean
}

// Inline query handler interface
export interface InlineQueryHandler {
  name: string
  canHandle: (query: TelegramInlineQuery) => boolean
  handle: (query: TelegramInlineQuery, bot: TelegramBot) => Promise<void>
  requiredAuth?: boolean
}

// Callback query handler interface
export interface CallbackQueryHandler {
  name: string
  canHandle: (callbackQuery: TelegramCallbackQuery) => boolean
  handle: (callbackQuery: TelegramCallbackQuery, bot: TelegramBot) => Promise<void>
  requiredAuth?: boolean
}

export interface TelegramInlineQueryResult {
  type: string
  id: string
  title: string
  description: string
  input_message_content: {
    message_text: string
    parse_mode?: string
  }
  reply_markup?: {
    inline_keyboard: Array<Array<{
      text: string
      callback_data: string
    }>>
  }
}

