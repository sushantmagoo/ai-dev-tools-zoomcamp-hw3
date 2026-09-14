"""Database wiring. Backend-agnostic: which database we talk to is decided
entirely by the DATABASE_URL environment variable (SQLAlchemy's connection
string), so switching from SQLite to Postgres (or anything else SQLAlchemy
supports) never touches application code — see crud.py / db_models.py,
which use only vendor-neutral SQLAlchemy constructs.
"""
from __future__ import annotations

import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./ledger.db")

# SQLite needs this because its default driver forbids sharing a connection
# across threads; every other backend (Postgres included) ignores it if
# passed, so it's simplest to just gate on the URL scheme.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
