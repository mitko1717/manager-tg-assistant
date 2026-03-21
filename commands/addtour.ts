import { writeFile } from 'fs/promises'
import * as cheerio from 'cheerio'
import { toursDir } from '../bot'
import axios from 'axios'
import * as path from 'path'
import { OPENAI_API_KEY, OPENAI_API_URL, OPENAI_MODEL } from '../constants'
import { bot } from '../bot-instance'

console.log('✅ commands.ts завантажено')
bot.onText(/\/addtour (.+?) (https?:\/\/\S+)/, async (msg, match) => {
  console.log('addtour triggered:', match![1], match![2])
  const chatId = msg.chat.id
  const tourName = match![1].trim()
  const url = match![2].trim()

  const thinkingMsg = await bot.sendMessage(chatId, '⏳ Завантажую інформацію про тур...')

  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })

    const $ = cheerio.load(response.data)
    $('script, style, nav, footer, header, .menu, .popup, form').remove()

    const rawText = $('main, .content, article, body')
      .first()
      .text()
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\t/g, ' ')
      .trim()

    // Формуємо промпт для структурування
    const structureRes = await axios.post(
      OPENAI_API_URL,
      {
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: `Ти — помічник який структурує інформацію про тур у чіткий формат.
Виведи ТІЛЬКИ структурований текст, без коментарів.
ВАЖЛИВО:
- Витягуй ВСЮ конкретну інформацію — ціни, дати, години, назви, деталі
- Не скорочуй і не узагальнюй — якщо є конкретна цифра або назва, вона має бути у відповіді
- Якщо інформація повторюється — залиш один найповніший варіант
- Якщо якогось розділу немає на сторінці — пропусти його повністю

Формат виводу:

## Основні дані
- Дати: ...
- Тривалість: ... днів
- Вартість: ... € за одного туриста
- Бронювання: передоплата ... €, залишок ...
- Виїзд: місто, точка збору, час
- Повернення: ...

## Що входить у вартість
(перелічи все що є на сторінці)

## Додаткові витрати
(всі додаткові платежі з цінами якщо є)

## Проживання
- Кількість людей у номері: ...
- Рівень готелю: ...
- Одномісне розміщення: ...
- Зручності: ...

## Автобус та переїзди
- Тип автобуса: ...
- Розетки / USB: ...
- Wi-Fi: ...
- Туалет: ...
- Час у дорозі: ...
- Нічні переїзди: ...
- Зупинки: ...

## Кордон
- Очікуваний час: ...
- Альтернативні пункти: ...
- Поради: ...

## Страхування
...

## Група та формат
...

## Посилання
...

## Додаткова інформація
...

## Прибуття у Львів чи Київ
...

## Оплата та валюта
- Картка: ...
- Готівка: ...
- Рекомендована валюта: ...

## Страхування
- Покриття: ...
- Франшиза: ...

## Група та формат
- Кількість людей: ...
- Середній вік: ...
- Формат туру: ...
- Турлідер: ...

## Важливі умови
(візові вимоги, документи, обмеження, повернення коштів)

## Посилання та контакти
(всі посилання, форми, боти згадані на сторінці)

## Додаткові рекомендації
(все що радять брати, робити, знати).

## Короткий загальний зміст туру
...

Якщо якоїсь інформації немає — пропусти той розділ.`
          },
          {
            role: 'user',
            content: `Тур: ${tourName}\nURL: ${url}\n\nКонтент сторінки:\n${rawText.slice(0, 100000)}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.22,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const structured = structureRes.data.choices?.[0]?.message?.content?.trim()
    if (!structured) throw new Error('GPT не повернув результат')

    const filePath = path.join(toursDir, `${tourName}.txt`)
    await writeFile(filePath, structured, 'utf-8')

    await bot.deleteMessage(chatId, thinkingMsg.message_id)
    bot.sendMessage(chatId, `✅ Тур "${tourName}" збережено у файл:\n<code>context/tours/${tourName}.txt</code>`, { parse_mode: 'HTML' })

  } catch (err: any) {
    await bot.deleteMessage(chatId, thinkingMsg.message_id)
    bot.sendMessage(chatId, `❌ Помилка: ${err.message}`)
    console.error(err?.response?.data || err)
  }
})

// **Як користуватись:**
// /addtour Стамбул https://eurotrips.ua/stambul/