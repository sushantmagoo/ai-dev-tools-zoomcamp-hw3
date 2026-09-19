export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
export const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

// The seeded household — see backend/app/seed.py. Assumed present (the
// dev backend seeds automatically on startup against an empty database),
// but tests never assume anything about counts or amounts beyond this,
// since docker-compose.dev.yml's Postgres volume persists across runs.
export const MEMBERS = {
  iris: { id: 'm1', name: 'Iris Calloway', short: 'Iris' },
  tobias: { id: 'm2', name: 'Tobias Renn', short: 'Tobias' },
  maren: { id: 'm3', name: 'Maren Holt', short: 'Maren' },
  felix: { id: 'm4', name: 'Felix Adeyemi', short: 'Felix' },
};

export function uniqueTitle(label) {
  return `[e2e ${Date.now()}-${Math.floor(Math.random() * 1e6)}] ${label}`;
}

// Reads the signed balance of `otherId` from `viewerId`'s perspective via
// the real API — used to assert on deltas instead of absolute values, so
// tests don't depend on the database being freshly reset.
export async function balanceOf(request, viewerId, otherId) {
  const res = await request.get(`${BACKEND_URL}/api/members/${viewerId}/balances`);
  if (!res.ok()) throw new Error(`GET balances for ${viewerId} failed: ${res.status()}`);
  const rows = await res.json();
  const row = rows.find(r => r.person.id === otherId);
  if (!row) throw new Error(`No balance row for ${otherId} in ${viewerId}'s balances`);
  return row.amount;
}

// Settles whatever is currently outstanding between two members (in
// whichever direction it actually runs), leaving their pairwise balance at
// zero. Used to set up a known, deterministic starting point for a test.
export async function settleWhateverIsOutstanding(request, aId, bId) {
  const amount = await balanceOf(request, aId, bId);
  if (amount === 0) return;
  const [fromId, toId] = amount < 0 ? [aId, bId] : [bId, aId];
  const res = await request.post(`${BACKEND_URL}/api/settlements`, {
    data: { fromId, toId },
  });
  if (!res.ok()) throw new Error(`Failed to settle ${fromId} -> ${toId}: ${res.status()}`);
}

export function balanceRow(page, personName) {
  return page.locator('.balance-row', { hasText: personName });
}

// The identity radios are visually hidden in favor of a styled label (see
// .seg-opt in classical.css), so Playwright's actionability check on the
// input itself never passes — click the label it's wrapped in instead.
export async function switchIdentity(page, memberShort) {
  await page.locator('.seg-opt', { hasText: memberShort }).click();
}
