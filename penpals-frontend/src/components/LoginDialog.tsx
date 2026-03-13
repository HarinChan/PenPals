import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import logoImage from '../assets/PenPals_Logo.png';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { useTheme } from './ThemeProvider';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from './ui/utils';
import LocationAutocomplete from './LocationAutocomplete';
import type { SelectedLocation } from '../services/location';
import { isValidApiBaseUrl } from '../services/api';

const CLIENT_HASH_SALT = (import.meta as any).env?.VITE_CLIENT_HASH_SALT || 'penpals-client-salt';

const hashPassword = async (plainText: string): Promise<string> => {
  const data = new TextEncoder().encode(`${CLIENT_HASH_SALT}:${plainText}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Truncates a string to a specified length and adds an ellipsis.
 * @param {string} str - The input string.
 * @param {number} limit - The character threshold (default 30).
 * @returns {string}
 */
const truncateString = (str?: string, limit = 42): string => {
  if (!str) return '';
  if (typeof str !== 'string') return '';
  
  return str.length > limit 
    ? str.slice(0, limit) + '...' 
    : str;
};

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogin: (email: string, password: string) => void;
  onSignup: (email: string, password: string, classroomName: string, location?: SelectedLocation) => void;
  selectedNetworkUrl: string | null;
  defaultNetworkUrl: string;
  previousNetworks: string[];
  onNetworkChange: (baseUrl: string) => void;
  loginError?: string;
  signupError?: string;
  isLoading?: boolean;
}

export default function LoginDialog({ 
  open, 
  onOpenChange, 
  onLogin, 
  onSignup, 
  selectedNetworkUrl,
  defaultNetworkUrl,
  previousNetworks,
  onNetworkChange,
  loginError, 
  signupError, 
  isLoading: externalLoading 
}: LoginDialogProps) {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('');
  const [signupClassroomName, setSignupClassroomName] = useState('');
  const [signupLocation, setSignupLocation] = useState<SelectedLocation | null>(null);
  const [passwordMatchError, setPasswordMatchError] = useState('');
  const [networkPopoverOpen, setNetworkPopoverOpen] = useState(false);
  const [networkInput, setNetworkInput] = useState('');
  const [networkValidationError, setNetworkValidationError] = useState('');
  const [internalLoading, setInternalLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const isLoading = externalLoading || internalLoading;
  const hasNetworkSelection = Boolean(selectedNetworkUrl);
  const hasValidNetworkSelection = selectedNetworkUrl ? isValidApiBaseUrl(selectedNetworkUrl) : false;
  const isAuthBlocked = !hasNetworkSelection || !hasValidNetworkSelection;
  const previousNetworkOptions = previousNetworks.filter((url) => url !== defaultNetworkUrl);

  const applyNetworkSelection = (candidate: string) => {
    const trimmedCandidate = candidate.trim();
    const withProtocol = /^https?:\/\//i.test(trimmedCandidate)
      ? trimmedCandidate
      : `http://${trimmedCandidate}`;

    if (!isValidApiBaseUrl(withProtocol)) {
      setNetworkValidationError('Please enter a valid http(s) URL, e.g. http://127.0.0.1:5001/api');
      return;
    }

    setNetworkValidationError('');
    onNetworkChange(withProtocol);
    setNetworkInput(withProtocol);
    setNetworkPopoverOpen(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setInternalLoading(true);
    try {
      const hashedPassword = await hashPassword(loginPassword);
      await onLogin(loginEmail, hashedPassword);
      // Only clear fields on successful login (no error)
      if (!loginError) {
        setLoginEmail('');
        setLoginPassword('');
      } else {
        // On error, clear only password but keep email
        setLoginPassword('');
      }
    } finally {
      setInternalLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords match
    if (signupPassword !== signupPasswordConfirm) {
      setPasswordMatchError('Passwords do not match');
      return;
    }
    
    setPasswordMatchError('');
    setInternalLoading(true);
    try {
      const hashedPassword = await hashPassword(signupPassword);
      await onSignup(signupEmail, hashedPassword, signupClassroomName, signupLocation || undefined);
      // Only clear fields on successful signup
      if (!signupError) {
        setSignupEmail('');
        setSignupPassword('');
        setSignupPasswordConfirm('');
        setSignupClassroomName('');
        setSignupLocation(null);
      }
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md backdrop-blur-sm">
        <DialogHeader>
          <div className="flex flex-col items-center justify-center w-full pb-4">
            <img src={logoImage} alt="PenPals Logo" className="h-20 w-auto" />
            <DialogTitle className="sr-only">Login to PenPals</DialogTitle>
            <DialogDescription className="sr-only">Access your account or create a new one</DialogDescription>
          </div>
        </DialogHeader>

        <Tabs defaultValue="login" className="w-full" onValueChange={() => {
          // Clear errors when switching tabs
          if (loginError || signupError) {
            // We need to call parent functions to clear errors
            // For now, errors will persist until next attempt
          }
        }}>
          <div className="space-y-2 pb-3">
            <Label htmlFor="network-selector" className="text-slate-900 dark:text-slate-100">Network</Label>
            <Popover
              open={networkPopoverOpen}
              onOpenChange={(nextOpen: boolean) => {
                setNetworkPopoverOpen(nextOpen);
                if (nextOpen) {
                  setNetworkInput('');
                  setNetworkValidationError('');
                }
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  id="network-selector"
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={networkPopoverOpen}
                  className="w-full justify-between bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                >
                  <span
                    className={cn(
                      'truncate',
                      !selectedNetworkUrl && 'text-slate-500 dark:text-slate-400',
                    )}
                  >
                    {truncateString(selectedNetworkUrl) || 'Select a network'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Type custom network URL..."
                    value={networkInput}
                    onValueChange={(value: string) => {
                      setNetworkInput(value);
                      setNetworkValidationError('');
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && networkInput.trim()) {
                        event.preventDefault();
                        applyNetworkSelection(networkInput);
                      }
                    }}
                  />
                  <CommandList>
                    <CommandEmpty>No preset match. Use custom URL below.</CommandEmpty>
                    <CommandGroup heading="Preset">
                      <CommandItem onSelect={() => applyNetworkSelection(defaultNetworkUrl)}>
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedNetworkUrl === defaultNetworkUrl ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        Default network ({truncateString(defaultNetworkUrl)})
                      </CommandItem>
                    </CommandGroup>
                    {previousNetworkOptions.length > 0 && (
                      <CommandGroup heading="Previous networks">
                        {previousNetworkOptions.map((networkUrl) => (
                          <CommandItem key={networkUrl} onSelect={() => applyNetworkSelection(networkUrl)}>
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedNetworkUrl === networkUrl ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                            <span className="truncate">{truncateString(networkUrl)}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                    {networkInput.trim() && (
                      <CommandGroup heading="Custom">
                        <CommandItem onSelect={() => applyNetworkSelection(networkInput)}>
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedNetworkUrl === networkInput.trim() ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          <span className="truncate">Use {truncateString(networkInput.trim())}</span>
                        </CommandItem>
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {!selectedNetworkUrl && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Choose Default network or type a custom API URL to enable authentication.
              </p>
            )}
            {networkValidationError && (
              <p className="text-xs text-red-600 dark:text-red-400">{networkValidationError}</p>
            )}
          </div>

          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4">
            {loginError && (
              <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {loginError}
                </p>
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-slate-900 dark:text-slate-100">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="your@email.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-slate-900 dark:text-slate-100">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className={`bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 ${
                    loginError 
                      ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' 
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isLoading || isAuthBlocked}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            {signupError && (
              <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {signupError}
                </p>
              </div>
            )}
            {passwordMatchError && (
              <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {passwordMatchError}
                </p>
              </div>
            )}
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-classroom" className="text-slate-900 dark:text-slate-100">Account Name</Label>
                <Input
                  id="signup-classroom"
                  type="text"
                  placeholder="My Awesome Classroom"
                  value={signupClassroomName}
                  onChange={(e) => setSignupClassroomName(e.target.value)}
                  required
                  className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-slate-900 dark:text-slate-100">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="your@email.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required
                  className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <LocationAutocomplete
                  label="Location"
                  placeholder="Search for your city..."
                  value={signupLocation}
                  onChange={setSignupLocation}
                  id="signup-location"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-slate-900 dark:text-slate-100">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="••••••••"
                  value={signupPassword}
                  onChange={(e) => {
                    setSignupPassword(e.target.value);
                    setPasswordMatchError('');
                  }}
                  required
                  className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Must be 8+ characters with uppercase, lowercase, digit, and special character
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password-confirm" className="text-slate-900 dark:text-slate-100">Confirm Password</Label>
                <Input
                  id="signup-password-confirm"
                  type="password"
                  placeholder="••••••••"
                  value={signupPasswordConfirm}
                  onChange={(e) => {
                    setSignupPasswordConfirm(e.target.value);
                    setPasswordMatchError('');
                  }}
                  required
                  className={`bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 ${
                    passwordMatchError
                      ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isLoading || isAuthBlocked}
              >
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}