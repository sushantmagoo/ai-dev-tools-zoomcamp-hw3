import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AddExpenseDialog from './AddExpenseDialog.jsx';

const members = [
  { id: 'm1', name: 'Iris Calloway', short: 'Iris' },
  { id: 'm2', name: 'Tobias Renn', short: 'Tobias' },
];

function setup(overrides = {}) {
  const onClose = vi.fn();
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(
    <AddExpenseDialog
      members={members}
      currentId="m1"
      busy={false}
      onClose={onClose}
      onSave={onSave}
      {...overrides}
    />
  );
  return { onClose, onSave };
}

function shareInput(name) {
  const row = screen.getByText(name).closest('.split-row');
  return within(row).getByRole('textbox');
}

describe('AddExpenseDialog', () => {
  it('requires a description before saving', async () => {
    const { onSave } = setup();
    await userEvent.type(screen.getByLabelText('Total paid'), '20');
    await userEvent.click(screen.getByRole('button', { name: 'Save expense' }));
    expect(screen.getByText('Give the expense a description.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('requires a positive total before saving', async () => {
    const { onSave } = setup();
    await userEvent.type(screen.getByLabelText('What was it for'), 'Snacks');
    await userEvent.click(screen.getByRole('button', { name: 'Save expense' }));
    expect(screen.getByText('Enter the total paid.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('requires the shares to add up to the total before saving', async () => {
    const { onSave } = setup();
    await userEvent.type(screen.getByLabelText('What was it for'), 'Snacks');
    await userEvent.type(screen.getByLabelText('Total paid'), '20');
    await userEvent.type(shareInput('Iris Calloway (you)'), '5');
    await userEvent.click(screen.getByRole('button', { name: 'Save expense' }));
    expect(screen.getByText('Shares must add up to the total paid.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('Split evenly divides the total across every member', async () => {
    setup();
    await userEvent.type(screen.getByLabelText('Total paid'), '10');
    await userEvent.click(screen.getByRole('button', { name: 'Split evenly' }));
    expect(shareInput('Iris Calloway (you)')).toHaveValue('5.00');
    expect(shareInput('Tobias Renn')).toHaveValue('5.00');
  });

  it('Split evenly requires a total first', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Split evenly' }));
    expect(screen.getByText('Enter the total paid first.')).toBeInTheDocument();
  });

  it('saves with the entered title, payer, and evenly split shares', async () => {
    const { onSave } = setup();
    await userEvent.type(screen.getByLabelText('What was it for'), 'Snacks');
    await userEvent.type(screen.getByLabelText('Total paid'), '20');
    await userEvent.click(screen.getByRole('button', { name: 'Split evenly' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save expense' }));

    expect(onSave).toHaveBeenCalledWith({
      title: 'Snacks',
      payerId: 'm1',
      date: expect.any(String),
      splits: [
        { personId: 'm1', amount: 10 },
        { personId: 'm2', amount: 10 },
      ],
    });
  });

  it('shows the error thrown by onSave without closing the dialog', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('boom'));
    setup({ onSave });
    await userEvent.type(screen.getByLabelText('What was it for'), 'Snacks');
    await userEvent.type(screen.getByLabelText('Total paid'), '20');
    await userEvent.click(screen.getByRole('button', { name: 'Split evenly' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save expense' }));
    expect(await screen.findByText('boom')).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const { onClose } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});
