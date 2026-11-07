from datetime import datetime
from html import escape
import os
from pathlib import Path

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request
from flask_compress import Compress

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / '.env')

app = Flask(
    __name__,
    static_folder=str(PROJECT_ROOT / 'frontend/static'),
    template_folder=str(PROJECT_ROOT / 'frontend/static/templates'),
)

compress = Compress()
compress.init_app(app)
app.config['COMPRESS_MIMETYPES'] = [
    'text/html',
    'text/css',
    'text/xml',
    'application/json',
    'application/javascript',
]
app.config['COMPRESS_LEVEL'] = 6
app.config['COMPRESS_MIN_SIZE'] = 500

TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN') or os.getenv('TELEGRAM_BOT_ID')
TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID')

if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
    print('Важно: не найдены TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID в .env')


@app.after_request
def add_header(response):
    if 'static' in request.path:
        response.cache_control.max_age = 31536000
        response.cache_control.public = True
    elif request.path == '/' or request.path.endswith('.html'):
        response.cache_control.no_cache = True
        response.cache_control.must_revalidate = True
    return response


def send_notification(name, telegram, phone, timestamp, address, items):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print('Бот не настроен')
        return False

    items_text = '\n<b>📦 Модель:</b>\n'
    for item in items:
        item_name = escape(item['name'])
        item_size = escape(item.get('size', ''))
        item_quantity = escape(str(item.get('quantity', 1)))
        item_price = escape(item.get('price', ''))
        details = f', размер {item_size}' if item_size else ''
        price = f' — {item_price}' if item_price else ''
        items_text += f'  • {item_name}{details} · {item_quantity} шт.{price}\n'

    safe_name = escape(name)
    safe_telegram = escape(telegram)
    safe_phone = escape(phone)
    safe_address = escape(address)
    telegram_link = f"https://t.me/{telegram.lstrip('@')}"

    message = f"""<b>🌿 НОВЫЙ ЗАКАЗ ELIORA</b>

<b>👤 Клиент:</b> {safe_name}
<b>📞 Телефон:</b> <code>{safe_phone}</code>
<b>📱 Telegram:</b> {safe_telegram} [<a href="{telegram_link}">Написать</a>]
<b>📍 Адрес:</b> {safe_address}
<b>⏰ Время:</b> {timestamp}
{items_text}
#предзаказ #eliora
"""

    url = f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage'
    payload = {
        'chat_id': TELEGRAM_CHAT_ID,
        'text': message,
        'parse_mode': 'HTML',
        'disable_web_page_preview': True,
    }

    try:
        response = requests.post(url, json=payload, timeout=10)
    except requests.RequestException as error:
        print(f'❌ Ошибка отправки в Telegram: {error}')
        return False

    if response.status_code != 200:
        print(f'❌ Telegram API вернул {response.status_code}: {response.text}')
        return False
    return True


@app.route('/api/submit-order', methods=['POST'])
def submit_order():
    try:
        data = request.get_json()
        if not isinstance(data, dict):
            return jsonify({'success': False, 'message': 'Нет данных'}), 400

        name = data.get('name', '').strip()
        telegram = data.get('telegram', '').strip()
        phone = data.get('phone', '').strip()
        address = data.get('address', '').strip()
        timestamp = data.get('timestamp', datetime.now().isoformat())
        raw_items = data.get('items', [])

        if not name or not telegram or not phone or not address:
            return jsonify({
                'success': False,
                'message': 'Все поля обязательны',
            }), 400
        if len(name) < 2:
            return jsonify({
                'success': False,
                'message': 'Имя слишком короткое',
            }), 400
        if not telegram.startswith('@') or len(telegram) < 2:
            return jsonify({
                'success': False,
                'message': 'Telegram должен начинаться с @',
            }), 400
        if not isinstance(raw_items, list):
            return jsonify({
                'success': False,
                'message': 'Выберите модель',
            }), 400

        items = [
            {
                'name': str(item.get('name', '')).strip(),
                'size': str(item.get('size', '')).strip(),
                'quantity': item.get('quantity', 1),
                'price': str(item.get('price', '')).strip(),
            }
            for item in raw_items
            if isinstance(item, dict) and str(item.get('name', '')).strip()
        ]
        if not items:
            return jsonify({
                'success': False,
                'message': 'Выберите модель',
            }), 400

        try:
            parsed_timestamp = datetime.fromisoformat(
                str(timestamp).replace('Z', '+00:00')
            )
            formatted_time = parsed_timestamp.strftime('%d.%m.%Y %H:%M')
        except (TypeError, ValueError):
            formatted_time = datetime.now().strftime('%d.%m.%Y %H:%M')

        telegram_sent = send_notification(
            name,
            telegram,
            phone,
            formatted_time,
            address,
            items,
        )
        print(f'📝 New Eliora order: {name} ({telegram}, {phone}) at {formatted_time}')

        if not telegram_sent:
            return jsonify({
                'success': False,
                'message': 'Не удалось отправить заявку. Попробуй позже.',
            }), 502

        return jsonify({
            'success': True,
            'message': 'Заявка отправлена!',
        }), 200
    except (AttributeError, TypeError, ValueError) as error:
        print(f'❌ Ошибка обработки заявки: {error}')
        return jsonify({
            'success': False,
            'message': 'Ошибка сервера. Попробуй позже.',
        }), 500


@app.route('/health')
def health():
    return jsonify({
        'status': 'ok',
        'telegram_configured': bool(TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID),
    })


@app.route('/')
def index():
    return render_template('index.html')


@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404


@app.errorhandler(500)
def server_error(error):
    return jsonify({'error': 'Internal server error'}), 500


app_instance = app


if __name__ == '__main__':
    print('🚀 Eliora Landing Page Server')
    print(f"📱 Telegram Bot: {'✅ Configured' if TELEGRAM_BOT_TOKEN else '❌ Not configured'}")
    print(f"💬 Chat ID: {'✅ Set' if TELEGRAM_CHAT_ID else '❌ Not set'}")
    app.run(host='0.0.0.0', port=5001, debug=True)
