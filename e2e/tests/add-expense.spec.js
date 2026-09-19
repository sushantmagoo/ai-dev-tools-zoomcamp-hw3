import { test, expect } from '@playwright/test';
import { MEMBERS, balanceOf, uniqueTitle } from './helpers.js';

test('adding an expense persists to Postgres and is reflected immediately and after reload', async ({
  page,
  request,
}) => {
  const title = uniqueTitle('Groceries');

  await page.goto('/');
  await expect(page.getByRole('radio', { name: MEMBERS.iris.short })).toBeChecked();

  const before = await balanceOf(request, MEMBERS.iris.id, MEMBERS.felix.id);

  await page.getByRole('button', { name: 'Add an expense' }).click();
  await page.getByLabel('What was it for').fill(title);
  await page.getByLabel('Total paid').fill('40.00');
  await page.getByRole('button', { name: 'Split evenly' }).click();
  await page.getByRole('button', { name: 'Save expense' }).click();

  // Dialog closes on success (it stays open and shows an error otherwise).
  await expect(page.locator('.dialog-backdrop')).toHaveCount(0);
  await expect(page.getByText(title)).toBeVisible();

  // Iris paid, split evenly 4 ways, so Felix's share is 10.00 — the amount
  // Felix owes Iris (from Iris's perspective) should have gone up by
  // exactly that, whatever it was before this expense.
  const after = await balanceOf(request, MEMBERS.iris.id, MEMBERS.felix.id);
  expect(after - before).toBeCloseTo(10.0, 2);

  // Persists through a real reload — not just optimistic client state.
  await page.reload();
  await expect(page.getByText(title)).toBeVisible();
});

test('unbalanced shares are rejected client-side, before any request reaches the backend', async ({ page, request }) => {
  const title = uniqueTitle('Bad split attempt');

  const before = await balanceOf(request, MEMBERS.iris.id, MEMBERS.tobias.id);

  await page.goto('/');
  await page.getByRole('button', { name: 'Add an expense' }).click();
  await page.getByLabel('What was it for').fill(title);
  await page.getByLabel('Total paid').fill('40.00');
  // Only fill Iris's own share — shares (0) won't add up to the 40 total.
  await page.getByRole('button', { name: 'Save expense' }).click();

  await expect(page.getByText('Shares must add up to the total paid.')).toBeVisible();
  await expect(page.locator('.dialog-backdrop')).toHaveCount(1); // still open

  const after = await balanceOf(request, MEMBERS.iris.id, MEMBERS.tobias.id);
  expect(after).toBe(before); // nothing was persisted
});
