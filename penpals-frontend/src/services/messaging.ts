import { ApiClient } from './api';

export interface Conversation {
  id: number;
  type: 'direct' | 'group';
  title?: string;
  participants: {
    id: number;
    name: string;
    avatar?: string;
    location?: string;
  }[];
  lastMessage?: {
    id: number;
    content: string;
    senderId: number;
    createdAt: string;
    messageType: string;
  };
  unreadCount: number;
  updatedAt: string;
}

export interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  senderAvatar?: string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  attachmentUrl?: string;
  createdAt: string;
  editedAt?: string;
  isRead: boolean;
  deleted?: boolean;
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  emoji: string;
  count: number;
  profiles: { id: number; name: string }[];
  hasReacted: boolean;
}

export interface MessagesPagination {
  page: number;
  perPage: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export const MessagingService = {
  getConversations: async () => {
    return ApiClient.get<{ conversations: Conversation[] }>('/conversations');
  },

  startConversation: async (friendId: number) => {
    return ApiClient.post<{ msg: string; conversation: Conversation }>('/conversations/start', { friendId });
  },

  getMessages: async (conversationId: number, page = 1, perPage = 30) => {
    return ApiClient.get<{ messages: Message[]; pagination: MessagesPagination }>(
      `/conversations/${conversationId}/messages?page=${page}&per_page=${perPage}`
    );
  },

  sendMessage: async (conversationId: number, content: string, messageType: 'text' | 'image' = 'text', attachmentUrl?: string) => {
    return ApiClient.post<{ msg: string; message: Message }>(
      `/conversations/${conversationId}/messages`,
      { content, messageType, attachmentUrl }
    );
  },

  markMessageRead: async (messageId: number) => {
    return ApiClient.post<{ msg: string }>(`/messages/${messageId}/read`, {});
  },

  markAllRead: async (conversationId: number) => {
    return ApiClient.post<{ msg: string }>(`/conversations/${conversationId}/mark-all-read`, {});
  },

  editMessage: async (messageId: number, content: string) => {
    return ApiClient.put<{ msg: string; message: Message }>(`/messages/${messageId}`, { content });
  },

  deleteMessage: async (messageId: number) => {
    return ApiClient.delete<{ msg: string }>(`/messages/${messageId}`);
  },

  addReaction: async (messageId: number, emoji: string) => {
    return ApiClient.post<{ msg: string; action: 'added' | 'removed' }>(`/messages/${messageId}/reactions`, { emoji });
  },

  getReactions: async (messageId: number) => {
    return ApiClient.get<{ reactions: MessageReaction[] }>(`/messages/${messageId}/reactions`);
  },
};
