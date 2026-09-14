.PHONY: help install install-backend install-frontend dev backend frontend \
	test test-backend test-frontend clean \
	db-up db-down db-logs docker-build docker-up docker-down docker-logs

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
	docker compose up -d postgres

db-down: ## Stop just the Postgres container
	docker compose stop postgres

db-logs: ## Tail the Postgres container logs
	docker compose logs -f postgres

docker-build: ## Build the backend + frontend images
	docker compose build

docker-up: ## Run the whole stack in Docker: postgres + backend + frontend
	docker compose up -d --build

docker-down: ## Stop the whole Docker stack
	docker compose down

docker-logs: ## Tail logs for the whole Docker stack
	docker compose logs -f

clean: ## Remove backend venv and frontend node_modules
	rm -rf $(BACKEND_VENV) frontend/node_modules
