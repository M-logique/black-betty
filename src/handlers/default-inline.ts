import { TelegramBot, InlineQueryHandler, TelegramInlineQueryResult, TelegramInlineQuery } from "../types";

export const defaultInlineHandler: InlineQueryHandler = {
  name: 'default-inline',
  canHandle: (query: TelegramInlineQuery) => true,
  handle: async (query: TelegramInlineQuery, bot: TelegramBot) => {
    const results: TelegramInlineQueryResult[] = [
      {
        type: 'article',
        id: 'help',
        title: 'Help',
        description: 'How to use this bot',
        input_message_content: {
          message_text: `🤖 *Black Betty Bot Help*\n\nThis bot supports inline queries.\n\nType @WhoaBlackBettyBemBlemBot <command> to use features.\n\nAvailable commands:\n- notes: Take and search notes\n- calc: Inline calculator\n\nFor more info, type /help in chat.`,
          parse_mode: 'Markdown'
        }
      }
    ];
    await bot.answerInlineQuery(query.id, results);
  },
  requiredAuth: false
}