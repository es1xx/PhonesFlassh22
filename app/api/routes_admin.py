from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import Phone, Transaction, User, UserPhone
from app.security import get_current_user

router = APIRouter(prefix="/api/admin", tags=["admin"])


def verify_admin(user: User = Depends(get_current_user)) -> User:
    """Перевіряє, чи є поточний користувач адміністратором зі списку ADMIN_IDS."""
    admin_ids = settings.admin_id_list
    if settings.DEV_MODE and not admin_ids:
        return user
    if user.telegram_id not in admin_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ заборонено: потрібні права адміністратора.",
        )
    return user


class AdjustCoinsRequest(BaseModel):
    amount: int
    reason: Optional[str] = "Коригування адміністратором"


class BroadcastRequest(BaseModel):
    message: str


# Журнал аудиту в оперативній пам'яті
ADMIN_AUDIT_LOGS = [
    f"{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} - Адмін-система активована (ADMIN_IDS: {settings.ADMIN_IDS})"
]


@router.get("/stats")
async def get_admin_stats(
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Отримує глобальну статистику платформи."""
    users_count = (await db.execute(select(func.count(User.id)))).scalar_one()
    cards_count = (await db.execute(select(func.count(UserPhone.id)))).scalar_one()
    flashed_count = (
        await db.execute(
            select(func.count(UserPhone.id)).where(UserPhone.flashed.is_(True))
        )
    ).scalar_one()
    total_coins = (await db.execute(select(func.sum(User.balance)))).scalar_one() or 0

    return {
        "users_count": users_count,
        "cards_count": cards_count,
        "flashed_count": flashed_count,
        "total_coins": total_coins,
        "admin_telegram_id": admin.telegram_id,
        "app_mode": settings.APP_MODE,
    }


@router.get("/users")
async def list_admin_users(
    query: Optional[str] = Query(None, description="Пошук за нікнеймом або ID"),
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Список користувачів із можливістю пошуку."""
    stmt = select(User).order_by(User.id.desc()).limit(50)
    if query:
        if query.isdigit():
            stmt = stmt.where(User.telegram_id == int(query))
        else:
            stmt = stmt.where(User.username.ilike(f"%{query}%"))

    result = await db.execute(stmt)
    users = result.scalars().all()

    return [
        {
            "id": u.id,
            "telegram_id": u.telegram_id,
            "username": u.username,
            "first_name": u.first_name,
            "balance": u.balance,
            "is_banned": u.is_banned,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


@router.post("/user/{user_id}/coins")
async def adjust_user_coins(
    user_id: int,
    req: AdjustCoinsRequest,
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Змінює баланс користувача (+/- монети)."""
    target = await db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Користувача не знайдено.")

    old_balance = target.balance
    target.balance = max(0, target.balance + req.amount)

    # Запис транзакції
    tx = Transaction(
        user_id=target.id,
        amount=req.amount,
        tx_type="admin_adjust",
        description=f"Адмін @{admin.username or admin.telegram_id}: {req.reason}",
    )
    db.add(tx)
    await db.commit()

    log_entry = (
        f"{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} - Адмін "
        f"{admin.telegram_id} змінив баланс юзера {target.telegram_id}: "
        f"{old_balance} -> {target.balance} ({req.amount:+d})"
    )
    ADMIN_AUDIT_LOGS.insert(0, log_entry)

    return {
        "success": True,
        "message": f"Баланс користувача {target.telegram_id} успішно змінено на {req.amount:+d}.",
        "new_balance": target.balance,
    }


@router.post("/user/{user_id}/ban")
async def toggle_user_ban(
    user_id: int,
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Блокує або розблоковує користувача."""
    target = await db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Користувача не знайдено.")

    if target.telegram_id in settings.admin_id_list:
        raise HTTPException(status_code=400, detail="Неможливо заблокувати адміністратора.")

    target.is_banned = not target.is_banned
    await db.commit()

    action = "заблоковано" if target.is_banned else "розблоковано"
    log_entry = (
        f"{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} - Адмін "
        f"{admin.telegram_id} {action} юзера {target.telegram_id}"
    )
    ADMIN_AUDIT_LOGS.insert(0, log_entry)

    return {
        "success": True,
        "is_banned": target.is_banned,
        "message": f"Користувача {target.telegram_id} успішно {action}.",
    }


@router.post("/broadcast")
async def broadcast_message(
    req: BroadcastRequest,
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Імітація або відправка розсилки користувачам гри."""
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Текст розсилки не може бути порожнім.")

    users_count = (await db.execute(select(func.count(User.id)))).scalar_one()
    log_entry = (
        f"{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} - Адмін "
        f"{admin.telegram_id} відправив розсилку ({users_count} користувачам): '{req.message[:40]}...'"
    )
    ADMIN_AUDIT_LOGS.insert(0, log_entry)

    return {
        "success": True,
        "message": f"Розсилку поставлено в чергу для {users_count} користувачів.",
        "recipients_count": users_count,
    }


@router.get("/logs")
async def get_admin_logs(
    admin: User = Depends(verify_admin),
):
    """Повертає останні записи журналу аудиту дій адміністратора."""
    return {"logs": ADMIN_AUDIT_LOGS[:50]}
