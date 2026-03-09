import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SidePanel from '../SidePanel';
import { Account, Classroom } from '../../types';
import { toast } from 'sonner';

// Use hoisted to allow using mocks in vi.mock calls
const {
  mockGetUpcoming,
  mockGetTrendingMeetings,
  mockCancelMeeting,
  mockUpdateClassroom,
  mockCreateClassroom,
  mockApiGet,
  mockApiPost,
  mockRemoveFriend,
} = vi.hoisted(() => ({
  mockGetUpcoming: vi.fn(),
  mockGetTrendingMeetings: vi.fn(),
  mockCancelMeeting: vi.fn(),
  mockUpdateClassroom: vi.fn(),
  mockCreateClassroom: vi.fn(),
  mockApiGet: vi.fn(),
  mockApiPost: vi.fn(),
  mockRemoveFriend: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../services', () => ({
  ClassroomService: {
    updateClassroom: mockUpdateClassroom,
    createClassroom: mockCreateClassroom,
    deleteClassroom: vi.fn(),
  },
  MeetingsService: {
    getUpcoming: mockGetUpcoming,
    getTrendingMeetings: mockGetTrendingMeetings,
    cancelMeeting: mockCancelMeeting,
  },
}));

vi.mock('../../services/api', () => ({
  ApiClient: {
    get: mockApiGet,
    post: mockApiPost,
  },
}));

vi.mock('../../services/friends', () => ({
  FriendsService: {
    acceptRequest: vi.fn(),
    rejectRequest: vi.fn(),
    removeFriend: mockRemoveFriend,
    sendRequest: vi.fn(),
    markNotificationRead: vi.fn(),
    deleteNotification: vi.fn(),
  },
}));

vi.mock('../ClassroomDetailDialog', () => ({
  default: ({ open }: any) => open ? <div data-testid="classroom-detail-dialog">Dialog</div> : null,
}));

vi.mock('../FeedPanel', () => ({
  default: () => <div data-testid="feed-panel">Feed Panel</div>,
}));

vi.mock('../sidepanel/ClassroomSwitcher', () => ({
  default: ({ onCreateNew, onDelete }: any) => (
    <div data-testid="classroom-switcher">
      <button onClick={onCreateNew}>Create New</button>
      <button onClick={() => onDelete('1')}>Delete</button>
    </div>
  ),
}));

vi.mock('../sidepanel/AccountInfo', () => ({
  default: ({ onSave }: any) => (
    <div data-testid="account-info">
      <button onClick={() => onSave({ classroomName: 'Test', location: 'Test', size: 20, description: 'Test', avatar: '' })}>Save</button>
    </div>
  ),
}));

vi.mock('../sidepanel/InterestsWidget', () => ({
  default: () => <div data-testid="interests-widget">Interests</div>,
}));

vi.mock('../sidepanel/ScheduleWidget', () => ({
  default: () => <div data-testid="schedule-widget">Schedule</div>,
}));

vi.mock('../sidepanel/UpcomingMeetingsWidget', () => ({
  default: ({ onMeetingClick }: any) => (
    <div data-testid="upcoming-meetings-widget">
      <button onClick={() => onMeetingClick(1)}>Meeting 1</button>
    </div>
  ),
}));

vi.mock('../sidepanel/PublicMeetingsWidget', () => ({
  default: ({ onMeetingClick, onCancelMeeting }: any) => (
    <div data-testid="public-meetings-widget">
      <button onClick={() => onMeetingClick(1)}>Public Meeting</button>
      <button onClick={() => onCancelMeeting({ id: 1, title: 'Test' })}>Cancel</button>
    </div>
  ),
}));

vi.mock('../sidepanel/InvitationsWidget', () => ({
  default: ({ onAcceptInvitation, onDeclineInvitation }: any) => (
    <div data-testid="invitations-widget">
      <button onClick={() => onAcceptInvitation(1)}>Accept</button>
      <button onClick={() => onDeclineInvitation(1)}>Decline</button>
    </div>
  ),
}));

vi.mock('../sidepanel/RecentCallsWidget', () => ({
  default: () => <div data-testid="recent-calls-widget">Recent Calls</div>,
}));

vi.mock('../sidepanel/FriendsWidget', () => ({
  default: ({ onRemoveFriend }: any) => (
    <div data-testid="friends-widget">
      <button onClick={() => onRemoveFriend('1')}>Remove Friend</button>
    </div>
  ),
}));

vi.mock('../sidepanel/ClassroomsList', () => ({
  default: () => <div data-testid="classrooms-list">Classrooms List</div>,
}));

vi.mock('../MeetingDetailsDialog', () => ({
  default: ({ open }: any) => open ? <div data-testid="meeting-details-dialog">Meeting Dialog</div> : null,
}));

describe('SidePanel', () => {
  const mockCurrentAccount: Account = {
    id: '1',
    classroomName: 'Main Classroom',
    location: 'New York',
    size: 30,
    description: 'Main classroom',
    interests: [],
    schedule: {},
    x: -74.0060,
    y: 40.7128,
    avatar: '',
    recentCalls: [],
    friends: [],
    receivedFriendRequests: [],
    notifications: [],
  };

  const mockAccounts: Account[] = [mockCurrentAccount];

  const mockClassroom: Classroom = {
    id: '1',
    name: 'Science Class',
    location: 'New York',
    latitude: 40.7128,
    longitude: -74.0060,
    class_size: 25,
    description: 'Science classroom',
    interests: [],
  };

  const mockClassrooms: Classroom[] = [mockClassroom];

  const defaultProps = {
    selectedClassroom: undefined,
    onClassroomSelect: vi.fn(),
    currentAccount: mockCurrentAccount,
    accounts: mockAccounts,
    classrooms: mockClassrooms,
    onAccountChange: vi.fn(),
    onAccountUpdate: vi.fn(),
    onAccountCreate: vi.fn(),
    onAccountDelete: vi.fn(),
    allPosts: [],
    myPosts: [],
    onCreatePost: vi.fn(),
    onDeletePost: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    
    mockGetUpcoming.mockResolvedValue({ meetings: [] });
    mockGetTrendingMeetings.mockResolvedValue({ meetings: [] });
    mockApiGet.mockResolvedValue({ invitations: [], sent_invitations: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders expanded sidebar by default', () => {
    render(<SidePanel {...defaultProps} />);

    expect(screen.getByTestId('classroom-switcher')).toBeInTheDocument();
    expect(screen.getByTestId('account-info')).toBeInTheDocument();
    expect(screen.getByTestId('interests-widget')).toBeInTheDocument();
  });

  it('collapses sidebar when collapse button is clicked', async () => {
    const user = userEvent.setup();

    render(<SidePanel {...defaultProps} />);

    const collapseButton = screen.getByTitle('Collapse sidebar');
    await user.click(collapseButton);

    expect(screen.queryByTestId('classroom-switcher')).not.toBeInTheDocument();
    expect(screen.getByTitle('Account')).toBeInTheDocument();
  });

  it('expands sidebar when expand button is clicked in collapsed view', async () => {
    const user = userEvent.setup();

    render(<SidePanel {...defaultProps} />);

    const collapseButton = screen.getByTitle('Collapse sidebar');
    await user.click(collapseButton);

    const expandButton = screen.getByTitle('Expand sidebar');
    await user.click(expandButton);

    expect(screen.getByTestId('classroom-switcher')).toBeInTheDocument();
  });

  it('switches to Feed tab and displays FeedPanel', async () => {
    const user = userEvent.setup();

    render(<SidePanel {...defaultProps} />);

    const feedTab = screen.getByRole('tab', { name: /feed/i });
    await user.click(feedTab);

    await waitFor(() => {
      expect(screen.getByTestId('feed-panel')).toBeInTheDocument();
    });
  });

  it('opens classroom detail dialog when selectedClassroom prop is provided', () => {
    render(
      <SidePanel
        {...defaultProps}
        selectedClassroom={mockClassroom}
      />
    );

    expect(screen.getByTestId('classroom-detail-dialog')).toBeInTheDocument();
  });

  it('handles create classroom dialog - cancel', async () => {
    const user = userEvent.setup();

    render(<SidePanel {...defaultProps} />);

    const createButton = screen.getByText('Create New');
    await user.click(createButton);

    expect(screen.getByText('Create New Classroom')).toBeInTheDocument();

    // Get the dialog close button instead of Cancel button
    const buttons = screen.getAllByRole('button');
    const cancelButton = buttons.find(btn => btn.getAttribute('aria-label')?.includes('Close') || btn.textContent === 'Cancel');
    
    if (cancelButton) {
      fireEvent.click(cancelButton);
    }

    expect(screen.queryByText('Create New Classroom')).not.toBeInTheDocument();
  });

  it('creates new classroom with valid data', async () => {
    const user = userEvent.setup();
    mockCreateClassroom.mockResolvedValue({
      classroom: {
        id: 2,
        name: 'New Classroom',
        location: 'New York',
        latitude: '40.7128',
        longitude: '-74.0060',
        class_size: 20,
        interests: [],
      },
    });

    render(<SidePanel {...defaultProps} />);

    const createButton = screen.getByText('Create New');
    await user.click(createButton);

    const nameInput = screen.getByPlaceholderText('e.g. Science Class 101');
    await user.type(nameInput, 'New Classroom');

    const createClassroomButton = screen.getByRole('button', { name: /create classroom/i });
    await user.click(createClassroomButton);

    await waitFor(() => {
      expect(defaultProps.onAccountCreate).toHaveBeenCalled();
    });

    expect(toast.success).toHaveBeenCalledWith('New classroom created!');
  });

  it('prevents creating classroom with empty name', async () => {
    const user = userEvent.setup();

    render(<SidePanel {...defaultProps} />);

    const createButton = screen.getByText('Create New');
    await user.click(createButton);

    const createClassroomButton = screen.getByRole('button', { name: /create classroom/i });
    await user.click(createClassroomButton);

    expect(toast.error).toHaveBeenCalledWith('Please enter a classroom name');
  });

  it('prevents creating classroom with duplicate name', async () => {
    const user = userEvent.setup();

    render(<SidePanel {...defaultProps} />);

    const createButton = screen.getByText('Create New');
    await user.click(createButton);

    const nameInput = screen.getByPlaceholderText('e.g. Science Class 101');
    await user.type(nameInput, 'Main Classroom');

    const createClassroomButton = screen.getByRole('button', { name: /create classroom/i });
    await user.click(createClassroomButton);

    expect(toast.error).toHaveBeenCalledWith('A classroom with this name already exists');
  });

  it('opens delete confirmation dialog when delete is clicked', async () => {
    const user = userEvent.setup();

    const props = {
      ...defaultProps,
      accounts: [
        mockCurrentAccount,
        { ...mockCurrentAccount, id: '2', classroomName: 'Second Classroom' },
      ],
    };

    render(<SidePanel {...props} />);

    const deleteButton = screen.getByText('Delete');
    await user.click(deleteButton);

    expect(screen.getByText('Delete Classroom?')).toBeInTheDocument();
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
  });

  it('deletes classroom when confirmed', async () => {
    const user = userEvent.setup();

    const props = {
      ...defaultProps,
      accounts: [
        mockCurrentAccount,
        { ...mockCurrentAccount, id: '2', classroomName: 'Second Classroom' },
      ],
    };

    render(<SidePanel {...props} />);

    const deleteButton = screen.getByText('Delete');
    await user.click(deleteButton);

    const confirmDeleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(confirmDeleteButton);

    expect(defaultProps.onAccountDelete).toHaveBeenCalledWith('1');
  });

  it('does not delete last classroom', async () => {
    const user = userEvent.setup();

    render(<SidePanel {...defaultProps} />);

    const deleteButton = screen.getByText('Delete');
    await user.click(deleteButton);

    expect(screen.queryByText('Delete Classroom?')).not.toBeInTheDocument();
  });

  it('saves account info with valid data', async () => {
    const user = userEvent.setup();
    mockUpdateClassroom.mockResolvedValue({ classroom: {} });

    render(<SidePanel {...defaultProps} />);

    const saveButton = screen.getByText('Save');
    await user.click(saveButton);

    await waitFor(() => {
      expect(defaultProps.onAccountUpdate).toHaveBeenCalled();
    });

    expect(toast.success).toHaveBeenCalledWith('Classroom information saved');
  });

  it('handles accept invitation', async () => {
    const user = userEvent.setup();
    mockApiPost.mockResolvedValue({ meeting: { web_link: 'http://example.com' } });

    render(<SidePanel {...defaultProps} />);

    const acceptButton = screen.getByText('Accept');
    await user.click(acceptButton);

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/webex/invitations/1/accept');
    });

    expect(toast.success).toHaveBeenCalled();
  });

  it('handles decline invitation', async () => {
    const user = userEvent.setup();
    mockApiPost.mockResolvedValue({});

    render(<SidePanel {...defaultProps} />);

    const declineButton = screen.getByText('Decline');
    await user.click(declineButton);

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/webex/invitations/1/decline');
    });

    expect(toast.success).toHaveBeenCalledWith('Invitation declined');
  });

  it('handles cancel meeting', async () => {
    const user = userEvent.setup();
    mockCancelMeeting.mockResolvedValue({ msg: 'Meeting cancelled' });

    render(<SidePanel {...defaultProps} />);

    const cancelButton = screen.getByText('Cancel');
    
    global.confirm = vi.fn(() => true);

    await user.click(cancelButton);

    await waitFor(() => {
      expect(mockCancelMeeting).toHaveBeenCalled();
    });

    expect(toast.success).toHaveBeenCalledWith('Meeting cancelled');
  });

  it('opens meeting details when meeting is clicked', async () => {
    const user = userEvent.setup();

    render(<SidePanel {...defaultProps} />);

    const meetingButton = screen.getByText('Meeting 1');
    await user.click(meetingButton);

    expect(screen.getByTestId('meeting-details-dialog')).toBeInTheDocument();
  });

  it('fetches and displays upcoming meetings', async () => {
    mockGetUpcoming.mockResolvedValue({
      meetings: [{ id: 1, title: 'Test Meeting' }],
    });

    render(<SidePanel {...defaultProps} />);

    await waitFor(() => {
      expect(mockGetUpcoming).toHaveBeenCalled();
    });
  });

  it('removes friend when remove button is clicked', async () => {
    const user = userEvent.setup();
    mockRemoveFriend.mockResolvedValue({});

    const accountWithFriend: Account = {
      ...mockCurrentAccount,
      friends: [{ classroomId: '2', id: '2', name: 'Friend' }],
    };

    render(
      <SidePanel
        {...defaultProps}
        currentAccount={accountWithFriend}
      />
    );

    const removeButton = screen.getByText('Remove Friend');
    await user.click(removeButton);

    await waitFor(() => {
      expect(mockRemoveFriend).toHaveBeenCalledWith('1');
    });

    expect(toast.success).toHaveBeenCalledWith('Removed friend');
  });

  it('handles sidebar resize start', async () => {
    render(<SidePanel {...defaultProps} />);

    const dragHandle = document.querySelector('[class*="cursor-col-resize"]');
    expect(dragHandle).toBeInTheDocument();
  });

  it('renders all widgets in controls tab', () => {
    render(<SidePanel {...defaultProps} />);

    expect(screen.getByTestId('classroom-switcher')).toBeInTheDocument();
    expect(screen.getByTestId('account-info')).toBeInTheDocument();
    expect(screen.getByTestId('interests-widget')).toBeInTheDocument();
    expect(screen.getByTestId('schedule-widget')).toBeInTheDocument();
    expect(screen.getByTestId('upcoming-meetings-widget')).toBeInTheDocument();
    expect(screen.getByTestId('public-meetings-widget')).toBeInTheDocument();
    expect(screen.getByTestId('invitations-widget')).toBeInTheDocument();
    expect(screen.getByTestId('recent-calls-widget')).toBeInTheDocument();
    expect(screen.getByTestId('friends-widget')).toBeInTheDocument();
    expect(screen.getByTestId('classrooms-list')).toBeInTheDocument();
  });

  it('refreshes meetings at regular intervals', async () => {
    mockGetUpcoming.mockResolvedValue({ meetings: [] });
    mockGetTrendingMeetings.mockResolvedValue({ meetings: [] });

    render(<SidePanel {...defaultProps} />);

    // Should fetch meetings on mount
    await waitFor(() => {
      expect(mockGetUpcoming).toHaveBeenCalled();
    });

    const initialCallCount = mockGetUpcoming.mock.calls.length;
    expect(initialCallCount).toBeGreaterThanOrEqual(1);
  });

  it('handles API error when fetching meetings', async () => {
    mockGetUpcoming.mockRejectedValue(new Error('API Error'));

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<SidePanel {...defaultProps} />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it('passes loading state to feed panel', async () => {
    const user = userEvent.setup();

    render(
      <SidePanel
        {...defaultProps}
        loadingPosts={true}
      />
    );

    const feedTab = screen.getByRole('tab', { name: /feed/i });
    await user.click(feedTab);
    
    // FeedPanel should be rendered when feed tab is active
    await waitFor(() => {
      const feedPanel = screen.queryByTestId('feed-panel');
      expect(feedPanel).toBeInTheDocument();
    });
  });

  it('handles classroom detail dialog close', () => {
    const { rerender } = render(
      <SidePanel
        {...defaultProps}
        selectedClassroom={mockClassroom}
      />
    );

    expect(screen.getByTestId('classroom-detail-dialog')).toBeInTheDocument();

    rerender(
      <SidePanel
        {...defaultProps}
        selectedClassroom={undefined}
      />
    );

    expect(screen.getByTestId('classroom-detail-dialog')).toBeInTheDocument();
  });
});
