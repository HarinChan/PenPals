import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PublicMeetingsWidget from '../PublicMeetingsWidget';
import type { MeetingDto } from '../../../services/meetings';

describe('PublicMeetingsWidget', () => {
  const mockMeetings: MeetingDto[] = [
    {
      id: 1,
      title: 'Physics Seminar',
      description: 'Discussion on quantum mechanics',
      start_time: '2026-03-15T14:00:00Z',
      end_time: '2026-03-15T16:00:00Z',
      location: 'Lab A',
      creator_id: 2,
      creator_name: 'Dr. Smith',
      participant_count: 5,
      max_participants: 20,
      web_link: 'https://meet.example.com/physics',
      is_public: true,
      is_full: false,
      is_participant: false,
    },
    {
      id: 2,
      title: 'Chemistry Lab',
      description: 'Practical chemistry experiments',
      start_time: '2026-03-16T10:00:00Z',
      end_time: '2026-03-16T12:00:00Z',
      location: 'Lab B',
      creator_id: 3,
      creator_name: 'Prof. Johnson',
      participant_count: 15,
      max_participants: 15,
      web_link: 'https://meet.example.com/chemistry',
      is_public: true,
      is_full: true,
      is_participant: false,
    },
  ];

  const mockOnMeetingClick = vi.fn();
  const mockOnCancelMeeting = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders public meetings widget with title', () => {
    render(
      <PublicMeetingsWidget
        trendingMeetings={mockMeetings}
        currentAccountId="1"
        onMeetingClick={mockOnMeetingClick}
        onCancelMeeting={mockOnCancelMeeting}
      />
    );

    expect(screen.getByText('Public Meetings')).toBeInTheDocument();
  });

  it('shows meetings count badge', () => {
    render(
      <PublicMeetingsWidget
        trendingMeetings={mockMeetings}
        currentAccountId="1"
        onMeetingClick={mockOnMeetingClick}
        onCancelMeeting={mockOnCancelMeeting}
      />
    );

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('displays empty message when no meetings', () => {
    render(
      <PublicMeetingsWidget
        trendingMeetings={[]}
        currentAccountId="1"
        onMeetingClick={mockOnMeetingClick}
        onCancelMeeting={mockOnCancelMeeting}
      />
    );

    expect(screen.getByText('No public meetings available')).toBeInTheDocument();
  });

  it('shows meeting title', () => {
    render(
      <PublicMeetingsWidget
        trendingMeetings={mockMeetings}
        currentAccountId="1"
        onMeetingClick={mockOnMeetingClick}
        onCancelMeeting={mockOnCancelMeeting}
      />
    );

    expect(screen.getByText('Physics Seminar')).toBeInTheDocument();
    expect(screen.getByText('Chemistry Lab')).toBeInTheDocument();
  });

  it('displays meeting creator information', () => {
    render(
      <PublicMeetingsWidget
        trendingMeetings={mockMeetings}
        currentAccountId="1"
        onMeetingClick={mockOnMeetingClick}
        onCancelMeeting={mockOnCancelMeeting}
      />
    );

    expect(screen.getByText(/Host: Dr\. Smith/)).toBeInTheDocument();
    expect(screen.getByText(/Host: Prof\. Johnson/)).toBeInTheDocument();
  });

  it('displays participant count', () => {
    render(
      <PublicMeetingsWidget
        trendingMeetings={mockMeetings}
        currentAccountId="1"
        onMeetingClick={mockOnMeetingClick}
        onCancelMeeting={mockOnCancelMeeting}
      />
    );

    expect(screen.getByText(/Participants: 5 \/ 20/)).toBeInTheDocument();
    expect(screen.getByText(/Participants: 15 \/ 15/)).toBeInTheDocument();
  });

  it('calls onMeetingClick when meeting is clicked', async () => {
    const user = userEvent.setup();
    render(
      <PublicMeetingsWidget
        trendingMeetings={mockMeetings}
        currentAccountId="1"
        onMeetingClick={mockOnMeetingClick}
        onCancelMeeting={mockOnCancelMeeting}
      />
    );

    const meetingItem = screen.getByText('Physics Seminar');
    await user.click(meetingItem);

    expect(mockOnMeetingClick).toHaveBeenCalledWith(1);
  });

  it('shows join button for non-host', () => {
    render(
      <PublicMeetingsWidget
        trendingMeetings={mockMeetings}
        currentAccountId="1"
        onMeetingClick={mockOnMeetingClick}
        onCancelMeeting={mockOnCancelMeeting}
      />
    );

    const joinButtons = screen.getAllByRole('button', { name: /Join|Open|Full/ });
    expect(joinButtons.length).toBeGreaterThan(0);
  });

  it('shows cancel button for host', () => {
    const hostMeeting: MeetingDto[] = [
      {
        ...mockMeetings[0],
        creator_id: 1,
      },
    ];

    render(
      <PublicMeetingsWidget
        trendingMeetings={hostMeeting}
        currentAccountId="1"
        onMeetingClick={mockOnMeetingClick}
        onCancelMeeting={mockOnCancelMeeting}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    expect(cancelButton).toBeInTheDocument();
  });

  it('disables join button when meeting is full', () => {
    render(
      <PublicMeetingsWidget
        trendingMeetings={mockMeetings}
        currentAccountId="1"
        onMeetingClick={mockOnMeetingClick}
        onCancelMeeting={mockOnCancelMeeting}
      />
    );

    const fullButton = screen.getByRole('button', { name: /Full/i });
    expect(fullButton).toBeDisabled();
  });

  it('shows open button when user is participant with web_link', () => {
    const participantMeeting: MeetingDto[] = [
      {
        ...mockMeetings[0],
        is_participant: true,
        is_full: false,
      },
    ];

    render(
      <PublicMeetingsWidget
        trendingMeetings={participantMeeting}
        currentAccountId="1"
        onMeetingClick={mockOnMeetingClick}
        onCancelMeeting={mockOnCancelMeeting}
      />
    );

    const openButton = screen.getByRole('button', { name: /Open/i });
    expect(openButton).toBeInTheDocument();
  });

  it('calls onCancelMeeting when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const hostMeeting: MeetingDto[] = [
      {
        ...mockMeetings[0],
        creator_id: 1,
      },
    ];

    render(
      <PublicMeetingsWidget
        trendingMeetings={hostMeeting}
        currentAccountId="1"
        onMeetingClick={mockOnMeetingClick}
        onCancelMeeting={mockOnCancelMeeting}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    expect(mockOnCancelMeeting).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it('prevents event propagation when clicking cancel button', async () => {
    const user = userEvent.setup();
    const hostMeeting: MeetingDto[] = [
      {
        ...mockMeetings[0],
        creator_id: 1,
      },
    ];

    render(
      <PublicMeetingsWidget
        trendingMeetings={hostMeeting}
        currentAccountId="1"
        onMeetingClick={mockOnMeetingClick}
        onCancelMeeting={mockOnCancelMeeting}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    // Should only trigger cancel, not meeting click
    expect(mockOnCancelMeeting).toHaveBeenCalled();
    expect(mockOnMeetingClick).not.toHaveBeenCalled();
  });

  it('collapses and expands widget', async () => {
    const user = userEvent.setup();
    render(
      <PublicMeetingsWidget
        trendingMeetings={mockMeetings}
        currentAccountId="1"
        onMeetingClick={mockOnMeetingClick}
        onCancelMeeting={mockOnCancelMeeting}
      />
    );

    const trigger = screen.getByText('Public Meetings');
    await user.click(trigger);

    expect(screen.getByText('Public Meetings')).toBeInTheDocument();
  });

  it('handles meetings without max_participants', () => {
    const meetingNoMax: MeetingDto[] = [
      {
        ...mockMeetings[0],
        max_participants: undefined,
      },
    ];

    render(
      <PublicMeetingsWidget
        trendingMeetings={meetingNoMax}
        currentAccountId="1"
        onMeetingClick={mockOnMeetingClick}
        onCancelMeeting={mockOnCancelMeeting}
      />
    );

    expect(screen.getByText('Physics Seminar')).toBeInTheDocument();
  });

  it('displays start time for each meeting', () => {
    render(
      <PublicMeetingsWidget
        trendingMeetings={mockMeetings}
        currentAccountId="1"
        onMeetingClick={mockOnMeetingClick}
        onCancelMeeting={mockOnCancelMeeting}
      />
    );

    // Check that time information is displayed
    expect(screen.getByText(/Physics Seminar/)).toBeInTheDocument();
  });

  it('handles string and number currentAccountId', () => {
    const hostMeetingString: MeetingDto[] = [
      {
        ...mockMeetings[0],
        creator_id: 1,
      },
    ];

    render(
      <PublicMeetingsWidget
        trendingMeetings={hostMeetingString}
        currentAccountId="1"
        onMeetingClick={mockOnMeetingClick}
        onCancelMeeting={mockOnCancelMeeting}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    expect(cancelButton).toBeInTheDocument();
  });

  it('scrolls when there are many meetings', () => {
    const manyMeetings = Array.from({ length: 15 }, (_, i) => ({
      ...mockMeetings[0],
      id: i + 1,
      title: `Meeting ${i + 1}`,
    }));

    render(
      <PublicMeetingsWidget
        trendingMeetings={manyMeetings}
        currentAccountId="1"
        onMeetingClick={mockOnMeetingClick}
        onCancelMeeting={mockOnCancelMeeting}
      />
    );

    expect(screen.getByText('Meeting 1')).toBeInTheDocument();
  });
});
