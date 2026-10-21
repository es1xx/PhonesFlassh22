import random
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import Phone, Transaction, User, UserPhone
from app.security import get_current_user

router = APIRouter(prefix="/api", tags=["Game"])


class UserProfileResponse(BaseModel):
    id: int
    telegram_id: int
    username: Optional[str]
    balance: int
    last_claim_at: Optional[str]
    cooldown_seconds: int
    seconds_until_next_claim: int
    can_claim: bool
    app_mode: str
    dev_mode: bool
    is_admin: bool


class StepProgressRequest(BaseModel):
    step_id: str
    completed: bool


def calculate_sell_price(base_price: int, level: int, flashed: bool) -> int:
    """Розрахунок ціни продажу телефона з урахуванням рівня та множника прошивки."""
    level_multiplier = 1.0 + (level - 1) * 0.4
    flash_multiplier = settings.FLASH_SELL_MULTIPLIER if flashed else 1.0
    return int(base_price * level_multiplier * flash_multiplier)


def calculate_upgrade_cost(base_price: int, current_level: int) -> int:
    """Розрахунок вартості покращення на наступний рівень."""
    return int(base_price * current_level * 0.5)


@router.get("/me", response_model=UserProfileResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Отримання профілю поточного гравця, балансу та статусу кулдауну."""
    now = datetime.utcnow()
    seconds_until_next = 0
    can_claim = True

    if user.last_claim_at:
        elapsed = (now - user.last_claim_at).total_seconds()
        remaining = settings.cooldown_seconds - elapsed
        if remaining > 0:
            seconds_until_next = int(remaining)
            can_claim = False

    is_admin = user.telegram_id in settings.admin_id_list

    return UserProfileResponse(
        id=user.id,
        telegram_id=user.telegram_id,
        username=user.username,
        balance=user.balance,
        last_claim_at=user.last_claim_at.isoformat() if user.last_claim_at else None,
        cooldown_seconds=settings.cooldown_seconds,
        seconds_until_next_claim=seconds_until_next,
        can_claim=can_claim,
        app_mode=settings.APP_MODE,
        dev_mode=settings.DEV_MODE,
        is_admin=is_admin,
    )


@router.post("/claim-phone")
async def claim_phone(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Отримання випадкової картки телефона раз на кулдаун (перевірка на сервері).
    Випадковий вибір рідкості базується на вагах з конфігурації.
    """
    now = datetime.utcnow()
    if user.last_claim_at:
        elapsed = (now - user.last_claim_at).total_seconds()
        remaining = settings.cooldown_seconds - elapsed
        if remaining > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Кулдаун ще триває. Зачекайте ще {int(remaining)} сек."
            )

    # Вибір рідкості за ваговими коефіцієнтами
    rarities = list(settings.RARITY_WEIGHTS.keys())
    weights = [settings.RARITY_WEIGHTS[r] for r in rarities]
    chosen_rarity = random.choices(rarities, weights=weights, k=1)[0]

    # Вибираємо телефони цієї рідкості з каталогу
    query = select(Phone).where(Phone.active == True, Phone.rarity == chosen_rarity)
    result = await db.execute(query)
    candidates = result.scalars().all()

    if not candidates:
        # Fallback: будь-який активний телефон
        res_any = await db.execute(select(Phone).where(Phone.active == True))
        candidates = res_any.scalars().all()
        if not candidates:
            raise HTTPException(
                status_code=500,
                detail="Каталог телефонів порожній. Запустіть data/seed.py!"
            )

    phone = random.choice(candidates)

    # Створюємо новий екземпляр у колекції користувача
    user_phone = UserPhone(
        user_id=user.id,
        phone_id=phone.id,
        level=1,
        flashed=False,
        flash_progress=[],
        flash_rewarded=False,
        acquired_at=now,
    )
    db.add(user_phone)

    # Оновлюємо час останнього клейму та записуємо транзакцію
    user.last_claim_at = now
    tx = Transaction(
        user_id=user.id,
        type="claim",
        amount=0,
        details=f"Отримано картку: {phone.name} ({phone.rarity})",
    )
    db.add(tx)

    await db.commit()
    await db.refresh(user_phone)

    return {
        "status": "ok",
        "phone": {
            "id": user_phone.id,
            "brand": phone.brand,
            "name": phone.name,
            "codename": phone.codename,
            "rarity": phone.rarity,
            "emoji": phone.emoji,
            "level": user_phone.level,
            "flashed": user_phone.flashed,
            "base_price": phone.base_price,
            "sell_price": calculate_sell_price(phone.base_price, 1, False),
        },
        "message": f"Вітаємо! Ви отримали {phone.name} ({phone.rarity})!",
    }


@router.get("/collection")
async def get_user_collection(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Отримання списку телефонів у колекції поточного гравця з розрахунком цін та покращень."""
    query = (
        select(UserPhone)
        .where(UserPhone.user_id == user.id)
        .options(selectinload(UserPhone.phone))
        .order_by(UserPhone.acquired_at.desc())
    )
    result = await db.execute(query)
    user_phones = result.scalars().all()

    items = []
    for item in user_phones:
        phone = item.phone
        if not phone:
            continue

        sell_price = calculate_sell_price(phone.base_price, item.level, item.flashed)
        upgrade_cost = (
            calculate_upgrade_cost(phone.base_price, item.level)
            if item.level < phone.max_level
            else None
        )
        total_steps = len(phone.instructions) if isinstance(phone.instructions, list) else 0
        progress_count = len(item.flash_progress) if isinstance(item.flash_progress, list) else 0

        items.append({
            "id": item.id,
            "phone_id": phone.id,
            "brand": phone.brand,
            "name": phone.name,
            "codename": phone.codename,
            "rarity": phone.rarity,
            "emoji": phone.emoji,
            "level": item.level,
            "max_level": phone.max_level,
            "flashed": item.flashed,
            "flashed_at": item.flashed_at.isoformat() if item.flashed_at else None,
            "flash_progress_count": progress_count,
            "total_steps": total_steps,
            "sell_price": sell_price,
            "upgrade_cost": upgrade_cost,
            "acquired_at": item.acquired_at.isoformat(),
        })

    return {"collection": items}


# --- ЕТАП 3: РОУТИ ПРОШИВКИ ТА ІНСТРУКЦІЙ ---


@router.get("/phone/{user_phone_id}/instructions")
async def get_phone_instructions(
    user_phone_id: int = Path(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Отримання покрокової інструкції конкретного екземпляра телефона з його збереженим прогресом."""
    query = (
        select(UserPhone)
        .where(UserPhone.id == user_phone_id, UserPhone.user_id == user.id)
        .options(selectinload(UserPhone.phone))
    )
    result = await db.execute(query)
    user_phone = result.scalars().first()

    if not user_phone:
        raise HTTPException(status_code=404, detail="Телефон не знайдено у вашій колекції.")

    phone = user_phone.phone
    return {
        "id": user_phone.id,
        "phone_id": phone.id,
        "brand": phone.brand,
        "name": phone.name,
        "codename": phone.codename,
        "rarity": phone.rarity,
        "emoji": phone.emoji,
        "flashed": user_phone.flashed,
        "flashed_at": user_phone.flashed_at.isoformat() if user_phone.flashed_at else None,
        "flash_rewarded": user_phone.flash_rewarded,
        "flash_reward": settings.FLASH_REWARDS.get(phone.rarity, 50),
        "flash_progress": user_phone.flash_progress or [],
        "firmware_note": phone.firmware_note,
        "sources": phone.sources or [],
        "instructions": phone.instructions or [],
    }


@router.post("/phone/{user_phone_id}/step-progress")
async def save_step_progress(
    progress_data: StepProgressRequest,
    user_phone_id: int = Path(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Збереження прогресу виконання окремого кроку в БД по конкретному екземпляру."""
    query = (
        select(UserPhone)
        .where(UserPhone.id == user_phone_id, UserPhone.user_id == user.id)
        .options(selectinload(UserPhone.phone))
    )
    result = await db.execute(query)
    user_phone = result.scalars().first()

    if not user_phone:
        raise HTTPException(status_code=404, detail="Телефон не знайдено у вашій колекції.")

    current_progress = list(user_phone.flash_progress or [])

    if progress_data.completed:
        if progress_data.step_id not in current_progress:
            current_progress.append(progress_data.step_id)
    else:
        if progress_data.step_id in current_progress:
            current_progress.remove(progress_data.step_id)

    user_phone.flash_progress = current_progress
    await db.commit()

    return {
        "status": "ok",
        "step_id": progress_data.step_id,
        "completed": progress_data.completed,
        "completed_count": len(current_progress),
    }


@router.post("/phone/{user_phone_id}/complete-flash")
async def complete_flash(
    user_phone_id: int = Path(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Серверна фіналізація прошивки: перевірка, чи відмічені ВСІ кроки в БД.
    Нарахування разової нагороди за прошивку та встановлення статусу flashed = True.
    """
    query = (
        select(UserPhone)
        .where(UserPhone.id == user_phone_id, UserPhone.user_id == user.id)
        .options(selectinload(UserPhone.phone))
    )
    result = await db.execute(query)
    user_phone = result.scalars().first()

    if not user_phone:
        raise HTTPException(status_code=404, detail="Телефон не знайдено у вашій колекції.")

    phone = user_phone.phone
    instructions = phone.instructions or []
    all_step_ids = [step.get("id") for step in instructions if isinstance(step, dict) and "id" in step]

    # СУВОРА серверна перевірка: чи всі кроки відмічено
    user_progress = set(user_phone.flash_progress or [])
    missing_steps = [s_id for s_id in all_step_ids if s_id not in user_progress]

    if missing_steps:
        raise HTTPException(
            status_code=400,
            detail=f"Не всі кроки виконано! Залишилося відзначити кроків: {len(missing_steps)}."
        )

    now = datetime.utcnow()
    user_phone.flashed = True
    user_phone.flashed_at = now

    reward = 0
    message = f"Вітаємо! {phone.name} успішно прошито!"

    # Одноразова нагорода монетами
    if not user_phone.flash_rewarded:
        reward = settings.FLASH_REWARDS.get(phone.rarity, 50)
        user_phone.flash_rewarded = True
        user.balance += reward
        tx = Transaction(
            user_id=user.id,
            type="flash_reward",
            amount=reward,
            details=f"Нагорода за прошивку {phone.name} ({phone.rarity})",
        )
        db.add(tx)
        message += f" Отримано разову нагороду: +{reward} монет!"

    await db.commit()
    await db.refresh(user)
    await db.refresh(user_phone)

    return {
        "status": "ok",
        "flashed": True,
        "reward": reward,
        "balance": user.balance,
        "message": message,
    }


# --- ТОРГІВЛЯ ТА ПОКРАЩЕННЯ ---


@router.post("/phone/{user_phone_id}/sell")
async def sell_phone(
    user_phone_id: int = Path(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Продаж телефона з колекції за віртуальні монети."""
    query = (
        select(UserPhone)
        .where(UserPhone.id == user_phone_id, UserPhone.user_id == user.id)
        .options(selectinload(UserPhone.phone))
    )
    result = await db.execute(query)
    user_phone = result.scalars().first()

    if not user_phone:
        raise HTTPException(status_code=404, detail="Телефон не знайдено у вашій колекції.")

    phone = user_phone.phone
    sell_price = calculate_sell_price(phone.base_price, user_phone.level, user_phone.flashed)

    user.balance += sell_price
    tx = Transaction(
        user_id=user.id,
        type="sell",
        amount=sell_price,
        details=f"Продаж {phone.name} (рівень {user_phone.level}, {'прошито' if user_phone.flashed else 'сток'})",
    )
    db.add(tx)
    await db.delete(user_phone)
    await db.commit()
    await db.refresh(user)

    return {
        "status": "ok",
        "sold_price": sell_price,
        "balance": user.balance,
        "message": f"Успішно продано {phone.name} за {sell_price} монет!",
    }


@router.post("/phone/{user_phone_id}/upgrade")
async def upgrade_phone(
    user_phone_id: int = Path(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Платне підвищення рівня телефона для збільшення вартості продажу."""
    query = (
        select(UserPhone)
        .where(UserPhone.id == user_phone_id, UserPhone.user_id == user.id)
        .options(selectinload(UserPhone.phone))
    )
    result = await db.execute(query)
    user_phone = result.scalars().first()

    if not user_phone:
        raise HTTPException(status_code=404, detail="Телефон не знайдено у вашій колекції.")

    phone = user_phone.phone
    if user_phone.level >= phone.max_level:
        raise HTTPException(status_code=400, detail="Цей телефон вже має максимальний рівень!")

    upgrade_cost = calculate_upgrade_cost(phone.base_price, user_phone.level)
    if user.balance < upgrade_cost:
        raise HTTPException(
            status_code=400,
            detail=f"Недостатньо монет! Потрібно {upgrade_cost}, а у вас {user.balance}."
        )

    user.balance -= upgrade_cost
    user_phone.level += 1
    tx = Transaction(
        user_id=user.id,
        type="upgrade",
        amount=-upgrade_cost,
        details=f"Покращення {phone.name} до рівня {user_phone.level}",
    )
    db.add(tx)
    await db.commit()
    await db.refresh(user)
    await db.refresh(user_phone)

    return {
        "status": "ok",
        "new_level": user_phone.level,
        "balance": user.balance,
        "message": f"{phone.name} покращено до {user_phone.level} рівня!",
    }


@router.get("/shop")
async def get_shop_catalog(db: AsyncSession = Depends(get_db)):
    """Отримання каталогу доступних для покупки смартфонів у магазині."""
    query = select(Phone).where(Phone.active == True).order_by(Phone.base_price.asc())
    result = await db.execute(query)
    phones = result.scalars().all()

    shop_items = []
    for p in phones:
        price = settings.SHOP_PRICES.get(p.rarity, p.base_price * 2)
        shop_items.append({
            "id": p.id,
            "brand": p.brand,
            "name": p.name,
            "codename": p.codename,
            "rarity": p.rarity,
            "emoji": p.emoji,
            "price": price,
            "base_price": p.base_price,
            "max_level": p.max_level,
        })
    return {"shop": shop_items}


@router.post("/shop/buy/{phone_id}")
async def buy_phone_from_shop(
    phone_id: int = Path(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Купівля обраної моделі в магазині за віртуальні монети."""
    query = select(Phone).where(Phone.id == phone_id, Phone.active == True)
    result = await db.execute(query)
    phone = result.scalars().first()

    if not phone:
        raise HTTPException(status_code=404, detail="Модель не знайдена в магазині.")

    price = settings.SHOP_PRICES.get(phone.rarity, phone.base_price * 2)
    if user.balance < price:
        raise HTTPException(
            status_code=400,
            detail=f"Недостатньо монет! Потрібно {price}, а у вас {user.balance}."
        )

    user.balance -= price
    user_phone = UserPhone(
        user_id=user.id,
        phone_id=phone.id,
        level=1,
        flashed=False,
        flash_progress=[],
        flash_rewarded=False,
    )
    db.add(user_phone)

    tx = Transaction(
        user_id=user.id,
        type="buy",
        amount=-price,
        details=f"Купівля в магазині: {phone.name}",
    )
    db.add(tx)
    await db.commit()
    await db.refresh(user)

    return {
        "status": "ok",
        "phone_name": phone.name,
        "balance": user.balance,
        "message": f"Ви придбали {phone.name} за {price} монет!",
    }


# --- DEV ЕНДПОІНТИ ---


@router.post("/dev/reset-cooldown")
async def dev_reset_cooldown(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """[DEV] Скидання таймера отримання телефона."""
    if not settings.DEV_MODE:
        raise HTTPException(status_code=403, detail="DEV-режим вимкнено на сервері.")

    user.last_claim_at = None
    await db.commit()
    return {"status": "ok", "message": "Кулдаун успішно скинуто!"}


@router.post("/dev/add-coins")
async def dev_add_coins(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """[DEV] Додавання 1000 віртуальних монет до балансу."""
    if not settings.DEV_MODE:
        raise HTTPException(status_code=403, detail="DEV-режим вимкнено на сервері.")

    amount = 1000
    user.balance += amount
    tx = Transaction(
        user_id=user.id,
        type="dev_bonus",
        amount=amount,
        details="DEV бонус монет",
    )
    db.add(tx)
    await db.commit()
    await db.refresh(user)

    return {"status": "ok", "balance": user.balance, "message": "+1000 монет нараховано!"}


@router.post("/dev/clear-collection")
async def dev_clear_collection(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """[DEV] Очищення всієї колекції телефонів поточного користувача."""
    if not settings.DEV_MODE:
        raise HTTPException(status_code=403, detail="DEV-режим вимкнено на сервері.")

    await db.execute(delete(UserPhone).where(UserPhone.user_id == user.id))
    await db.commit()
    return {"status": "ok", "message": "Вашу колекцію успішно очищено!"}


@router.post("/dev/flash-all")
async def dev_flash_all(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """[DEV] Позначити всі мої телефони прошитими."""
    if not settings.DEV_MODE:
        raise HTTPException(status_code=403, detail="DEV-режим вимкнено на сервері.")

    query = (
        select(UserPhone)
        .where(UserPhone.user_id == user.id)
        .options(selectinload(UserPhone.phone))
    )
    result = await db.execute(query)
    phones = result.scalars().all()

    now = datetime.utcnow()
    count = 0
    total_reward = 0

    for up in phones:
        if not up.flashed:
            up.flashed = True
            up.flashed_at = now
            if isinstance(up.phone.instructions, list):
                up.flash_progress = [s.get("id") for s in up.phone.instructions if "id" in s]
            if not up.flash_rewarded:
                reward = settings.FLASH_REWARDS.get(up.phone.rarity, 50)
                up.flash_rewarded = True
                user.balance += reward
                total_reward += reward
                tx = Transaction(
                    user_id=user.id,
                    type="flash_reward",
                    amount=reward,
                    details=f"DEV прошивка: {up.phone.name}",
                )
                db.add(tx)
            count += 1

    await db.commit()
    await db.refresh(user)

    return {
        "status": "ok",
        "flashed_count": count,
        "total_reward": total_reward,
        "balance": user.balance,
        "message": f"Позначено прошитими: {count} телефонів. Нараховано нагороду: {total_reward} монет!",
    }
