import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccountInfo from '../AccountInfo';
import { Account } from '../../../types';

describe('AccountInfo', () => {
  const mockAccount: Account = {
    id: '1',
    classroomName: 'Physics Lab',
    location: 'Sydney, Australia',
    size: 30,
    description: 'Hands-on science activities',
    avatar: '🏫',
    interests: [],
    schedule: {},
    x: 0,
    y: 0,
  };

  const mockAccounts: Account[] = [mockAccount];
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders classroom information when not editing', () => {
    render(
      <AccountInfo currentAccount={mockAccount} accounts={mockAccounts} onSave={mockOnSave} />
    );

    expect(screen.getByText('Classroom Information')).toBeInTheDocument();
    expect(screen.getByText('Sydney, Australia')).toBeInTheDocument();
    expect(screen.getByText('30 students')).toBeInTheDocument();
    expect(screen.getByText('Hands-on science activities')).toBeInTheDocument();
  });

  it('shows save button and editable fields after entering edit mode', async () => {
    const user = userEvent.setup();
    render(
      <AccountInfo currentAccount={mockAccount} accounts={mockAccounts} onSave={mockOnSave} />
    );

    const editButton = screen.getByRole('button', { name: '' });
    await user.click(editButton);

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Physics Lab')).toBeInTheDocument();
    expect(screen.getByDisplayValue('30')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Hands-on science activities')).toBeInTheDocument();
  });

  it('calls onSave with updated form values when saving', async () => {
    const user = userEvent.setup();
    render(
      <AccountInfo currentAccount={mockAccount} accounts={mockAccounts} onSave={mockOnSave} />
    );

    const editButton = screen.getByRole('button', { name: '' });
    await user.click(editButton);

    const classroomNameInput = screen.getByDisplayValue('Physics Lab');
    const classSizeInput = screen.getByDisplayValue('30');
    const descriptionInput = screen.getByDisplayValue('Hands-on science activities');

    await user.clear(classroomNameInput);
    await user.type(classroomNameInput, 'Ocean Science Room');

    await user.clear(classSizeInput);
    await user.type(classSizeInput, '25');

    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'Marine biology and chemistry');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(mockOnSave).toHaveBeenCalledWith({
      classroomName: 'Ocean Science Room',
      location: 'Sydney, Australia',
      size: 25,
      description: 'Marine biology and chemistry',
      avatar: '🏫',
    });
  });

  it('uses 0 when class size input is cleared and saved', async () => {
    const user = userEvent.setup();
    render(
      <AccountInfo currentAccount={mockAccount} accounts={mockAccounts} onSave={mockOnSave} />
    );

    const editButton = screen.getByRole('button', { name: '' });
    await user.click(editButton);

    const classSizeInput = screen.getByDisplayValue('30');
    await user.clear(classSizeInput);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 0,
      })
    );
  });

  it('updates selected avatar and saves it', async () => {
    const user = userEvent.setup();
    render(
      <AccountInfo currentAccount={mockAccount} accounts={mockAccounts} onSave={mockOnSave} />
    );

    const editButton = screen.getByRole('button', { name: '' });
    await user.click(editButton);

    await user.click(screen.getByRole('button', { name: '🚀' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        avatar: '🚀',
      })
    );
  });

  it('shows all emoji avatar options in edit mode', async () => {
    const user = userEvent.setup();
    render(
      <AccountInfo currentAccount={mockAccount} accounts={mockAccounts} onSave={mockOnSave} />
    );

    const editButton = screen.getByRole('button', { name: '' });
    await user.click(editButton);

    expect(screen.getByRole('button', { name: '🏫' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '🎓' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '🚀' })).toBeInTheDocument();
  });

  it('resets form values when current account changes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <AccountInfo currentAccount={mockAccount} accounts={mockAccounts} onSave={mockOnSave} />
    );

    const editButton = screen.getByRole('button', { name: '' });
    await user.click(editButton);

    const classroomNameInput = screen.getByDisplayValue('Physics Lab');
    await user.clear(classroomNameInput);
    await user.type(classroomNameInput, 'Temporary Draft Name');

    const updatedAccount: Account = {
      ...mockAccount,
      id: '2',
      classroomName: 'Chemistry Studio',
      location: 'Melbourne, Australia',
      size: 18,
      description: 'Organic chemistry intro',
      avatar: '🎨',
    };

    rerender(
      <AccountInfo currentAccount={updatedAccount} accounts={[updatedAccount]} onSave={mockOnSave} />
    );

    await waitFor(() => {
      expect(screen.getByText('Melbourne, Australia')).toBeInTheDocument();
      expect(screen.getByText('18 students')).toBeInTheDocument();
      expect(screen.getByText('Organic chemistry intro')).toBeInTheDocument();
    });

    expect(screen.queryByText('Save')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Temporary Draft Name')).not.toBeInTheDocument();
  });

  it('does not render description paragraph when description is empty', () => {
    const accountWithoutDescription: Account = {
      ...mockAccount,
      description: '',
    };

    render(
      <AccountInfo
        currentAccount={accountWithoutDescription}
        accounts={[accountWithoutDescription]}
        onSave={mockOnSave}
      />
    );

    expect(screen.queryByText('Hands-on science activities')).not.toBeInTheDocument();
    expect(screen.getByText('Sydney, Australia')).toBeInTheDocument();
    expect(screen.getByText('30 students')).toBeInTheDocument();
  });

  it('keeps section available after collapse toggle', async () => {
    const user = userEvent.setup();
    render(
      <AccountInfo currentAccount={mockAccount} accounts={mockAccounts} onSave={mockOnSave} />
    );

    const trigger = screen.getByText('Classroom Information');
    await user.click(trigger);

    expect(screen.getByText('Classroom Information')).toBeInTheDocument();
  });
});