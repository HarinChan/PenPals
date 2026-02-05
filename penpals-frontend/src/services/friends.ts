
import { ApiClient } from './api';

export interface FriendRequestDto {
    classroomId: string;
}

export const FriendsService = {
    sendRequest: async (classroomId: string) => {
        return ApiClient.post<{ msg: string; status: string }>('/friends/request', { classroomId });
    },

    acceptRequest: async (requestId: string | undefined, senderId: string | undefined) => {
        return ApiClient.post<{ msg: string }>('/friends/accept', { requestId, senderId });
    },

    rejectRequest: async (requestId: string | undefined, senderId: string | undefined) => {
        return ApiClient.post<{ msg: string }>('/friends/reject', { requestId, senderId });
    },

    removeFriend: async (friendId: string) => {
        return ApiClient.delete<{ msg: string }>(`/friends/${friendId}`);
    },

    markNotificationRead: async (notificationId: string) => {
        return ApiClient.post<{ msg: string }>(`/notifications/${notificationId}/read`, {});
    },

    deleteNotification: async (notificationId: string) => {
        return ApiClient.delete<{ msg: string }>(`/notifications/${notificationId}`);
    }
};
