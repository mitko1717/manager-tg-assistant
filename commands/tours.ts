import { readdir } from 'fs/promises'
import { toursDir } from '../bot'
import { bot } from '../bot-instance'
 
bot.onText(/\/tours/, async (msg) => {
  const chatId = msg.chat.id
  try {
    const files = await readdir(toursDir)
    const tourNames = files
      .filter(f => f.endsWith('.txt'))
      .map(f => f.replace('.txt', ''))

    if (tourNames.length === 0) {
      bot.sendMessage(chatId, '📂 Поки немає жодного збереженого туру.')
      return
    }

    // Список турів
    const list = tourNames.map(name => `• ${name}`).join('\n')
    bot.sendMessage(chatId, `📂 <b>Збережені тури:</b>\n\n${list}`, { parse_mode: 'HTML' })

    // Шаблони для копіювання
    const keyboard = tourNames.map(name => ([{
      text: `📋 ${name}`,
      callback_data: `copy_${name}`
    }]))

    bot.sendMessage(chatId, '📂 <b>Оберіть тур для копіювання шаблону:</b>', {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    })

    bot.on('callback_query', async (query) => {
      if (!query.data?.startsWith('copy_')) return
      const name = query.data.replace('copy_', '')
      await bot.answerCallbackQuery(query.id)
      bot.sendMessage(query.message!.chat.id,
        `<code>НАЗВА_ТУРУ: ${name}; ІМʼЯ: _;</code>`,
        { parse_mode: 'HTML' }
      )
    })
  } catch {
    bot.sendMessage(chatId, '❌ Не вдалося прочитати папку турів.')
  }
})