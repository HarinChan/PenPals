import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockTzLookup = vi.fn();

vi.mock('tz-lookup', () => ({
  default: (...args: any[]) => mockTzLookup(...args),
}));

vi.mock('../ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <div>
      <select
        aria-label="timezone-select"
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
      >
        <option value="UTC">UTC</option>
        <option value="America/New_York">Eastern (ET)</option>
        <option value="Europe/London">London (GMT)</option>
      </select>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => <span>Timezone</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
}));

import TimezoneClock from '../TimezoneClock';

describe('TimezoneClock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();

    mockTzLookup.mockReturnValue('Europe/London');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes timezone from lat/lon using tz-lookup', () => {
    render(<TimezoneClock lat={51.5074} lon={-0.1278} />);

    expect(mockTzLookup).toHaveBeenCalledWith(51.5074, -0.1278);
    expect(screen.getByText('GMT')).toBeInTheDocument();
  });

  it('falls back to device timezone when no coordinates are provided', () => {
    const resolvedOptionsSpy = vi
      .spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions')
      .mockReturnValue({ timeZone: 'UTC' } as Intl.ResolvedDateTimeFormatOptions);

    render(<TimezoneClock />);

    expect(mockTzLookup).not.toHaveBeenCalled();
    expect(screen.getByText('UTC')).toBeInTheDocument();

    resolvedOptionsSpy.mockRestore();
  });

  it('updates timezone when lat/lon props change', () => {
    const { rerender } = render(<TimezoneClock lat={48.8566} lon={2.3522} />);

    expect(mockTzLookup).toHaveBeenCalledWith(48.8566, 2.3522);

    mockTzLookup.mockReturnValue('America/New_York');
    rerender(<TimezoneClock lat={40.7128} lon={-74.006} />);

    expect(mockTzLookup).toHaveBeenCalledWith(40.7128, -74.006);
    expect(screen.getByText('ET')).toBeInTheDocument();
  });

  it('enters edit mode and allows manual timezone selection', async () => {
    const user = userEvent.setup();
    render(<TimezoneClock lat={51.5074} lon={-0.1278} />);

    const editButton = screen.getAllByRole('button')[0];
    await user.click(editButton);

    const select = screen.getByLabelText('timezone-select');
    await user.selectOptions(select, 'America/New_York');

    expect(screen.getByText('ET')).toBeInTheDocument();
  });

  it('exits edit mode when check button is clicked', async () => {
    const user = userEvent.setup();
    render(<TimezoneClock lat={51.5074} lon={-0.1278} />);

    await user.click(screen.getAllByRole('button')[0]);
    expect(screen.getByLabelText('timezone-select')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    const checkButton = buttons[buttons.length - 1];
    await user.click(checkButton);

    expect(screen.queryByLabelText('timezone-select')).not.toBeInTheDocument();
  });

  it('starts a 1-second timer and clears it on unmount', () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval');
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

    const { unmount } = render(<TimezoneClock lat={51.5074} lon={-0.1278} />);

    expect(setIntervalSpy).toHaveBeenCalled();
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();

    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  it('handles tz-lookup errors gracefully and keeps rendering', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const resolvedOptionsSpy = vi
      .spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions')
      .mockReturnValue({ timeZone: 'UTC' } as Intl.ResolvedDateTimeFormatOptions);

    mockTzLookup.mockImplementation(() => {
      throw new Error('lookup failed');
    });

    render(<TimezoneClock lat={999} lon={999} />);

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(screen.getByText('UTC')).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
    resolvedOptionsSpy.mockRestore();
  });
});
