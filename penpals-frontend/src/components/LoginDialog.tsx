import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import LocationAutocomplete from './LocationAutocomplete';
import type { SelectedLocation } from '../services/location';

const CLIENT_HASH_SALT = (import.meta as any).env?.VITE_CLIENT_HASH_SALT || 'penpals-client-salt';

const hashPassword = async (plainText: string): Promise<string> => {
  const data = new TextEncoder().encode(`${CLIENT_HASH_SALT}:${plainText}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogin: (email: string, password: string) => void;
  onSignup: (email: string, password: string, classroomName: string, location?: SelectedLocation) => void;
  loginError?: string;
  signupError?: string;
  isLoading?: boolean;
}

export default function LoginDialog({ 
  open, 
  onOpenChange, 
  onLogin, 
  onSignup, 
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
  const [internalLoading, setInternalLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const isLoading = externalLoading || internalLoading;

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
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-slate-900 dark:text-slate-100">Welcome to MirrorMirror</DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-400">
                Connect with classrooms around the world
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-full"
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4 text-slate-700" />
              ) : (
                <Sun className="h-4 w-4 text-slate-300" />
              )}
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="login" className="w-full" onValueChange={() => {
          // Clear errors when switching tabs
          if (loginError || signupError) {
            // We need to call parent functions to clear errors
            // For now, errors will persist until next attempt
          }
        }}>
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
                disabled={isLoading}
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
                disabled={isLoading}
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