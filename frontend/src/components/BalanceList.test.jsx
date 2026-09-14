import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BalanceList from './BalanceList.jsx';

const rows = [
  { person: { id: 'm2', name: 'Tobias Renn', initials: 'TR' }, amount: 39.1 },
  { person: { id: 'm3', name: 'Maren Holt', initials: 'MH' }, amount: -8 },
  { person: { id: 'm4', name: 'Felix Adeyemi', initials: 'FA' }, amount: 0 },
];

describe('BalanceList', () => {
  it('labels each row owes you / you owe / settled up based on the sign of amount', () => {
    render(<BalanceList rows={rows} busy={false} onSettle={() => {}} />);
    expect(screen.getByText('Tobias Renn').closest('.balance-row')).toHaveTextContent('owes you');
    expect(screen.getByText('Maren Holt').closest('.balance-row')).toHaveTextContent('you owe');
    expect(screen.getByText('Felix Adeyemi').closest('.balance-row')).toHaveTextContent('settled up');
  });

  it('hides the Mark paid button for a settled (zero) row', () => {
    render(<BalanceList rows={rows} busy={false} onSettle={() => {}} />);
    const felixRow = screen.getByText('Felix Adeyemi').closest('.balance-row');
    expect(within(felixRow).queryByRole('button', { name: /mark paid/i })).not.toBeInTheDocument();
  });

  it('calls onSettle with that row when its Mark paid button is clicked', async () => {
    const onSettle = vi.fn();
    render(<BalanceList rows={rows} busy={false} onSettle={onSettle} />);
    const tobiasRow = screen.getByText('Tobias Renn').closest('.balance-row');
    await userEvent.click(within(tobiasRow).getByRole('button', { name: /mark paid/i }));
    expect(onSettle).toHaveBeenCalledWith(rows[0]);
  });

  it('disables every Mark paid button while busy', () => {
    render(<BalanceList rows={rows} busy={true} onSettle={() => {}} />);
    const tobiasRow = screen.getByText('Tobias Renn').closest('.balance-row');
    expect(within(tobiasRow).getByRole('button', { name: /mark paid/i })).toBeDisabled();
  });
});
