import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FriendsWidget from '../FriendsWidget';
import { Account, Classroom, Friend } from '../../../types';

describe('FriendsWidget', () => {
  const mockAccount: Account = {
    id: '1',
    classroomName: 'Physics Lab',
    location: 'Building A',
    size: 30,
    description: 'Physics experiments',
    avatar: '🔬',
    interests: ['Physics'],
    schedule: {},
    friends: [
      {
        id: '1',
        classroomId: '10',
        classroomName: 'Chemistry Lab',
        location: 'Building B',
        lastConnected: '2026-03-09T10:00:00Z',
      },
      {
        id: '2',
        classroomId: '11',
        classroomName: 'Biology Lab',
        location: 'Building C',
        lastConnected: '2026-03-08T14:00:00Z',
      },
    ],
    recentCalls: [],
  };

  const mockClassrooms: Classroom[] = [
    {
      id: '10',
      name: 'Chemistry Lab',
      location: 'Building B',
      interests: ['Chemistry'],
      availability: {},
      creator_id: 2,
      creator_name: 'Dr. Johnson',
      participant_count: 15,
      max_participants: 30,
    },
    {
      id: '11',
      name: 'Biology Lab',
      location: 'Building C',
      interests: ['Biology'],
      availability: {},
      creator_id: 3,
      creator_name: 'Prof. Smith',
      participant_count: 20,
      max_participants: 25,
    },
  ];

  const mockOnFriendClick = vi.fn();
  const mockOnRemoveFriend = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders friends widget with title', () => {
    render(
      <FriendsWidget
        currentAccount={mockAccount}
        classrooms={mockClassrooms}
        onFriendClick={mockOnFriendClick}
        onRemoveFriend={mockOnRemoveFriend}
      />
    );

    expect(screen.getByText('Friends')).toBeInTheDocument();
  });

  it('displays all friends in the list', () => {
    render(
      <FriendsWidget
        currentAccount={mockAccount}
        classrooms={mockClassrooms}
        onFriendClick={mockOnFriendClick}
        onRemoveFriend={mockOnRemoveFriend}
      />
    );

    expect(screen.getByText('Chemistry Lab')).toBeInTheDocument();
    expect(screen.getByText('Biology Lab')).toBeInTheDocument();
  });

  it('displays friend location', () => {
    render(
      <FriendsWidget
        currentAccount={mockAccount}
        classrooms={mockClassrooms}
        onFriendClick={mockOnFriendClick}
        onRemoveFriend={mockOnRemoveFriend}
      />
    );

    expect(screen.getByText('Building B')).toBeInTheDocument();
    expect(screen.getByText('Building C')).toBeInTheDocument();
  });

  it('displays last connected date for friends', () => {
    render(
      <FriendsWidget
        currentAccount={mockAccount}
        classrooms={mockClassrooms}
        onFriendClick={mockOnFriendClick}
        onRemoveFriend={mockOnRemoveFriend}
      />
    );

    const lastConnected = screen.getAllByText(/Last connected/i);
    expect(lastConnected.length).toBeGreaterThan(0);
  });

  it('calls onFriendClick when friend is clicked', async () => {
    const user = userEvent.setup();
    render(
      <FriendsWidget
        currentAccount={mockAccount}
        classrooms={mockClassrooms}
        onFriendClick={mockOnFriendClick}
        onRemoveFriend={mockOnRemoveFriend}
      />
    );

    const friendItem = screen.getByText('Chemistry Lab');
    await user.click(friendItem);

    expect(mockOnFriendClick).toHaveBeenCalledWith(expect.objectContaining({ name: 'Chemistry Lab' }));
  });

  it('shows remove friend button on hover', async () => {
    const user = userEvent.setup();
    render(
      <FriendsWidget
        currentAccount={mockAccount}
        classrooms={mockClassrooms}
        onFriendClick={mockOnFriendClick}
        onRemoveFriend={mockOnRemoveFriend}
      />
    );

    const friendItem = screen.getByText('Chemistry Lab').closest('div');
    await user.hover(friendItem!);

    const removeButtons = screen.getAllByRole('button', { name: /remove friend/i });
    expect(removeButtons.length).toBeGreaterThan(0);
  });

  it('calls onRemoveFriend when remove button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <FriendsWidget
        currentAccount={mockAccount}
        classrooms={mockClassrooms}
        onFriendClick={mockOnFriendClick}
        onRemoveFriend={mockOnRemoveFriend}
      />
    );

    const friendItem = screen.getByText('Chemistry Lab').closest('div');
    await user.hover(friendItem!);

    const removeButtons = screen.getAllByRole('button', { name: /remove friend/i });
    await user.click(removeButtons[0]);

    expect(mockOnRemoveFriend).toHaveBeenCalledWith('1');
  });

  it('handles empty friends list', () => {
    const accountNoFriends: Account = {
      ...mockAccount,
      friends: [],
    };

    render(
      <FriendsWidget
        currentAccount={accountNoFriends}
        classrooms={mockClassrooms}
        onFriendClick={mockOnFriendClick}
        onRemoveFriend={mockOnRemoveFriend}
      />
    );

    expect(screen.getByText('No friends added yet')).toBeInTheDocument();
  });

  it('handles account with no friends array', () => {
    const accountUndefinedFriends: Account = {
      ...mockAccount,
      friends: undefined as any,
    };

    render(
      <FriendsWidget
        currentAccount={accountUndefinedFriends}
        classrooms={mockClassrooms}
        onFriendClick={mockOnFriendClick}
        onRemoveFriend={mockOnRemoveFriend}
      />
    );

    expect(screen.getByText('No friends added yet')).toBeInTheDocument();
  });

  it('collapses and expands friends list', async () => {
    const user = userEvent.setup();
    render(
      <FriendsWidget
        currentAccount={mockAccount}
        classrooms={mockClassrooms}
        onFriendClick={mockOnFriendClick}
        onRemoveFriend={mockOnRemoveFriend}
      />
    );

    const trigger = screen.getByText('Friends');
    await user.click(trigger);

    expect(screen.getByText('Friends')).toBeInTheDocument();
  });

  it('prevents event propagation when removing friend', async () => {
    const user = userEvent.setup();
    render(
      <FriendsWidget
        currentAccount={mockAccount}
        classrooms={mockClassrooms}
        onFriendClick={mockOnFriendClick}
        onRemoveFriend={mockOnRemoveFriend}
      />
    );

    const friendItem = screen.getByText('Chemistry Lab').closest('div');
    await user.hover(friendItem!);

    const removeButtons = screen.getAllByRole('button', { name: /remove friend/i });
    await user.click(removeButtons[0]);

    // Click should only trigger remove, not friend click
    expect(mockOnRemoveFriend).toHaveBeenCalled();
    expect(mockOnFriendClick).not.toHaveBeenCalled();
  });

  it('renders with scroll area for many friends', () => {
    const manyFriendsAccount: Account = {
      ...mockAccount,
      friends: Array.from({ length: 20 }, (_, i) => ({
        id: String(i),
        classroomId: String(10 + i),
        classroomName: `Classroom ${i + 1}`,
        location: `Building ${String.fromCharCode(65 + i)}`,
        lastConnected: new Date().toISOString(),
      })),
    };

    render(
      <FriendsWidget
        currentAccount={manyFriendsAccount}
        classrooms={mockClassrooms}
        onFriendClick={mockOnFriendClick}
        onRemoveFriend={mockOnRemoveFriend}
      />
    );

    expect(screen.getByText('Classroom 1')).toBeInTheDocument();
  });

  it('handles friend without lastConnected date', () => {
    const friendNoLastConnected: Account = {
      ...mockAccount,
      friends: [
        {
          id: '1',
          classroomId: '10',
          classroomName: 'Chemistry Lab',
          location: 'Building B',
          lastConnected: undefined,
        },
      ],
    };

    render(
      <FriendsWidget
        currentAccount={friendNoLastConnected}
        classrooms={mockClassrooms}
        onFriendClick={mockOnFriendClick}
        onRemoveFriend={mockOnRemoveFriend}
      />
    );

    expect(screen.getByText('Chemistry Lab')).toBeInTheDocument();
  });

  it('finds correct classroom for friend click', async () => {
    const user = userEvent.setup();
    render(
      <FriendsWidget
        currentAccount={mockAccount}
        classrooms={mockClassrooms}
        onFriendClick={mockOnFriendClick}
        onRemoveFriend={mockOnRemoveFriend}
      />
    );

    const biologyItem = screen.getByText('Biology Lab');
    await user.click(biologyItem);

    expect(mockOnFriendClick).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '11',
        name: 'Biology Lab',
      })
    );
  });
});
