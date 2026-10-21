import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    BOT_TOKEN: str = ""
    ADMIN_IDS: str = ""
    WEBAPP_URL: str = ""
    PORT: int = 8765
    DEV_MODE: bool = True
    APP_MODE: str = "DEBUG"  # REAL, SIMULATION, DEBUG

    # Ігрова економіка (значення за замовчуванням)
    INITIAL_BALANCE: int = 100
    FLASH_SELL_MULTIPLIER: float = 1.5

    # Ваги випадіння карток (common 60, rare 25, epic 12, legendary 3)
    RARITY_WEIGHTS: dict = {
        "common": 60,
        "rare": 25,
        "epic": 12,
        "legendary": 3,
    }

    # Нагороди за успішну прошивку залежно від рідкості
    FLASH_REWARDS: dict = {
        "common": 50,
        "rare": 100,
        "epic": 200,
        "legendary": 500,
    }

    # Магазинні ціни нових карток залежно від рідкості
    SHOP_PRICES: dict = {
        "common": 150,
        "rare": 350,
        "epic": 750,
        "legendary": 2000,
    }

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

    @property
    def admin_id_list(self) -> List[int]:
        """Повертає список ID адміністраторів з рядка ADMIN_IDS."""
        if not self.ADMIN_IDS:
            return []
        ids = []
        for raw in self.ADMIN_IDS.split(","):
            raw = raw.strip()
            if raw.isdigit():
                ids.append(int(raw))
        return ids

    @property
    def cooldown_seconds(self) -> int:
        """Повертає тривалість кулдауну отримання телефона (3 години для релізу в TG)."""
        return 10800  # 3 години (10800 секунд)



settings = Settings()
