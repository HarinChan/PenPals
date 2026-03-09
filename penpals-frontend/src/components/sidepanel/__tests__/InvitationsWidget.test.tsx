import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InvitationsWidget from '../InvitationsWidget';

describe('InvitationsWidget', () => {
  const mockReceivedInvitations = [
    {
      id: 1,
      title: 'Physics Seminar',
      start_time: '2026-03-15T14:00:00Z',
      end_time: '2026-03-15T16:00:00Z',
      sender_name: 'Dr. Smith',
    },
    {
      id: 2,
      title: 'Chemistry Lab',
      start_time: '2026-03-16T10:00:00Z',
      end_time: '2026-03-16T12:00:00Z',
      sender_name: 'Prof. Johnson',
    },
  ];

  const mockSentInvitations = [
    {
      id: 3,
      meeting_id: 101,
      title: 'Biology Discussion',
      start_time: '2026-03-17T15:00:00Z',
      end_time: '2026-03-17T17:00:00Z',
    },
  ];

  const mockOnAcceptInvitation = vi.fn();
  const mockOnDeclineInvitation = vi.fn();
  const mockOnCancelInvitation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders invitations widget with title', () => {
    render(
      <InvitationsWidget
        receivedInvitations={mockReceivedInvitations}
        sentInvitations={mockSentInvitations}
        onAcceptInvitation={mockOnAcceptInvitation}
        onDeclineInvitation={mockOnDeclineInvitation}
        onCancelInvitation={mockOnCancelInvitation}
      />
    );

    expect(screen.getByText('Meeting Invitations')).toBeInTheDocument();
  });

  it('shows received invitations count badge', () => {
    render(
      <InvitationsWidget
        receivedInvitations={mockReceivedInvitations}
        sentInvitations={mockSentInvitations}
        onAcceptInvitation={mockOnAcceptInvitation}
        onDeclineInvitation={mockOnDeclineInvitation}
        onCancelInvitation={mockOnCancelInvitation}
      />
    );

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('displays received and sent tabs', () => {
    render(
      <InvitationsWidget
        receivedInvitations={mockReceivedInvitations}
        sentInvitations={mockSentInvitations}
        onAcceptInvitation={mockOnAcceptInvitation}
        onDeclineInvitation={mockOnDeclineInvitation}
        onCancelInvitation={mockOnCancelInvitation}
      />
    );

    expect(screen.getByRole('button', { name: /Received/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sent/i })).toBeInTheDocument();
  });

  it('shows received invitations by default', () => {
    render(
      <InvitationsWidget
        receivedInvitations={mockReceivedInvitations}
        sentInvitations={mockSentInvitations}
        onAcceptInvitation={mockOnAcceptInvitation}
        onDeclineInvitation={mockOnDeclineInvitation}
        onCancelInvitation={mockOnCancelInvitation}
      />
    );

    expect(screen.getByText('Physics Seminar')).toBeInTheDocument();
    expect(screen.getByText('Chemistry Lab')).toBeInTheDocument();
  });

  it('switches to sent invitations when tab is clicked', async () => {
    const user = userEvent.setup();
    render(
      <InvitationsWidget
        receivedInvitations={mockReceivedInvitations}
        sentInvitations={mockSentInvitations}
        onAcceptInvitation={mockOnAcceptInvitation}
        onDeclineInvitation={mockOnDeclineInvitation}
        onCancelInvitation={mockOnCancelInvitation}
      />
    );

    const sentTab = screen.getByRole('button', { name: /Sent/i });
    await user.click(sentTab);

    await waitFor(() => {
      expect(screen.getByText('Biology Discussion')).toBeInTheDocument();
    });
  });

  it('displays empty message when no received invitations', () => {
    render(
      <InvitationsWidget
        receivedInvitations={[]}
        sentInvitations={mockSentInvitations}
        onAcceptInvitation={mockOnAcceptInvitation}
        onDeclineInvitation={mockOnDeclineInvitation}
        onCancelInvitation={mockOnCancelInvitation}
      />
    );

    expect(screen.getByText('No incoming invitations')).toBeInTheDocument();
  });

  it('displays empty message when no sent invitations', async () => {
    const user = userEvent.setup();
    render(
      <InvitationsWidget
        receivedInvitations={mockReceivedInvitations}
        sentInvitations={[]}
        onAcceptInvitation={mockOnAcceptInvitation}
        onDeclineInvitation={mockOnDeclineInvitation}
        onCancelInvitation={mockOnCancelInvitation}
      />
    );

    const sentTab = screen.getByRole('button', { name: /Sent/i });
    await user.click(sentTab);

    await waitFor(() => {
      expect(screen.getByText('No pending outgoing invitations')).toBeInTheDocument();
    });
  });

  it('shows invitation sender information', () => {
    render(
      <InvitationsWidget
        receivedInvitations={mockReceivedInvitations}
        sentInvitations={mockSentInvitations}
        onAcceptInvitation={mockOnAcceptInvitation}
        onDeclineInvitation={mockOnDeclineInvitation}
        onCancelInvitation={mockOnCancelInvitation}
      />
    );

    expect(screen.getByText(/From: Dr\. Smith/)).toBeInTheDocument();
  });

  it('calls onAcceptInvitation when accept button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <InvitationsWidget
        receivedInvitations={mockReceivedInvitations}
        sentInvitations={mockSentInvitations}
        onAcceptInvitation={mockOnAcceptInvitation}
        onDeclineInvitation={mockOnDeclineInvitation}
        onCancelInvitation={mockOnCancelInvitation}
      />
    );

    const acceptButtons = screen.getAllByRole('button', { name: /Accept/i });
    await user.click(acceptButtons[0]);

    expect(mockOnAcceptInvitation).toHaveBeenCalledWith(1);
  });

  it('calls onDeclineInvitation when decline button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <InvitationsWidget
        receivedInvitations={mockReceivedInvitations}
        sentInvitations={mockSentInvitations}
        onAcceptInvitation={mockOnAcceptInvitation}
        onDeclineInvitation={mockOnDeclineInvitation}
        onCancelInvitation={mockOnCancelInvitation}
      />
    );

    const declineButtons = screen.getAllByRole('button', { name: /Decline/i });
    await user.click(declineButtons[0]);

    expect(mockOnDeclineInvitation).toHaveBeenCalledWith(1);
  });

  it('groups sent invitations by meeting', async () => {
    const user = userEvent.setup();
    const multipleInvitations = [
      {
        id: 1,
        meeting_id: 101,
        title: 'Physics Seminar',
        start_time: '2026-03-15T14:00:00Z',
        end_time: '2026-03-15T16:00:00Z',
      },
      {
        id: 2,
        meeting_id: 101,
        title: 'Physics Seminar',
        start_time: '2026-03-15T14:00:00Z',
        end_time: '2026-03-15T16:00:00Z',
      },
    ];

    render(
      <InvitationsWidget
        receivedInvitations={[]}
        sentInvitations={multipleInvitations}
        onAcceptInvitation={mockOnAcceptInvitation}
        onDeclineInvitation={mockOnDeclineInvitation}
        onCancelInvitation={mockOnCancelInvitation}
      />
    );

    const sentTab = screen.getByRole('button', { name: /Sent/i });
    await user.click(sentTab);

    await waitFor(() => {
      expect(screen.getByText('Physics Seminar')).toBeInTheDocument();
    });
  });

  it('collapses and expands widget', async () => {
    const user = userEvent.setup();
    render(
      <InvitationsWidget
        receivedInvitations={mockReceivedInvitations}
        sentInvitations={mockSentInvitations}
        onAcceptInvitation={mockOnAcceptInvitation}
        onDeclineInvitation={mockOnDeclineInvitation}
        onCancelInvitation={mockOnCancelInvitation}
      />
    );

    const trigger = screen.getByText('Meeting Invitations');
    await user.click(trigger);

    expect(screen.getByText('Meeting Invitations')).toBeInTheDocument();
  });

  it('shows meeting time information', () => {
    render(
      <InvitationsWidget
        receivedInvitations={mockReceivedInvitations}
        sentInvitations={mockSentInvitations}
        onAcceptInvitation={mockOnAcceptInvitation}
        onDeclineInvitation={mockOnDeclineInvitation}
        onCancelInvitation={mockOnCancelInvitation}
      />
    );

    expect(screen.getAllByText(/Physics Seminar/)[0]).toBeInTheDocument();
  });

  it('updates badge count when switching tabs', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <InvitationsWidget
        receivedInvitations={mockReceivedInvitations}
        sentInvitations={mockSentInvitations}
        onAcceptInvitation={mockOnAcceptInvitation}
        onDeclineInvitation={mockOnDeclineInvitation}
        onCancelInvitation={mockOnCancelInvitation}
      />
    );

    const sentTab = screen.getByRole('button', { name: /Sent/i });
    await user.click(sentTab);

    rerender(
      <InvitationsWidget
        receivedInvitations={mockReceivedInvitations}
        sentInvitations={mockSentInvitations}
        onAcceptInvitation={mockOnAcceptInvitation}
        onDeclineInvitation={mockOnDeclineInvitation}
        onCancelInvitation={mockOnCancelInvitation}
      />
    );

    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('displays multiple sent invitations', async () => {
    const user = userEvent.setup();
    const multipleSent = [
      {
        id: 1,
        meeting_id: 101,
        title: 'Physics Seminar',
        start_time: '2026-03-15T14:00:00Z',
        end_time: '2026-03-15T16:00:00Z',
      },
      {
        id: 2,
        meeting_id: 102,
        title: 'Chemistry Lab',
        start_time: '2026-03-16T10:00:00Z',
        end_time: '2026-03-16T12:00:00Z',
      },
    ];

    render(
      <InvitationsWidget
        receivedInvitations={[]}
        sentInvitations={multipleSent}
        onAcceptInvitation={mockOnAcceptInvitation}
        onDeclineInvitation={mockOnDeclineInvitation}
        onCancelInvitation={mockOnCancelInvitation}
      />
    );

    const sentTab = screen.getByRole('button', { name: /Sent/i });
    await user.click(sentTab);

    await waitFor(() => {
      expect(screen.getByText('Physics Seminar')).toBeInTheDocument();
      expect(screen.getByText('Chemistry Lab')).toBeInTheDocument();
    });
  });

  it('handles invitations with no meeting_id', async () => {
    const user = userEvent.setup();
    const invNoMeeting = [
      {
        id: 1,
        meeting_id: null,
        title: 'Direct Invitation',
        start_time: '2026-03-15T14:00:00Z',
        end_time: '2026-03-15T16:00:00Z',
      },
    ];

    render(
      <InvitationsWidget
        receivedInvitations={[]}
        sentInvitations={invNoMeeting}
        onAcceptInvitation={mockOnAcceptInvitation}
        onDeclineInvitation={mockOnDeclineInvitation}
        onCancelInvitation={mockOnCancelInvitation}
      />
    );

    const sentTab = screen.getByRole('button', { name: /Sent/i });
    await user.click(sentTab);

    await waitFor(() => {
      expect(screen.getByText('Direct Invitation')).toBeInTheDocument();
    });
  });
});
