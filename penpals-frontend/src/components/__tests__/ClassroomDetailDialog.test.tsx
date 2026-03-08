import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { Classroom } from '../../types';

const mockFetchAllClassrooms = vi.fn();
const mockApiPost = vi.fn();
const mockToastError = vi.fn();
const mockToastPromise = vi.fn();

vi.mock('tz-lookup', () => ({
  default: vi.fn(() => 'UTC'),
}));

vi.mock('../../services/classroom', () => ({
  ClassroomService: {
    fetchAllClassrooms: (...args: any[]) => mockFetchAllClassrooms(...args),
  },
}));

vi.mock('../../services/api', () => ({
  ApiClient: {
    post: (...args: any[]) => mockApiPost(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: any[]) => mockToastError(...args),
    promise: (...args: any[]) => mockToastPromise(...args),
  },
}));

import ClassroomDetailDialog from '../ClassroomDetailDialog';

const buildHourRange = () => Array.from({ length: 24 }, (_, index) => index);

const makeClassroom = (overrides: Partial<Classroom> = {}): Classroom => ({
  id: '101',
  name: 'Class A',
  location: 'Paris',
  lat: 48.8566,
  lon: 2.3522,
  interests: ['math', 'science'],
  availability: {
    Mon: buildHourRange(),
    Tue: buildHourRange(),
    Wed: buildHourRange(),
    Thu: buildHourRange(),
    Fri: buildHourRange(),
    Sat: buildHourRange(),
    Sun: buildHourRange(),
  },
  size: 25,
  description: 'A great classroom',
  ...overrides,
});

const makeMySchedule = () => ({
  Mon: buildHourRange(),
  Tue: buildHourRange(),
  Wed: buildHourRange(),
  Thu: buildHourRange(),
  Fri: buildHourRange(),
  Sat: buildHourRange(),
  Sun: buildHourRange(),
});

const renderDialog = (overrides: Partial<React.ComponentProps<typeof ClassroomDetailDialog>> = {}) => {
  const onOpenChange = vi.fn();
  const onToggleFriend = vi.fn();
  const onMeetingCreated = vi.fn();

  render(
    <ClassroomDetailDialog
      classroom={makeClassroom()}
      open
      onOpenChange={onOpenChange}
      mySchedule={makeMySchedule()}
      friendshipStatus="none"
      onToggleFriend={onToggleFriend}
      onMeetingCreated={onMeetingCreated}
      {...overrides}
    />,
  );

  return { onOpenChange, onToggleFriend, onMeetingCreated };
};

describe('ClassroomDetailDialog', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();

    mockFetchAllClassrooms.mockResolvedValue({
      classrooms: [
        { id: '200', name: 'Invite Alpha', location: 'Singapore' },
        { id: '201', name: 'Invite Beta', location: 'Tokyo' },
      ],
    });

    mockApiPost.mockResolvedValue({ ok: true, id: 'meeting-1' });

    mockToastPromise.mockImplementation(async (promiseLike: Promise<any>, options: any) => {
      const result = await promiseLike;
      if (result && options?.success) {
        options.success(result);
      }
      return result;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders classroom details and info sections', () => {
    renderDialog();

    expect(screen.getByText('Class A')).toBeInTheDocument();
    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('A great classroom')).toBeInTheDocument();
    expect(screen.getByText('Interests & Subjects')).toBeInTheDocument();
    expect(screen.getByText('math')).toBeInTheDocument();
    expect(screen.getByText('science')).toBeInTheDocument();
  });

  it('returns null when classroom is null', () => {
    render(
      <ClassroomDetailDialog
        classroom={null}
        open
        onOpenChange={vi.fn()}
        mySchedule={{}}
        friendshipStatus="none"
      />,
    );

    expect(screen.queryByText('Connect with this classroom to learn together')).not.toBeInTheDocument();
  });

  it('shows correct friend action label for friendship statuses', () => {
    const { rerender } = render(
      <ClassroomDetailDialog
        classroom={makeClassroom()}
        open
        onOpenChange={vi.fn()}
        mySchedule={makeMySchedule()}
        friendshipStatus="none"
        onToggleFriend={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /send friend request/i })).toBeInTheDocument();

    rerender(
      <ClassroomDetailDialog
        classroom={makeClassroom()}
        open
        onOpenChange={vi.fn()}
        mySchedule={makeMySchedule()}
        friendshipStatus="accepted"
        onToggleFriend={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /unfriend/i })).toBeInTheDocument();

    rerender(
      <ClassroomDetailDialog
        classroom={makeClassroom()}
        open
        onOpenChange={vi.fn()}
        mySchedule={makeMySchedule()}
        friendshipStatus="pending"
        onToggleFriend={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /cancel request/i })).toBeInTheDocument();

    rerender(
      <ClassroomDetailDialog
        classroom={makeClassroom()}
        open
        onOpenChange={vi.fn()}
        mySchedule={makeMySchedule()}
        friendshipStatus="received"
        onToggleFriend={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /accept request/i })).toBeInTheDocument();
  });

  it('calls onToggleFriend when friend button is clicked', async () => {
    const user = userEvent.setup();
    const { onToggleFriend } = renderDialog();

    await user.click(screen.getByRole('button', { name: /send friend request/i }));

    expect(onToggleFriend).toHaveBeenCalledTimes(1);
    expect(onToggleFriend).toHaveBeenCalledWith(expect.objectContaining({ id: '101', name: 'Class A' }));
  });

  it('opens schedule UI and loads invitee classrooms', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: /schedule call/i }));

    expect(screen.getByText('Schedule a Call')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockFetchAllClassrooms).toHaveBeenCalledTimes(1);
    });
  });

  it('allows searching and selecting invitee classrooms', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: /schedule call/i }));

    await waitFor(() => {
      expect(mockFetchAllClassrooms).toHaveBeenCalled();
    });

    const searchInput = screen.getByPlaceholderText(/search classrooms by name or location/i);
    await user.type(searchInput, 'invite alpha');

    const inviteeButton = await screen.findByRole('button', { name: /invite alpha • singapore/i });
    await user.click(inviteeButton);

    expect(screen.getByText('Invite Alpha ×')).toBeInTheDocument();
  });

  it('validates public meeting capacity before scheduling', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: /schedule call/i }));

    const publicMeetingCheckbox = screen.getByRole('checkbox', {
      name: /make this meeting public/i,
    });
    await user.click(publicMeetingCheckbox);

    const maxParticipantsInput = screen.getByRole('spinbutton');
    await user.clear(maxParticipantsInput);
    await user.type(maxParticipantsInput, '1');

    await user.click(screen.getByRole('button', { name: /confirm schedule/i }));

    expect(mockToastError).toHaveBeenCalledWith('Public meetings require a capacity of at least 2.');
    expect(mockToastPromise).not.toHaveBeenCalled();
  });

  it('creates instant call when call now is available', async () => {
    const user = userEvent.setup();

    const currentHour = new Date().getHours();
    const currentDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];

    renderDialog({
      classroom: makeClassroom({ availability: { [currentDay]: [currentHour] } }),
      mySchedule: { [currentDay]: [currentHour] },
    });

    const callNowButton = screen.getByRole('button', { name: /call now/i });
    expect(callNowButton).not.toBeDisabled();

    await user.click(callNowButton);

    await waitFor(() => {
      expect(mockToastPromise).toHaveBeenCalledTimes(1);
      expect(mockApiPost).toHaveBeenCalledWith('/webex/meeting', expect.objectContaining({
        title: 'Instant Call with Class A',
      }));
    });
  });
});
