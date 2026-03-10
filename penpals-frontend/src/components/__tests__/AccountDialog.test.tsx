import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Account } from '../../types';

const mockGetStatus = vi.fn();
const mockGetAuthUrl = vi.fn();
const mockDisconnect = vi.fn();
const mockUpdateClassroom = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('../../services', () => ({
  WebexService: {
    getStatus: (...args: any[]) => mockGetStatus(...args),
    getAuthUrl: (...args: any[]) => mockGetAuthUrl(...args),
    disconnect: (...args: any[]) => mockDisconnect(...args),
  },
  ClassroomService: {
    updateClassroom: (...args: any[]) => mockUpdateClassroom(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: any[]) => mockToastSuccess(...args),
    error: (...args: any[]) => mockToastError(...args),
  },
}));

vi.mock('../LocationAutocomplete', () => ({
  default: ({ onChange }: { onChange: (location: any) => void }) => (
    <div>
      <button
        type="button"
        onClick={() =>
          onChange({
            name: 'Singapore',
            latitude: 1.3521,
            longitude: 103.8198,
          })
        }
      >
        Select mock location
      </button>
    </div>
  ),
}));

import AccountDialog from '../AccountDialog';

const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  id: '1',
  classroomName: 'Class A',
  location: 'London',
  size: 30,
  description: 'Class desc',
  interests: ['math'],
  schedule: { Mon: [9] },
  x: -0.12,
  y: 51.5,
  friends: [],
  ...overrides,
});

const renderAccountDialog = (overrides: Partial<React.ComponentProps<typeof AccountDialog>> = {}) => {
  const onOpenChange = vi.fn();
  const onAccountUpdate = vi.fn();
  const currentAccount = makeAccount();
  const accounts = [
    makeAccount({ id: '1', classroomName: 'Class A', friends: [{ id: 'f1' } as any] }),
    makeAccount({ id: '2', classroomName: 'Class B', friends: [{ id: 'f2' } as any, { id: 'f3' } as any] }),
  ];

  render(
    <AccountDialog
      open
      onOpenChange={onOpenChange}
      currentAccount={currentAccount}
      accounts={accounts}
      onAccountUpdate={onAccountUpdate}
      {...overrides}
    />,
  );

  return { onOpenChange, onAccountUpdate, currentAccount, accounts };
};

describe('AccountDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStatus.mockResolvedValue({ connected: false });
    mockGetAuthUrl.mockResolvedValue({ url: '' });
    mockDisconnect.mockResolvedValue({ msg: 'ok' });
    mockUpdateClassroom.mockResolvedValue({ msg: 'ok', classroom: {} });
  });

  it('renders account settings with current location and overview stats', async () => {
    renderAccountDialog();

    expect(screen.getByText('Account Settings')).toBeInTheDocument();
    expect(screen.getByText('Account Location')).toBeInTheDocument();
    expect(screen.getByText('London')).toBeInTheDocument();

    expect(screen.getByText('Classrooms')).toBeInTheDocument();
    expect(screen.getByText('Total Friends')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockGetStatus).toHaveBeenCalledTimes(1);
    });
  });

  it('shows connect WebEx button when not connected', async () => {
    mockGetStatus.mockResolvedValue({ connected: false });
    renderAccountDialog();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /connect webex account/i })).toBeInTheDocument();
    });
  });

  it('shows connected state with reconnect and disconnect actions', async () => {
    mockGetStatus.mockResolvedValue({ connected: true });
    renderAccountDialog();

    await waitFor(() => {
      expect(screen.getByText('Account Connected Successfully')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reconnect/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument();
    });
  });

  it('disconnects webex account and shows success toast', async () => {
    const user = userEvent.setup();
    mockGetStatus.mockResolvedValue({ connected: true });

    renderAccountDialog();

    const disconnectButton = await screen.findByRole('button', { name: /disconnect/i });
    await user.click(disconnectButton);

    await waitFor(() => {
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
      expect(mockToastSuccess).toHaveBeenCalledWith('Disconnected from WebEx successfully');
    });
  });

  it('enters edit mode and saves selected location for all classrooms', async () => {
    const user = userEvent.setup();
    const { onAccountUpdate, accounts } = renderAccountDialog();

    const editButton = screen.getByRole('button', { name: '' });
    await user.click(editButton);

    expect(screen.getByText('Select mock location')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /select mock location/i }));

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateClassroom).toHaveBeenCalledTimes(accounts.length);
      expect(mockUpdateClassroom).toHaveBeenCalledWith(1, {
        location: 'Singapore',
        latitude: '1.3521',
        longitude: '103.8198',
      });
      expect(mockUpdateClassroom).toHaveBeenCalledWith(2, {
        location: 'Singapore',
        latitude: '1.3521',
        longitude: '103.8198',
      });

      expect(onAccountUpdate).toHaveBeenCalledTimes(accounts.length);
      expect(mockToastSuccess).toHaveBeenCalledWith('Location updated for all classrooms');
    });
  });

  it('shows toast error and keeps edit mode when location update fails', async () => {
    const user = userEvent.setup();
    mockUpdateClassroom.mockRejectedValue(new Error('network failed'));

    renderAccountDialog();

    const editButton = screen.getByRole('button', { name: '' });
    await user.click(editButton);

    await user.click(screen.getByRole('button', { name: /select mock location/i }));
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Failed to update location on the server');
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });
  });

  it('does not update classrooms when save is clicked without selecting location', async () => {
    const user = userEvent.setup();

    renderAccountDialog();

    const editButton = screen.getByRole('button', { name: '' });
    await user.click(editButton);

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockUpdateClassroom).not.toHaveBeenCalled();
    });
  });
});
