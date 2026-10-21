import asyncio
import os
import re
import shutil
import subprocess
import sys
from contextlib import asynccontextmanager
from typing import Optional

from aiogram import Bot, Dispatcher
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

from app.api.routes_game import router as game_router
from app.api.routes_admin import router as admin_router
from app.bot.handlers import router as bot_router
from app.config import settings
from app.database import init_db
from data.seed import seed_phones

# Створення екземплярів бота та диспетчера
bot: Optional[Bot] = None
dp: Optional[Dispatcher] = None

if settings.BOT_TOKEN and settings.BOT_TOKEN != "123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ":
    bot = Bot(token=settings.BOT_TOKEN)
    dp = Dispatcher()
    dp.include_router(bot_router)


async def start_cloudflared_tunnel(port: int) -> Optional[tuple[subprocess.Popen, str]]:
    """
    Запускає cloudflared тунель для отримання публічного HTTPS URL,
    якщо cloudflared встановлено в системі.
    """
    if not shutil.which("cloudflared"):
        print("\n" + "=" * 65)
        print("⚠️  [УВАГА] cloudflared не знайдено в системі!")
        print("Для роботи Telegram Mini App обов'язковий HTTPS URL.")
        print("Встановлення в Arch Linux: sudo pacman -S cloudflared")
        print(f"Без тунелю ви можете тестувати гру в браузері: http://localhost:{port}")
        print("=" * 65 + "\n")
        return None

    cmd = ["cloudflared", "tunnel", "--url", f"http://localhost:{port}"]
    print(f"🌐 Запуск cloudflared тунелю для http://localhost:{port} ...")
    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
        )

        tunnel_url = None
        # Читаємо вивід cloudflared для знаходження trycloudflare.com посилання
        url_pattern = re.compile(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com")
        for _ in range(40):
            await asyncio.sleep(0.5)
            # Перевіряємо stderr, оскільки cloudflared виводить логи туди
            if process.stderr:
                try:
                    line = process.stderr.readline()
                    match = url_pattern.search(line)
                    if match:
                        tunnel_url = match.group(0)
                        break
                except Exception:
                    pass

        if tunnel_url:
            print("\n" + "🚀" * 30)
            print(f"✅ Тунель успішно піднято!")
            print(f"🔗 Публічний HTTPS URL: {tunnel_url}")
            print(f"Вкажіть цей URL у @BotFather для WebApp або використовуйте кнопку в боті.")
            print("🚀" * 30 + "\n")
            return process, tunnel_url
        else:
            print("⚠️ Не вдалося автоматично перехопити URL тунелю з виводу cloudflared.")
            return process, None
    except Exception as e:
        print(f"⚠️ Помилка запуску cloudflared: {e}")
        return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ініціалізація структури бази даних та імпорт каталогу
    print("📦 Ініціалізація бази даних SQLite...")
    await init_db()
    print("📱 Синхронізація каталогу 15 моделей телефонів...")
    await seed_phones()
    print("✅ База даних і каталог готові.")

    # Запуск бота у фоні, якщо токен заданий
    bot_task = None
    if bot and dp:
        print("🤖 Запуск фонового процесу Telegram-бота...")
        bot_task = asyncio.create_task(dp.start_polling(bot))

    yield

    # Зупинка бота при закритті сервера
    if bot_task:
        bot_task.cancel()
        try:
            await bot_task
        except asyncio.CancelledError:
            pass
    if bot:
        await bot.session.close()


# Створення FastAPI додатку
app = FastAPI(
    title="Флешер API",
    description="Бекенд навчальної гри-симулятора прошивки смартфонів",
    version="1.0.0",
    lifespan=lifespan,
)

# Підключення роутів
app.include_router(game_router)
app.include_router(admin_router)

# Роздача статичних файлів Mini App (пріоритет сучасному React додатку з dist/)
dist_dir = os.path.join(os.path.dirname(__file__), "dist")
static_dir = os.path.join(os.path.dirname(__file__), "static")

if os.path.exists(dist_dir) and os.path.exists(os.path.join(dist_dir, "index.html")):
    assets_dir = os.path.join(dist_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        target = os.path.join(dist_dir, full_path)
        if full_path and os.path.exists(target) and os.path.isfile(target):
            return FileResponse(target)
        return FileResponse(os.path.join(dist_dir, "index.html"))
elif os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")


def main():
    # Порт із середовища (Render надає PORT) або налаштувань
    port = int(os.environ.get("PORT", str(settings.PORT)))
    tunnel_proc = None

    # Підтримка Render публічного домену
    render_url = os.environ.get("RENDER_EXTERNAL_URL")
    if render_url and not settings.WEBAPP_URL:
        settings.WEBAPP_URL = render_url

    # Якщо WEBAPP_URL не вказано вручну, пробуємо підняти cloudflared тунель локально
    if not settings.WEBAPP_URL and shutil.which("cloudflared"):
        loop = asyncio.new_event_loop()
        tunnel_info = loop.run_until_complete(start_cloudflared_tunnel(port))
        loop.close()
        if tunnel_info:
            tunnel_proc, url = tunnel_info
            if url:
                settings.WEBAPP_URL = url

    print(f"🎮 Запуск сервера на порту {port} (DEV_MODE={settings.DEV_MODE}, APP_MODE={settings.APP_MODE})...")
    config = uvicorn.Config(
        app=app,
        host="0.0.0.0",
        port=port,
        log_level="info",
    )
    server = uvicorn.Server(config)

    try:
        server.run()
    finally:
        if tunnel_proc:
            print("🛑 Зупинка cloudflared тунелю...")
            tunnel_proc.terminate()


if __name__ == "__main__":
    main()
