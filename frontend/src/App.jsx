import { useMemo, useState } from 'react';
import { useLedger } from './hooks/useLedger.js';
import { money } from './lib/money.js';
import IdentityNav from './components/IdentityNav.jsx';
import BalanceList from './components/BalanceList.jsx';
import ExpenseTable from './components/ExpenseTable.jsx';
import AddExpenseDialog from './components/AddExpenseDialog.jsx';

const HOUSEHOLD = 'Flat 4, Ashgrove Road';

export default function App() {
  const { members, currentId, rows, expenses, loading, busy, switchIdentity, settle, addExpense } = useLedger();
  const [dialogOpen, setDialogOpen] = useState(false);

  const summary = useMemo(() => {
    if (loading) return 'Reading the ledger…';
    const owed = rows.reduce((t, r) => t + Math.max(0, r.amount), 0);
    const owing = rows.reduce((t, r) => t + Math.max(0, -r.amount), 0);
    if (owed === 0 && owing === 0)
      return 'You are square with everyone in the house. Add an expense and the shares appear as pairwise balances.';
    return 'You are owed ' + money(owed) + ' across the house and owe ' + money(owing) +
      '. Each figure below stands on its own; settling one pair leaves the others untouched.';
  }, [rows, loading]);

  return (
    <div className="app">
      <IdentityNav
        household={HOUSEHOLD}
        members={members}
        currentId={currentId}
        onSwitch={switchIdentity}
      />

      <main className="app-main">
        <header className="app-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1>Balances</h1>
            <p>{summary}</p>
          </div>
          <button className="btn btn-primary" onClick={() => setDialogOpen(true)} style={{ flex: 'none' }}>
            Add an expense
          </button>
        </header>

        <hr className="hr" />

        <div className="app-columns">
          <BalanceList rows={rows} busy={busy} onSettle={settle} />
          <ExpenseTable expenses={expenses} members={members} currentId={currentId} />
        </div>
      </main>

      {dialogOpen && (
        <AddExpenseDialog
          members={members}
          currentId={currentId}
          busy={busy}
          onClose={() => setDialogOpen(false)}
          onSave={async payload => { await addExpense(payload); setDialogOpen(false); }}
        />
      )}
    </div>
  );
}
