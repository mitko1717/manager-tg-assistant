import TelegramBot from 'node-telegram-bot-api'
import * as path from 'path'
import { TELEGRAM_BOT_TOKEN } from './constants'

export const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true })

export const contextDir = path.join(__dirname, 'context')
export const toursDir = path.join(contextDir, 'tours')

bot.setMyCommands([
  { command: 'start', description: '👋 Як користуватись ботом' },
  { command: 'addtour', description: '➕ Додати тур — /addtour Назва https://...' },
  { command: 'tours', description: '📂 Список збережених турів' },
])