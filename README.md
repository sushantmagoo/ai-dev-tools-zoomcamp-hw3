# Expense Splitter

A household expense ledger for roommates: log one-off shared expenses with
fixed-amount splits, and settle up pairwise balances between any two people.
No accounts/passwords — you just pick which household member you're viewing
as.

- **Frontend:** React + Vite SPA
- **Backend:** FastAPI + SQLAlchemy, SQLite by default (Postgres-ready)
- **Contract:** [`openapi.yaml`](openapi.yaml) at the repo root describes every endpoint

## Project layout

```
frontend/          React + Vite SPA
backend/           FastAPI service (SQLAlchemy ORM, SQLite/Postgres)
test/integration/  Backend + real-Postgres integration tests (pytest)
e2e/               Playwright end-to-end tests, run against docker-compose.dev.yml
openapi.yaml       API contract the frontend and backend both implement
docker-compose.yml       Prod: Postgres + backend (serves the built frontend)
docker-compose.dev.yml   Dev: Postgres + hot-reload backend + Vite frontend
Makefile           Shortcuts for everything below
_docs/spec.md      Original product scope
_docs/testing.md   How the four test layers fit together
```

## Quick start

Needs Python 3.11+, Node 18+, and `make`.

```bash
make install   # backend venv + pip install, frontend npm install
make dev       # runs backend (:8000) and frontend (:5173) together
```

Open **http://localhost:5173**. `Ctrl+C` stops both servers. Run `make help`
to see every available command, or `make test` to run both unit test
suites — see [`_docs/testing.md`](_docs/testing.md) for the integration
and end-to-end suites too.

## Frontend

React 18 + Vite. Key files:

| Path | What it is |
| --- | --- |
| `src/App.jsx` | Dashboard shell: header, summary, balances + expenses columns |
| `src/hooks/useLedger.js` | All data fetching/mutation — the only place components talk to the API |
| `src/api/httpApi.js` | Real API client (`fetch`), calls the backend at `/api/...` |
| `src/api/mockApi.js` | Legacy in-memory mock from before the backend existed; unused now, kept for reference |
| `src/components/` | `IdentityNav`, `BalanceList`, `ExpenseTable`, `AddExpenseDialog` |

In dev, `vite.config.js` proxies `/api/*` to `http://127.0.0.1:8000`, so the
frontend never needs to know the backend's real URL.

Run just the frontend: `make frontend` (or `cd frontend && npm run dev`).

Tests (Vitest + React Testing Library, `src/**/*.test.{js,jsx}`):
`make test-frontend` (or `cd frontend && npm test`; `npm run test:watch` to
watch).

## Backend

FastAPI, with SQLAlchemy as a database-agnostic ORM layer.

| Path | What it is |
| --- | --- |
| `app/main.py` | App setup; on startup, creates tables and seeds demo data if empty |
| `app/routers/` | `members`, `expenses`, `settlements` — one router per resource |
| `app/crud.py` | All database reads/writes (plain SQLAlchemy, no vendor-specific SQL) |
| `app/db_models.py` | SQLAlchemy ORM tables |
| `app/ledger.py` | Pure pairwise-balance math (independent of storage) |
| `app/database.py` | Engine/session setup; reads `DATABASE_URL` |
| `app/seed.py` | Demo data for a fresh, empty database |

Run just the backend: `make backend` (or `cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000`).
Interactive API docs are at `http://localhost:8000/docs` once it's running.

Tests (pytest, `tests/`): `make test-backend` (or `cd backend && .venv/bin/pytest -q`).

### Choosing a database

Set via the `DATABASE_URL` environment variable — see `backend/.env.example`.
Defaults to a local SQLite file (`backend/ledger.db`) if unset.

```bash
# SQLite (default, no setup)
# DATABASE_URL=sqlite:///./ledger.db

# Postgres (start it first: make db-up)
DATABASE_URL=postgresql://ledger:ledger@localhost:5432/ledger
```

## Running everything in Docker

Two separate Compose files, since dev and prod run different topologies (a
hot-reload backend + a separate Vite dev server, vs. one image that serves
both) — see [`STEPS.md`](STEPS.md) for why.

**Prod** (`docker-compose.yml`, `backend/Dockerfile`): the backend image
builds the frontend and serves the static build itself, so there's a single
app container.

```bash
make docker-up     # build + start postgres + backend
make docker-down   # stop it
make docker-logs   # tail logs
```

- App (frontend + API): **http://localhost:8000** (`/docs`, `/healthz`)

**Dev** (`docker-compose.dev.yml`, `*/Dockerfile.dev`): backend runs with
`--reload` and the frontend runs the Vite dev server, both bind-mounting
your source so containers pick up edits without a rebuild.

```bash
make docker-up-dev     # build + start postgres + backend + frontend
make docker-down-dev   # stop it
make docker-logs-dev   # tail logs
```

- Frontend: **http://localhost:5173**
- Backend: **http://localhost:8000** (`/docs`, `/healthz`)

To run just a Postgres container for local (non-Docker) dev, use
`make db-up` / `make db-down` instead — this now points at
`docker-compose.dev.yml`.

## Integration tests

`test/integration/` runs the backend's pytest suite against a real,
disposable Postgres database instead of the in-memory SQLite used by
`backend/tests/` — see [`test/integration/README.md`](test/integration/README.md)
for what that catches (it already found a real bug — see there).

```bash
make db-up             # start Postgres, if it isn't already
make test-integration
```

## End-to-end tests

`e2e/` holds a Playwright suite that runs against a real, running
`docker-compose.dev.yml` stack (real browser, real Vite proxy, real
FastAPI, real Postgres) — see [`e2e/README.md`](e2e/README.md) for what it
covers and why it's separate from the suites above, or
[`_docs/testing.md`](_docs/testing.md) for how all four test layers fit
together.

```bash
make e2e-install   # one-time: npm install + download the Playwright browser
make e2e           # reset the dev stack, run the suite, tear it down
```

## Scope

See [`_docs/spec.md`](_docs/spec.md) for the original product scope. Notably:
fixed-amount splits only (no percentages/shares), no recurring expenses, no
group-wide debt simplification (balances are tracked strictly pairwise), and
no passwords.
