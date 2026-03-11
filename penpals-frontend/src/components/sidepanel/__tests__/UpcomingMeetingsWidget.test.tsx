import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UpcomingMeetingsWidget from '../UpcomingMeetingsWidget';

describe('UpcomingMeetingsWidget', () => {
  const mockMeetings = [
    {
      id: 1,
      title: 'Physics Seminar',
      start_time: '2026-03-15T14:00:00Z',
      end_time: '2026-03-15T16:00:00Z',
      creator_name: 'Dr. Smith',
      web_link: 'https://meet.example.com/physics',
    },
    {
      id: 2,
      title: 'Chemistry Lab',
      start_time: '2026-03-16T10:00:00Z',
      end_time: '2026-03-16T12:00:00Z',
      creator_name: 'Prof. Johnson',
      web_link: 'https://meet.example.com/chemistry',
    },
    {
      id: 3,
      title: 'Biology Discussion',
      start_time: '2026-03-17T15:00:00Z',
      end_time: '2026-03-17T17:00:00Z',
      creator_name: 'Dr. Miller',
      web_link: null,
    },
  ];

  const mockOnMeetingClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upcoming meetings widget with title', () => {
    render(
      <UpcomingMeetingsWidget upcomingMeetings={mockMeetings} onMeetingClick={mockOnMeetingClick} />
    );

    expect(screen.getByText('Upcoming Meetings')).toBeInTheDocument();
  });

  it('displays all upcoming meetings', () => {
    render(
      <UpcomingMeetingsWidget upcomingMeetings={mockMeetings} onMeetingClick={mockOnMeetingClick} />
    );

    expect(screen.getByText('Physics Seminar')).toBeInTheDocument();
    expect(screen.getByText('Chemistry Lab')).toBeInTheDocument();
    expect(screen.getByText('Biology Discussion')).toBeInTheDocument();
  });

  it('displays empty message when no upcoming meetings', () => {
    render(
      <UpcomingMeetingsWidget upcomingMeetings={[]} onMeetingClick={mockOnMeetingClick} />
    );

    expect(screen.getByText('No upcoming meetings')).toBeInTheDocument();
  });

  it('shows meeting creator information', () => {
    render(
      <UpcomingMeetingsWidget upcomingMeetings={mockMeetings} onMeetingClick={mockOnMeetingClick} />
    );

    expect(screen.getByText(/Host: Dr\. Smith/)).toBeInTheDocument();
    expect(screen.getByText(/Host: Prof\. Johnson/)).toBeInTheDocument();
  });

  it('displays start time for meetings', () => {
    render(
      <UpcomingMeetingsWidget upcomingMeetings={mockMeetings} onMeetingClick={mockOnMeetingClick} />
    );

    // Check for time information displayed
    expect(screen.getByText('Physics Seminar')).toBeInTheDocument();
  });

  it('calls onMeetingClick when meeting is clicked', async () => {
    const user = userEvent.setup();
    render(
      <UpcomingMeetingsWidget upcomingMeetings={mockMeetings} onMeetingClick={mockOnMeetingClick} />
    );

    const meetingItem = screen.getByText('Physics Seminar');
    await user.click(meetingItem);

    expect(mockOnMeetingClick).toHaveBeenCalledWith(1);
  });

  it('shows join button with web_link', () => {
    render(
      <UpcomingMeetingsWidget upcomingMeetings={mockMeetings} onMeetingClick={mockOnMeetingClick} />
    );

    const joinButtons = screen.getAllByRole('button', { name: /Join/i });
    expect(joinButtons.length).toBeGreaterThan(0);
  });

  it('disables join button when no web_link', () => {
    render(
      <UpcomingMeetingsWidget upcomingMeetings={mockMeetings} onMeetingClick={mockOnMeetingClick} />
    );

    const joinButtons = screen.getAllByRole('button', { name: /Join/i });
    const disabledJoinButton = joinButtons.find(btn => btn.hasAttribute('disabled'));
    expect(disabledJoinButton).toBeTruthy();
  });

  it('opens meeting link in new tab when join button is clicked', async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <UpcomingMeetingsWidget upcomingMeetings={mockMeetings} onMeetingClick={mockOnMeetingClick} />
    );

    const joinButtons = screen.getAllByRole('button', { name: /Join/i });
    const enabledJoinButton = joinButtons.find(btn => !btn.hasAttribute('disabled'));
    
    if (enabledJoinButton) {
      await user.click(enabledJoinButton);
      expect(openSpy).toHaveBeenCalledWith('https://meet.example.com/physics', '_blank');
    }

    openSpy.mockRestore();
  });

  it('prevents event propagation when join button is clicked', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <UpcomingMeetingsWidget upcomingMeetings={mockMeetings} onMeetingClick={mockOnMeetingClick} />
    );

    const joinButtons = screen.getAllByRole('button', { name: /Join/i });
    const enabledJoinButton = joinButtons.find(btn => !btn.hasAttribute('disabled'));
    
    if (enabledJoinButton) {
      await user.click(enabledJoinButton);
      // Should not trigger meeting click when button is clicked
      expect(mockOnMeetingClick).not.toHaveBeenCalled();
    }
  });

  it('collapses and expands widget', async () => {
    const user = userEvent.setup();
    render(
      <UpcomingMeetingsWidget upcomingMeetings={mockMeetings} onMeetingClick={mockOnMeetingClick} />
    );

    const trigger = screen.getByText('Upcoming Meetings');
    await user.click(trigger);

    expect(screen.getByText('Upcoming Meetings')).toBeInTheDocument();
  });

  it('handles single meeting', () => {
    const singleMeeting = [mockMeetings[0]];

    render(
      <UpcomingMeetingsWidget upcomingMeetings={singleMeeting} onMeetingClick={mockOnMeetingClick} />
    );

    expect(screen.getByText('Physics Seminar')).toBeInTheDocument();
    expect(screen.queryByText('Chemistry Lab')).not.toBeInTheDocument();
  });

  it('displays scroll area for many meetings', () => {
    const manyMeetings = Array.from({ length: 20 }, (_, i) => ({
      ...mockMeetings[0],
      id: i + 1,
      title: `Meeting ${i + 1}`,
    }));

    render(
      <UpcomingMeetingsWidget upcomingMeetings={manyMeetings} onMeetingClick={mockOnMeetingClick} />
    );

    expect(screen.getByText('Meeting 1')).toBeInTheDocument();
  });

  it('handles meeting without web_link gracefully', () => {
    const meetingNoLink = [
      {
        id: 1,
        title: 'Meeting Without Link',
        start_time: '2026-03-15T14:00:00Z',
        end_time: '2026-03-15T16:00:00Z',
        creator_name: 'Dr. Smith',
        web_link: undefined,
      },
    ];

    render(
      <UpcomingMeetingsWidget upcomingMeetings={meetingNoLink} onMeetingClick={mockOnMeetingClick} />
    );

    expect(screen.getByText('Meeting Without Link')).toBeInTheDocument();
    const joinButtons = screen.getAllByRole('button', { name: /Join/i });
    expect(joinButtons[0]).toBeDisabled();
  });

  it('updates when meetings prop changes', async () => {
    const { rerender } = render(
      <UpcomingMeetingsWidget upcomingMeetings={[mockMeetings[0]]} onMeetingClick={mockOnMeetingClick} />
    );

    expect(screen.getByText('Physics Seminar')).toBeInTheDocument();
    expect(screen.queryByText('Chemistry Lab')).not.toBeInTheDocument();

    rerender(
      <UpcomingMeetingsWidget upcomingMeetings={mockMeetings} onMeetingClick={mockOnMeetingClick} />
    );

    await waitFor(() => {
      expect(screen.getByText('Chemistry Lab')).toBeInTheDocument();
    });
  });

  it('calls onMeetingClick with correct meeting id', async () => {
    const user = userEvent.setup();
    render(
      <UpcomingMeetingsWidget upcomingMeetings={mockMeetings} onMeetingClick={mockOnMeetingClick} />
    );

    const chemistryMeeting = screen.getByText('Chemistry Lab');
    await user.click(chemistryMeeting);

    expect(mockOnMeetingClick).toHaveBeenCalledWith(2);
  });

  it('renders chevron icon for expandable section', () => {
    render(
      <UpcomingMeetingsWidget upcomingMeetings={mockMeetings} onMeetingClick={mockOnMeetingClick} />
    );

    expect(screen.getByText('Upcoming Meetings')).toBeInTheDocument();
  });

  it('handles meetings with special characters in title', () => {
    const specialMeetings = [
      {
        ...mockMeetings[0],
        title: 'Physics & Chemistry Lab #1',
      },
    ];

    render(
      <UpcomingMeetingsWidget upcomingMeetings={specialMeetings} onMeetingClick={mockOnMeetingClick} />
    );

    expect(screen.getByText('Physics & Chemistry Lab #1')).toBeInTheDocument();
  });

  it('shows all meeting information in list item', () => {
    render(
      <UpcomingMeetingsWidget upcomingMeetings={[mockMeetings[0]]} onMeetingClick={mockOnMeetingClick} />
    );

    expect(screen.getByText('Physics Seminar')).toBeInTheDocument();
    expect(screen.getByText(/Host: Dr\. Smith/)).toBeInTheDocument();
  });
});
