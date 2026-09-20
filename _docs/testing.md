# Expense Splitter — Testing

Four independent layers, each catching a different class of bug. None of
them substitute for another — see "Why four layers" below.

| Layer | Tool | Runs against | Speed |
| --- | --- | --- | --- |
| Frontend unit | Vitest + React Testing Library | Mocked API, jsdom | ~2s |
| Backend unit | pytest + FastAPI `TestClient` | In-memory SQLite, fresh per test | <1s |
| Integration | pytest + FastAPI `TestClient` | Real Postgres, truncated + reseeded per test | ~1s |
| End-to-end | Playwright | Real browser + real `docker-compose.dev.yml` stack (Vite, FastAPI, Postgres) | ~4s |

```bash
make test             # frontend + backend unit suites
make test-integration # backend + a real (disposable) Postgres, no browser
make e2e-install      # one-time: Playwright + its browser
make e2e              # reset the dev stack, run e2e, tear it down
```

## Frontend unit tests

`frontend/src/**/*.test.{js,jsx}`, run with `make test-frontend` (or
`cd frontend && npm test`).

Every component, the `useLedger` hook, the API client, and the money/date
formatters have a dedicated test file. The API is mocked (`vi.fn()` /
mocked `fetch`) — nothing here talks to a real backend, so these tests are
fast and cover UI logic in isolation: validation messages, split-evenly
math, busy-state disabling, error display without closing dialogs, and so
on.

## Backend tests

`backend/tests/*.py`, run with `make test-backend` (or
`cd backend && uv run pytest -q` / `pytest -q` in an activated venv).

Each test gets a fresh in-memory SQLite database (`tests/conftest.py`) and
drives the app through FastAPI's `TestClient` — real routers, real
`crud.py`, real `ledger.py` pairwise-balance math, but no real HTTP and no
real Postgres. Covers: seeded-data listing, balance antisymmetry, expense
creation (total computation, date defaulting, validation), and settlements
(clearing a balance, rejecting an already-settled or wrong-direction
settlement).

## Integration tests

`test/integration/`, run with `make test-integration` (needs a reachable
Postgres — the target depends on `db-up`). See
[`../test/integration/README.md`](../test/integration/README.md) for the
full rationale.

Same shape as the backend unit tests (FastAPI `TestClient`, fresh state per
test) but against a real, disposable Postgres database
(`ledger_integration_test`, dropped and recreated once per session, then
truncated and reseeded before each test) instead of in-memory SQLite. This
is the layer that catches database-*engine*-specific behavior — SQLite's
default lack of foreign-key enforcement, numeric storage differences — that
neither the SQLite-backed unit tests nor the browser-driven e2e tests
(which don't specifically target the DB layer) are positioned to catch.

Writing this suite immediately found a real bug: `POST /api/expenses` with
a nonexistent member id returns a raw, unhandled `500` on Postgres (an
uncaught FK `IntegrityError`), not the clean `400` every other validation
failure gets — invisible on SQLite, which doesn't enforce the constraint by
default. Tracked as a `strict` `xfail` in
`test_foreign_key_integrity.py` until `crud.py` validates ids up front.

## End-to-end tests

`e2e/`, run with `make e2e` (full lifecycle) or `make e2e-run` (against a
dev stack you already started with `make docker-up-dev`). See
[`../e2e/README.md`](../e2e/README.md) for the full scenario list and
design notes.

These are the only tests that exercise the real, containerized stack —
real Vite dev server proxying to a real FastAPI container backed by a real
Postgres container. They catch what none of the other three layers can:
a broken proxy target, a container that can't reach Postgres, an
env var that isn't wired through, a CORS header that behaves differently
over real HTTP than in-process. Covered: stack wiring/health, identity
switching, adding an expense (persists across a reload), settling a
balance (persists, doesn't leak into other pairs), and a few API-contract
checks (404/400/422) against the live container.

Because these share one real backend and database instead of getting
fresh, isolated state per test, they run serially and assert on
before/after deltas read from the real API rather than hardcoded seed
counts — see "Design notes" in `e2e/README.md` for why.

## Why four layers

The frontend and backend unit suites are fast and precise but each only
proves its own half works *in isolation* — a mocked API can drift from
what the real backend actually returns, and an in-memory SQLite
`TestClient` never touches a container, a network, or Postgres. The
integration suite closes the database-fidelity gap cheaply, without paying
for a browser or full container stack. The e2e suite is slower and
coarser, but it's the only layer that would catch, say, the Vite
dev-server proxy pointing at the wrong host, or a Docker network
misconfiguration between containers — none of the other three run the
actual containers, so none of them can see that.

Prefer the frontend/backend unit suites when the logic under test doesn't
depend on the pieces being wired together; reach for integration when it
specifically depends on real database behavior; reach for e2e when it
depends on the containers/network actually being wired together correctly,
or is a user-facing flow worth proving end to end.

## Not covered (future work)

- Visual regression / cross-browser testing (e2e currently runs Chromium
  only).
- Accessibility auditing (no automated a11y checks yet).
- Load/performance testing.
- Concurrent-write races (e.g. two simultaneous settlements for the same
  pair) — `settle_pair` reads the current balance then writes with no
  locking, so a race is plausible in principle; a manual concurrent-request
  check while building the integration suite didn't reproduce one, but that
  wasn't rigorous enough to call it covered.
- Schema migrations — there are none yet (`Base.metadata.create_all` on
  startup), so nothing tests upgrading a populated database.
