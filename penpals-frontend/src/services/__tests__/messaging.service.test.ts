import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MessagingService } from '../messaging';
import { ApiClient } from '../api';

vi.mock('../api', () => ({
  ApiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('messaging service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gets conversations', async () => {
    const mockResponse = {
      conversations: [
        {
          id: 1,
          type: 'direct',
          participants: [{ id: 2, name: 'Classroom B' }],
          unreadCount: 0,
          updatedAt: '2026-03-10T10:00:00Z',
        },
      ],
    };

    vi.mocked(ApiClient.get).mockResolvedValue(mockResponse as any);

    const result = await MessagingService.getConversations();

    expect(ApiClient.get).toHaveBeenCalledWith('/conversations');
    expect(result).toEqual(mockResponse);
  });

  it('starts conversation with friend id', async () => {
    const mockResponse = {
      msg: 'started',
      conversation: {
        id: 7,
        type: 'direct',
        participants: [{ id: 3, name: 'Classroom C' }],
        unreadCount: 0,
        updatedAt: '2026-03-10T10:00:00Z',
      },
    };

    vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

    const result = await MessagingService.startConversation(3);

    expect(ApiClient.post).toHaveBeenCalledWith('/conversations/start', { friendId: 3 });
    expect(result).toEqual(mockResponse);
  });

  it('gets messages using default pagination values', async () => {
    const mockResponse = {
      messages: [],
      pagination: { page: 1, perPage: 30, total: 0, pages: 1, hasNext: false, hasPrev: false },
    };

    vi.mocked(ApiClient.get).mockResolvedValue(mockResponse as any);

    const result = await MessagingService.getMessages(12);

    expect(ApiClient.get).toHaveBeenCalledWith('/conversations/12/messages?page=1&per_page=30');
    expect(result).toEqual(mockResponse);
  });

  it('gets messages with custom pagination values', async () => {
    vi.mocked(ApiClient.get).mockResolvedValue({ messages: [], pagination: {} } as any);

    await MessagingService.getMessages(22, 3, 50);

    expect(ApiClient.get).toHaveBeenCalledWith('/conversations/22/messages?page=3&per_page=50');
  });

  it('sends message with default type', async () => {
    const mockResponse = {
      msg: 'sent',
      message: {
        id: 100,
        conversationId: 12,
        senderId: 1,
        senderName: 'Classroom A',
        content: 'Hello',
        messageType: 'text',
        createdAt: '2026-03-10T10:10:00Z',
        isRead: true,
      },
    };

    vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

    const result = await MessagingService.sendMessage(12, 'Hello');

    expect(ApiClient.post).toHaveBeenCalledWith('/conversations/12/messages', {
      content: 'Hello',
      messageType: 'text',
      attachmentUrl: undefined,
    });
    expect(result).toEqual(mockResponse);
  });

  it('sends message with custom type and attachment URL', async () => {
    vi.mocked(ApiClient.post).mockResolvedValue({ msg: 'sent', message: {} } as any);

    await MessagingService.sendMessage(12, 'Picture', 'image', 'https://cdn.example.com/img.jpg');

    expect(ApiClient.post).toHaveBeenCalledWith('/conversations/12/messages', {
      content: 'Picture',
      messageType: 'image',
      attachmentUrl: 'https://cdn.example.com/img.jpg',
    });
  });

  it('marks one message as read', async () => {
    vi.mocked(ApiClient.post).mockResolvedValue({ msg: 'ok' } as any);

    await MessagingService.markMessageRead(55);

    expect(ApiClient.post).toHaveBeenCalledWith('/messages/55/read', {});
  });

  it('marks all messages in a conversation as read', async () => {
    vi.mocked(ApiClient.post).mockResolvedValue({ msg: 'ok' } as any);

    await MessagingService.markAllRead(77);

    expect(ApiClient.post).toHaveBeenCalledWith('/conversations/77/mark-all-read', {});
  });

  it('edits a message', async () => {
    const mockResponse = {
      msg: 'updated',
      message: {
        id: 7,
        conversationId: 12,
        senderId: 1,
        senderName: 'Classroom A',
        content: 'Edited content',
        messageType: 'text',
        createdAt: '2026-03-10T10:10:00Z',
        isRead: true,
      },
    };

    vi.mocked(ApiClient.put).mockResolvedValue(mockResponse as any);

    const result = await MessagingService.editMessage(7, 'Edited content');

    expect(ApiClient.put).toHaveBeenCalledWith('/messages/7', { content: 'Edited content' });
    expect(result).toEqual(mockResponse);
  });

  it('deletes a message', async () => {
    const mockResponse = { msg: 'deleted' };
    vi.mocked(ApiClient.delete).mockResolvedValue(mockResponse as any);

    const result = await MessagingService.deleteMessage(9);

    expect(ApiClient.delete).toHaveBeenCalledWith('/messages/9');
    expect(result).toEqual(mockResponse);
  });

  it('adds reaction to message', async () => {
    const mockResponse = { msg: 'ok', action: 'added' };
    vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

    const result = await MessagingService.addReaction(15, '👍');

    expect(ApiClient.post).toHaveBeenCalledWith('/messages/15/reactions', { emoji: '👍' });
    expect(result).toEqual(mockResponse);
  });

  it('gets reactions for message', async () => {
    const mockResponse = {
      reactions: [{ emoji: '👍', count: 2, profiles: [{ id: 1, name: 'A' }], hasReacted: true }],
    };

    vi.mocked(ApiClient.get).mockResolvedValue(mockResponse as any);

    const result = await MessagingService.getReactions(15);

    expect(ApiClient.get).toHaveBeenCalledWith('/messages/15/reactions');
    expect(result).toEqual(mockResponse);
  });
});
