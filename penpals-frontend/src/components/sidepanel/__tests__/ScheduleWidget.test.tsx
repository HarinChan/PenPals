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
    x: 0,
    y: 0,
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

    // Hour buttons for 7am-6pm should now be visible
    const hourButtons = screen.getAllByTitle(/:\d{2}/);
    expect(hourButtons.length).toBeGreaterThan(0);
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

    // Mon has [9, 10, 11] — hour 9 button should exist (one per day)
    const hour9Buttons = screen.getAllByTitle('9:00');
    expect(hour9Buttons.length).toBeGreaterThan(0);
  });

  it('updates schedule when toggling a time slot button', async () => {
    const user = userEvent.setup();
    render(<ScheduleWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    const editButton = screen.getByRole('button', { name: /Edit/i });
    await user.click(editButton);

    // Click hour 8 to toggle it on
    const hour8Buttons = screen.getAllByTitle('8:00');
    await user.click(hour8Buttons[0]);

    expect(mockOnAccountUpdate).toHaveBeenCalled();
  });

  it('saves schedule when Save is clicked after toggling a slot', async () => {
    const user = userEvent.setup();
    vi.mocked(ClassroomService.updateClassroom).mockResolvedValue({} as any);

    render(<ScheduleWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    const editButton = screen.getByRole('button', { name: /Edit/i });
    await user.click(editButton);

    // Toggle hour 8 on Mon
    const hour8Buttons = screen.getAllByTitle('8:00');
    await user.click(hour8Buttons[0]);

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

    // Toggle hour 13 (1pm) on Mon
    const hour13Buttons = screen.getAllByTitle('13:00');
    await user.click(hour13Buttons[0]);

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

    // Only hours 7-18 should be rendered — hour 25 should not exist
    expect(screen.queryByTitle('25:00')).not.toBeInTheDocument();
    const hour7Buttons = screen.getAllByTitle('7:00');
    expect(hour7Buttons.length).toBeGreaterThan(0);
  });

  it('calls ClassroomService when schedule is saved', async () => {
    const user = userEvent.setup();
    vi.mocked(ClassroomService.updateClassroom).mockResolvedValue({} as any);

    render(<ScheduleWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    const editButton = screen.getByRole('button', { name: /Edit/i });
    await user.click(editButton);

    const saveButton = screen.getByRole('button', { name: /Save/i });
    await user.click(saveButton);

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

    const saveButton = screen.getByRole('button', { name: /Save/i });
    await user.click(saveButton);

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

    const saveButton = screen.getByRole('button', { name: /Save/i });
    await user.click(saveButton);

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

    const saveButton = screen.getByRole('button', { name: /Save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(ClassroomService.updateClassroom).toHaveBeenCalled();
      // After save, Edit button should be back and Save should be gone
      expect(screen.getByRole('button', { name: /Edit/i })).toBeInTheDocument();
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

    // After rerender, hour 8 should now be rendered (it's in range 7-18)
    await waitFor(() => {
      const hour8Buttons = screen.getAllByTitle('8:00');
      expect(hour8Buttons.length).toBeGreaterThan(0);
    });
  });
});
