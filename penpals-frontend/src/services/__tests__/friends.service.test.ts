import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FriendsService } from '../friends';
import { ApiClient } from '../api';

vi.mock('../api', () => ({
  ApiClient: {
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('FriendsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendRequest', () => {
    it('posts friend request with classroomId and returns response', async () => {
      const mockResponse = { msg: 'Friend request sent', status: 'pending' };
      vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

      const result = await FriendsService.sendRequest('classroom-123');

      expect(ApiClient.post).toHaveBeenCalledWith('/friends/request', { classroomId: 'classroom-123' });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('acceptRequest', () => {
    it('posts accept payload with requestId and senderId', async () => {
      const mockResponse = { msg: 'Friend request accepted' };
      vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

      const result = await FriendsService.acceptRequest('req-456', 'sender-789');

      expect(ApiClient.post).toHaveBeenCalledWith('/friends/accept', {
        requestId: 'req-456',
        senderId: 'sender-789',
      });
      expect(result).toEqual(mockResponse);
    });

    it('accepts undefined requestId and senderId', async () => {
      const mockResponse = { msg: 'Accepted' };
      vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

      const result = await FriendsService.acceptRequest(undefined, undefined);

      expect(ApiClient.post).toHaveBeenCalledWith('/friends/accept', {
        requestId: undefined,
        senderId: undefined,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('rejectRequest', () => {
    it('posts reject payload with requestId and senderId', async () => {
      const mockResponse = { msg: 'Friend request rejected' };
      vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

      const result = await FriendsService.rejectRequest('req-111', 'sender-222');

      expect(ApiClient.post).toHaveBeenCalledWith('/friends/reject', {
        requestId: 'req-111',
        senderId: 'sender-222',
      });
      expect(result).toEqual(mockResponse);
    });

    it('accepts undefined requestId and senderId', async () => {
      const mockResponse = { msg: 'Rejected' };
      vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

      const result = await FriendsService.rejectRequest(undefined, undefined);

      expect(ApiClient.post).toHaveBeenCalledWith('/friends/reject', {
        requestId: undefined,
        senderId: undefined,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('removeFriend', () => {
    it('deletes friend by friendId and returns response', async () => {
      const mockResponse = { msg: 'Friend removed' };
      vi.mocked(ApiClient.delete).mockResolvedValue(mockResponse as any);

      const result = await FriendsService.removeFriend('friend-999');

      expect(ApiClient.delete).toHaveBeenCalledWith('/friends/friend-999');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('markNotificationRead', () => {
    it('posts to notification read endpoint with empty payload', async () => {
      const mockResponse = { msg: 'Notification marked as read' };
      vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

      const result = await FriendsService.markNotificationRead('notif-42');

      expect(ApiClient.post).toHaveBeenCalledWith('/notifications/notif-42/read', {});
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteNotification', () => {
    it('deletes notification by notificationId and returns response', async () => {
      const mockResponse = { msg: 'Notification deleted' };
      vi.mocked(ApiClient.delete).mockResolvedValue(mockResponse as any);

      const result = await FriendsService.deleteNotification('notif-555');

      expect(ApiClient.delete).toHaveBeenCalledWith('/notifications/notif-555');
      expect(result).toEqual(mockResponse);
    });
  });
});
