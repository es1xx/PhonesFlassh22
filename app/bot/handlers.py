from aiogram import Router, types
from aiogram.filters import Command, CommandStart
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

from app.config import settings

router = Router()


@router.message(CommandStart())
async def cmd_start(message: types.Message):
    user_id = message.from_user.id
    first_name = message.from_user.first_name or "Користувач"

    welcome_text = (
        f"👋 Вітаємо, <b>{first_name}</b>, у грі-симуляторі <b>Флешер</b>!\n\n"
        "🎮 <b>Що це таке:</b>\n"
        "Це колекційна навчальна гра, де ви отримуєте картки реальних смартфонів "
        "(Samsung, Xiaomi, Poco, Pixel, iPhone, Nothing), можете покращувати їх, "
        "продавати за віртуальні монети та вивчати реальні кроки перепрошивки або джейлбрейку.\n\n"
        "⚠️ <b>Увага:</b> Гра має виключно навчальний характер. Будь-які реальні маніпуляції "
        "з власним смартфоном здійснюються на власний ризик та лише після звірки з офіційними "
        "інструкціями моделі!\n\n"
        "Натисніть кнопку нижче, щоб відкрити гру:"
    )

    webapp_url = settings.WEBAPP_URL
    keyboard_buttons = []

    if webapp_url:
        keyboard_buttons.append([
            InlineKeyboardButton(
                text="📱 Відкрити гру (Mini App)",
                web_app=WebAppInfo(url=webapp_url),
            )
        ])
    else:
        keyboard_buttons.append([
            InlineKeyboardButton(
                text="🌐 Гра доступна на локальному сервері",
                callback_data="no_webapp_url",
            )
        ])

    keyboard = InlineKeyboardMarkup(inline_keyboard=keyboard_buttons)

    await message.answer(welcome_text, reply_markup=keyboard, parse_mode="HTML")


@router.message(Command("help"))
async def cmd_help(message: types.Message):
    help_text = (
        "ℹ️ <b>Корисні команди:</b>\n"
        "/start — Відкрити головне меню та Mini App\n"
        "/id — Дізнатися свій Telegram ID\n"
        "/help — Довідка\n\n"
        "💡 <i>Підказка:</i> Якщо кнопка не відкривається, переконайтеся, що в налаштуваннях "
        "бота встановлено правильний HTTPS URL (через cloudflared або власний домен)."
    )
    await message.answer(help_text, parse_mode="HTML")


@router.message(Command("id"))
async def cmd_id(message: types.Message):
    await message.answer(f"Ваш Telegram ID: <code>{message.from_user.id}</code>", parse_mode="HTML")


@router.callback_query(lambda c: c.data == "no_webapp_url")
async def cb_no_webapp(callback: types.CallbackQuery):
    await callback.answer(
        "WEBAPP_URL ще не налаштовано або тунель створюється. Перевірте консоль run.py!",
        show_alert=True,
    )
