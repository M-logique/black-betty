// Types for Cloudflare Workers bindings
export interface CloudflareBindings {
  TELEGRAM_BOT_TOKEN: string
  ALLOWED_USER_IDS: string
  WEBHOOK_SECRET: string
}

// Types for Telegram Bot API
export interface TelegramMessage {
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

// Update type that includes inline queries
export interface TelegramUpdate {
  message?: TelegramMessage
  inline_query?: TelegramInlineQuery
  chosen_inline_result?: TelegramChosenInlineResult
}

// Telegram Bot API client
export class TelegramBot {
  private token: string
  private baseUrl: string

  constructor(token: string) {
    this.token = token
    this.baseUrl = `https://api.telegram.org/bot${token}`
  }

  async getFile(fileId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/getFile?file_id=${fileId}`)
    return response.json()
  }

  async sendMessage(chatId: number, text: string): Promise<any> {
    const body = { chat_id: chatId, text }
    const response = await fetch(`${this.baseUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
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

  getToken(): string {
    return this.token
  }
}

// Handler interface
export interface MessageHandler {
  name: string
  canHandle: (message: TelegramMessage) => boolean
  handle: (message: TelegramMessage, bot: TelegramBot) => Promise<void>
}

// Inline query handler interface
export interface InlineQueryHandler {
  name: string
  canHandle: (query: TelegramInlineQuery) => boolean
  handle: (query: TelegramInlineQuery, bot: TelegramBot) => Promise<void>
} 

export interface TelegramInlineQueryResult {
  type: string
  id: string
  title: string
  description: string
  input_message_content: {
    message_text: string
  }
}