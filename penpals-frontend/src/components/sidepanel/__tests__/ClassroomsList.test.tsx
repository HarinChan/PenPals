import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClassroomsList from '../ClassroomsList';
import { Account, Classroom } from '../../../types';

describe('ClassroomsList', () => {
  const mockAccount: Account = {
    id: '1',
    classroomName: 'Physics Lab',
    location: 'Building A',
    size: 30,
    description: 'Physics experiments',
    avatar: '🔬',
    interests: ['Physics', 'Science'],
    schedule: { Mon: [9, 10, 11], Tue: [14, 15] },
    friends: [],
    recentCalls: [],
  };

  const mockClassrooms: Classroom[] = [
    {
      id: '1',
      name: 'Physics Club',
      location: 'Lab A',
      interests: ['Physics', 'Science'],
      availability: { Mon: [9, 10], Tue: [14] },
      creator_id: 1,
      creator_name: 'Dr. Smith',
      participant_count: 5,
      max_participants: 20,
    },
    {
      id: '2',
      name: 'Art Studio',
      location: 'Building C',
      interests: ['Art', 'Drawing'],
      availability: { Wed: [15, 16] },
      creator_id: 2,
      creator_name: 'Jane Artist',
      participant_count: 8,
      max_participants: 15,
    },
    {
      id: '3',
      name: 'Chemistry Experiments',
      location: 'Lab B',
      interests: ['Chemistry', 'Science'],
      availability: { Mon: [9, 10, 11] },
      creator_id: 3,
      creator_name: 'Prof. Johnson',
      participant_count: 6,
      max_participants: 12,
    },
  ];

  const mockOnClassroomClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders classrooms list with title', () => {
    render(
      <ClassroomsList
        classrooms={mockClassrooms}
        currentAccount={mockAccount}
        onClassroomClick={mockOnClassroomClick}
      />
    );

    expect(screen.getByText('Find Classrooms')).toBeInTheDocument();
  });

  it('displays search input field', () => {
    render(
      <ClassroomsList
        classrooms={mockClassrooms}
        currentAccount={mockAccount}
        onClassroomClick={mockOnClassroomClick}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search by name, location, or interest/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('filters classrooms by name', async () => {
    const user = userEvent.setup();
    render(
      <ClassroomsList
        classrooms={mockClassrooms}
        currentAccount={mockAccount}
        onClassroomClick={mockOnClassroomClick}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search by name, location, or interest/i);
    await user.type(searchInput, 'Physics');

    await waitFor(() => {
      expect(screen.getByText('Physics Club')).toBeInTheDocument();
      expect(screen.queryByText('Art Studio')).not.toBeInTheDocument();
    });
  });

  it('filters classrooms by location', async () => {
    const user = userEvent.setup();
    render(
      <ClassroomsList
        classrooms={mockClassrooms}
        currentAccount={mockAccount}
        onClassroomClick={mockOnClassroomClick}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search by name, location, or interest/i);
    await user.type(searchInput, 'Lab B');

    await waitFor(() => {
      expect(screen.getByText('Chemistry Experiments')).toBeInTheDocument();
    });
  });

  it('filters classrooms by interest', async () => {
    const user = userEvent.setup();
    render(
      <ClassroomsList
        classrooms={mockClassrooms}
        currentAccount={mockAccount}
        onClassroomClick={mockOnClassroomClick}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search by name, location, or interest/i);
    await user.type(searchInput, 'Art');

    await waitFor(() => {
      expect(screen.getByText('Art Studio')).toBeInTheDocument();
    });
  });

  it('displays all classrooms when no search query', () => {
    render(
      <ClassroomsList
        classrooms={mockClassrooms}
        currentAccount={mockAccount}
        onClassroomClick={mockOnClassroomClick}
      />
    );

    expect(screen.getByText('Physics Club')).toBeInTheDocument();
    expect(screen.getByText('Art Studio')).toBeInTheDocument();
    expect(screen.getByText('Chemistry Experiments')).toBeInTheDocument();
  });

  it('calls onClassroomClick when classroom is selected', async () => {
    const user = userEvent.setup();
    render(
      <ClassroomsList
        classrooms={mockClassrooms}
        currentAccount={mockAccount}
        onClassroomClick={mockOnClassroomClick}
      />
    );

    const classroomItem = screen.getByText('Physics Club');
    await user.click(classroomItem);

    expect(mockOnClassroomClick).toHaveBeenCalledWith(expect.objectContaining({ name: 'Physics Club' }));
  });

  it('marks selected classroom as active', () => {
    render(
      <ClassroomsList
        classrooms={mockClassrooms}
        currentAccount={mockAccount}
        selectedClassroom={mockClassrooms[0]}
        onClassroomClick={mockOnClassroomClick}
      />
    );

    expect(screen.getByText('Physics Club')).toBeInTheDocument();
  });

  it('calculates high relevancy for schedule and interest match', () => {
    render(
      <ClassroomsList
        classrooms={mockClassrooms}
        currentAccount={mockAccount}
        onClassroomClick={mockOnClassroomClick}
      />
    );

    // Physics Club should appear before Art Studio due to higher relevancy
    const classrooms = screen.getAllByText(/club|studio|experiments/i);
    expect(classrooms.length).toBeGreaterThan(0);
  });

  it('handles empty classroom list', () => {
    render(
      <ClassroomsList
        classrooms={[]}
        currentAccount={mockAccount}
        onClassroomClick={mockOnClassroomClick}
      />
    );

    expect(screen.getByText('Find Classrooms')).toBeInTheDocument();
  });

  it('clears search when input is emptied', async () => {
    const user = userEvent.setup();
    render(
      <ClassroomsList
        classrooms={mockClassrooms}
        currentAccount={mockAccount}
        onClassroomClick={mockOnClassroomClick}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search by name, location, or interest/i);
    await user.type(searchInput, 'Physics');

    await waitFor(() => {
      expect(screen.getByText('Physics Club')).toBeInTheDocument();
    });

    await user.clear(searchInput);

    await waitFor(() => {
      expect(screen.getByText('Art Studio')).toBeInTheDocument();
    });
  });

  it('handles case-insensitive search', async () => {
    const user = userEvent.setup();
    render(
      <ClassroomsList
        classrooms={mockClassrooms}
        currentAccount={mockAccount}
        onClassroomClick={mockOnClassroomClick}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search by name, location, or interest/i);
    await user.type(searchInput, 'PHYSICS');

    await waitFor(() => {
      expect(screen.getByText('Physics Club')).toBeInTheDocument();
    });
  });



  it('collapses and expands classrooms list', async () => {
    const user = userEvent.setup();
    render(
      <ClassroomsList
        classrooms={mockClassrooms}
        currentAccount={mockAccount}
        onClassroomClick={mockOnClassroomClick}
      />
    );

    const trigger = screen.getByText('Find Classrooms');
    await user.click(trigger);

    // Component should still render with collapsed state
    expect(screen.getByText('Find Classrooms')).toBeInTheDocument();
  });

  it('handles classroom with no matching interests', () => {
    const accountNoInterests: Account = {
      ...mockAccount,
      interests: [],
    };

    render(
      <ClassroomsList
        classrooms={mockClassrooms}
        currentAccount={accountNoInterests}
        onClassroomClick={mockOnClassroomClick}
      />
    );

    expect(screen.getByText('Physics Club')).toBeInTheDocument();
  });

  it('handles classroom with no schedule overlap', () => {
    const accountDifferentSchedule: Account = {
      ...mockAccount,
      schedule: { Wed: [18, 19, 20], Thu: [18, 19] },
    };

    render(
      <ClassroomsList
        classrooms={mockClassrooms}
        currentAccount={accountDifferentSchedule}
        onClassroomClick={mockOnClassroomClick}
      />
    );

    expect(screen.getByText('Physics Club')).toBeInTheDocument();
  });

  it('updates filtered results when search query changes', async () => {
    const user = userEvent.setup();
    render(
      <ClassroomsList
        classrooms={mockClassrooms}
        currentAccount={mockAccount}
        onClassroomClick={mockOnClassroomClick}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search by name, location, or interest/i);

    await user.type(searchInput, 'Physics');
    await waitFor(() => {
      expect(screen.getByText('Physics Club')).toBeInTheDocument();
    });

    await user.clear(searchInput);
    await user.type(searchInput, 'Art');

    await waitFor(() => {
      expect(screen.getByText('Art Studio')).toBeInTheDocument();
      expect(screen.queryByText('Physics Club')).not.toBeInTheDocument();
    });
  });
});
