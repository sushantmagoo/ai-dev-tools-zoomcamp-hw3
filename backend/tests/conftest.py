import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.main as main_module
from app.database import get_db
from app.main import app


@pytest.fixture()
def client(monkeypatch):
    # A fresh, isolated in-memory SQLite database per test — StaticPool
    # keeps the single connection alive for the whole test instead of
    # dropping the data when a pooled connection would be recycled.
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    # The app's startup hook (create tables + seed) reads these module
    # attributes, so patch them too — otherwise it would create/seed the
    # real DATABASE_URL-backed database as a side effect of running tests.
    monkeypatch.setattr(main_module, "engine", engine)
    monkeypatch.setattr(main_module, "SessionLocal", TestingSessionLocal)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as c:
            yield c
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
