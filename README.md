# Eliora

Лендинг бренда одежды Eliora на Flask.

## Локальный запуск

```bash
/usr/local/bin/python3 backend/tg_bot.py
```

## Деплой

Проект настроен для Vercel через `api/index.py` и `vercel.json`. Каждый push в подключённую ветку `main` запускает новый деплой автоматически.

Секреты Telegram добавляются в Vercel Project Settings → Environment Variables:

- `TELEGRAM_BOT_TOKEN` (или совместимое старое имя `TELEGRAM_BOT_ID`)
- `TELEGRAM_CHAT_ID`

Файл `.env` не коммитится.
