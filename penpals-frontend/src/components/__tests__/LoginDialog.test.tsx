import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginDialog from '../LoginDialog';
import { ThemeProvider } from '../ThemeProvider';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { SelectedLocation } from '../../services/location';

type LoginDialogOverrides = Partial<React.ComponentProps<typeof LoginDialog>>;

const defaultProps: React.ComponentProps<typeof LoginDialog> = {
  open: true,
  onOpenChange: () => {},
  onLogin: async () => {},
  onSignup: async (
    _email: string,
    _password: string,
    _classroomName: string,
    _location?: SelectedLocation,
  ) => {},
  selectedNetworkUrl: null,
  defaultNetworkUrl: 'http://127.0.0.1:5001/api',
  previousNetworks: ['http://10.0.0.5:5001/api'],
  onNetworkChange: () => {},
  loginError: undefined,
  signupError: undefined,
  isLoading: false,
};

const renderLoginDialog = (overrides: LoginDialogOverrides = {}) => {
  const props = { ...defaultProps, ...overrides };
  render(
    <ThemeProvider>
      <LoginDialog {...props} />
    </ThemeProvider>,
  );
  return props;
};

describe('LoginDialog network import/selection', () => {
  it('selects the default network from preset list', async () => {
    const user = userEvent.setup();
    const onNetworkChange = vi.fn();

    renderLoginDialog({ onNetworkChange });

    await user.click(screen.getByRole('combobox', { name: /network/i }));
    await user.click(screen.getByText('Default network (http://127.0.0.1:5001/api)'));

    expect(onNetworkChange).toHaveBeenCalledWith('http://127.0.0.1:5001/api');
  });

  it('selects a previous network from the import list', async () => {
    const user = userEvent.setup();
    const onNetworkChange = vi.fn();

    renderLoginDialog({
      onNetworkChange,
      previousNetworks: ['http://10.1.1.20:5001/api'],
    });

    await user.click(screen.getByRole('combobox', { name: /network/i }));
    await user.click(screen.getByText('http://10.1.1.20:5001/api'));

    expect(onNetworkChange).toHaveBeenCalledWith('http://10.1.1.20:5001/api');
  });

  it('shows validation error for invalid custom network and does not apply', async () => {
    const user = userEvent.setup();
    const onNetworkChange = vi.fn();

    renderLoginDialog({ onNetworkChange });

    await user.click(screen.getByRole('combobox', { name: /network/i }));
    const input = screen.getByPlaceholderText('Type custom network URL...');
    await user.type(input, 'http://');
    await user.keyboard('{Enter}');

    expect(
      screen.getByText('Please enter a valid http(s) URL, e.g. http://127.0.0.1:5001/api'),
    ).toBeInTheDocument();
    expect(onNetworkChange).not.toHaveBeenCalled();
  });

  it('auto-prefixes custom network without protocol and applies it', async () => {
    const user = userEvent.setup();
    const onNetworkChange = vi.fn();

    renderLoginDialog({ onNetworkChange });

    await user.click(screen.getByRole('combobox', { name: /network/i }));
    const input = screen.getByPlaceholderText('Type custom network URL...');
    await user.type(input, '192.168.1.9:5001/api');
    await user.keyboard('{Enter}');

    expect(onNetworkChange).toHaveBeenCalledWith('http://192.168.1.9:5001/api');
  });
});

describe('LoginDialog login flow', () => {
  it('submits successful login and clears fields', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn().mockResolvedValue(undefined);

    renderLoginDialog({
      onLogin,
      selectedNetworkUrl: 'http://127.0.0.1:5001/api',
    });

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const loginButton = screen.getByRole('button', { name: 'Login' });

    await user.type(emailInput, 'teacher@example.com');
    await user.type(passwordInput, 'MySecureP@ssw0rd!');
    await user.click(loginButton);

    await waitFor(() => expect(onLogin).toHaveBeenCalledTimes(1));

    const [sentEmail, sentPassword] = onLogin.mock.calls[0];
    expect(sentEmail).toBe('teacher@example.com');
    expect(sentPassword).toEqual(expect.any(String));
    expect(sentPassword).not.toBe('MySecureP@ssw0rd!');

    await waitFor(() => {
      expect(emailInput).toHaveValue('');
      expect(passwordInput).toHaveValue('');
    });
  });
});
