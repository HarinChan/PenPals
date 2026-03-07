import { ApiClient } from './api';

export interface MeetingDto {
  id: number;
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  web_link?: string | null;
  password?: string | null;
  creator_name: string;
  creator_id: number;
  visibility: 'private' | 'public';
  status: 'pending_setup' | 'active' | 'cancelled';
  max_participants?: number | null;
  participant_count: number;
  join_count: number;
  is_creator?: boolean;
  is_participant?: boolean;
  is_full?: boolean;
  trending_score?: number;
}

export interface MeetingInvitationResult {
  id: number;
  receiver_id: number;
  receiver_name: string;
  title: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  meeting_id: number;
}

export const MeetingsService = {
  getUpcoming: async () => {
    return ApiClient.get<{ meetings: MeetingDto[] }>('/meetings');
  },

  getPublicMeetings: async () => {
    return ApiClient.get<{ meetings: MeetingDto[] }>('/meetings/public');
  },

  getTrendingMeetings: async () => {
    return ApiClient.get<{ meetings: MeetingDto[] }>('/meetings/public/trending');
  },

  joinPublicMeeting: async (meetingId: number) => {
    return ApiClient.post<{ msg: string; meeting: MeetingDto }>(`/meetings/${meetingId}/join`);
  },

  cancelMeeting: async (meetingId: number) => {
    return ApiClient.delete<{ msg: string }>(`/webex/meeting/${meetingId}`);
  },

  inviteToMeeting: async (meetingId: number, classroomIds: number[]) => {
    return ApiClient.post<{
      msg: string;
      invitations: MeetingInvitationResult[];
      skipped: Array<{ receiver_id: number; receiver_name?: string; reason: string }>;
    }>(`/webex/meeting/${meetingId}/invitees`, { classroom_ids: classroomIds });
  },
};
