import { InlineQueryHandler, TelegramBot, TelegramInlineQuery, TelegramInlineQueryResult, CallbackQueryHandler, TelegramCallbackQuery } from '../types'

export const inlineNotesSet: InlineQueryHandler = {
    name: "inline-notes-set",
    canHandle: (query: TelegramInlineQuery) => query.query.toLowerCase().startsWith("note create"),
    handle: async (query: TelegramInlineQuery, bot: TelegramBot) => {
        const noteContent = query.query.slice("note create".length).trim()
        const userId = query.from.id
        
        if (noteContent.length === 0) {
            const results: TelegramInlineQueryResult[] = [{
                type: 'article',
                id: 'result',
                title: `📝 Create Note`,
                description: `Please provide note content after "note create"`,
                input_message_content: {
                    message_text: `❌ Please provide note content after "note create"`,
                    parse_mode: "MarkdownV2"
                }
            }]
            await bot.answerInlineQuery(query.id, results)
            return
        }

        const results: TelegramInlineQueryResult[] = [{
            type: 'article',
            id: 'create-note',
            title: `📝 Create New Note`,
            description: `Click to create note: ${noteContent.length > 50 ? noteContent.substring(0, 47) + '...' : noteContent}`,
            input_message_content: {
                message_text: `📝 *Note Preview*\n\n📄 Content:\n${escapeMarkdown(noteContent)}\n\n⏳ Click the button below to create this note\\.`,
                parse_mode: "MarkdownV2"
            },
            reply_markup: {
                inline_keyboard: [[
                    {
                        text: '✅ Create Note',
                        callback_data: `create_note:${userId}:${btoa(noteContent)}`
                    }
                ]]
            }
        }]
        
        await bot.answerInlineQuery(query.id, results)
    },
}

export const inlineNotesGet: InlineQueryHandler = {
    name: "inline-notes-get",
    canHandle: (query: TelegramInlineQuery) => query.query.toLowerCase().startsWith("note get"),
    handle: async (query: TelegramInlineQuery, bot: TelegramBot) => {
        const searchTerm = query.query.slice("note get".length).trim().toLowerCase()
        const userId = query.from.id
        
        if (searchTerm.length === 0) {
            const results: TelegramInlineQueryResult[] = [{
                type: 'article',
                id: 'result',
                title: `🔍 Search Notes`,
                description: `Type "note get <search term>" to find notes`,
                input_message_content: {
                    message_text: `🔍 Type "note get <search term>" to search for your notes`,
                    parse_mode: "MarkdownV2"
                }
            }]
            await bot.answerInlineQuery(query.id, results)
            return
        }

        // Get all notes from KV store
        const notesList = await bot.context.env.NOTES.list()
        const results: TelegramInlineQueryResult[] = []
        
        // Search through all notes
        for (const key of notesList.keys) {
            const noteContent = await bot.context.env.NOTES.get(key.name)
            if (noteContent && noteContent.toLowerCase().includes(searchTerm)) {
                // Truncate content for display if too long
                const displayContent = noteContent.length > 50 
                    ? noteContent.substring(0, 47) + '...' 
                    : noteContent
                
                results.push({
                    type: 'article',
                    id: key.name,
                    title: `📝 ${displayContent}`,
                    description: `ID: ${key.name}`,
                    input_message_content: {
                        message_text: `📝 *Note Found\\!*\n\n📋 ID: \`${key.name}\`\n📄 Content:\n${escapeMarkdown(noteContent)}`,
                        parse_mode: "MarkdownV2"
                    },
                    reply_markup: {
                        inline_keyboard: [[
                            {
                                text: '🗑️ Delete Note',
                                callback_data: `delete_note:${userId}:${key.name}`
                            }
                        ]]
                    }
                })
            }
        }

        if (results.length === 0) {
            results.push({
                type: 'article',
                id: 'no-results',
                title: `🔍 No Notes Found`,
                description: `No notes found matching "${searchTerm}"`,
                input_message_content: {
                    message_text: `🔍 No notes found matching "${escapeMarkdown(searchTerm)}"`,
                    parse_mode: "MarkdownV2"
                }
            })
        }

        await bot.answerInlineQuery(query.id, results)
    },
}

export const callbackNotesDelete: CallbackQueryHandler = {
    name: "callback-notes-delete",
    canHandle: (callbackQuery: TelegramCallbackQuery) => callbackQuery.data.startsWith("delete_note:"),
    handle: async (callbackQuery: TelegramCallbackQuery, bot: TelegramBot) => {
        const userId = callbackQuery.data.split(":")[1]
        const noteId = callbackQuery.data.split(":")[2]
        
        if (Number(userId) !== callbackQuery.from.id) {
            await bot.answerCallbackQuery(callbackQuery.id, "❌ You can only delete your own notes!")
            return
        }

        try {
            // Delete the note from KV store
            await bot.context.env.NOTES.delete(noteId)
            
            // Answer the callback query
            await bot.answerCallbackQuery(callbackQuery.id, "✅ Note deleted successfully!")
            
            // Update the message to show it's been deleted
            const updatedText = `🗑️ *Note Deleted\\!*\n\n📋 ID: \`${noteId}\`\n✅ This note has been permanently deleted\\.`
            
            if (callbackQuery.inline_message_id) {
                await bot.editInlineMessageText(callbackQuery.inline_message_id, updatedText, {
                    inline_keyboard: []
                }, "MarkdownV2")
            } else if (callbackQuery.message) {
                await bot.editMessageText(
                    callbackQuery.message.chat.id, 
                    callbackQuery.message.message_id, 
                    updatedText,
                    { inline_keyboard: [] },
                    "MarkdownV2"
                )
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error('Note delete error:', error)
            
            await bot.answerCallbackQuery(callbackQuery.id, `❌ Failed to delete note: ${errorMessage}`)
            
            // Send detailed error message
            if (callbackQuery.message) {
                await bot.sendMessage(callbackQuery.message.chat.id,
                    `❌ *Note Delete Error*\n\n*Note ID:* \`${noteId}\`\n*Error:* \`${errorMessage}\`\n\nPlease try again or contact support if the problem persists.`,
                    "MarkdownV2"
                )
            }
        }
    },
}

export const callbackNotesCreate: CallbackQueryHandler = {
    name: "callback-notes-create",
    canHandle: (callbackQuery: TelegramCallbackQuery) => callbackQuery.data.startsWith("create_note:"),
    handle: async (callbackQuery: TelegramCallbackQuery, bot: TelegramBot) => {
        const userId = callbackQuery.data.split(":")[1]
        const encodedContent = callbackQuery.data.split(":")[2]
        
        if (Number(userId) !== callbackQuery.from.id) {
            await bot.answerCallbackQuery(callbackQuery.id, "❌ You can only create notes for yourself!")
            return
        }

        try {
            // Decode the note content
            const noteContent = atob(encodedContent)
            const noteID = nanoid()

            // Create the note in KV store
            await bot.context.env.NOTES.put(noteID, noteContent)
            
            // Answer the callback query
            await bot.answerCallbackQuery(callbackQuery.id, "✅ Note created successfully!")
            
            // Update the message to show the created note
            const updatedText = `✅ *Note Created\\!*\n\n📋 ID: \`${noteID}\`\n📄 Content:\n${escapeMarkdown(noteContent)}`
            
            if (callbackQuery.inline_message_id) {
                await bot.editInlineMessageText(callbackQuery.inline_message_id, updatedText, {
                    inline_keyboard: []
                }, "MarkdownV2")
            } else if (callbackQuery.message) {
                await bot.editMessageText(
                    callbackQuery.message.chat.id, 
                    callbackQuery.message.message_id, 
                    updatedText,
                    { inline_keyboard: [] },
                    "MarkdownV2"
                )
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error('Note creation error:', error)
            
            await bot.answerCallbackQuery(callbackQuery.id, `❌ Failed to create note: ${errorMessage}`)
            
            // Send detailed error message
            if (callbackQuery.message) {
                await bot.sendMessage(callbackQuery.message.chat.id,
                    `❌ *Note Creation Error*\n\n*Error:* \`${errorMessage}\`\n\nPlease try again or contact support if the problem persists.`,
                    "MarkdownV2"
                )
            }
        }
    },
    requiredAuth: true
}

function nanoid(size: number = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let id = ''
  const array = new Uint8Array(size)
  crypto.getRandomValues(array)
  for (let i = 0; i < size; i++) {
    id += chars[array[i] % chars.length]
  }
  return id
}

function escapeMarkdown(text: string): string {
  // Escape special characters for MarkdownV2
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
    .replace(/!/g, '\\!')
}
