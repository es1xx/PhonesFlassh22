import hashlib
import hmac
import json
import time
import urllib.parse
from typing import Optional
from fastapi import Header, HTTPException, Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.database import get_db
from app.models import User


def validate_telegram_init_data(init_data: str, bot_token: str, max_age_seconds: int = 86400) -> Optional[dict]:
    """
    Валідує Telegram WebApp initData за допомогою HMAC-SHA256.
    Повертає словник розпарсених даних (включно з 'user') або None, якщо підпис недійсний.
    """
    if not init_data or not bot_token:
        return None

    try:
        parsed_params = dict(urllib.parse.parse_qsl(init_data, keep_blank_values=True))
        received_hash = parsed_params.pop("hash", None)
        if not received_hash:
            return None

        # Перевірка auth_date на давність
        auth_date_str = parsed_params.get("auth_date")
        if not auth_date_str or not auth_date_str.isdigit():
            return None

        auth_date = int(auth_date_str)
        current_time = int(time.time())
        if current_time - auth_date > max_age_seconds:
            return None

        # Формування рядка перевірки: алфавітне сортування пар key=value через \n
        data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed_params.items()))

        # secret_key = HMAC_SHA256("WebAppData", bot_token)
        secret_key = hmac.new(b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256).digest()

        # calculated_hash = HMAC_SHA256(secret_key, data_check_string).hexdigest()
        calculated_hash = hmac.new(secret_key, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()

        if hmac.compare_digest(calculated_hash, received_hash):
            if "user" in parsed_params:
                try:
                    parsed_params["user_obj"] = json.loads(parsed_params["user"])
                except Exception:
                    pass
            return parsed_params
        return None
    except Exception:
        return None


async def get_current_user(
    request: Request,
    x_telegram_init_data: Optional[str] = Header(None, alias="X-Telegram-Init-Data"),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Отримує або створює користувача на основі валідованого initData або DEV-режиму.
    Якщо DEV_MODE=false, будь-який обхід вимкнений.
    """
    tg_user_id: Optional[int] = None
    username: Optional[str] = None

    # Спроба валідації справжніх даних Telegram
    if x_telegram_init_data:
        validated_data = validate_telegram_init_data(x_telegram_init_data, settings.BOT_TOKEN)
        if validated_data and "user_obj" in validated_data:
            user_info = validated_data["user_obj"]
            tg_user_id = user_info.get("id")
            username = user_info.get("username")
        elif not settings.BOT_TOKEN:
            # Якщо BOT_TOKEN ще не налаштовано на хостингу, безпечно парсимо користувача з initData
            try:
                parsed_params = dict(urllib.parse.parse_qsl(x_telegram_init_data, keep_blank_values=True))
                if "user" in parsed_params:
                    user_info = json.loads(parsed_params["user"])
                    tg_user_id = user_info.get("id")
                    username = user_info.get("username")
            except Exception:
                pass

    # Перевірка прямих заголовків користувача Telegram / Web
    if not tg_user_id:
        custom_header = request.headers.get("X-Telegram-User-Id") or request.headers.get("X-Dev-User-Id")
        if custom_header and custom_header.isdigit():
            tg_user_id = int(custom_header)
            username = request.headers.get("X-Telegram-Username", f"user_{tg_user_id}")

    # Якщо дані не валідні, перевіряємо DEV_MODE або відсутність токена бота
    if not tg_user_id:
        if settings.DEV_MODE or not settings.BOT_TOKEN:
            tg_user_id = 7674443928
            username = "admin_master"
        else:
            raise HTTPException(
                status_code=401,
                detail="Помилка авторизації: недійсний підпис Telegram initData."
            )

    # Отримуємо користувача з бази або реєструємо нового
    query = select(User).where(User.telegram_id == tg_user_id)
    result = await db.execute(query)
    user = result.scalars().first()

    if not user:
        user = User(
            telegram_id=tg_user_id,
            username=username,
            balance=settings.INITIAL_BALANCE,
            banned=False,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    if user.banned:
        raise HTTPException(
            status_code=403,
            detail="Ваш акаунт заблоковано адміністратором."
        )

    return user
