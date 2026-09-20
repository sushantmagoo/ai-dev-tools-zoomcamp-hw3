# Integration tests

pytest tests that run the FastAPI app in-process (like `backend/tests/`)
but against a **real, disposable Postgres database** instead of an
in-memory SQLite one. That's the one thing missing from the existing three
test layers — see [`_docs/testing.md`](../../_docs/testing.md) for how this
fits alongside the frontend/backend unit suites and the Playwright e2e
suite.

## Why this is a distinct layer, not overlap

- **vs. `backend/tests/` (unit):** same style (FastAPI `TestClient`, fresh
  isolated state per test), but SQLite doesn't enforce foreign keys by
  default and has different numeric storage than Postgres. Anything that
  depends on the real database engine's behavior is invisible to that
  suite by construction.
- **vs. `e2e/` (end-to-end):** no browser, no Vite, no container
  networking — just the app and a real database, over a direct Python
  call rather than HTTP. Faster, and can afford full per-test isolation
  (truncate + reseed) instead of e2e's state-tolerant design, since there's
  no shared persistent dev data to work around.

## A real bug this already found

`test_foreign_key_integrity.py` is `xfail` (not skipped) because writing
it surfaced an actual bug: `POST /api/expenses` with a nonexistent
`payerId` or split `personId` returns a raw, unhandled `500` on Postgres
(an uncaught FK `IntegrityError`) instead of the clean `400` every other
validation failure gets. `backend/tests/`'s SQLite-backed suite can't see
this — SQLite doesn't enforce foreign keys by default, so the same
operation just silently "succeeds" there. See the file for details; remove
the `xfail` once `crud.create_expense` validates member ids up front.

## Running

Needs a reachable Postgres (`make db-up` starts the same one
`docker-compose.dev.yml` provides for dev). Then:

```bash
make test-integration
```

A dedicated `ledger_integration_test` database is dropped and recreated
once per test session (never touches your dev data in the `ledger`
database), and each test gets it truncated and reseeded fresh — see
`conftest.py`.

Override the target Postgres with `INTEGRATION_DATABASE_URL` (e.g. for
CI, or a non-default port).
