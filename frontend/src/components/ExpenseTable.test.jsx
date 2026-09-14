import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ExpenseTable from './ExpenseTable.jsx';

const members = [
  { id: 'm1', short: 'Iris' },
  { id: 'm2', short: 'Tobias' },
];

const expenses = [
  {
    id: 'e1',
    title: 'Weekly groceries',
    payerId: 'm1',
    amount: 128.4,
    date: '2026-09-11',
    splits: [
      { personId: 'm1', amount: 32.1 },
      { personId: 'm2', amount: 32.1 },
    ],
  },
  {
    id: 'e2',
    title: 'Dinner at Olio',
    payerId: 'm2',
    amount: 96,
    date: '2026-09-09',
    splits: [{ personId: 'm1', amount: 38 }],
  },
];

describe('ExpenseTable', () => {
  it('shows "You" for the viewer as payer, and the short name for anyone else', () => {
    render(<ExpenseTable expenses={expenses} members={members} currentId="m1" />);
    expect(screen.getByText('Weekly groceries').closest('tr')).toHaveTextContent('You');
    expect(screen.getByText('Dinner at Olio').closest('tr')).toHaveTextContent('Tobias');
  });

  it("shows the viewer's own share, or a dash when they weren't part of the split", () => {
    render(<ExpenseTable expenses={expenses} members={members} currentId="m2" />);
    expect(screen.getByText('Weekly groceries').closest('tr')).toHaveTextContent('$32.10');
    // m2 has no split entry on e2
    expect(screen.getByText('Dinner at Olio').closest('tr').textContent).toContain('—');
  });

  it('always shows the expense total regardless of viewer', () => {
    render(<ExpenseTable expenses={expenses} members={members} currentId="m2" />);
    expect(screen.getByText('Weekly groceries').closest('tr')).toHaveTextContent('$128.40');
  });
});
