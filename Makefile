.PHONY: help install install-backend install-frontend dev backend frontend \
	test test-backend test-frontend clean \
	db-up db-down db-logs docker-build docker-up docker-down docker-logs \
	docker-build-dev docker-up-dev docker-down-dev docker-logs-dev \
	e2e-install e2e e2e-run

BACKEND_VENV := backend/.venv
BACKEND_PY := $(BACKEND_VENV)/bin/python

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

install: install-backend install-frontend ## Install backend + frontend dependencies

install-backend: ## Create backend venv and install Python dependencies
	python3 -m venv $(BACKEND_VENV)
	$(BACKEND_PY) -m pip install --quiet --upgrade pip
	$(BACKEND_PY) -m pip install --quiet -r backend/requirements.txt

install-frontend: ## Install frontend npm dependencies
	cd frontend && npm install

dev: ## Run backend + frontend together (Ctrl+C stops both)
	@trap 'kill 0' EXIT INT TERM; \
	$(MAKE) backend & \
	$(MAKE) frontend & \
	wait

backend: ## Run the FastAPI backend on :8000 with auto-reload
	cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000

frontend: ## Run the Vite frontend dev server on :5173
	cd frontend && npm run dev

test: test-backend test-frontend ## Run backend + frontend test suites

test-backend: ## Run the backend test suite (pytest)
	cd backend && .venv/bin/pytest -q

test-frontend: ## Run the frontend test suite (vitest)
	cd frontend && npm test

db-up: ## Start just the Postgres container (see backend/.env.example to point local dev at it)
	docker compose -f docker-compose.dev.yml up -d postgres

db-down: ## Stop just the Postgres container
	docker compose -f docker-compose.dev.yml stop postgres

db-logs: ## Tail the Postgres container logs
	docker compose -f docker-compose.dev.yml logs -f postgres

docker-build: ## Build the prod images (backend serves the built frontend)
	docker compose build

docker-up: ## Run the prod stack in Docker: postgres + backend (serving the built frontend)
	docker compose up -d --build

docker-down: ## Stop the prod Docker stack
	docker compose down

docker-logs: ## Tail logs for the prod Docker stack
	docker compose logs -f

docker-build-dev: ## Build the dev images (hot-reload backend + Vite frontend)
	docker compose -f docker-compose.dev.yml build

docker-up-dev: ## Run the dev stack in Docker: postgres + hot-reload backend + Vite frontend
	docker compose -f docker-compose.dev.yml up -d --build

docker-down-dev: ## Stop the dev Docker stack
	docker compose -f docker-compose.dev.yml down

docker-logs-dev: ## Tail logs for the dev Docker stack
	docker compose -f docker-compose.dev.yml logs -f

e2e-install: ## One-time setup: install Playwright + its browser for the e2e suite
	cd e2e && npm install && npx playwright install chromium

e2e: ## Reset the dev stack, run the e2e suite against it, then tear it down
	docker compose -f docker-compose.dev.yml down -v
	docker compose -f docker-compose.dev.yml up -d --build
	cd e2e && npm test; \
	status=$$?; \
	docker compose -f ../docker-compose.dev.yml down -v; \
	exit $$status

e2e-run: ## Run the e2e suite against a dev stack you already started (make docker-up-dev)
	cd e2e && npm test

clean: ## Remove backend venv and frontend node_modules
	rm -rf $(BACKEND_VENV) frontend/node_modules
