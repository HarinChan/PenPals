import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClassroomSwitcher from '../ClassroomSwitcher';
import { Account } from '../../../types';

vi.mock('../../ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select
      aria-label="classroom-switcher-select"
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));

describe('ClassroomSwitcher', () => {
  const createAccount = (overrides: Partial<Account> = {}): Account => ({
    id: '1',
    classroomName: 'Physics Lab',
    location: 'Sydney',
    size: 30,
    description: 'Science classroom',
    avatar: '🏫',
    interests: [],
    schedule: {},
    x: 0,
    y: 0,
    ...overrides,
  });

  const accountA = createAccount({ id: '1', classroomName: 'Physics Lab' });
  const accountB = createAccount({ id: '2', classroomName: 'Chemistry Room' });

  const mockOnAccountChange = vi.fn();
  const mockOnCreateNew = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders classrooms title and count badge', () => {
    render(
      <ClassroomSwitcher
        accounts={[accountA, accountB]}
        currentAccount={accountA}
        onAccountChange={mockOnAccountChange}
        onCreateNew={mockOnCreateNew}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Classrooms')).toBeInTheDocument();
    expect(screen.getByText('2/12')).toBeInTheDocument();
  });

  it('calls onCreateNew when add classroom button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ClassroomSwitcher
        accounts={[accountA, accountB]}
        currentAccount={accountA}
        onAccountChange={mockOnAccountChange}
        onCreateNew={mockOnCreateNew}
        onDelete={mockOnDelete}
      />
    );

    await user.click(screen.getByTitle('Add new classroom'));

    expect(mockOnCreateNew).toHaveBeenCalledTimes(1);
  });

  it('disables add classroom button and shows warning at max limit', () => {
    const maxAccounts = Array.from({ length: 12 }, (_, i) =>
      createAccount({ id: `${i + 1}`, classroomName: `Classroom ${i + 1}` })
    );

    render(
      <ClassroomSwitcher
        accounts={maxAccounts}
        currentAccount={maxAccounts[0]}
        onAccountChange={mockOnAccountChange}
        onCreateNew={mockOnCreateNew}
        onDelete={mockOnDelete}
      />
    );

    const addButton = screen.getByTitle('Maximum classrooms reached');
    expect(addButton).toBeDisabled();
    expect(
      screen.getByText(/You've reached the maximum limit of 12 classrooms/i)
    ).toBeInTheDocument();
  });

  it('calls onAccountChange when selected classroom changes', async () => {
    const user = userEvent.setup();
    render(
      <ClassroomSwitcher
        accounts={[accountA, accountB]}
        currentAccount={accountA}
        onAccountChange={mockOnAccountChange}
        onCreateNew={mockOnCreateNew}
        onDelete={mockOnDelete}
      />
    );

    const select = screen.getByLabelText('classroom-switcher-select');
    await user.selectOptions(select, '2');

    expect(mockOnAccountChange).toHaveBeenCalledWith('2');
  });

  it('renders all account names in classroom selector', () => {
    render(
      <ClassroomSwitcher
        accounts={[accountA, accountB]}
        currentAccount={accountA}
        onAccountChange={mockOnAccountChange}
        onCreateNew={mockOnCreateNew}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByRole('option', { name: 'Physics Lab' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Chemistry Room' })).toBeInTheDocument();
  });

  it('calls onDelete with current account id', async () => {
    const user = userEvent.setup();
    render(
      <ClassroomSwitcher
        accounts={[accountA, accountB]}
        currentAccount={accountB}
        onAccountChange={mockOnAccountChange}
        onCreateNew={mockOnCreateNew}
        onDelete={mockOnDelete}
      />
    );

    await user.click(screen.getByTitle('Delete classroom'));

    expect(mockOnDelete).toHaveBeenCalledWith('2');
  });

  it('disables delete button when only one classroom exists', () => {
    render(
      <ClassroomSwitcher
        accounts={[accountA]}
        currentAccount={accountA}
        onAccountChange={mockOnAccountChange}
        onCreateNew={mockOnCreateNew}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getByTitle('Cannot delete last classroom');
    expect(deleteButton).toBeDisabled();
  });

  it('updates selected value when currentAccount prop changes', () => {
    const { rerender } = render(
      <ClassroomSwitcher
        accounts={[accountA, accountB]}
        currentAccount={accountA}
        onAccountChange={mockOnAccountChange}
        onCreateNew={mockOnCreateNew}
        onDelete={mockOnDelete}
      />
    );

    const selectBefore = screen.getByLabelText('classroom-switcher-select') as HTMLSelectElement;
    expect(selectBefore.value).toBe('1');

    rerender(
      <ClassroomSwitcher
        accounts={[accountA, accountB]}
        currentAccount={accountB}
        onAccountChange={mockOnAccountChange}
        onCreateNew={mockOnCreateNew}
        onDelete={mockOnDelete}
      />
    );

    const selectAfter = screen.getByLabelText('classroom-switcher-select') as HTMLSelectElement;
    expect(selectAfter.value).toBe('2');
  });
});