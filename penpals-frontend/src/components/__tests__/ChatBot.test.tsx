import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Account, Classroom } from '../../types';

// Mock the chat service
vi.mock('../../services/chat', () => ({
  sendChatMessage: vi.fn(),
  transcribeChatAudio: vi.fn(),
}));

// Mock scrollTo on HTMLElement
HTMLElement.prototype.scrollTo = vi.fn();

// Mock child components
vi.mock('../ClassroomDetailDialog', () => ({
  default: ({ open }: any) => (open ? <div data-testid="classroom-detail-dialog">Classroom Details</div> : null),
}));

vi.mock('../MeetingDetailsDialog', () => ({
  default: ({ open }: any) => (open ? <div data-testid="meeting-details-dialog">Meeting Details</div> : null),
}));

import ChatBot from '../ChatBot';
import * as chatService from '../../services/chat';

const makeMyClassroom = (overrides: Partial<Account> = {}): Account => ({
  id: 'my-1',
  classroomName: 'My Classroom',
  location: 'London',
  size: 30,
  description: 'My class',
  interests: ['math', 'science'],
  schedule: { Mon: [9, 10], Tue: [14] },
  x: -0.1273,
  y: 51.2507,
  ...overrides,
});

const makeClassroom = (overrides: Partial<Classroom> = {}): Classroom => ({
  id: 'c-1',
  name: 'Class A',
  location: 'Paris',
  lat: 48.8566,
  lon: 2.3522,
  interests: ['math'],
  availability: { Mon: [9] },
  size: 25,
  description: 'A classroom',
  ...overrides,
});

// Helper to get send button (last button in the input area)
const getSendButton = () => {
  const buttons = screen.getAllByRole('button');
  return buttons[buttons.length - 1];
};

const renderChatBot = (overrides: Partial<React.ComponentProps<typeof ChatBot>> = {}) => {
  const onClose = vi.fn();
  const myClassroom = makeMyClassroom();
  const classrooms = [makeClassroom()];

  render(
    <ChatBot
      onClose={onClose}
      classrooms={classrooms}
      currentAccount={myClassroom}
      {...overrides}
    />,
  );

  return { onClose, myClassroom, classrooms };
};

describe('ChatBot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(chatService.sendChatMessage).mockResolvedValue({
      status: 'success',
      reply: 'Here is some information about math classes.',
      context: [],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders initial greeting message', () => {
    renderChatBot();

    expect(screen.getByText('Hi! I can answer questions using the documents in our library. How can I help?')).toBeInTheDocument();
  });

  it('sends a message when user types and clicks send button', async () => {
    const user = userEvent.setup();
    renderChatBot();

    const input = screen.getByPlaceholderText('Ask about classrooms, topics, or help...');
    await user.type(input, 'Tell me about math classes');

    const sendButton = getSendButton();
    await user.click(sendButton);

    await waitFor(() => {
      expect(chatService.sendChatMessage).toHaveBeenCalledWith(
        'Tell me about math classes',
        expect.any(Array),
        5,
      );
    });
  });

  it('sends a message when pressing Enter in the input field', async () => {
    const user = userEvent.setup();
    renderChatBot();

    const input = screen.getByPlaceholderText('Ask about classrooms, topics, or help...');
    await user.type(input, 'What are available classes?');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(chatService.sendChatMessage).toHaveBeenCalledWith(
        'What are available classes?',
        expect.any(Array),
        5,
      );
    });
  });

  it('clears input after sending a message', async () => {
    const user = userEvent.setup();
    renderChatBot();

    const input = screen.getByPlaceholderText('Ask about classrooms, topics, or help...') as HTMLInputElement;
    await user.type(input, 'Test message');

    const sendButton = getSendButton();
    await user.click(sendButton);

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('displays assistant response with plain text', async () => {
    const user = userEvent.setup();
    vi.mocked(chatService.sendChatMessage).mockResolvedValue({
      status: 'success',
      reply: 'Math classes cover algebra and geometry.',
      context: [],
    });

    renderChatBot();

    const input = screen.getByPlaceholderText('Ask about classrooms, topics, or help...');
    await user.type(input, 'Tell me about classes');

    const sendButton = getSendButton();
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Math classes cover algebra and geometry.')).toBeInTheDocument();
    });
  });

  it('parses classroom tags from assistant response and displays suggestions', async () => {
    const user = userEvent.setup();
    const classroom = makeClassroom({ id: 'c-1', name: 'Class A' });
    const classrooms = [classroom];

    vi.mocked(chatService.sendChatMessage).mockResolvedValue({
      status: 'success',
      reply: 'Here is a recommended class: <classroom id="c-1" />',
      context: [],
    });

    renderChatBot({ classrooms });

    const input = screen.getByPlaceholderText('Ask about classrooms, topics, or help...');
    await user.type(input, 'Find a good class');

    const sendButton = getSendButton();
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Suggested Classrooms')).toBeInTheDocument();
      expect(screen.getByText('Class A')).toBeInTheDocument();
    });
  });

  it('displays multiple classroom suggestions when tagged', async () => {
    const user = userEvent.setup();
    const classroom1 = makeClassroom({ id: 'c-1', name: 'Math Class' });
    const classroom2 = makeClassroom({ id: 'c-2', name: 'Science Class' });
    const classrooms = [classroom1, classroom2];

    vi.mocked(chatService.sendChatMessage).mockResolvedValue({
      status: 'success',
      reply: 'Check these: <classroom id="c-1" /> and <classroom id="c-2" />',
      context: [],
    });

    renderChatBot({ classrooms });

    const input = screen.getByPlaceholderText('Ask about classrooms, topics, or help...');
    await user.type(input, 'Show me options');

    const sendButton = getSendButton();
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Math Class')).toBeInTheDocument();
      expect(screen.getByText('Science Class')).toBeInTheDocument();
    });
  });

  it('opens classroom details dialog when clicking a classroom suggestion', async () => {
    const user = userEvent.setup();
    const classroom = makeClassroom({ id: 'c-1', name: 'Math Class' });

    vi.mocked(chatService.sendChatMessage).mockResolvedValue({
      status: 'success',
      reply: 'Try this: <classroom id="c-1" />',
      context: [],
    });

    renderChatBot({ classrooms: [classroom] });

    const input = screen.getByPlaceholderText('Ask about classrooms, topics, or help...');
    await user.type(input, 'Show classes');

    const sendButton = getSendButton();
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Math Class')).toBeInTheDocument();
    });

    const classroomButtons = screen.getAllByRole('button');
    const classroomButton = classroomButtons.find(btn => btn.textContent?.includes('Math Class'));
    expect(classroomButton).toBeDefined();
    if (classroomButton) await user.click(classroomButton);

    expect(screen.getByTestId('classroom-detail-dialog')).toBeInTheDocument();
  });

  it('displays meeting suggestions when tagged in response', async () => {
    const user = userEvent.setup();
    vi.mocked(chatService.sendChatMessage).mockResolvedValue({
      status: 'success',
      reply: 'Check out this meeting: <meeting id="123" />',
      context: [
        {
          metadata: {
            source: 'meeting',
            meeting_id: 123,
            title: 'Algebra Workshop',
            description: 'Learn algebra basics',
            start_time: '2026-03-15T10:00:00Z',
            creator_name: 'Prof. Smith',
          },
        },
      ],
    });

    renderChatBot();

    const input = screen.getByPlaceholderText('Ask about classrooms, topics, or help...');
    await user.type(input, 'Find meetings');

    const sendButton = getSendButton();
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Suggested Public Meetings')).toBeInTheDocument();
      expect(screen.getByText('Algebra Workshop')).toBeInTheDocument();
    });
  });

  it('opens meeting details dialog when clicking a meeting suggestion', async () => {
    const user = userEvent.setup();
    vi.mocked(chatService.sendChatMessage).mockResolvedValue({
      status: 'success',
      reply: 'Try this: <meeting id="456" />',
      context: [
        {
          metadata: {
            source: 'meeting',
            meeting_id: 456,
            title: 'Geometry Seminar',
            creator_name: 'Dr. Jones',
          },
        },
      ],
    });

    renderChatBot();

    const input = screen.getByPlaceholderText('Ask about classrooms, topics, or help...');
    await user.type(input, 'Find meetings');

    const sendButton = getSendButton();
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Geometry Seminar')).toBeInTheDocument();
    });

    const meetingButtons = screen.getAllByRole('button');
    const meetingButton = meetingButtons.find(btn => btn.textContent?.includes('Geometry Seminar'));
    expect(meetingButton).toBeDefined();
    if (meetingButton) await user.click(meetingButton);

    expect(screen.getByTestId('meeting-details-dialog')).toBeInTheDocument();
  });

  it('displays error message when chat service fails', async () => {
    const user = userEvent.setup();
    vi.mocked(chatService.sendChatMessage).mockResolvedValue({
      status: 'error',
      message: 'Service temporarily unavailable',
    });

    renderChatBot();

    const input = screen.getByPlaceholderText('Ask about classrooms, topics, or help...');
    await user.type(input, 'Ask something');

    const sendButton = getSendButton();
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Service temporarily unavailable')).toBeInTheDocument();
    });
  });

  it('displays loading state while message is being processed', async () => {
    const user = userEvent.setup();
    vi.mocked(chatService.sendChatMessage).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        status: 'success',
        reply: 'Done',
        context: [],
      }), 100)),
    );

    renderChatBot();

    const input = screen.getByPlaceholderText('Ask about classrooms, topics, or help...');
    await user.type(input, 'Wait for it');

    const sendButton = getSendButton();
    await user.click(sendButton);

    expect(screen.getByText(/Thinking\.\.\./)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/Thinking\.\.\./)).not.toBeInTheDocument();
    });
  });

  it('disables send button when input is empty', () => {
    renderChatBot();

    const sendButton = getSendButton();
    expect(sendButton).toBeDisabled();
  });

  it('enables send button when input has text', async () => {
    const user = userEvent.setup();
    renderChatBot();

    const input = screen.getByPlaceholderText('Ask about classrooms, topics, or help...');
    const sendButton = getSendButton();

    expect(sendButton).toBeDisabled();

    await user.type(input, 'Test');

    expect(sendButton).not.toBeDisabled();
  });

  it('does not send message when input is only whitespace', async () => {
    const user = userEvent.setup();
    renderChatBot();

    const input = screen.getByPlaceholderText('Ask about classrooms, topics, or help...');
    await user.type(input, '   ');

    const sendButton = getSendButton();
    expect(sendButton).toBeDisabled();

    expect(chatService.sendChatMessage).not.toHaveBeenCalled();
  });

  it('builds meeting suggestions from response context with metadata', async () => {
    const user = userEvent.setup();
    vi.mocked(chatService.sendChatMessage).mockResolvedValue({
      status: 'success',
      reply: 'Meetings: <meeting id="100" /> <meeting id="101" />',
      context: [
        {
          metadata: {
            source: 'meeting',
            meeting_id: 100,
            title: 'Math Basics',
            start_time: '2026-03-20T09:00:00Z',
            creator_name: 'Teacher A',
          },
        },
        {
          metadata: {
            source: 'meeting',
            meeting_id: 101,
            title: 'Physics Advanced',
            description: 'Advanced topics in physics',
            creator_name: 'Teacher B',
          },
        },
      ],
    });

    renderChatBot();

    const input = screen.getByPlaceholderText('Ask about classrooms, topics, or help...');
    await user.type(input, 'Multiple meetings');

    const sendButton = getSendButton();
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Math Basics')).toBeInTheDocument();
      expect(screen.getByText('Physics Advanced')).toBeInTheDocument();
      expect(screen.getByText(/Teacher A/)).toBeInTheDocument();
      expect(screen.getByText(/Teacher B/)).toBeInTheDocument();
    });
  });

  it('trims whitespace from user input before sending', async () => {
    const user = userEvent.setup();
    renderChatBot();

    const input = screen.getByPlaceholderText('Ask about classrooms, topics, or help...');
    await user.type(input, '  hello world  ');

    const sendButton = getSendButton();
    await user.click(sendButton);

    await waitFor(() => {
      expect(chatService.sendChatMessage).toHaveBeenCalledWith(
        'hello world',
        expect.any(Array),
        5,
      );
    });
  });

  it('filters classroom suggestions to only include existing classrooms', async () => {
    const user = userEvent.setup();
    const classroom = makeClassroom({ id: 'c-1', name: 'Available Class' });

    vi.mocked(chatService.sendChatMessage).mockResolvedValue({
      status: 'success',
      reply: 'Try: <classroom id="c-1" /> and <classroom id="c-999" />',
      context: [],
    });

    renderChatBot({ classrooms: [classroom] });

    const input = screen.getByPlaceholderText('Ask about classrooms, topics, or help...');
    await user.type(input, 'Show classes');

    const sendButton = getSendButton();
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Available Class')).toBeInTheDocument();
      expect(screen.queryByText('c-999')).not.toBeInTheDocument();
    });
  });
});
