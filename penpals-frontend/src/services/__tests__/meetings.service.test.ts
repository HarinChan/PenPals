import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MeetingsService, type MeetingDto, type MeetingInvitationResult } from '../meetings';
import { ApiClient } from '../api';

vi.mock('../api', () => ({
  ApiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('MeetingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUpcoming', () => {
    it('calls ApiClient.get and returns upcoming meetings', async () => {
      const mockMeetings: MeetingDto[] = [
        {
          id: 1,
          title: 'Team Meeting',
          description: 'Weekly sync',
          start_time: '2026-03-10T10:00:00Z',
          end_time: '2026-03-10T11:00:00Z',
          web_link: 'https://meet.example.com/123',
          password: 'pass123',
          creator_name: 'Alice',
          creator_id: 100,
          visibility: 'private',
          status: 'active',
          max_participants: 50,
          participant_count: 5,
          join_count: 3,
          is_creator: true,
          is_participant: true,
          is_full: false,
        },
      ];

      const mockResponse = { meetings: mockMeetings };

      vi.mocked(ApiClient.get).mockResolvedValue(mockResponse as any);

      const result = await MeetingsService.getUpcoming();

      expect(ApiClient.get).toHaveBeenCalledWith('/meetings');
      expect(result).toEqual(mockResponse);
      expect(result.meetings).toHaveLength(1);
      expect(result.meetings[0].title).toBe('Team Meeting');
    });

    it('returns empty meetings array', async () => {
      const mockResponse = { meetings: [] };

      vi.mocked(ApiClient.get).mockResolvedValue(mockResponse as any);

      const result = await MeetingsService.getUpcoming();

      expect(ApiClient.get).toHaveBeenCalledWith('/meetings');
      expect(result.meetings).toEqual([]);
    });
  });

  describe('getPublicMeetings', () => {
    it('calls ApiClient.get and returns public meetings', async () => {
      const mockMeetings: MeetingDto[] = [
        {
          id: 2,
          title: 'Public Webinar',
          start_time: '2026-03-11T14:00:00Z',
          end_time: '2026-03-11T15:00:00Z',
          creator_name: 'Bob',
          creator_id: 200,
          visibility: 'public',
          status: 'active',
          participant_count: 25,
          join_count: 20,
        },
      ];

      const mockResponse = { meetings: mockMeetings };

      vi.mocked(ApiClient.get).mockResolvedValue(mockResponse as any);

      const result = await MeetingsService.getPublicMeetings();

      expect(ApiClient.get).toHaveBeenCalledWith('/meetings/public');
      expect(result).toEqual(mockResponse);
      expect(result.meetings[0].visibility).toBe('public');
    });

    it('returns empty public meetings array', async () => {
      const mockResponse = { meetings: [] };

      vi.mocked(ApiClient.get).mockResolvedValue(mockResponse as any);

      const result = await MeetingsService.getPublicMeetings();

      expect(result.meetings).toEqual([]);
    });
  });

  describe('getTrendingMeetings', () => {
    it('calls ApiClient.get and returns trending meetings', async () => {
      const mockMeetings: MeetingDto[] = [
        {
          id: 3,
          title: 'Trending Discussion',
          start_time: '2026-03-12T16:00:00Z',
          end_time: '2026-03-12T17:00:00Z',
          creator_name: 'Charlie',
          creator_id: 300,
          visibility: 'public',
          status: 'active',
          participant_count: 100,
          join_count: 95,
          trending_score: 0.95,
        },
      ];

      const mockResponse = { meetings: mockMeetings };

      vi.mocked(ApiClient.get).mockResolvedValue(mockResponse as any);

      const result = await MeetingsService.getTrendingMeetings();

      expect(ApiClient.get).toHaveBeenCalledWith('/meetings/public/trending');
      expect(result).toEqual(mockResponse);
      expect(result.meetings[0].trending_score).toBe(0.95);
    });

    it('handles meetings with null optional fields', async () => {
      const mockMeetings: MeetingDto[] = [
        {
          id: 4,
          title: 'Minimal Meeting',
          start_time: '2026-03-13T10:00:00Z',
          end_time: '2026-03-13T11:00:00Z',
          creator_name: 'Dana',
          creator_id: 400,
          visibility: 'public',
          status: 'pending_setup',
          participant_count: 0,
          join_count: 0,
          description: null,
          web_link: null,
          password: null,
          max_participants: null,
        },
      ];

      const mockResponse = { meetings: mockMeetings };

      vi.mocked(ApiClient.get).mockResolvedValue(mockResponse as any);

      const result = await MeetingsService.getTrendingMeetings();

      expect(result.meetings[0].description).toBeNull();
      expect(result.meetings[0].web_link).toBeNull();
      expect(result.meetings[0].password).toBeNull();
    });
  });

  describe('joinPublicMeeting', () => {
    it('posts join request and returns meeting data', async () => {
      const mockMeeting: MeetingDto = {
        id: 5,
        title: 'Public Workshop',
        start_time: '2026-03-14T09:00:00Z',
        end_time: '2026-03-14T10:00:00Z',
        creator_name: 'Eve',
        creator_id: 500,
        visibility: 'public',
        status: 'active',
        participant_count: 10,
        join_count: 8,
        is_participant: true,
      };

      const mockResponse = { msg: 'Successfully joined meeting', meeting: mockMeeting };

      vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

      const result = await MeetingsService.joinPublicMeeting(5);

      expect(ApiClient.post).toHaveBeenCalledWith('/meetings/5/join');
      expect(result).toEqual(mockResponse);
      expect(result.meeting.is_participant).toBe(true);
    });

    it('handles joining a full meeting', async () => {
      const mockMeeting: MeetingDto = {
        id: 6,
        title: 'Full Meeting',
        start_time: '2026-03-15T10:00:00Z',
        end_time: '2026-03-15T11:00:00Z',
        creator_name: 'Frank',
        creator_id: 600,
        visibility: 'public',
        status: 'active',
        max_participants: 10,
        participant_count: 10,
        join_count: 10,
        is_full: true,
      };

      const mockResponse = { msg: 'Meeting is full', meeting: mockMeeting };

      vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

      const result = await MeetingsService.joinPublicMeeting(6);

      expect(result.meeting.is_full).toBe(true);
      expect(result.meeting.participant_count).toBe(result.meeting.max_participants);
    });
  });

  describe('cancelMeeting', () => {
    it('deletes meeting and returns success message', async () => {
      const mockResponse = { msg: 'Meeting cancelled successfully' };

      vi.mocked(ApiClient.delete).mockResolvedValue(mockResponse as any);

      const result = await MeetingsService.cancelMeeting(7);

      expect(ApiClient.delete).toHaveBeenCalledWith('/webex/meeting/7');
      expect(result).toEqual(mockResponse);
    });

    it('handles cancelling pending setup meeting', async () => {
      const mockResponse = { msg: 'Meeting cancelled' };

      vi.mocked(ApiClient.delete).mockResolvedValue(mockResponse as any);

      const result = await MeetingsService.cancelMeeting(999);

      expect(ApiClient.delete).toHaveBeenCalledWith('/webex/meeting/999');
      expect(result.msg).toBe('Meeting cancelled');
    });
  });

  describe('inviteToMeeting', () => {
    it('posts invitations and returns results with skipped list', async () => {
      const mockInvitations: MeetingInvitationResult[] = [
        {
          id: 1,
          receiver_id: 10,
          receiver_name: 'Grace',
          title: 'Workshop Invitation',
          start_time: '2026-03-16T10:00:00Z',
          end_time: '2026-03-16T11:00:00Z',
          status: 'pending',
          meeting_id: 8,
        },
        {
          id: 2,
          receiver_id: 11,
          receiver_name: 'Henry',
          title: 'Workshop Invitation',
          start_time: '2026-03-16T10:00:00Z',
          end_time: '2026-03-16T11:00:00Z',
          status: 'pending',
          meeting_id: 8,
        },
      ];

      const mockSkipped = [
        { receiver_id: 12, receiver_name: 'Ian', reason: 'Already invited' },
        { receiver_id: 13, reason: 'No email available' },
      ];

      const mockResponse = {
        msg: 'Invitations sent',
        invitations: mockInvitations,
        skipped: mockSkipped,
      };

      vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

      const result = await MeetingsService.inviteToMeeting(8, [10, 11, 12, 13]);

      expect(ApiClient.post).toHaveBeenCalledWith('/webex/meeting/8/invitees', {
        classroom_ids: [10, 11, 12, 13],
      });
      expect(result).toEqual(mockResponse);
      expect(result.invitations).toHaveLength(2);
      expect(result.skipped).toHaveLength(2);
    });

    it('handles inviting with empty classroom list', async () => {
      const mockResponse = {
        msg: 'No invitations sent',
        invitations: [],
        skipped: [],
      };

      vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

      const result = await MeetingsService.inviteToMeeting(9, []);

      expect(ApiClient.post).toHaveBeenCalledWith('/webex/meeting/9/invitees', {
        classroom_ids: [],
      });
      expect(result.invitations).toEqual([]);
      expect(result.skipped).toEqual([]);
    });

    it('handles all invitations being skipped', async () => {
      const mockSkipped = [
        { receiver_id: 20, receiver_name: 'Jack', reason: 'Already participant' },
        { receiver_id: 21, receiver_name: 'Kate', reason: 'Meeting is full' },
      ];

      const mockResponse = {
        msg: 'All invitations skipped',
        invitations: [],
        skipped: mockSkipped,
      };

      vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

      const result = await MeetingsService.inviteToMeeting(10, [20, 21]);

      expect(result.invitations).toEqual([]);
      expect(result.skipped).toHaveLength(2);
    });

    it('handles invitation with various statuses', async () => {
      const mockInvitations: MeetingInvitationResult[] = [
        {
          id: 3,
          receiver_id: 30,
          receiver_name: 'Leo',
          title: 'Conference',
          start_time: '2026-03-17T10:00:00Z',
          end_time: '2026-03-17T12:00:00Z',
          status: 'accepted',
          meeting_id: 11,
        },
        {
          id: 4,
          receiver_id: 31,
          receiver_name: 'Mia',
          title: 'Conference',
          start_time: '2026-03-17T10:00:00Z',
          end_time: '2026-03-17T12:00:00Z',
          status: 'declined',
          meeting_id: 11,
        },
        {
          id: 5,
          receiver_id: 32,
          receiver_name: 'Noah',
          title: 'Conference',
          start_time: '2026-03-17T10:00:00Z',
          end_time: '2026-03-17T12:00:00Z',
          status: 'cancelled',
          meeting_id: 11,
        },
      ];

      const mockResponse = {
        msg: 'Invitations processed',
        invitations: mockInvitations,
        skipped: [],
      };

      vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

      const result = await MeetingsService.inviteToMeeting(11, [30, 31, 32]);

      expect(result.invitations[0].status).toBe('accepted');
      expect(result.invitations[1].status).toBe('declined');
      expect(result.invitations[2].status).toBe('cancelled');
    });
  });
});
