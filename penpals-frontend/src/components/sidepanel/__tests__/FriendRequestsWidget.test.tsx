import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import FriendRequestsWidget from '../FriendRequestsWidget';
import { Account, Classroom, FriendRequest } from '../../../types';

describe('FriendRequestsWidget', () => {
  const mockOnAcceptRequest = vi.fn();
  const mockOnRejectRequest = vi.fn();
  const mockOnClassroomClick = vi.fn();

  const mockClassrooms: Classroom[] = [
    {
      id: '200',
      name: 'History Class',
      location: 'Rome',
      lat: 0,
      lon: 0,
      interests: ['history'],
      availability: {},
    },
    {
      id: '300',
      name: 'Science Class',
      location: 'Berlin',
      lat: 0,
      lon: 0,
      interests: ['science'],
      availability: {},
    },
  ];

  const mockRequests: FriendRequest[] = [
    {
      id: 'req-1',
      fromClassroomId: '200',
      fromClassroomName: 'History Class',
      toClassroomId: '1',
      toClassroomName: 'My Class',
      timestamp: new Date('2026-03-10T09:00:00Z'),
      classroomId: '200',
      classroomName: 'History Class',
      location: 'Rome',
    },
    {
      id: 'req-2',
      fromClassroomId: '300',
      fromClassroomName: 'Science Class',
      toClassroomId: '1',
      toClassroomName: 'My Class',
      timestamp: new Date('2026-03-10T10:00:00Z'),
      classroomId: '300',
      classroomName: 'Science Class',
      location: 'Berlin',
    },
  ];

  const mockAccount: Account = {
    id: '1',
    classroomName: 'My Class',
    location: 'Tokyo',
    size: 20,
    description: 'Main account',
    interests: [],
    schedule: {},
    x: 0,
    y: 0,
    receivedFriendRequests: mockRequests,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWidget = (overrides: Partial<React.ComponentProps<typeof FriendRequestsWidget>> = {}) => {
    render(
      <FriendRequestsWidget
        currentAccount={mockAccount}
        classrooms={mockClassrooms}
        onAcceptRequest={mockOnAcceptRequest}
        onRejectRequest={mockOnRejectRequest}
        onClassroomClick={mockOnClassroomClick}
        {...overrides}
      />,
    );
  };

  it('returns null when there are no received requests', () => {
    const accountWithoutRequests: Account = {
      ...mockAccount,
      receivedFriendRequests: [],
    };

    renderWidget({ currentAccount: accountWithoutRequests });

    expect(screen.queryByText('Friend Requests')).not.toBeInTheDocument();
  });

  it('renders title, count badge, and request sender/location info', () => {
    renderWidget();

    expect(screen.getByText('Friend Requests')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('History Class')).toBeInTheDocument();
    expect(screen.getByText('Science Class')).toBeInTheDocument();
    expect(screen.getByText('Rome')).toBeInTheDocument();
    expect(screen.getByText('Berlin')).toBeInTheDocument();
  });

  it('calls onAcceptRequest with sender id and request id', async () => {
    const user = userEvent.setup();
    renderWidget();

    const acceptButtons = screen.getAllByTitle('Accept');
    await user.click(acceptButtons[0]);

    expect(mockOnAcceptRequest).toHaveBeenCalledWith('200', 'req-1');
  });

  it('calls onRejectRequest with sender id and request id', async () => {
    const user = userEvent.setup();
    renderWidget();

    const rejectButtons = screen.getAllByTitle('Reject');
    await user.click(rejectButtons[1]);

    expect(mockOnRejectRequest).toHaveBeenCalledWith('300', 'req-2');
  });

  it('opens classroom details when request card is clicked', async () => {
    const user = userEvent.setup();
    renderWidget();

    await user.click(screen.getByText('History Class'));

    expect(mockOnClassroomClick).toHaveBeenCalledWith(expect.objectContaining({ id: '200', name: 'History Class' }));
  });

  it('does not call classroom click when action buttons are used', async () => {
    const user = userEvent.setup();
    renderWidget();

    await user.click(screen.getAllByTitle('Accept')[0]);
    await user.click(screen.getAllByTitle('Reject')[0]);

    expect(mockOnClassroomClick).not.toHaveBeenCalled();
  });
});
