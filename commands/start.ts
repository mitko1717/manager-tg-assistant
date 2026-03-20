import { bot } from '../bot-instance'

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, [
    '👋 Привіт! Ось доступні команди:',
    '',
    '<b>Відповідь на питання клієнта:</b>',
    '<code>НАЗВА_ТУРУ: Назва; ІМʼЯ: Імʼя; Питання</code>',
    '',
    '<b>Додати новий тур:</b>',
    '<code>/addtour Назва туру https://eurotrips.ua/...</code>',
    '',
    '<b>Список збережених турів:</b>',
    '<code>/tours</code>',
  ].join('\n'), { parse_mode: 'HTML' })
})
 