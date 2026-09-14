import { money } from '../lib/money.js';

export default function BalanceList({ rows, busy, onSettle }) {
  return (
    <section>
      <h6 className="section-kicker">Pairwise standing</h6>
      {rows.map(row => (
        <div className="balance-row" key={row.person.id}>
          <span className="balance-avatar">{row.person.initials}</span>
          <span className="balance-who">
            <span className="balance-name">{row.person.name}</span>
            <span className="text-muted balance-caption">
              {row.amount > 0 ? 'owes you' : row.amount < 0 ? 'you owe' : 'settled up'}
            </span>
          </span>
          <span className="balance-figure">{row.amount === 0 ? '—' : money(row.amount)}</span>
          {row.amount !== 0 && (
            <button
              className="btn btn-secondary"
              onClick={() => onSettle(row)}
              disabled={busy}
              style={{ flex: 'none', fontSize: 13 }}
            >
              Mark paid
            </button>
          )}
        </div>
      ))}
      <p className="text-muted balance-note">
        Marking paid clears the whole balance between the two of you and records a settlement.
        Balances are kept pair by pair; nothing is simplified across the household.
      </p>
    </section>
  );
}
