import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account } from '../../types';
import type { Conversation, Message } from '../../services/messaging';

const mockGetConversations = vi.fn();
const mockGetMessages = vi.fn();
const mockMarkAllRead = vi.fn();
const mockSendMessage = vi.fn();
const mockStartConversation = vi.fn();
const mockEditMessage = vi.fn();
const mockDeleteMessage = vi.fn();
const mockAddReaction = vi.fn();
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();

vi.mock('../../services/messaging', () => ({
  MessagingService: {
    getConversations: (...args: any[]) => mockGetConversations(...args),
    getMessages: (...args: any[]) => mockGetMessages(...args),
    markAllRead: (...args: any[]) => mockMarkAllRead(...args),
    sendMessage: (...args: any[]) => mockSendMessage(...args),
    startConversation: (...args: any[]) => mockStartConversation(...args),
    editMessage: (...args: any[]) => mockEditMessage(...args),
    deleteMessage: (...args: any[]) => mockDeleteMessage(...args),
    addReaction: (...args: any[]) => mockAddReaction(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: any[]) => mockToastError(...args),
    success: (...args: any[]) => mockToastSuccess(...args),
  },
}));

vi.mock('../ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('../ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}));

import MessagingPanel from '../MessagingPanel';

const makeConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 101,
  type: 'direct',
  participants: [
    {
      id: 2,
      name: 'Teacher B',
      avatar: '🧑‍🏫',
      location: 'Paris',
    },
  ],
  unreadCount: 1,
  updatedAt: new Date('2026-03-10T10:00:00.000Z').toISOString(),
  lastMessage: {
    id: 700,
    content: 'Latest hello',
    senderId: 2,
    createdAt: new Date('2026-03-10T10:00:00.000Z').toISOString(),
    messageType: 'text',
  },
  ...overrides,
});

const makeMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 1,
  conversationId: 101,
  senderId: 2,
  senderName: 'Teacher B',
  content: 'Hi from Teacher B',
  messageType: 'text',
  createdAt: new Date('2026-03-10T10:01:00.000Z').toISOString(),
  isRead: true,
  ...overrides,
});

const mockAccount: Account = {
  id: '1',
  classroomName: 'Teacher A',
  location: 'Tokyo',
  size: 22,
  description: 'Classroom account',
  interests: ['culture'],
  schedule: {},
  x: 0,
  y: 0,
  friends: [
    {
      id: 'f-2',
      classroomId: '2',
      classroomName: 'Teacher B',
      location: 'Paris',
      addedDate: new Date('2026-03-01T10:00:00.000Z'),
    },
  ],
};

const renderMessagingPanel = (overrides: Partial<React.ComponentProps<typeof MessagingPanel>> = {}) => {
  return render(<MessagingPanel currentAccount={mockAccount} {...overrides} />);
};

beforeAll(() => {
  Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
    value: vi.fn(),
    writable: true,
  });
});

beforeEach(() => {
  vi.clearAllMocks();

  mockGetConversations.mockResolvedValue({ conversations: [] });
  mockGetMessages.mockResolvedValue({
    messages: [],
    pagination: { page: 1, perPage: 30, total: 0, pages: 1, hasNext: false, hasPrev: false },
  });
  mockMarkAllRead.mockResolvedValue({ msg: 'ok' });
  mockSendMessage.mockResolvedValue({
    msg: 'sent',
    message: makeMessage({ id: 999, senderId: 1, senderName: 'Teacher A', content: 'Hello there' }),
  });
  mockStartConversation.mockResolvedValue({ msg: 'started', conversation: makeConversation() });
  mockEditMessage.mockResolvedValue({ msg: 'updated', message: makeMessage() });
  mockDeleteMessage.mockResolvedValue({ msg: 'deleted' });
  mockAddReaction.mockResolvedValue({ msg: 'ok', action: 'added' });
});

describe('MessagingPanel', () => {
  it('renders empty state when no conversations are returned', async () => {
    renderMessagingPanel();

    await waitFor(() => {
      expect(screen.getByText(/no conversations yet/i)).toBeInTheDocument();
    });

    expect(mockGetConversations).toHaveBeenCalled();
  });

  it('loads conversation messages when a conversation is selected', async () => {
    const user = userEvent.setup();
    mockGetConversations.mockResolvedValue({ conversations: [makeConversation()] });
    mockGetMessages.mockResolvedValue({
      messages: [makeMessage()],
      pagination: { page: 1, perPage: 30, total: 1, pages: 1, hasNext: false, hasPrev: false },
    });

    renderMessagingPanel();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /teacher b/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /teacher b/i }));

    await waitFor(() => {
      expect(screen.getByText('Hi from Teacher B')).toBeInTheDocument();
    });

    expect(mockGetMessages).toHaveBeenCalledWith(101, 1, 30);
    expect(mockMarkAllRead).toHaveBeenCalledWith(101);
    expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument();
  });

  it('sends a new message from the active conversation', async () => {
    const user = userEvent.setup();
    mockGetConversations.mockResolvedValue({ conversations: [makeConversation()] });

    const { container } = renderMessagingPanel();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /teacher b/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /teacher b/i }));

    const input = await screen.findByPlaceholderText(/type a message/i);
    await user.type(input, 'Hello there');

    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitButton).toBeEnabled();

    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(101, 'Hello there');
    });

    expect(screen.getByText('Hello there')).toBeInTheDocument();
  });
});
