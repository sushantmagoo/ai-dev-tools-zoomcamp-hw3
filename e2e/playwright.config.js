import { defineConfig } from '@playwright/test';

// Points at the docker-compose.dev.yml stack by default — override to run
// against a different environment (e.g. a staging deploy).
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  // These tests share one real backend + Postgres instance (no per-test
  // isolation like the unit/backend suites), so run them serially to avoid
  // one test's mutations racing another's assertions.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  globalSetup: './tests/global-setup.js',
  reporter: [['list']],
  use: {
    baseURL: FRONTEND_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
