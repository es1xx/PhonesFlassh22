import asyncio
import json
import os
import sys
from pathlib import Path

# Додаємо корінь проєкту до sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from app.database import AsyncSessionLocal, init_db
from app.models import Phone


async def seed_phones():
    """Зчитує JSON файли з data/phones/ та синхронізує каталог у базі даних."""
    await init_db()
    phones_dir = Path(__file__).resolve().parent / "phones"
    if not phones_dir.exists():
        print(f"⚠️ Папка з телефонами не знайдена: {phones_dir}")
        return

    json_files = sorted(list(phones_dir.glob("*.json")))
    print(f"📦 Знайдено {len(json_files)} файлів моделей для імпорту...")

    async with AsyncSessionLocal() as session:
        for json_path in json_files:
            try:
                with open(json_path, "r", encoding="utf-8") as f:
                    data = json.load(f)

                codename = data.get("codename")
                if not codename:
                    print(f"⚠️ Пропущено {json_path.name}: відсутній codename")
                    continue

                query = select(Phone).where(Phone.codename == codename)
                result = await session.execute(query)
                phone = result.scalars().first()

                if not phone:
                    phone = Phone(
                        brand=data.get("brand", "Unknown"),
                        name=data.get("name", codename),
                        codename=codename,
                        rarity=data.get("rarity", "common"),
                        base_price=data.get("base_price", 100),
                        max_level=data.get("max_level", 5),
                        active=data.get("active", True),
                        emoji=data.get("emoji", "📱"),
                        instructions=data.get("instructions", []),
                        sources=data.get("sources", []),
                        firmware_note=data.get("firmware_note"),
                    )
                    session.add(phone)
                    print(f"  ➕ Додано: {phone.name} ({phone.codename}) [{phone.rarity}]")
                else:
                    phone.brand = data.get("brand", phone.brand)
                    phone.name = data.get("name", phone.name)
                    phone.rarity = data.get("rarity", phone.rarity)
                    phone.base_price = data.get("base_price", phone.base_price)
                    phone.max_level = data.get("max_level", phone.max_level)
                    phone.active = data.get("active", phone.active)
                    phone.emoji = data.get("emoji", phone.emoji)
                    phone.instructions = data.get("instructions", phone.instructions)
                    phone.sources = data.get("sources", phone.sources)
                    phone.firmware_note = data.get("firmware_note", phone.firmware_note)
                    print(f"  🔄 Оновлено: {phone.name} ({phone.codename})")

            except Exception as e:
                print(f"❌ Помилка завантаження {json_path.name}: {e}")

        await session.commit()
        print("✅ Каталог телефонів успішно синхронізовано з базою даних!")


if __name__ == "__main__":
    asyncio.run(seed_phones())
