from datetime import datetime
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(BigInteger, unique=True, index=True, nullable=False)
    username = Column(String(255), nullable=True)
    balance = Column(Integer, default=100, nullable=False)
    last_claim_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    banned = Column(Boolean, default=False, nullable=False)

    user_phones = relationship("UserPhone", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")


class Phone(Base):
    __tablename__ = "phones"

    id = Column(Integer, primary_key=True, index=True)
    brand = Column(String(100), nullable=False)
    name = Column(String(150), nullable=False)
    codename = Column(String(100), unique=True, index=True, nullable=False)
    rarity = Column(String(50), nullable=False)  # common, rare, epic, legendary
    base_price = Column(Integer, default=100, nullable=False)
    max_level = Column(Integer, default=5, nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    emoji = Column(String(20), default="📱", nullable=False)
    instructions = Column(JSON, default=list, nullable=False)
    sources = Column(JSON, default=list, nullable=False)
    firmware_note = Column(Text, nullable=True)

    instances = relationship("UserPhone", back_populates="phone")


class UserPhone(Base):
    __tablename__ = "user_phones"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    phone_id = Column(Integer, ForeignKey("phones.id", ondelete="CASCADE"), nullable=False, index=True)
    level = Column(Integer, default=1, nullable=False)
    flashed = Column(Boolean, default=False, nullable=False)
    flashed_at = Column(DateTime, nullable=True)
    flash_progress = Column(JSON, default=list, nullable=False)  # list of step IDs
    flash_rewarded = Column(Boolean, default=False, nullable=False)
    acquired_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="user_phones")
    phone = relationship("Phone", back_populates="instances")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(50), nullable=False)  # claim, sell, upgrade, buy, flash_reward, dev_bonus, admin
    amount = Column(Integer, nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="transactions")
