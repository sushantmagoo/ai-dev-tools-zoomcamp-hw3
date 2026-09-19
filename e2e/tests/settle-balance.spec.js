import { test, expect } from '@playwright/test';
import { MEMBERS, BACKEND_URL, balanceOf, balanceRow, switchIdentity } from './helpers.js';

test('marking a balance paid clears it to zero, records a settlement, and persists', async ({ page, request }) => {
  // Force a known-nonzero, specific balance between Iris and Maren so the
  // test doesn't depend on whatever the database already holds: an amount
  // this exact is astronomically unlikely to already be sitting there
  // and to happen to net out to zero by coincidence.
  const setup = await request.post(`${BACKEND_URL}/api/expenses`, {
    data: {
      title: '[e2e setup] settle-balance fixture',
      payerId: MEMBERS.iris.id,
      splits: [
        { personId: MEMBERS.iris.id, amount: 1 },
        { personId: MEMBERS.maren.id, amount: 137.42 },
      ],
    },
  });
  expect(setup.ok()).toBeTruthy();

  await page.goto('/');
  await expect(page.getByRole('radio', { name: MEMBERS.iris.short })).toBeChecked();

  const row = balanceRow(page, MEMBERS.maren.name);
  await expect(row).toBeVisible();
  await expect(row.getByRole('button', { name: 'Mark paid' })).toBeVisible();

  await row.getByRole('button', { name: 'Mark paid' }).click();

  await expect(row.getByText('settled up')).toBeVisible();
  await expect(row.getByRole('button', { name: 'Mark paid' })).toHaveCount(0);

  const amount = await balanceOf(request, MEMBERS.iris.id, MEMBERS.maren.id);
  expect(amount).toBe(0);

  // Persists through a reload — the settlement was actually written, not
  // just reflected in optimistic client state.
  await page.reload();
  await expect(balanceRow(page, MEMBERS.maren.name).getByText('settled up')).toBeVisible();
});

test('settling one pair does not affect other pairwise balances for the same viewer', async ({ page, request }) => {
  const before = await balanceOf(request, MEMBERS.tobias.id, MEMBERS.felix.id);

  await page.goto('/');
  await switchIdentity(page, MEMBERS.tobias.short);

  const marenRow = balanceRow(page, MEMBERS.maren.name);
  if ((await marenRow.getByRole('button', { name: 'Mark paid' }).count()) > 0) {
    await marenRow.getByRole('button', { name: 'Mark paid' }).click();
    await expect(marenRow.getByText('settled up')).toBeVisible();
  }

  const after = await balanceOf(request, MEMBERS.tobias.id, MEMBERS.felix.id);
  expect(after).toBe(before);
});
