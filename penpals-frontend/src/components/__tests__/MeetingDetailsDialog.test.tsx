import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockApiGet = vi.fn();
const mockApiPost = vi.fn();
const mockApiPut = vi.fn();
const mockApiDelete = vi.fn();
const mockFetchAllClassrooms = vi.fn();
const mockInviteToMeeting = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('../../services/api', () => ({
  ApiClient: {
    get: (...args: any[]) => mockApiGet(...args),
    post: (...args: any[]) => mockApiPost(...args),
    put: (...args: any[]) => mockApiPut(...args),
    delete: (...args: any[]) => mockApiDelete(...args),
  },
}));

vi.mock('../../services/classroom', () => ({
  ClassroomService: {
    fetchAllClassrooms: (...args: any[]) => mockFetchAllClassrooms(...args),
  },
}));

vi.mock('../../services/meetings', () => ({
  MeetingsService: {
    inviteToMeeting: (...args: any[]) => mockInviteToMeeting(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: any[]) => mockToastSuccess(...args),
    error: (...args: any[]) => mockToastError(...args),
  },
}));

import MeetingDetailsDialog from '../MeetingDetailsDialog';

const creatorMeeting = {
  id: 77,
  title: 'Weekly Math Sync',
  description: 'Discuss curriculum updates',
  start_time: '2026-03-12T10:00:00.000Z',
  end_time: '2026-03-12T10:30:00.000Z',
  web_link: 'https://webex.example/abc',
  password: 'pass123',
  creator_name: 'Class A',
  is_creator: true,
  visibility: 'private',
  max_participants: 20,
  invited_classrooms: [
    {
      invitation_id: 501,
      receiver_id: 9,
      receiver_name: 'Class B',
      status: 'pending',
      can_withdraw: true,
    },
  ],
};

const publicNonCreatorMeeting = {
  id: 88,
  title: 'Public STEM Meetup',
  description: 'Open community call',
  start_time: '2026-03-13T11:00:00.000Z',
  end_time: '2026-03-13T11:45:00.000Z',
  web_link: null,
  password: null,
  creator_name: 'Class Z',
  is_creator: false,
  is_participant: false,
  visibility: 'public',
  max_participants: 30,
  invited_classrooms: [],
};

const privateParticipantMeeting = {
  ...publicNonCreatorMeeting,
  id: 89,
  title: 'Private Existing Link',
  visibility: 'private',
  is_participant: true,
  web_link: 'https://webex.example/private',
};

const privateNonParticipantNoLinkMeeting = {
  ...publicNonCreatorMeeting,
  id: 90,
  title: 'Private No Link Yet',
  visibility: 'private',
  is_participant: false,
  web_link: null,
};

const renderDialog = (overrides: Partial<React.ComponentProps<typeof MeetingDetailsDialog>> = {}) => {
  const onOpenChange = vi.fn();
  const onMeetingUpdated = vi.fn();

  render(
    <MeetingDetailsDialog
      meetingId={77}
      open
      onOpenChange={onOpenChange}
      onMeetingUpdated={onMeetingUpdated}
      {...overrides}
    />,
  );

  return { onOpenChange, onMeetingUpdated };
};

describe('MeetingDetailsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockApiGet.mockResolvedValue(creatorMeeting);
    mockApiPost.mockResolvedValue({});
    mockApiPut.mockResolvedValue({});
    mockApiDelete.mockResolvedValue({ msg: 'ok' });
    mockFetchAllClassrooms.mockResolvedValue({
      classrooms: [
        { id: '12', name: 'Invite Alpha', location: 'Singapore' },
        { id: '13', name: 'Invite Beta', location: 'Tokyo' },
      ],
    });
    mockInviteToMeeting.mockResolvedValue({
      msg: 'ok',
      invitations: [{ id: 1 }],
      skipped: [],
    });

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn(),
      },
    });

    vi.stubGlobal('open', vi.fn());
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  it('loads and renders creator meeting details', async () => {
    renderDialog();

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith('/webex/meeting/77');
    });

    expect(await screen.findByText('Weekly Math Sync')).toBeInTheDocument();
    expect(screen.getByText(/Organized by Class A/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save settings/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel meeting/i })).toBeInTheDocument();
  });

  it('validates save settings when title is empty', async () => {
    const user = userEvent.setup();
    renderDialog();

    await screen.findByText('Weekly Math Sync');

    const titleInput = screen.getByDisplayValue('Weekly Math Sync');
    await user.clear(titleInput);
    await user.click(screen.getByRole('button', { name: /save settings/i }));

    expect(mockToastError).toHaveBeenCalledWith('Meeting title cannot be empty.');
    expect(mockApiPut).not.toHaveBeenCalled();
  });

  it('validates public settings capacity before save', async () => {
    const user = userEvent.setup();
    renderDialog();

    await screen.findByText('Weekly Math Sync');

    await user.click(screen.getByRole('checkbox', { name: /make this meeting public/i }));

    const capacityInput = screen.getByRole('spinbutton');
    await user.clear(capacityInput);
    await user.type(capacityInput, '1');

    await user.click(screen.getByRole('button', { name: /save settings/i }));

    expect(mockToastError).toHaveBeenCalledWith('Public meetings require a capacity of at least 2.');
    expect(mockApiPut).not.toHaveBeenCalled();
  });

  it('searches invitees and sends invites', async () => {
    const user = userEvent.setup();
    const { onMeetingUpdated } = renderDialog();

    await screen.findByText('Weekly Math Sync');

    await waitFor(() => {
      expect(mockFetchAllClassrooms).toHaveBeenCalled();
    });

    const searchInput = screen.getByPlaceholderText(/search classrooms by name or location/i);
    await user.type(searchInput, 'invite alpha');

    await user.click(screen.getByRole('button', { name: /invite alpha • singapore/i }));
    await user.click(screen.getByRole('button', { name: /send invites/i }));

    await waitFor(() => {
      expect(mockInviteToMeeting).toHaveBeenCalledWith(77, [12]);
      expect(mockToastSuccess).toHaveBeenCalledWith('1 invitation(s) sent');
      expect(onMeetingUpdated).toHaveBeenCalled();
    });
  });

  it('withdraws invitation for creator', async () => {
    const user = userEvent.setup();
    const { onMeetingUpdated } = renderDialog();

    await screen.findByText('Weekly Math Sync');

    await user.click(screen.getByRole('button', { name: /withdraw/i }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/webex/invitations/501/cancel');
      expect(mockToastSuccess).toHaveBeenCalledWith('Invitation withdrawn');
      expect(onMeetingUpdated).toHaveBeenCalled();
    });
  });

  it('joins public meeting for non-participant and opens returned link', async () => {
    const user = userEvent.setup();
    mockApiGet.mockResolvedValue(publicNonCreatorMeeting);
    mockApiPost.mockResolvedValueOnce({
      msg: 'Joined meeting',
      meeting: { web_link: 'https://webex.example/joined' },
    });

    const { onMeetingUpdated } = renderDialog({ meetingId: 88 });

    await screen.findByText('Public STEM Meetup');

    await user.click(screen.getByRole('button', { name: /join meeting/i }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/meetings/88/join');
      expect(mockToastSuccess).toHaveBeenCalledWith('Joined meeting');
      expect(onMeetingUpdated).toHaveBeenCalled();
      expect(window.open).toHaveBeenCalledWith('https://webex.example/joined', '_blank');
    });
  });

  it('opens existing meeting link for participant', async () => {
    const user = userEvent.setup();
    mockApiGet.mockResolvedValue(privateParticipantMeeting);

    renderDialog({ meetingId: 89 });

    await screen.findByText('Private Existing Link');

    await user.click(screen.getByRole('button', { name: /open meeting/i }));

    expect(window.open).toHaveBeenCalledWith('https://webex.example/private', '_blank');
  });

  it('shows loading invitees state while classrooms are being fetched', async () => {
    mockFetchAllClassrooms.mockReturnValue(new Promise(() => {}));
    renderDialog();

    await screen.findByText('Weekly Math Sync');

    expect(await screen.findByText('Loading classrooms...')).toBeInTheDocument();
  });

  it('shows toast error when invite API returns zero invitations', async () => {
    const user = userEvent.setup();
    mockInviteToMeeting.mockResolvedValue({
      msg: 'No new invitations were created',
      invitations: [],
      skipped: [],
    });

    renderDialog();
    await screen.findByText('Weekly Math Sync');

    const searchInput = screen.getByPlaceholderText(/search classrooms by name or location/i);
    await user.type(searchInput, 'invite alpha');
    await user.click(screen.getByRole('button', { name: /invite alpha • singapore/i }));
    await user.click(screen.getByRole('button', { name: /send invites/i }));

    await waitFor(() => {
      expect(mockInviteToMeeting).toHaveBeenCalledWith(77, [12]);
      expect(mockToastError).toHaveBeenCalledWith('No new invitations were created');
    });
  });

  it('shows toast error when invite API throws', async () => {
    const user = userEvent.setup();
    mockInviteToMeeting.mockRejectedValue(new Error('invite failed'));

    renderDialog();
    await screen.findByText('Weekly Math Sync');

    const searchInput = screen.getByPlaceholderText(/search classrooms by name or location/i);
    await user.type(searchInput, 'invite alpha');
    await user.click(screen.getByRole('button', { name: /invite alpha • singapore/i }));
    await user.click(screen.getByRole('button', { name: /send invites/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('invite failed');
    });
  });

  it('shows toast error when withdrawing invitation fails', async () => {
    const user = userEvent.setup();
    mockApiPost.mockRejectedValueOnce(new Error('withdraw failed'));

    renderDialog();
    await screen.findByText('Weekly Math Sync');

    await user.click(screen.getByRole('button', { name: /withdraw/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('withdraw failed');
    });
  });

  it('opens reschedule panel and saves changes', async () => {
    const user = userEvent.setup();
    const { onMeetingUpdated } = renderDialog();
    await screen.findByText('Weekly Math Sync');

    await user.click(screen.getByRole('button', { name: /reschedule/i }));

    expect(screen.getByText('Reschedule Meeting')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /15 min/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /30 min/i })).toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox', { name: /make this meeting public/i });
    await user.click(checkboxes[1]);
    expect(screen.getAllByText('Maximum participants').length).toBeGreaterThan(1);
    await user.click(checkboxes[1]);

    await user.click(screen.getByRole('button', { name: /45 min/i }));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith('/webex/meeting/77', expect.objectContaining({
        title: 'Weekly Math Sync',
        start_time: expect.any(String),
        end_time: expect.any(String),
      }));
      expect(mockToastSuccess).toHaveBeenCalledWith('Meeting rescheduled successfully');
      expect(onMeetingUpdated).toHaveBeenCalled();
    });
  });

  it('shows error when creator clicks Join Now without meeting link', async () => {
    const user = userEvent.setup();
    mockApiGet.mockResolvedValue({
      ...creatorMeeting,
      web_link: null,
    });

    renderDialog();
    await screen.findByText('Weekly Math Sync');

    await user.click(screen.getByRole('button', { name: /join now/i }));

    expect(mockToastError).toHaveBeenCalledWith('Meeting link is not available yet');
  });

  it('opens creator Join Now link when available', async () => {
    const user = userEvent.setup();
    renderDialog();

    await screen.findByText('Weekly Math Sync');
    await user.click(screen.getByRole('button', { name: /join now/i }));

    expect(window.open).toHaveBeenCalledWith('https://webex.example/abc', '_blank');
  });

  it('shows error for non-creator open meeting when link is unavailable', async () => {
    const user = userEvent.setup();
    mockApiGet.mockResolvedValue(privateNonParticipantNoLinkMeeting);

    renderDialog({ meetingId: 90 });
    await screen.findByText('Private No Link Yet');

    await user.click(screen.getByRole('button', { name: /open meeting/i }));

    expect(mockToastError).toHaveBeenCalledWith('Meeting link is not available yet');
  });

  it('shows error when joining public meeting fails', async () => {
    const user = userEvent.setup();
    mockApiGet.mockResolvedValue(publicNonCreatorMeeting);
    mockApiPost.mockRejectedValueOnce(new Error('join failed'));

    renderDialog({ meetingId: 88 });
    await screen.findByText('Public STEM Meetup');

    await user.click(screen.getByRole('button', { name: /join meeting/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('join failed');
    });
  });
});
