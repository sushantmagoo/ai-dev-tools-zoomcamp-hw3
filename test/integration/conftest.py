"""Wires these tests to a real, disposable Postgres database — as opposed
to backend/tests/, which uses an in-memory SQLite database via FastAPI's
TestClient. See test/integration/README.md for why that distinction
matters and what it catches that the SQLite-backed suite structurally
can't.

Needs a reachable Postgres server (`make db-up`, or any `INTEGRATION_DATABASE_URL`
you point at one). A fresh `ledger_integration_test` database is dropped and
recreated once per test session; each test then gets a truncated-and-reseeded
copy of it — real Postgres, but the same fast, isolated-per-test shape as
the SQLite suite.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import pytest
from sqlalchemy import create_engine, text

BACKEND_DIR = Path(__file__).resolve().parents[2] / "backend"
sys.path.insert(0, str(BACKEND_DIR))

BASE_URL = os.environ.get("INTEGRATION_DATABASE_URL", "postgresql://ledger:ledger@localhost:5432/ledger")
TEST_DB_NAME = "ledger_integration_test"


def _with_database(url: str, db_name: str) -> str:
    parts = urlsplit(url)
    return urlunsplit(parts._replace(path=f"/{db_name}"))


TEST_DATABASE_URL = _with_database(BASE_URL, TEST_DB_NAME)

# app/database.py reads DATABASE_URL at import time, so this must happen
# before the first `import app...` below.
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

from app import db_models as m  # noqa: E402
from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.seed import seed_if_empty  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _fresh_test_database():
    admin_engine = create_engine(BASE_URL, isolation_level="AUTOCOMMIT")
    try:
        with admin_engine.connect() as conn:
            conn.execute(text(f'DROP DATABASE IF EXISTS "{TEST_DB_NAME}" WITH (FORCE)'))
            conn.execute(text(f'CREATE DATABASE "{TEST_DB_NAME}"'))
    except Exception as exc:  # pragma: no cover - fails fast with a clear hint
        pytest.exit(
            f"Could not reach/reset Postgres at {BASE_URL!r} ({exc}).\n"
            "Start it first: 'make db-up'.",
            returncode=1,
        )
    finally:
        admin_engine.dispose()

    Base.metadata.create_all(engine)
    yield
    engine.dispose()


@pytest.fixture()
def client():
    # Truncate instead of recreating the database per test — much faster,
    # and just as isolated since every table starts empty either way.
    with engine.begin() as conn:
        conn.execute(
            text("TRUNCATE members, expenses, splits, settlements RESTART IDENTITY CASCADE")
        )

    with TestClient(app) as c:  # triggers the app's lifespan -> seed_if_empty
        yield c
