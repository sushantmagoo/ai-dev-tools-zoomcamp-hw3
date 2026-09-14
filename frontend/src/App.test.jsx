import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';
import * as api from './api/httpApi.js';

vi.mock('./api/httpApi.js');

const members = [
  { id: 'm1', name: 'Iris Calloway', short: 'Iris', initials: 'IC' },
  { id: 'm2', name: 'Tobias Renn', short: 'Tobias', initials: 'TR' },
];

beforeEach(() => {
  vi.resetAllMocks();
  api.getMembers.mockResolvedValue(members);
  api.getBalances.mockResolvedValue([{ person: members[1], amount: 25 }]);
  api.getExpenses.mockResolvedValue([
    {
      id: 'e1',
      title: 'Weekly groceries',
      payerId: 'm1',
      amount: 50,
      date: '2026-09-11',
      splits: [
        { personId: 'm1', amount: 25 },
        { personId: 'm2', amount: 25 },
      ],
    },
  ]);
});

describe('App', () => {
  it('loads and renders balances and expenses for the default identity', async () => {
    render(<App />);
    expect(await screen.findByText('Tobias Renn')).toBeInTheDocument();
    expect(screen.getByText('Weekly groceries')).toBeInTheDocument();
    expect(screen.getByText(/You are owed \$25\.00/)).toBeInTheDocument();
  });

  it('opens the add-expense dialog from the header button', async () => {
    render(<App />);
    await screen.findByText('Weekly groceries');
    await userEvent.click(screen.getByRole('button', { name: 'Add an expense' }));
    expect(screen.getByLabelText('What was it for')).toBeInTheDocument();
  });

  it('marking a balance paid calls settlePair and refreshes the balances shown', async () => {
    api.settlePair.mockResolvedValue({ id: 's1' });
    render(<App />);
    await screen.findByText('Tobias Renn');

    api.getBalances.mockResolvedValue([{ person: members[1], amount: 0 }]);
    await userEvent.click(screen.getByRole('button', { name: /mark paid/i }));

    expect(api.settlePair).toHaveBeenCalledWith('m2', 'm1');
    expect(await screen.findByText('settled up')).toBeInTheDocument();
  });
});
