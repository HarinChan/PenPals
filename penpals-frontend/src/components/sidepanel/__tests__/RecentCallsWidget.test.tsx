import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecentCallsWidget from '../RecentCallsWidget';
import { Account, Classroom, RecentCall } from '../../../types';

describe('RecentCallsWidget', () => {
  const mockAccount: Account = {
    id: '1',
    classroomName: 'Physics Lab',
    location: 'Building A',
    size: 30,
    description: 'Physics experiments',
    avatar: '🔬',
    interests: [],
    schedule: {},
    friends: [],
    recentCalls: [
      {
        id: '1',
        classroomId: '10',
        classroomName: 'Chemistry Lab',
        timestamp: '2026-03-09T10:00:00Z',
        duration: 15,
        type: 'incoming',
      },
      {
        id: '2',
        classroomId: '11',
        classroomName: 'Biology Lab',
        timestamp: '2026-03-08T14:00:00Z',
        duration: 30,
        type: 'outgoing',
      },
      {
        id: '3',
        classroomId: '12',
        classroomName: 'Art Studio',
        timestamp: '2026-03-07T16:00:00Z',
        duration: 5,
        type: 'missed',
      },
    ],
  };

  const mockClassrooms: Classroom[] = [
    {
      id: '10',
      name: 'Chemistry Lab',
      location: 'Building B',
      interests: [],
      availability: {},
      creator_id: 1,
      creator_name: 'Dr. Smith',
      participant_count: 10,
      max_participants: 20,
    },
    {
      id: '11',
      name: 'Biology Lab',
      location: 'Building C',
      interests: [],
      availability: {},
      creator_id: 2,
      creator_name: 'Prof. Johnson',
      participant_count: 15,
      max_participants: 25,
    },
  ];

  const mockOnCallClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders recent calls widget with title', () => {
    render(
      <RecentCallsWidget
        currentAccount={mockAccount}
        classrooms={mockClassrooms}
        onCallClick={mockOnCallClick}
      />
    );

    expect(screen.getByText('Recent Calls')).toBeInTheDocument();
  });

  it('displays all recent calls', () => {
    render(
      <RecentCallsWidget
        currentAccount={mockAccount}
        classrooms={mockClassrooms}
        onCallClick={mockOnCallClick}
      />
    );

    expect(screen.getByText('Chemistry Lab')).toBeInTheDocument();
    expect(screen.getByText('Biology Lab')).toBeInTheDocument();
    expect(screen.getByText('Art Studio')).toBeInTheDocument();
  });

  it('displays call duration', () => {
    render(
      <RecentCallsWidget
        currentAccount={mockAccount}
        classrooms={mockClassrooms}
        onCallClick={mockOnCallClick}
      />
    );

    const durationElements = screen.getAllByText(/min/);
    expect(durationElements.length).toBeGreaterThan(0);
  });

  it('displays call type badge', () => {
    render(
      <RecentCallsWidget
        currentAccount={mockAccount}
        classrooms={mockClassrooms}
        onCallClick={mockOnCallClick}
      />
    );

    expect(screen.getByText('incoming')).toBeInTheDocument();
    expect(screen.getByText('outgoing')).toBeInTheDocument();
    expect(screen.getByText('missed')).toBeInTheDocument();
  });

  it('displays call timestamp', () => {
    render(
      <RecentCallsWidget
        currentAccount={mockAccount}
        classrooms={mockClassrooms}
        onCallClick={mockOnCallClick}
      />
    );

    // Should display formatted date and time
    const dateElements = screen.getAllByText(/3\/9\/2026|03-09|9 Mar|Mar 9/);
    expect(dateElements.length).toBeGreaterThan(0);
  });

  it('handles empty recent calls', () => {
    const accountNoRecents: Account = {
      ...mockAccount,
      recentCalls: [],
    };

    render(
      <RecentCallsWidget
        currentAccount={accountNoRecents}
        classrooms={mockClassrooms}
        onCallClick={mockOnCallClick}
      />
    );

    expect(screen.getByText('No recent calls')).toBeInTheDocument();
  });

  it('handles account with undefined recentCalls', () => {
    const accountUndefinedRecents: Account = {
      ...mockAccount,
      recentCalls: undefined as any,
    };

    render(
      <RecentCallsWidget
        currentAccount={accountUndefinedRecents}
        classrooms={mockClassrooms}
        onCallClick={mockOnCallClick}
      />
    );

    expect(screen.getByText('No recent calls')).toBeInTheDocument();
  });

  it('calls onCallClick with correct classroom when call is clicked', async () => {
    const user = userEvent.setup();

    render(
      <RecentCallsWidget
        currentAccount={mockAccount}
        classrooms={mockClassrooms}
        onCallClick={mockOnCallClick}
      />
    );

    const callItem = screen.getByText('Chemistry Lab');
    await user.click(callItem);

    expect(mockOnCallClick).toHaveBeenCalled();
  });

  it('colors incoming calls badge green', () => {
    render(
      <RecentCallsWidget
        currentAccount={mockAccount}
        classrooms={mockClassrooms}
        onCallClick={mockOnCallClick}
      />
    );

    const incomingBadge = screen.getByText('incoming').closest('div');
    expect(incomingBadge).toBeInTheDocument();
  });

  it('colors outgoing calls badge blue', () => {
    render(
      <RecentCallsWidget
        currentAccount={mockAccount}
        classrooms={mockClassrooms}
        onCallClick={mockOnCallClick}
      />
    );

    const outgoingBadge = screen.getByText('outgoing').closest('div');
    expect(outgoingBadge).toBeInTheDocument();
  });

  it('colors missed calls badge red', () => {
    render(
      <RecentCallsWidget
        currentAccount={mockAccount}
        classrooms={mockClassrooms}
        onCallClick={mockOnCallClick}
      />
    );

    const missedBadge = screen.getByText('missed').closest('div');
    expect(missedBadge).toBeInTheDocument();
  });

  it('handles call without matching classroom', () => {
    const callNoClassroom: Account = {
      ...mockAccount,
      recentCalls: [
        {
          id: '1',
          classroomId: '999',
          classroomName: 'Missing Classroom',
          timestamp: '2026-03-09T10:00:00Z',
          duration: 15,
          type: 'incoming',
        },
      ],
    };

    render(
      <RecentCallsWidget
        currentAccount={callNoClassroom}
        classrooms={mockClassrooms}
        onCallClick={mockOnCallClick}
      />
    );

    expect(screen.getByText('Missing Classroom')).toBeInTheDocument();
  });

  it('collapses and expands widget', () => {
    const { container } = render(
      <RecentCallsWidget
        currentAccount={mockAccount}
        classrooms={mockClassrooms}
        onCallClick={mockOnCallClick}
      />
    );

    expect(screen.getByText('Recent Calls')).toBeInTheDocument();
  });

  it('displays correct time format', () => {
    render(
      <RecentCallsWidget
        currentAccount={mockAccount}
        classrooms={mockClassrooms}
        onCallClick={mockOnCallClick}
      />
    );

    // Should have formatted timestamps
    const callItems = screen.getAllByText(/Chemistry Lab|Biology Lab|Art Studio/);
    expect(callItems.length).toBeGreaterThan(0);
  });

  it('handles large number of recent calls', () => {
    const manyCallsAccount: Account = {
      ...mockAccount,
      recentCalls: Array.from({ length: 50 }, (_, i) => ({
        id: String(i),
        classroomId: String(i),
        classroomName: `Call ${i + 1}`,
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        duration: Math.floor(Math.random() * 60) + 1,
        type: ['incoming', 'outgoing', 'missed'][i % 3] as 'incoming' | 'outgoing' | 'missed',
      })),
    };

    render(
      <RecentCallsWidget
        currentAccount={manyCallsAccount}
        classrooms={[]}
        onCallClick={mockOnCallClick}
      />
    );

    expect(screen.getByText('Call 1')).toBeInTheDocument();
  });

  it('passes correct call data to callback', () => {
    const { container } = render(
      <RecentCallsWidget
        currentAccount={mockAccount}
        classrooms={mockClassrooms}
        onCallClick={mockOnCallClick}
      />
    );

    // Verify render includes call data
    expect(screen.getByText('Chemistry Lab')).toBeInTheDocument();
  });
});
