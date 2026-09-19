# End-to-end tests

Playwright tests that run against the **real `docker-compose.dev.yml`
stack** — a real browser, hitting the real Vite dev server, proxying to the
real FastAPI backend, backed by a real Postgres container. This is
deliberately different from:

- `frontend/src/**/*.test.jsx` (Vitest) — component/hook tests against a
  mocked API, no browser or network involved.
- `backend/tests/` (pytest) — router tests against a disposable in-memory
  SQLite database via FastAPI's `TestClient`, no real HTTP or Postgres.

Neither of those catches problems in how the pieces are actually wired
together — a broken Vite proxy target, a container that can't reach
Postgres, an env var that isn't passed through, a CORS header that's fine
in-process but wrong over real HTTP. That's what this suite is for.

## Scenarios covered

- **Stack wiring** (`smoke.spec.js`): backend reachable directly; the
  frontend dev server's `/api/*` proxy actually reaches the backend
  container; the app renders data that really came from Postgres.
- **Identity switching** (`identity.spec.js`): changing "Viewing as" issues
  real requests and re-renders that person's real balances.
- **Adding an expense** (`add-expense.spec.js`): a real `POST /api/expenses`
  is persisted to Postgres, reflected immediately, and still there after a
  full page reload; unbalanced shares are caught client-side before any
  request is made.
- **Settling a balance** (`settle-balance.spec.js`): "Mark paid" zeroes the
  pairwise balance for real, survives a reload, and doesn't leak into other
  pairs for the same viewer.
- **API contract, against the live container** (`api-validation.spec.js`):
  unknown member → 404, settling nothing outstanding → 400, invalid split →
  422 and nothing persisted. These mirror `backend/tests/` but prove the
  *deployed* service enforces the same rules, not just the source under a
  test client.

## Design notes

- **Serial, not parallel** (`workers: 1` in `playwright.config.js`). All
  tests share one real backend and one real database — there's no
  per-test isolation like the unit/backend suites get, so parallel runs
  would race each other's mutations.
- **State-tolerant.** `docker-compose.dev.yml`'s Postgres volume persists
  across runs, so tests don't assume a freshly-seeded database. Numeric
  assertions use before/after deltas read from the real API
  (`balanceOf` in `helpers.js`) instead of hardcoded totals, and setup data
  uses unique titles/specific decimal amounts to avoid colliding with
  whatever's already there. `make e2e` (below) resets the volume anyway,
  for a fully clean, reproducible run.

## Running

```bash
make e2e-install   # one-time: npm install + download the Playwright browser
make e2e           # reset the dev stack, run the suite, tear it down
```

Iterating on a test against a stack you already have running
(`make docker-up-dev`) is faster:

```bash
make e2e-run       # just runs the tests against whatever's up right now
```

Override the target URLs (e.g. against a non-default port or a deployed
environment) with `FRONTEND_URL` / `BACKEND_URL` env vars — see
`tests/helpers.js`.
