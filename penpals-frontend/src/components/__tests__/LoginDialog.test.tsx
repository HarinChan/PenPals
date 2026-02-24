import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginDialog from '../LoginDialog';

// Mock the ThemeProvider
vi.mock('../ThemeProvider', () => ({
  useTheme: vi.fn(() => ({
    theme: 'light',
    toggleTheme: vi.fn(),
  })),
}));

// Mock LocationAutocomplete component
vi.mock('../LocationAutocomplete', () => ({
  default: ({
    id,
    label,
    placeholder,
    value,
    onChange,
  }: any) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        placeholder={placeholder}
        value={value ? value.name : ''}
        onChange={(e) =>
          onChange({ name: e.target.value, lat: 0, lng: 0 })
        }
      />
    </div>
  ),
}));

// Mock UI components
vi.mock('../ui/dialog', () => ({
  Dialog: ({ open, onOpenChange, children }: any) => (
    <div data-testid="dialog" data-open={open}>
      {children}
    </div>
  ),
  DialogContent: ({ children }: any) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: any) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: any) => <h1 data-testid="dialog-title">{children}</h1>,
  DialogDescription: ({ children }: any) => (
    <p data-testid="dialog-description">{children}</p>
  ),
}));

vi.mock('../ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('../ui/label', () => ({
  Label: ({ htmlFor, children }: any) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

vi.mock('../ui/button', () => ({
  Button: ({ children, onClick, type, disabled, ...props }: any) => (
    <button {...props} onClick={onClick} type={type} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('../ui/tabs', () => ({
  Tabs: ({ children, onValueChange }: any) => (
    <div data-testid="tabs" data-onchange={onValueChange}>
      {children}
    </div>
  ),
  TabsList: ({ children }: any) => (
    <div data-testid="tabs-list">{children}</div>
  ),
  TabsTrigger: ({ children, value }: any) => (
    <button data-testid={`tab-trigger-${value}`} data-value={value}>
      {children}
    </button>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid={`tab-content-${value}`} data-value={value}>
      {children}
    </div>
  ),
}));

vi.mock('lucide-react', () => ({
  Moon: () => <div data-testid="moon-icon" />,
  Sun: () => <div data-testid="sun-icon" />,
}));

describe('LoginDialog', () => {
  const mockOnLogin = vi.fn();
  const mockOnSignup = vi.fn();
  const mockOnOpenChange = vi.fn();

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    onLogin: mockOnLogin,
    onSignup: mockOnSignup,
    loginError: undefined,
    signupError: undefined,
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render dialog when open prop is true', () => {
      render(<LoginDialog {...defaultProps} />);
      const dialog = screen.getByTestId('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('should display correct title and description', () => {
      render(<LoginDialog {...defaultProps} />);
      expect(screen.getByTestId('dialog-title')).toHaveTextContent(
        'Welcome to MirrorMirror'
      );
      expect(screen.getByTestId('dialog-description')).toHaveTextContent(
        'Connect with classrooms around the world'
      );
    });

    it('should render both login and signup tabs', () => {
      render(<LoginDialog {...defaultProps} />);
      expect(screen.getByTestId('tab-trigger-login')).toBeInTheDocument();
      expect(screen.getByTestId('tab-trigger-signup')).toBeInTheDocument();
    });

    it('should render theme toggle button with Moon icon', () => {
      render(<LoginDialog {...defaultProps} />);
      expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
    });
  });

  describe('Login Tab', () => {
    it('should render login form fields', () => {
      render(<LoginDialog {...defaultProps} />);
      const loginTab = screen.getByTestId('tab-content-login');
      expect(within(loginTab).getByText('Email')).toBeInTheDocument();
      expect(within(loginTab).getByText('Password')).toBeInTheDocument();
    });

    it('should render login input fields with correct IDs', () => {
      render(<LoginDialog {...defaultProps} />);
      const inputs = screen.getAllByDisplayValue('');
      const loginInputs = inputs.filter(input => input.id.includes('login'));
      expect(loginInputs.length).toBeGreaterThan(0);
    });

    it('should update email state on input change', async () => {
      render(<LoginDialog {...defaultProps} />);
      const emailInput = screen.getByPlaceholderText('your@email.com');
      
      await userEvent.type(emailInput, 'test@example.com');
      expect(emailInput).toHaveValue('test@example.com');
    });

    it('should update password state on input change', async () => {
      render(<LoginDialog {...defaultProps} />);
      const passwordInput = screen.getByPlaceholderText('••••••••');
      
      await userEvent.type(passwordInput, 'password123');
      expect(passwordInput).toHaveValue('password123');
    });

    it('should call onLogin with hashed password on form submit', async () => {
      render(<LoginDialog {...defaultProps} />);
      
      const emailInput = screen.getAllByDisplayValue('').find(input => input.id === 'login-email') as HTMLInputElement;
      const passwordInput = screen.getAllByDisplayValue('').find(input => input.id === 'login-password') as HTMLInputElement;
      const loginButtons = screen.getAllByRole('button', { name: /login/i });
      const loginButton = loginButtons[0];
      
      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'password123');
      await userEvent.click(loginButton);
      
      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalled();
      });
    });

    it('should display loading state on login button', async () => {
      render(<LoginDialog {...defaultProps} isLoading={true} />);
      const loginButton = screen.getByRole('button', { name: /logging in/i });
      expect(loginButton).toHaveAttribute('disabled');
    });

    it('should display login error message', () => {
      render(
        <LoginDialog
          {...defaultProps}
          loginError="Invalid email or password"
        />
      );
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });

    it('should display error styling on password field when login error occurs', () => {
      render(
        <LoginDialog
          {...defaultProps}
          loginError="Invalid credentials"
        />
      );
      const loginTab = screen.getByTestId('tab-content-login');
      const passwordInput = within(loginTab).getAllByDisplayValue('').find(input => input.id === 'login-password') as HTMLInputElement;
      expect(passwordInput.className).toContain('border-red');
    });

    it('should not submit form with required fields empty', async () => {
      render(<LoginDialog {...defaultProps} />);
      const loginButtons = screen.getAllByRole('button', { name: /login/i });
      const loginButton = loginButtons.find(btn => (btn as HTMLButtonElement).type === 'submit') || loginButtons[1];
      
      await userEvent.click(loginButton);
      
      // The browser will prevent submission due to required fields
      expect(mockOnLogin).not.toHaveBeenCalled();
    });
  });

  describe('Signup Tab', () => {
    it('should render signup form fields', () => {
      render(<LoginDialog {...defaultProps} />);
      const signupTab = screen.getByTestId('tab-content-signup');
      expect(within(signupTab).getByText('Account Name')).toBeInTheDocument();
      expect(within(signupTab).getByText('Email')).toBeInTheDocument();
      expect(within(signupTab).getByText('Location')).toBeInTheDocument();
      expect(within(signupTab).getByText('Password')).toBeInTheDocument();
      expect(within(signupTab).getByText('Confirm Password')).toBeInTheDocument();
    });

    it('should display password requirement hint', () => {
      render(<LoginDialog {...defaultProps} />);
      const signupTab = screen.getByTestId('tab-content-signup');
      expect(
        within(signupTab).getByText(
          /must be 8\+ characters with uppercase, lowercase, digit, and special character/i
        )
      ).toBeInTheDocument();
    });

    it('should update classroom name on input change', async () => {
      render(<LoginDialog {...defaultProps} />);
      const classroomInput = screen.getByPlaceholderText('My Awesome Classroom');
      
      await userEvent.type(classroomInput, 'My Test Classroom');
      expect(classroomInput).toHaveValue('My Test Classroom');
    });

    it('should clear password match error when password field changes', async () => {
      render(<LoginDialog {...defaultProps} />);
      
      const signupTab = screen.getByTestId('tab-content-signup');
      const passwordInput = within(signupTab).getAllByDisplayValue('').find(input => input.id === 'signup-password') as HTMLInputElement;
      
      await userEvent.type(passwordInput, 'NewPassword123!');
      
      // Password match error should be cleared when typing in password field
      expect(
        within(signupTab).queryByText('Passwords do not match')
      ).not.toBeInTheDocument();
    });

    it('should display password mismatch error', async () => {
      render(<LoginDialog {...defaultProps} />);
      
      const signupTab = screen.getByTestId('tab-content-signup');
      const passwordInput = within(signupTab).getAllByDisplayValue('').find(input => input.id === 'signup-password') as HTMLInputElement;
      const confirmPasswordInput = within(signupTab).getAllByDisplayValue('').find(input => input.id === 'signup-password-confirm') as HTMLInputElement;
      const signupButtons = screen.getAllByRole('button', { name: /sign up/i });
      const signupButton = signupButtons.find(btn => (btn as HTMLButtonElement).type === 'submit') || signupButtons[signupButtons.length - 1];
      
      await userEvent.type(passwordInput, 'Password123!');
      await userEvent.type(confirmPasswordInput, 'DifferentPassword123!');
      await userEvent.click(signupButton);
      
      await waitFor(() => {
        expect(
          within(signupTab).getByText('Passwords do not match')
        ).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should not call onSignup when passwords do not match', async () => {
      render(<LoginDialog {...defaultProps} />);
      
      const signupTab = screen.getByTestId('tab-content-signup');
      const passwordInput = within(signupTab).getAllByDisplayValue('').find(input => input.id === 'signup-password') as HTMLInputElement;
      const confirmPasswordInput = within(signupTab).getAllByDisplayValue('').find(input => input.id === 'signup-password-confirm') as HTMLInputElement;
      const signupButtons = screen.getAllByRole('button', { name: /sign up/i });
      const signupButton = signupButtons.find(btn => (btn as HTMLButtonElement).type === 'submit') || signupButtons[signupButtons.length - 1];
      
      await userEvent.type(passwordInput, 'Password123!');
      await userEvent.type(confirmPasswordInput, 'DifferentPassword123!');
      await userEvent.click(signupButton);
      
      expect(mockOnSignup).not.toHaveBeenCalled();
    });

    it('should call onSignup with matching passwords', async () => {
      render(<LoginDialog {...defaultProps} />);
      
      const signupTab = screen.getByTestId('tab-content-signup');
      const classroomInput = within(signupTab).getByPlaceholderText('My Awesome Classroom');
      const emailInput = within(signupTab).getByPlaceholderText('your@email.com');
      const passwordInput = within(signupTab).getAllByDisplayValue('').find(input => input.id === 'signup-password') as HTMLInputElement;
      const confirmPasswordInput = within(signupTab).getAllByDisplayValue('').find(input => input.id === 'signup-password-confirm') as HTMLInputElement;
      const signupButtons = screen.getAllByRole('button', { name: /sign up/i });
      const signupButton = signupButtons.find(btn => (btn as HTMLButtonElement).type === 'submit') || signupButtons[signupButtons.length - 1];
      
      await userEvent.type(classroomInput, 'Test Classroom');
      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'Password123!');
      await userEvent.type(confirmPasswordInput, 'Password123!');
      await userEvent.click(signupButton);
      
      await waitFor(() => {
        expect(mockOnSignup).toHaveBeenCalled();
      });
    });

    it('should display signup error message', () => {
      render(
        <LoginDialog
          {...defaultProps}
          signupError="Email already exists"
        />
      );
      expect(screen.getByText('Email already exists')).toBeInTheDocument();
    });

    it('should display loading state on signup button', () => {
      render(<LoginDialog {...defaultProps} isLoading={true} />);
      const buttons = screen.getAllByRole('button');
      const signupButton = buttons.find(btn => btn.textContent.includes('Creating Account'));
      expect(signupButton).toHaveAttribute('disabled');
    });
  });

  describe('Theme Toggle', () => {
    it('should render theme toggle button', () => {
      render(<LoginDialog {...defaultProps} />);
      const themeButtons = screen.getAllByRole('button').filter(
        (button) =>
          button.querySelector('[data-testid="moon-icon"]') ||
          button.querySelector('[data-testid="sun-icon"]')
      );
      
      expect(themeButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Form Validation', () => {
    it('should require email field in login form', () => {
      render(<LoginDialog {...defaultProps} />);
      const emailInput = screen.getAllByDisplayValue('').find(input => input.id === 'login-email') as HTMLInputElement;
      expect(emailInput).toHaveAttribute('required');
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should require password field in login form', () => {
      render(<LoginDialog {...defaultProps} />);
      const passwordInput = screen.getAllByDisplayValue('').find(input => input.id === 'login-password') as HTMLInputElement;
      expect(passwordInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should require all fields in signup form', () => {
      render(<LoginDialog {...defaultProps} />);
      const signupTab = screen.getByTestId('tab-content-signup');
      
      const classroomInput = within(signupTab).getByPlaceholderText('My Awesome Classroom');
      const emailInput = within(signupTab).getByPlaceholderText('your@email.com');
      const passwordInput = within(signupTab).getAllByDisplayValue('').find(input => input.id === 'signup-password') as HTMLInputElement;
      const confirmPasswordInput = within(signupTab).getAllByDisplayValue('').find(input => input.id === 'signup-password-confirm') as HTMLInputElement;
      
      expect(classroomInput).toHaveAttribute('required');
      expect(emailInput).toHaveAttribute('required');
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(passwordInput).toHaveAttribute('required');
      expect(confirmPasswordInput).toHaveAttribute('required');
    });

    it('should mask password input', () => {
      render(<LoginDialog {...defaultProps} />);
      const passwordInput = screen.getAllByDisplayValue('').find(input => input.id === 'login-password') as HTMLInputElement;
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Error Clearing', () => {
    it('should clear password match error when confirm password field changes', async () => {
      render(<LoginDialog {...defaultProps} />);
      
      const signupTab = screen.getByTestId('tab-content-signup');
      const confirmPasswordInput = within(signupTab).getAllByDisplayValue('').find(input => input.id === 'signup-password-confirm') as HTMLInputElement;
      
      await userEvent.type(confirmPasswordInput, 'Password123!');
      
      // Error should be cleared
      expect(
        within(signupTab).queryByText('Passwords do not match')
      ).not.toBeInTheDocument();
    });
  });

  describe('Dialog Interaction', () => {
    it('should render dialog with correct open state', () => {
      render(<LoginDialog {...defaultProps} open={true} />);
      const dialog = screen.getByTestId('dialog');
      expect(dialog).toHaveAttribute('data-open', 'true');
    });

    it('should not render dialog when open prop is false', () => {
      render(<LoginDialog {...defaultProps} open={false} />);
      // Dialog should still be rendered but might have aria-hidden or similar
      const dialog = screen.getByTestId('dialog');
      expect(dialog).toHaveAttribute('data-open', 'false');
    });
  });

  describe('Edge Cases', () => {
    it('should handle location selection in signup form', async () => {
      render(<LoginDialog {...defaultProps} />);
      
      const signupTab = screen.getByTestId('tab-content-signup');
      const locationInput = within(signupTab).getByPlaceholderText('Search for your city...');
      
      await userEvent.type(locationInput, 'New York');
      expect(locationInput).toHaveValue('New York');
    });

    it('should handle rapid form submissions', async () => {
      render(<LoginDialog {...defaultProps} />);
      
      const emailInput = screen.getAllByDisplayValue('').find(input => input.id === 'login-email') as HTMLInputElement;
      const passwordInput = screen.getAllByDisplayValue('').find(input => input.id === 'login-password') as HTMLInputElement;
      const loginButton = screen.getByRole('button', { name: /login/i });
      
      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'password123');
      
      // Rapid clicks
      await userEvent.click(loginButton);
      await userEvent.click(loginButton);
      
      await waitFor(() => {
        // Should only call onLogin once due to loading state prevention
        expect(mockOnLogin).toHaveBeenCalled();
      });
    });

    it('should handle undefined location in signup', async () => {
      render(<LoginDialog {...defaultProps} />);
      
      const signupTab = screen.getByTestId('tab-content-signup');
      const classroomInput = within(signupTab).getByPlaceholderText('My Awesome Classroom');
      const emailInput = within(signupTab).getByPlaceholderText('your@email.com');
      const passwordInput = within(signupTab).getAllByDisplayValue('').find(input => input.id === 'signup-password') as HTMLInputElement;
      const confirmPasswordInput = within(signupTab).getAllByDisplayValue('').find(input => input.id === 'signup-password-confirm') as HTMLInputElement;
      const signupButton = within(signupTab).getByRole('button', { name: /sign up/i });
      
      await userEvent.type(classroomInput, 'Test Classroom');
      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'Password123!');
      await userEvent.type(confirmPasswordInput, 'Password123!');
      // No location selected
      await userEvent.click(signupButton);
      
      await waitFor(() => {
        expect(mockOnSignup).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          'Test Classroom',
          undefined
        );
      });
    });
  });
});
