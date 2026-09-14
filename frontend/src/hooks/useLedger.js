import { useCallback, useEffect, useState } from 'react';
import * as api from '../api/httpApi.js';

// Single source of truth for the dashboard. Every read goes through the API
// module, so swapping backends means editing api/httpApi.js only.
export function useLedger() {
  const [members, setMembers] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [rows, setRows] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async personId => {
    const id = personId ?? currentId;
    if (!id) return;
    setLoading(true);
    const [balances, list] = await Promise.all([api.getBalances(id), api.getExpenses()]);
    setRows(balances);
    setExpenses(list);
    setLoading(false);
  }, [currentId]);

  useEffect(() => {
    (async () => {
      const people = await api.getMembers();
      setMembers(people);
      setCurrentId(people[0].id);
      await refresh(people[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchIdentity = useCallback(id => {
    setCurrentId(id);
    refresh(id);
  }, [refresh]);

  // One tap clears the entire outstanding balance between the two people.
  const settle = useCallback(async row => {
    if (busy || !currentId) return;
    setBusy(true);
    try {
      if (row.amount < 0) await api.settlePair(currentId, row.person.id);
      else await api.settlePair(row.person.id, currentId);
      await refresh();
    } catch {
      // nothing outstanding — leave the ledger as it is
    }
    setBusy(false);
  }, [busy, currentId, refresh]);

  const addExpense = useCallback(async payload => {
    setBusy(true);
    try {
      await api.createExpense(payload);
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  return { members, currentId, rows, expenses, loading, busy, switchIdentity, settle, addExpense };
}
