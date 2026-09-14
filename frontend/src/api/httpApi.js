// Real API client for the FastAPI backend (see /openapi.yaml). Same five
// functions mockApi.js exposed, so useLedger.js didn't need to change shape.
const BASE = '/api';

async function request(path, options) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || body?.detail || `Request failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function getMembers() {
  return request('/members');
}

export function getBalances(personId) {
  return request(`/members/${encodeURIComponent(personId)}/balances`);
}

export function getExpenses() {
  return request('/expenses');
}

export function createExpense({ title, payerId, splits, date }) {
  return request('/expenses', {
    method: 'POST',
    body: JSON.stringify({ title, payerId, splits, date }),
  });
}

export function settlePair(fromId, toId) {
  return request('/settlements', {
    method: 'POST',
    body: JSON.stringify({ fromId, toId }),
  });
}
