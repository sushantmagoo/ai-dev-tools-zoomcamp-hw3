import { test, expect } from '@playwright/test';
import { MEMBERS, BACKEND_URL, settleWhateverIsOutstanding } from './helpers.js';

// These hit the running backend container directly (no browser), to prove
// the deployed service itself enforces its contract — not just the source
// code under a test client. See backend/tests/ for the equivalent
// same-process checks against a disposable in-memory database.

test('GET balances for an unknown member is a 404', async ({ request }) => {
  const res = await request.get(`${BACKEND_URL}/api/members/does-not-exist/balances`);
  expect(res.status()).toBe(404);
});

test('settling a pair with nothing outstanding is a 400', async ({ request }) => {
  await settleWhateverIsOutstanding(request, MEMBERS.tobias.id, MEMBERS.maren.id);

  const res = await request.post(`${BACKEND_URL}/api/settlements`, {
    data: { fromId: MEMBERS.tobias.id, toId: MEMBERS.maren.id },
  });
  expect(res.status()).toBe(400);
  expect((await res.json()).message).toBe('Nothing outstanding between these two.');
});

test('creating an expense with a negative split amount is rejected and not persisted', async ({ request }) => {
  const before = await (await request.get(`${BACKEND_URL}/api/expenses`)).json();

  const res = await request.post(`${BACKEND_URL}/api/expenses`, {
    data: {
      title: '[e2e] should never be saved',
      payerId: MEMBERS.iris.id,
      splits: [{ personId: MEMBERS.iris.id, amount: -5 }],
    },
  });
  expect(res.status()).toBe(422);

  const after = await (await request.get(`${BACKEND_URL}/api/expenses`)).json();
  expect(after.length).toBe(before.length);
});
