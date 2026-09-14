import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../api/httpApi.js';
import { useLedger } from './useLedger.js';

vi.mock('../api/httpApi.js');

const members = [
  { id: 'm1', name: 'Iris Calloway', short: 'Iris', initials: 'IC' },
  { id: 'm2', name: 'Tobias Renn', short: 'Tobias', initials: 'TR' },
];

async function ready() {
  const hook = renderHook(() => useLedger());
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

beforeEach(() => {
  vi.resetAllMocks();
  api.getMembers.mockResolvedValue(members);
  api.getBalances.mockResolvedValue([{ person: members[1], amount: 10 }]);
  api.getExpenses.mockResolvedValue([
    { id: 'e1', title: 'Snacks', payerId: 'm1', amount: 10, date: '2026-09-14', splits: [] },
  ]);
});

describe('useLedger', () => {
  it('loads members, defaults to the first as current, and loads their balances/expenses', async () => {
    const { result } = await ready();

    expect(result.current.members).toEqual(members);
    expect(result.current.currentId).toBe('m1');
    expect(api.getBalances).toHaveBeenCalledWith('m1');
    expect(result.current.rows).toEqual([{ person: members[1], amount: 10 }]);
    expect(result.current.expenses).toHaveLength(1);
  });

  it('switchIdentity refetches balances/expenses for the new person', async () => {
    const { result } = await ready();

    api.getBalances.mockResolvedValue([{ person: members[0], amount: -10 }]);

    await act(async () => {
      result.current.switchIdentity('m2');
    });

    expect(result.current.currentId).toBe('m2');
    expect(api.getBalances).toHaveBeenCalledWith('m2');
    expect(result.current.rows).toEqual([{ person: members[0], amount: -10 }]);
  });

  it('addExpense creates the expense, then refreshes expenses and balances', async () => {
    const { result } = await ready();
    api.createExpense.mockResolvedValue({ id: 'e2' });

    await act(async () => {
      await result.current.addExpense({ title: 'Coffee', payerId: 'm1', splits: [] });
    });

    expect(api.createExpense).toHaveBeenCalledWith({ title: 'Coffee', payerId: 'm1', splits: [] });
    expect(api.getExpenses).toHaveBeenCalledTimes(2); // initial load + post-save refresh
    expect(result.current.busy).toBe(false);
  });

  it('settle pays from the other person to the viewer when the viewer is owed (amount > 0)', async () => {
    const { result } = await ready();
    api.settlePair.mockResolvedValue({ id: 's1' });

    await act(async () => {
      await result.current.settle({ person: members[1], amount: 10 });
    });

    expect(api.settlePair).toHaveBeenCalledWith('m2', 'm1');
  });

  it('settle pays from the viewer to the other person when the viewer owes (amount < 0)', async () => {
    const { result } = await ready();
    api.settlePair.mockResolvedValue({ id: 's1' });

    await act(async () => {
      await result.current.settle({ person: members[1], amount: -10 });
    });

    expect(api.settlePair).toHaveBeenCalledWith('m1', 'm2');
  });

  it('settle silently leaves the ledger untouched when the backend rejects it (nothing outstanding)', async () => {
    const { result } = await ready();
    api.settlePair.mockRejectedValue(new Error('Nothing outstanding between these two.'));

    await act(async () => {
      await result.current.settle({ person: members[1], amount: 10 });
    });

    expect(result.current.busy).toBe(false);
  });

  it('settle is a no-op while another mutation is already busy', async () => {
    const { result } = await ready();
    let resolveCreate;
    api.createExpense.mockReturnValue(new Promise(r => (resolveCreate = r)));

    let addPromise;
    act(() => {
      addPromise = result.current.addExpense({ title: 'Coffee', payerId: 'm1', splits: [] });
    });
    await waitFor(() => expect(result.current.busy).toBe(true));

    await act(async () => {
      await result.current.settle({ person: members[1], amount: 10 });
    });
    expect(api.settlePair).not.toHaveBeenCalled();

    await act(async () => {
      resolveCreate({ id: 'e2' });
      await addPromise;
    });
  });
});
