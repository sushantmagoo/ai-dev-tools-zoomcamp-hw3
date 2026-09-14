import { money, shortDate } from '../lib/money.js';

export default function ExpenseTable({ expenses, members, currentId }) {
  const nameOf = id => members.find(m => m.id === id)?.short ?? '—';

  return (
    <section>
      <h6 className="section-kicker">Recent expenses</h6>
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 56 }}>Date</th>
            <th>Expense</th>
            <th>Paid by</th>
            <th className="right">Your share</th>
            <th className="right">Total</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map(e => {
            const mine = e.splits.find(s => s.personId === currentId);
            return (
              <tr key={e.id}>
                <td className="text-muted num" style={{ fontSize: 12 }}>{shortDate(e.date)}</td>
                <td>{e.title}</td>
                <td className="text-muted" style={{ fontSize: 13 }}>
                  {e.payerId === currentId ? 'You' : nameOf(e.payerId)}
                </td>
                <td className="right num">{mine ? money(mine.amount) : '—'}</td>
                <td className="right num">{money(e.amount)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
