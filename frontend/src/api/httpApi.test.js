import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createExpense, getBalances, getExpenses, getMembers, settlePair } from './httpApi.js';

describe('httpApi', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getMembers issues a GET to /api/members', async () => {
    fetch.mockResolvedValue({ ok: true, status: 200, json: async () => [{ id: 'm1' }] });
    const result = await getMembers();
    expect(fetch).toHaveBeenCalledWith(
      '/api/members',
      expect.objectContaining({ headers: { 'Content-Type': 'application/json' } })
    );
    expect(result).toEqual([{ id: 'm1' }]);
  });

  it('getBalances GETs /api/members/:id/balances, URL-encoding the id', async () => {
    fetch.mockResolvedValue({ ok: true, status: 200, json: async () => [] });
    await getBalances('m 1');
    expect(fetch).toHaveBeenCalledWith('/api/members/m%201/balances', expect.anything());
  });

  it('getExpenses GETs /api/expenses', async () => {
    fetch.mockResolvedValue({ ok: true, status: 200, json: async () => [] });
    await getExpenses();
    expect(fetch).toHaveBeenCalledWith('/api/expenses', expect.anything());
  });

  it('createExpense POSTs the payload as JSON', async () => {
    fetch.mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: 'e1' }) });
    const payload = {
      title: 'Snacks',
      payerId: 'm1',
      splits: [{ personId: 'm1', amount: 5 }],
      date: '2026-09-14',
    };
    const result = await createExpense(payload);
    expect(fetch).toHaveBeenCalledWith(
      '/api/expenses',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) })
    );
    expect(result).toEqual({ id: 'e1' });
  });

  it('settlePair POSTs { fromId, toId }', async () => {
    fetch.mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: 's1' }) });
    await settlePair('m2', 'm1');
    expect(fetch).toHaveBeenCalledWith(
      '/api/settlements',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ fromId: 'm2', toId: 'm1' }) })
    );
  });

  it('throws an Error using the backend-supplied message on a non-ok response', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Nothing outstanding between these two.' }),
    });
    await expect(settlePair('m1', 'm2')).rejects.toThrow('Nothing outstanding between these two.');
  });

  it('falls back to a generic error when the error body is not JSON', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('not json');
      },
    });
    await expect(getExpenses()).rejects.toThrow('Request failed (500)');
  });
});
