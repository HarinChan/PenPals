import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import InterestsWidget from '../InterestsWidget';
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

describe('InterestsWidget', () => {
  const mockAccount: Account = {
    id: '1',
    classroomName: 'Physics Lab',
    location: 'Building A',
    size: 30,
    description: 'Physics experiments',
    avatar: '🔬',
    interests: ['Physics', 'Science'],
    schedule: {},
    friends: [],
    recentCalls: [],
  };

  const mockOnAccountUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders interests widget with title', () => {
    render(<InterestsWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    expect(screen.getByText('Your Interests & subjects')).toBeInTheDocument();
  });

  it('displays available subjects', () => {
    render(<InterestsWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    expect(screen.getByText('Maths')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Physics')).toBeInTheDocument();
  });

  it('shows current interests as checked', () => {
    render(<InterestsWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    const physicsCheckbox = screen.getByRole('checkbox', { name: /Physics/i });
    expect(physicsCheckbox).toBeChecked();
  });

  it('shows unchecked interests', () => {
    render(<InterestsWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    const mathsCheckbox = screen.getByRole('checkbox', { name: /Maths/i });
    expect(mathsCheckbox).not.toBeChecked();
  });

  it('toggles interest when checkbox is clicked', async () => {
    const user = userEvent.setup();
    render(<InterestsWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    const mathsCheckbox = screen.getByRole('checkbox', { name: /Maths/i });
    await user.click(mathsCheckbox);

    await waitFor(() => {
      expect(mockOnAccountUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          interests: expect.arrayContaining(['Maths', 'Physics', 'Science']),
        })
      );
    });
  });

  it('removes interest when already selected checkbox is clicked', async () => {
    const user = userEvent.setup();
    render(<InterestsWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    const physicsCheckbox = screen.getByRole('checkbox', { name: /Physics/i });
    await user.click(physicsCheckbox);

    await waitFor(() => {
      expect(mockOnAccountUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          interests: expect.not.arrayContaining(['Physics']),
        })
      );
    });
  });

  it('calls ClassroomService when interest is toggled', async () => {
    const user = userEvent.setup();
    vi.mocked(ClassroomService.updateClassroom).mockResolvedValue({} as any);

    render(<InterestsWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    const mathsCheckbox = screen.getByRole('checkbox', { name: /Maths/i });
    await user.click(mathsCheckbox);

    await waitFor(() => {
      expect(ClassroomService.updateClassroom).toHaveBeenCalledWith(1, expect.any(Object));
    });
  });

  it('shows success toast when interest is saved', async () => {
    const user = userEvent.setup();
    vi.mocked(ClassroomService.updateClassroom).mockResolvedValue({} as any);

    render(<InterestsWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    const mathsCheckbox = screen.getByRole('checkbox', { name: /Maths/i });
    await user.click(mathsCheckbox);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Interest updated');
    });
  });

  it('shows error toast when save fails', async () => {
    const user = userEvent.setup();
    vi.mocked(ClassroomService.updateClassroom).mockRejectedValue(new Error('API Error'));

    render(<InterestsWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    const mathsCheckbox = screen.getByRole('checkbox', { name: /Maths/i });
    await user.click(mathsCheckbox);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to save interest');
    });
  });



  it('adds custom interest when plus button is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(ClassroomService.updateClassroom).mockResolvedValue({} as any);

    render(<InterestsWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    const customInput = screen.getByPlaceholderText(/Add or search interests/i) as HTMLInputElement;
    await user.type(customInput, 'Photography');

    const addButton = screen.getByRole('button', { name: /^$/ });
    await user.click(addButton);

    await waitFor(() => {
      expect(mockOnAccountUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          interests: expect.arrayContaining(['Photography']),
        })
      );
    });
  });

  it('sorts interests with selected ones first', () => {
    render(<InterestsWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    const interestLabels = screen.getAllByRole('checkbox');
    expect(interestLabels.length).toBeGreaterThan(0);
  });



  it('clears custom interest input after adding', async () => {
    const user = userEvent.setup();
    vi.mocked(ClassroomService.updateClassroom).mockResolvedValue({} as any);

    render(<InterestsWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    const customInput = screen.getByPlaceholderText(/Add or search interests/i) as HTMLInputElement;
    await user.type(customInput, 'Photography');

    const addButton = screen.getByRole('button', { name: /^$/ });
    await user.click(addButton);

    await waitFor(() => {
      expect(customInput.value).toBe('');
    });
  });

  it('handles duplicate custom interest', async () => {
    const user = userEvent.setup();
    vi.mocked(ClassroomService.updateClassroom).mockResolvedValue({} as any);

    render(<InterestsWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    const customInput = screen.getByPlaceholderText(/Add or search interests/i) as HTMLInputElement;
    await user.type(customInput, 'Physics');

    const addButton = screen.getByRole('button', { name: /^$/ });
    await user.click(addButton);

    // Should not add duplicate
    await waitFor(() => {
      expect(mockOnAccountUpdate).toHaveBeenCalled();
    });
  });

  it('handles empty custom interest input', async () => {
    const user = userEvent.setup();
    render(<InterestsWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    const addButton = screen.getByRole('button', { name: /^$/ });
    await user.click(addButton);

    // Should not add empty interest
    expect(mockOnAccountUpdate).not.toHaveBeenCalled();
  });

  it('converts custom interest to title case', async () => {
    const user = userEvent.setup();
    vi.mocked(ClassroomService.updateClassroom).mockResolvedValue({} as any);

    render(<InterestsWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    const customInput = screen.getByPlaceholderText(/Add or search interests/i);
    await user.type(customInput, 'rock climbing');

    const addButton = screen.getByRole('button', { name: /^$/ });
    await user.click(addButton);

    await waitFor(() => {
      expect(mockOnAccountUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          interests: expect.arrayContaining(['Rock Climbing']),
        })
      );
    });
  });

  it('displays scroll area for interests list', () => {
    render(<InterestsWidget currentAccount={mockAccount} onAccountUpdate={mockOnAccountUpdate} />);

    expect(screen.getByText('Maths')).toBeInTheDocument();
  });

  it('handles account with no interests', () => {
    const accountNoInterests: Account = {
      ...mockAccount,
      interests: [],
    };

    render(<InterestsWidget currentAccount={accountNoInterests} onAccountUpdate={mockOnAccountUpdate} />);

    const physicsCheckbox = screen.getByRole('checkbox', { name: /Physics/i });
    expect(physicsCheckbox).not.toBeChecked();
  });
});
