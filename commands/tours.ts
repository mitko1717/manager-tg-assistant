import { readdir } from 'fs/promises'
import { toursDir } from '../bot'
import { bot } from '../bot-instance'
 
bot.onText(/\/tours/, async (msg) => {
  const chatId = msg.chat.id
  try {
    const files = await readdir(toursDir)
    const tours = files
      .filter(f => f.endsWith('.txt'))
      .map(f => `• ${f.replace('.txt', '')}`)
 
    if (tours.length === 0) {
      bot.sendMessage(chatId, '📂 Поки немає жодного збереженого туру.')
      return
    }
 
    bot.sendMessage(chatId, `📂 <b>Збережені тури:</b>\n\n${tours.join('\n')}`, { parse_mode: 'HTML' })
  } catch {
    bot.sendMessage(chatId, '❌ Не вдалося прочитати папку турів.')
  }
})