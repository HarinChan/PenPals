import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Notification } from '../../types';

import NotificationWidget from '../NotificationWidget';

const makeNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: 'n-1',
  type: 'info',
  title: 'Info',
  message: 'Default notification message',
  timestamp: new Date('2026-03-08T12:00:00.000Z'),
  read: false,
  ...overrides,
});

const renderWidget = (overrides: Partial<React.ComponentProps<typeof NotificationWidget>> = {}) => {
  const onToggle = vi.fn();
  const onMarkAsRead = vi.fn();
  const onClearNotification = vi.fn();

  const notifications = [
    makeNotification({ id: 'n-1', message: 'Unread notification', read: false, type: 'friend_request_received' }),
    makeNotification({ id: 'n-2', message: 'Read notification', read: true, type: 'success' }),
  ];

  render(
    <NotificationWidget
      notifications={notifications}
      isOpen
      onToggle={onToggle}
      onMarkAsRead={onMarkAsRead}
      onClearNotification={onClearNotification}
      {...overrides}
    />,
  );

  return { onToggle, onMarkAsRead, onClearNotification, notifications };
};

describe('NotificationWidget', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('renders header, notifications list, and unread count badge', () => {
    renderWidget();

    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Unread notification')).toBeInTheDocument();
    expect(screen.getByText('Read notification')).toBeInTheDocument();

    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows empty state when there are no notifications', () => {
    renderWidget({ notifications: [] });

    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
  });

  it('calls onToggle when clicking collapsible trigger', async () => {
    const user = userEvent.setup();
    const { onToggle } = renderWidget();

    const trigger = screen.getByRole('button', { name: /notifications/i });
    await user.click(trigger);

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('marks unread notification as read when clicked', async () => {
    const user = userEvent.setup();
    const { onMarkAsRead } = renderWidget();

    await user.click(screen.getByText('Unread notification'));

    expect(onMarkAsRead).toHaveBeenCalledWith('n-1');
  });

  it('does not mark already-read notification as read when clicked', async () => {
    const user = userEvent.setup();
    const { onMarkAsRead } = renderWidget();

    await user.click(screen.getByText('Read notification'));

    expect(onMarkAsRead).not.toHaveBeenCalled();
  });

  it('clears notification from clear icon button and does not mark as read', async () => {
    const user = userEvent.setup();
    const { onClearNotification, onMarkAsRead } = renderWidget();

    const unreadText = screen.getByText('Unread notification');
    const itemContainer = unreadText.closest('.group');
    expect(itemContainer).toBeTruthy();

    const clearButton = within(itemContainer as HTMLElement).getByRole('button');
    await user.click(clearButton);

    expect(onClearNotification).toHaveBeenCalledWith('n-1');
    expect(onMarkAsRead).not.toHaveBeenCalled();
  });

  it('shows "View post" button when link exists', () => {
    renderWidget({
      notifications: [
        makeNotification({ id: 'n-link', message: 'Linked notification', link: '/post/1', read: false }),
      ],
    });

    expect(screen.getByRole('button', { name: /view post/i })).toBeInTheDocument();
  });

  it('formats timestamps as relative values', () => {
    const now = new Date();

    renderWidget({
      notifications: [
        makeNotification({ id: 'n-now', message: 'Now', timestamp: new Date(now.getTime()) }),
        makeNotification({ id: 'n-min', message: 'Minutes', timestamp: new Date(now.getTime() - 5 * 60 * 1000) }),
        makeNotification({ id: 'n-hour', message: 'Hours', timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000) }),
        makeNotification({ id: 'n-day', message: 'Days', timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) }),
      ],
    });

    expect(screen.getByText('Just now')).toBeInTheDocument();
    expect(screen.getByText('5m ago')).toBeInTheDocument();
    expect(screen.getByText('2h ago')).toBeInTheDocument();
    expect(screen.getByText('3d ago')).toBeInTheDocument();
  });

  it('hides unread badge when all notifications are read', () => {
    renderWidget({
      notifications: [
        makeNotification({ id: 'n-read-1', read: true, message: 'Read one' }),
        makeNotification({ id: 'n-read-2', read: true, message: 'Read two' }),
      ],
    });

    expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument();
  });
});
