import { test, expect } from '@playwright/test';
import { MEMBERS, balanceRow, switchIdentity } from './helpers.js';

test('switching identity re-fetches balances and expenses for that person', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Balances' })).toBeVisible();

  // The app defaults to the first member returned by the API — m1, Iris.
  await expect(page.getByRole('radio', { name: MEMBERS.iris.short })).toBeChecked();
  await expect(balanceRow(page, MEMBERS.iris.name)).toHaveCount(0); // never balanced against yourself

  await switchIdentity(page, MEMBERS.tobias.short);

  await expect(page.getByRole('radio', { name: MEMBERS.tobias.short })).toBeChecked();
  // Now viewing as Tobias: he no longer appears in his own balance list,
  // but Iris (previously the viewer) now does.
  await expect(balanceRow(page, MEMBERS.tobias.name)).toHaveCount(0);
  await expect(balanceRow(page, MEMBERS.iris.name)).toBeVisible();
});
