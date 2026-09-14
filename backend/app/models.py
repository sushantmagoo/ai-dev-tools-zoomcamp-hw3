"""Pydantic request/response schemas — mirrors the shapes in openapi.yaml."""
from __future__ import annotations

from datetime import date as date_type
from typing import List, Optional

from pydantic import BaseModel, Field


class Member(BaseModel):
    id: str
    name: str
    short: str
    initials: str


class Split(BaseModel):
    personId: str
    amount: float = Field(ge=0)


class Expense(BaseModel):
    id: str
    title: str
    payerId: str
    amount: float
    date: date_type
    splits: List[Split]


class CreateExpenseRequest(BaseModel):
    title: str = Field(min_length=1)
    payerId: str
    date: Optional[date_type] = None
    splits: List[Split] = Field(min_length=1)


class BalanceRow(BaseModel):
    person: Member
    amount: float


class Settlement(BaseModel):
    id: str
    fromId: str
    toId: str
    amount: float
    date: date_type


class CreateSettlementRequest(BaseModel):
    fromId: str
    toId: str


class Error(BaseModel):
    message: str
