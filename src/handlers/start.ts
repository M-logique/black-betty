import { TelegramMessage, MessageHandler, TelegramBot} from "../types"

export const startHandler: MessageHandler = {
  name: 'start',
  canHandle: (message: TelegramMessage) => message.text?.startsWith('/start') ?? false,
  handle: async (message: TelegramMessage, bot: TelegramBot) => {
    await bot.sendMessage(message.chat.id, 'Hello!')
  }, 
  requiredAuth: false
}