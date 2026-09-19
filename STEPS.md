# Steps log

A running log of notable changes made on request, so they're easy to review.
Newest entries at the top.

## Split Docker setup into dev vs. prod, backend serves the frontend build in prod

**Request:** two Dockerfiles (`Dockerfile.dev` for local, `Dockerfile` for
prod), and in prod, have the backend serve the built frontend instead of a
separate nginx container.

**Question answered — does this need two docker-compose files?** Yes. Dev
and prod aren't just different builds of the same services, they have a
different number of containers: dev runs backend + a standalone Vite dev
server as two containers (for hot reload on both sides); prod runs a single
backend container that bakes in and serves the frontend build, so there's no
frontend container at all. Compose doesn't have a clean way to make a whole
service disappear via an override file, so two full Compose files
(`docker-compose.yml` for prod, `docker-compose.dev.yml` for dev) is the
cleaner option, versus e.g. one file with `profiles:` toggling services.
Went with two files.

**Changes:**

- `backend/Dockerfile.dev` (new) — plain FastAPI dev image, runs
  `uvicorn --reload`. `docker-compose.dev.yml` bind-mounts `backend/app` over
  it so edits apply without a rebuild.
- `backend/Dockerfile` (rewritten) — multi-stage prod image: stage 1 builds
  the frontend (`node:20-alpine`, `npm ci && npm run build`), stage 2 is the
  Python image with the built frontend copied in at `./static`. Build
  context is now the **repo root** (not `backend/`) so this stage can reach
  `frontend/`; `docker-compose.yml` reflects that via `build.context: .` +
  `build.dockerfile: backend/Dockerfile`.
- `backend/Dockerfile.dockerignore` (new) — Docker's per-Dockerfile ignore
  file (`<dockerfile-name>.dockerignore`, a BuildKit feature), scoped to the
  root-context prod build only, so it doesn't send `.git`,
  `frontend/node_modules`, `backend/.venv`, etc. as build context. Requires
  BuildKit, which is the default in current Docker.
- `backend/app/main.py` — after routing setup, mounts
  `StaticFiles(directory="static", html=True)` at `/` **only if** that
  directory exists. It exists in the prod image (baked in by the Dockerfile
  above) and doesn't in dev, so this is a no-op there — dev keeps using the
  separate Vite server.
- `frontend/Dockerfile.dev` (new) — Vite dev server (`npm run dev --host`),
  meant to run with the source bind-mounted for hot reload.
- `frontend/Dockerfile` and `frontend/nginx.conf` (deleted) — no longer
  needed now that prod serves the frontend from the backend container
  instead of a separate nginx one.
- `frontend/vite.config.js` — the dev proxy target is now
  `process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'` instead of a
  hardcoded `127.0.0.1`. Bare-metal dev (`npm run dev` on the host) still
  defaults to localhost; `docker-compose.dev.yml` sets
  `VITE_BACKEND_URL=http://backend:8000` since the frontend and backend are
  separate containers there and `127.0.0.1` inside the frontend container
  wouldn't reach the backend one.
- `docker-compose.yml` (prod, rewritten) — now just `postgres` + `backend`.
  Backend is built from `backend/Dockerfile` with the repo root as context,
  serves everything on `:8000`.
- `docker-compose.dev.yml` (new) — `postgres` + `backend` (`Dockerfile.dev`,
  bind-mounted, reload, `:8000`) + `frontend` (`Dockerfile.dev`,
  bind-mounted, `:5173`). Uses its own Postgres volume
  (`postgres_data_dev`) so dev and prod data never mix.
- `Makefile` — `docker-build/up/down/logs` now point at the prod compose
  file (unchanged names, but now prod-only); added `docker-build-dev`,
  `docker-up-dev`, `docker-down-dev`, `docker-logs-dev` for the dev file.
  `db-up`/`db-down`/`db-logs` (spin up just Postgres for bare-metal local
  dev) now point at `docker-compose.dev.yml` instead of the default file.
- `README.md` — updated the project layout and "Running everything in
  Docker" section to describe both compose files and their commands/ports.

**Verified:** built both `backend/Dockerfile` (prod, multi-stage) and
`backend/Dockerfile.dev` / `frontend/Dockerfile.dev` (dev) images
successfully. Ran the prod image standalone and confirmed `/healthz`,
`/api/members`, and `/` (the built SPA) all serve correctly from the one
container. Brought up the full dev stack
(`docker compose -f docker-compose.dev.yml up -d --build`) and confirmed the
Vite dev server on `:5173` proxies `/api/*` through to the backend
container. Brought up the full prod stack (`docker compose up -d --build`)
against real Postgres and confirmed the same `/healthz` / `/` / `/api/*`
checks. Tore both down afterward (`docker compose down -v`).

**Not changed / left as-is:** `backend/requirements.txt` + `pip` are still
used inside both backend Dockerfiles, even though `AGENTS.md` says to use
`uv` for backend dependency management — the backend doesn't currently have
a `uv.lock` or dependencies declared in `pyproject.toml` (it only has pytest
config there), so migrating to `uv` is a separate, unrelated change. Flag if
you'd like that done too.
