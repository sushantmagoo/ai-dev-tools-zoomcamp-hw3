"""Database access. Every function takes a SQLAlchemy Session and speaks
only generic SQLAlchemy — nothing here is SQLite- or Postgres-specific."""
from __future__ import annotations

from datetime import date as date_type
from typing import Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from . import db_models as m
from .ids import new_id
from .ledger import net_ledger, pair_key, round2


def _member_dict(row: m.Member) -> dict:
    return {"id": row.id, "name": row.name, "short": row.short, "initials": row.initials}


def _expense_dict(row: m.Expense) -> dict:
    return {
        "id": row.id,
        "title": row.title,
        "payerId": row.payer_id,
        "amount": row.amount,
        "date": row.date.isoformat(),
        "splits": [{"personId": s.person_id, "amount": s.amount} for s in row.splits],
    }


def _settlement_dict(row: m.Settlement) -> dict:
    return {
        "id": row.id,
        "fromId": row.from_id,
        "toId": row.to_id,
        "amount": row.amount,
        "date": row.date.isoformat(),
    }


# -- members --------------------------------------------------------------


def list_members(db: Session) -> List[dict]:
    rows = db.execute(select(m.Member).order_by(m.Member.id)).scalars().all()
    return [_member_dict(r) for r in rows]


def get_member(db: Session, member_id: str) -> Optional[dict]:
    row = db.get(m.Member, member_id)
    return _member_dict(row) if row else None


# -- expenses ---------------------------------------------------------------


def _all_expenses(db: Session) -> List[dict]:
    rows = db.execute(select(m.Expense).options(joinedload(m.Expense.splits))).unique().scalars().all()
    return [_expense_dict(r) for r in rows]


def _all_settlements(db: Session) -> List[dict]:
    rows = db.execute(select(m.Settlement)).scalars().all()
    return [_settlement_dict(r) for r in rows]


def list_expenses(db: Session) -> List[dict]:
    return sorted(_all_expenses(db), key=lambda e: e["date"], reverse=True)


def create_expense(
    db: Session,
    title: str,
    payer_id: str,
    splits: List[dict],
    date: Optional[date_type] = None,
) -> dict:
    clean = [s for s in splits if s["amount"] > 0]
    if not title or not title.strip() or not clean:
        raise ValueError("An expense needs a description and at least one share.")

    amount = round2(sum(s["amount"] for s in clean))
    expense = m.Expense(
        id=new_id("e"),
        title=title.strip(),
        payer_id=payer_id,
        amount=amount,
        date=date or date_type.today(),
    )
    expense.splits = [m.Split(person_id=s["personId"], amount=s["amount"]) for s in clean]

    db.add(expense)
    db.commit()
    db.refresh(expense)
    return _expense_dict(expense)


# -- balances / settlements ------------------------------------------------


def get_balances(db: Session, person_id: str) -> List[dict]:
    members = list_members(db)
    net: Dict[str, float] = net_ledger(_all_expenses(db), _all_settlements(db))

    rows = []
    for mem in members:
        if mem["id"] == person_id:
            continue
        raw = net.get(pair_key(person_id, mem["id"]), 0.0)
        amount = raw if person_id < mem["id"] else -raw
        rows.append({"person": mem, "amount": round2(amount)})
    return rows


def settle_pair(db: Session, from_id: str, to_id: str) -> dict:
    net = net_ledger(_all_expenses(db), _all_settlements(db))
    raw = net.get(pair_key(from_id, to_id), 0.0)
    owed = round2(-raw if from_id < to_id else raw)  # what from_id owes to_id
    if owed <= 0:
        raise ValueError("Nothing outstanding between these two.")

    settlement = m.Settlement(
        id=new_id("s"),
        from_id=from_id,
        to_id=to_id,
        amount=owed,
        date=date_type.today(),
    )
    db.add(settlement)
    db.commit()
    db.refresh(settlement)
    return _settlement_dict(settlement)
