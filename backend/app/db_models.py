"""SQLAlchemy ORM tables. Deliberately uses only generic column types
(String, Float, Date, Integer) so the same models work unchanged against
SQLite or Postgres."""
from __future__ import annotations

from datetime import date as date_type

from sqlalchemy import Date, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Member(Base):
    __tablename__ = "members"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    short: Mapped[str] = mapped_column(String(100))
    initials: Mapped[str] = mapped_column(String(8))


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    title: Mapped[str] = mapped_column(String(300))
    payer_id: Mapped[str] = mapped_column(ForeignKey("members.id"))
    amount: Mapped[float] = mapped_column(Float)
    date: Mapped[date_type] = mapped_column(Date)

    splits: Mapped[list["Split"]] = relationship(
        back_populates="expense", cascade="all, delete-orphan", order_by="Split.id"
    )


class Split(Base):
    __tablename__ = "splits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    expense_id: Mapped[str] = mapped_column(ForeignKey("expenses.id"))
    person_id: Mapped[str] = mapped_column(ForeignKey("members.id"))
    amount: Mapped[float] = mapped_column(Float)

    expense: Mapped["Expense"] = relationship(back_populates="splits")


class Settlement(Base):
    __tablename__ = "settlements"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    from_id: Mapped[str] = mapped_column(ForeignKey("members.id"))
    to_id: Mapped[str] = mapped_column(ForeignKey("members.id"))
    amount: Mapped[float] = mapped_column(Float)
    date: Mapped[date_type] = mapped_column(Date)
