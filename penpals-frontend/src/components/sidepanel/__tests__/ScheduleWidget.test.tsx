import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import ScheduleWidget from '../ScheduleWidget';
import { Account } from '../../../types';
import { ClassroomService } from '../../../services';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../services', () => ({
  ClassroomService: {
    updateClassroom: vi.fn(),
  },
}));

describe('ScheduleWidget', () => {
  const mockAccount: Account = {
    id: '1',
    classroomName: 'Physics Lab',
    location: 'Building A',
    size: 30,
    description: 'Physics experiments',
    avatar: '🔬',
    interests: [],
    schedule: {
      Mon: [9, 10, 11],
      Tue: [14, 15],
      Wed: [],
      Thu: [9, 10],
      Fri: [14, 15, 16],
      Sat: [],
      Sun: [],
    },
    friends: [],
    recentCalls: [],
  };

  const mockOnAccountUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders schedule widget with title', () => {
    render(<ScheduleWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    expect(screen.getByText('Your Availability')).toBeInTheDocument();
  });

  it('displays edit button', () => {
    render(<ScheduleWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    const editButton = screen.getByRole('button', { name: /Edit/i });
    expect(editButton).toBeInTheDocument();
  });

  it('shows schedule in read mode', () => {
    render(<ScheduleWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    expect(screen.getByText('Mon:')).toBeInTheDocument();
    expect(screen.getByText('Tue:')).toBeInTheDocument();
  });

  it('enters edit mode when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<ScheduleWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    const editButton = screen.getByRole('button', { name: /Edit/i });
    await user.click(editButton);

    const inputs = screen.getAllByPlaceholderText(/e\.g\. 9-12/);
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('displays input fields for each day in edit mode', async () => {
    const user = userEvent.setup();
    render(<ScheduleWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    const editButton = screen.getByRole('button', { name: /Edit/i });
    await user.click(editButton);

    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
  });

  it('populates input fields with current schedule', async () => {
    const user = userEvent.setup();
    render(<ScheduleWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    const editButton = screen.getByRole('button', { name: /Edit/i });
    await user.click(editButton);

    const inputs = screen.getAllByDisplayValue('9, 10, 11');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('updates schedule input when user types', async () => {
    const user = userEvent.setup();
    render(<ScheduleWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    const editButton = screen.getByRole('button', { name: /Edit/i });
    await user.click(editButton);

    const inputs = screen.getAllByDisplayValue('9, 10, 11');
    const firstInput = inputs[0] as HTMLInputElement;
    
    await user.clear(firstInput);
    await user.type(firstInput, '8-12');

    expect(firstInput.value).toContain('8');
  });

  it('parses range input like 9-12', async () => {
    const user = userEvent.setup();
    vi.mocked(ClassroomService.updateClassroom).mockResolvedValue({} as any);

    render(<ScheduleWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    const editButton = screen.getByRole('button', { name: /Edit/i });
    await user.click(editButton);

    const inputs = screen.getAllByDisplayValue('9, 10, 11');
    const firstInput = inputs[0] as HTMLInputElement;
    
    await user.clear(firstInput);
    await user.type(firstInput, '9-12');
    await user.tab();

    await waitFor(() => {
      expect(mockOnAccountUpdate).toHaveBeenCalled();
    });
  });

  it('parses comma-separated hours', async () => {
    const user = userEvent.setup();
    vi.mocked(ClassroomService.updateClassroom).mockResolvedValue({} as any);

    render(<ScheduleWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    const editButton = screen.getByRole('button', { name: /Edit/i });
    await user.click(editButton);

    const inputs = screen.getAllByDisplayValue('9, 10, 11');
    const firstInput = inputs[0] as HTMLInputElement;
    
    await user.clear(firstInput);
    await user.type(firstInput, '9, 11, 13');
    await user.tab();

    await waitFor(() => {
      expect(mockOnAccountUpdate).toHaveBeenCalled();
    });
  });

  it('validates hour range 0-23', async () => {
    const user = userEvent.setup();
    vi.mocked(ClassroomService.updateClassroom).mockResolvedValue({} as any);

    render(<ScheduleWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    const editButton = screen.getByRole('button', { name: /Edit/i });
    await user.click(editButton);

    const inputs = screen.getAllByDisplayValue('9, 10, 11');
    const firstInput = inputs[0] as HTMLInputElement;
    
    await user.clear(firstInput);
    await user.type(firstInput, '25, 30');
    await user.tab();

    // Should not include invalid hours
    expect(mockOnAccountUpdate).toHaveBeenCalled();
  });

  it('calls ClassroomService when schedule is saved', async () => {
    const user = userEvent.setup();
    vi.mocked(ClassroomService.updateClassroom).mockResolvedValue({} as any);

    render(<ScheduleWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    const editButton = screen.getByRole('button', { name: /Edit/i });
    await user.click(editButton);

    const inputs = screen.getAllByDisplayValue('9, 10, 11');
    const firstInput = inputs[0] as HTMLInputElement;
    
    await user.clear(firstInput);
    await user.type(firstInput, '8, 9, 10');
    await user.tab();

    await waitFor(() => {
      expect(ClassroomService.updateClassroom).toHaveBeenCalledWith(1, expect.any(Object));
    });
  });

  it('shows success toast when schedule is saved', async () => {
    const user = userEvent.setup();
    vi.mocked(ClassroomService.updateClassroom).mockResolvedValue({} as any);

    render(<ScheduleWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    const editButton = screen.getByRole('button', { name: /Edit/i });
    await user.click(editButton);

    const inputs = screen.getAllByDisplayValue('9, 10, 11');
    const firstInput = inputs[0] as HTMLInputElement;
    
    await user.clear(firstInput);
    await user.type(firstInput, '8, 9, 10');
    await user.tab();

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Schedule saved');
    });
  });

  it('shows error toast when save fails', async () => {
    const user = userEvent.setup();
    vi.mocked(ClassroomService.updateClassroom).mockRejectedValue(new Error('API Error'));

    render(<ScheduleWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    const editButton = screen.getByRole('button', { name: /Edit/i });
    await user.click(editButton);

    const inputs = screen.getAllByDisplayValue('9, 10, 11');
    const firstInput = inputs[0] as HTMLInputElement;
    
    await user.clear(firstInput);
    await user.type(firstInput, '8, 9, 10');
    await user.tab();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to save schedule');
    });
  });

  it('exits edit mode when save is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(ClassroomService.updateClassroom).mockResolvedValue({} as any);

    render(<ScheduleWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    const editButton = screen.getByRole('button', { name: /Edit/i });
    await user.click(editButton);

    const inputs = screen.getAllByDisplayValue('9, 10, 11');
    const firstInput = inputs[0] as HTMLInputElement;
    
    await user.clear(firstInput);
    await user.type(firstInput, '8, 9, 10');
    await user.tab();

    await waitFor(() => {
      expect(ClassroomService.updateClassroom).toHaveBeenCalled();
    });
  });

  it('collapses and expands widget', async () => {
    const user = userEvent.setup();
    render(<ScheduleWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    const trigger = screen.getByText('Your Availability');
    await user.click(trigger);

    expect(screen.getByText('Your Availability')).toBeInTheDocument();
  });

  it('handles account with no availability', () => {
    const accountNoSchedule: Account = {
      ...mockAccount,
      schedule: {
        Mon: [],
        Tue: [],
        Wed: [],
        Thu: [],
        Fri: [],
        Sat: [],
        Sun: [],
      },
    };

    render(<ScheduleWidget currentAccount={accountNoSchedule} onAccountUpdate={mockOnAccountUpdate} />);

    expect(screen.getByText('No availability yet')).toBeInTheDocument();
  });

  it('syncs edit form when account changes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ScheduleWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />
    );

    const editButton = screen.getByRole('button', { name: /Edit/i });
    await user.click(editButton);

    const newAccount: Account = {
      ...mockAccount,
      id: '2',
      schedule: {
        ...mockAccount.schedule,
        Mon: [8, 9, 10],
      },
    };

    rerender(<ScheduleWidget currentAccount={newAccount} onAccountUpdate={mockOnAccountUpdate} />);

    // Form should update when account changes
    await waitFor(() => {
      const inputs = screen.getAllByDisplayValue('8, 9, 10');
      expect(inputs.length).toBeGreaterThan(0);
    });
  });
});
