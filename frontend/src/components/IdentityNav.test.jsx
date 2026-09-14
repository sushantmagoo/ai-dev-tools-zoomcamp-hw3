import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import IdentityNav from './IdentityNav.jsx';

const members = [
  { id: 'm1', short: 'Iris' },
  { id: 'm2', short: 'Tobias' },
];

describe('IdentityNav', () => {
  it('checks the radio for the current member only', () => {
    render(<IdentityNav household="Flat 4" members={members} currentId="m2" onSwitch={() => {}} />);
    expect(screen.getByRole('radio', { name: 'Tobias' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Iris' })).not.toBeChecked();
  });

  it('calls onSwitch with the id of the clicked member', async () => {
    const onSwitch = vi.fn();
    render(<IdentityNav household="Flat 4" members={members} currentId="m1" onSwitch={onSwitch} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Tobias' }));
    expect(onSwitch).toHaveBeenCalledWith('m2');
  });

  it('renders the household name', () => {
    render(<IdentityNav household="Flat 4, Ashgrove Road" members={members} currentId="m1" onSwitch={() => {}} />);
    expect(screen.getByText('Flat 4, Ashgrove Road')).toBeInTheDocument();
  });
});
