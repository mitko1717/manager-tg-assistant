import TelegramBot from 'node-telegram-bot-api'
import dotenv from 'dotenv'
import axios from 'axios'
import { readFile } from 'fs/promises'
import * as path from 'path'

dotenv.config()

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN as string
const OPENAI_API_KEY = process.env.OPENAI_API_KEY as string

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_MODEL = 'gpt-4o-mini'

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true })

const contextDir = path.join(__dirname, 'context')
const toursDir = path.join(contextDir, 'tours')

async function safeRead(filePath: string, defaultValue: string = ''): Promise<string> {
  try {
    return await readFile(filePath, 'utf-8')
  } catch (e) {
    return defaultValue
  }
}

function parseNewFormat(message: string): { tourName: string; name: string; clientMessage: string } | null {
  const re = /НАЗВА_ТУРУ:\s*([^;]+);?\s*ІМʼЯ:\s*([^;]+);?\s*([\s\S]*)/i
  const match = message.match(re)
  if (!match) return null

  const tourName = match[1].trim()
  const name = match[2].trim()
  const clientMessage = match[3]?.trim() || ''
  return { tourName, name, clientMessage }
}

function tourFileNameFromTour(tourName: string): string {
  return `${tourName}.txt`
}

function detectFormat(message: string): 'numbered' | 'bullets' | 'freeform' {
  if (/^\s*\d+[\.\)]/m.test(message)) return 'numbered'
  if (/^\s*[-•*]/m.test(message)) return 'bullets'
  return 'freeform'
}

function countItems(message: string): number {
  const numbered = message.match(/^\s*\d+[\.\)]/gm)
  if (numbered) return numbered.length
  const bullets = message.match(/^\s*[-•*]/gm)
  if (bullets) return bullets.length
  return 0
}

async function assembleMessages(name: string, tourName: string, clientMessage: string): Promise<{ role: string; content: string }[]> {
    const [tone, examples, company, faq, dont, rules] = await Promise.all([
    safeRead(path.join(contextDir, 'tone.md')),
    safeRead(path.join(contextDir, 'examples.md')),
    safeRead(path.join(contextDir, 'eurotrips.txt')),
    safeRead(path.join(contextDir, 'faq.md')),
    safeRead(path.join(contextDir, 'dont.md')),
    safeRead(path.join(contextDir, 'rules.md')),
    ])

  let tourInfo = ''
  if (tourName) {
    const tourFile = path.join(toursDir, tourFileNameFromTour(tourName))
    console.log('Шукаю файл туру:', tourFile)
    tourInfo = await safeRead(tourFile)
  }

  const format = detectFormat(clientMessage)
  const itemCount = countItems(clientMessage)

  const formatInstruction = format === 'numbered'
    ? `Клієнт надіслав нумерований список з ${itemCount} пунктів. Відповідай на КОЖЕН пункт окремо, зберігаючи ту саму нумерацію. Не пропускай жодного. Формат: "1. відповідь\\n2. відповідь" тощо.`
    : format === 'bullets'
    ? `Клієнт надіслав список з ${itemCount} пунктів через буллети. Відповідай на кожен пункт окремо у тому самому порядку, розділяючи відповіді з нового рядка.`
    : `Клієнт написав у вільній формі. Відповідай природним абзацом — без нумерації, без буллетів. Тон живий і теплий, як у месенджері.`

  const systemPrompt = `Ти — менеджер туристичної компанії Євротріпс. Відповідаєш на питання клієнтів від імені компанії українською мовою.

ТОНАЛЬНІСТЬ І СТИЛЬ:
${tone}

КОНТЕКСТ КОМПАНІЇ:
${company}

${faq ? `ЧАСТІ ПИТАННЯ І ВІДПОВІДІ (використовуй як джерело фактів):\n${faq}` : ''}

${tourInfo ? `ІНФОРМАЦІЯ ПРО ТУР "${tourName}":\n${tourInfo}` : ''}

ПРИКЛАДИ ПРАВИЛЬНИХ ВІДПОВІДЕЙ (стиль і тон):
${examples}

${dont ? `ЗАБОРОНЕНО:\n${dont}` : ''}

ФОРМАТ ВІДПОВІДІ:
${formatInstruction}

ЗАГАЛЬНІ ПРАВИЛА:
${rules ? `ЗАГАЛЬНІ ПРАВИЛА:\n${rules}` : ''}`

  const userPrompt = `Клієнт: ${name}
Тур: ${tourName}

Питання клієнта:
${clientMessage}`

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]
}

async function askOpenAI(messages: { role: string; content: string }[]): Promise<string> {
  const itemCount = messages[1].content.match(/^\s*\d+[\.\)]/gm)?.length || 0
  // Для списків ~100 токенів на пункт, для вільного тексту 400 достатньо
  const maxTokens = itemCount > 0 ? Math.max(800, itemCount * 110 + 200) : 500

  const res = await axios.post(
    OPENAI_API_URL,
    {
      model: OPENAI_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.4,
    },
    {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  )

  return res.data.choices?.[0]?.message?.content?.trim() || 'Сталася помилка генерації відповіді.'
}

bot.on('message', async (msg) => {
  try {
    const text = msg.text || ''
    const chatId = msg.chat.id

    if (text === '/start') {
      bot.sendMessage(chatId, 'Привіт! Надішли запит у форматі:\n\nНАЗВА_ТУРУ: Назва туру; ІМʼЯ: Імʼя; Питання клієнта')
      return
    }

    const parsed = parseNewFormat(text)
    if (!parsed?.name || !parsed.clientMessage || !parsed.tourName) {
      bot.sendMessage(chatId, '⚠️ Формат: НАЗВА_ТУРУ: Вікенд у Будапешті + Відень; ІМʼЯ: Олена; Ваше питання')
      return
    }

    // Показуємо що бот думає
    const thinkingMsg = await bot.sendMessage(chatId, '⏳')

    const { name, tourName, clientMessage } = parsed
    const messages = await assembleMessages(name, tourName, clientMessage)
    const reply = await askOpenAI(messages)

    // Видаляємо "⏳" і надсилаємо відповідь
    await bot.deleteMessage(chatId, thinkingMsg.message_id)
    bot.sendMessage(chatId, reply)

  } catch (err: any) {
    bot.sendMessage(msg.chat.id, '❌ Вибачте, сталася помилка!')
    console.error(err?.response?.data || err)
  }
})

console.log('✅ Eurotrips бот запущено!')