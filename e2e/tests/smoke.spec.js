import { test, expect } from '@playwright/test';
import { BACKEND_URL, FRONTEND_URL } from './helpers.js';

test.describe('stack wiring', () => {
  test('backend is reachable directly', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/healthz`);
    expect(res.ok()).toBeTruthy();
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  test("the frontend dev server's /api proxy reaches the backend", async ({ request }) => {
    // Exercises the actual container networking + Vite proxy config
    // (VITE_BACKEND_URL in docker-compose.dev.yml), independent of the
    // React app — if this fails, the UI tests below will fail too, but
    // for a different reason (a broken proxy, not a broken component).
    const res = await request.get(`${FRONTEND_URL}/api/members`);
    expect(res.ok()).toBeTruthy();
    const members = await res.json();
    expect(members.length).toBeGreaterThan(0);
  });

  test('the app loads real data end-to-end (Postgres -> backend -> browser)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Balances' })).toBeVisible();

    // Not a mock: this data only exists if it made a real request to the
    // real backend, which read it from the real (seeded) Postgres database.
    await expect(page.locator('.balance-row').first()).toBeVisible();
    await expect(page.locator('table.table tbody tr').first()).toBeVisible();
  });
});
