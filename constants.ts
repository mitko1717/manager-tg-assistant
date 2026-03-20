import dotenv from 'dotenv'
dotenv.config()

export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN as string
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY as string
export const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
export const OPENAI_MODEL = 'gpt-4.1-mini'
export * from './bot-instance'