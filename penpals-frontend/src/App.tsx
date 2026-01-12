import { useState, useEffect } from 'react';
import MapView from './components/MapView';
import SidePanel from './components/SidePanel';
import LoginDialog from './components/LoginDialog';
import { ThemeProvider, useTheme } from './components/ThemeProvider';
import { Account, Classroom } from './types';
import { GraduationCap, Moon, Sun, LogOut, Menu, RotateCw } from 'lucide-react';
import { Post } from './components/PostCreator';
import { Button } from './components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from './components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './components/ui/dialog';
import { toast } from 'sonner@2.0.3';
import { Toaster } from './components/Toaster';
import { AuthService, ClassroomService } from './services';
import type { SelectedLocation } from './services/location';

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [loginError, setLoginError] = useState<string>('');
  const [signupError, setSignupError] = useState<string>('');
  const [authLoading, setAuthLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | undefined>();
  const [accounts, setAccounts] = useState<Account[]>([defaultAccount]);
  const [currentAccountId, setCurrentAccountId] = useState(defaultAccount.id);

  const [posts, setPosts] = useState<Post[]>([
    {
      id: '1',
      authorId: 'account-1',
      authorName: 'My Classroom',
      content: 'Just joined MirrorMirror! Excited to connect with classrooms around the world! 🌍',
      timestamp: new Date(Date.now() - 3600000),
      likes: 5,
      comments: 2,
    },
    {
      id: '2',
      authorId: 'other-1',
      authorName: "Lee's Classroom",
      content: 'Had an amazing session teaching Mandarin today. Looking forward to more collaborations!',
      timestamp: new Date(Date.now() - 7200000),
      likes: 12,
      comments: 4,
    },
  ]);

  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  const currentAccount = accounts.find(acc => acc.id === currentAccountId) || defaultAccount;

  // Check for existing authentication on component mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      if (AuthService.isAuthenticated()) {
        setAuthLoading(true);
        try {
          // Try to get user data with existing token
          const userData = await AuthService.getCurrentUser();
          
          // Convert backend classrooms to frontend format
          const convertedAccounts = userData.classrooms.map(classroom => ({
            id: classroom.id.toString(),
            classroomName: classroom.name,
            location: classroom.location || 'Unknown',
            size: classroom.class_size || 20,
            description: `Classroom managed by ${userData.account.email}`,
            interests: classroom.interests || [],
            schedule: {}, // TODO: Convert availability to schedule format
            // Use coordinates from backend if available, otherwise use default location (London)
            x: classroom.longitude ? parseFloat(classroom.longitude) : -0.1278,
            y: classroom.latitude ? parseFloat(classroom.latitude) : 51.5074,
            recentCalls: [],
            friends: [],
          }));

          if (convertedAccounts.length > 0) {
            setAccounts(convertedAccounts);
            setCurrentAccountId(convertedAccounts[0].id);
          } else {
            // No classrooms yet, keep default state
            setAccounts([defaultAccount]);
            setCurrentAccountId(defaultAccount.id);
          }

          setIsAuthenticated(true);
        } catch (error) {
          // Token is invalid or expired, clear it
          AuthService.logout();
          setIsAuthenticated(false);
        } finally {
          setAuthLoading(false);
          setInitialLoading(false);
        }
      } else {
        setInitialLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const handleClassroomSelect = (classroom: Classroom) => {
    setSelectedClassroom(classroom);
  };

  const handleAccountChange = (accountId: string) => {
    setCurrentAccountId(accountId);
  };

  const handleAccountUpdate = (updatedAccount: Account) => {
    setAccounts(accounts.map(acc =>
      acc.id === updatedAccount.id ? updatedAccount : acc
    ));
  };

  const handleAccountCreate = (newAccount: Account) => {
    // If there are existing accounts, inherit coordinates from the first one
    if (accounts.length > 0) {
      const firstAccount = accounts[0];
      newAccount.x = firstAccount.x;
      newAccount.y = firstAccount.y;
    }
    setAccounts([...accounts, newAccount]);
    setCurrentAccountId(newAccount.id);
  };

  const handleAccountDelete = (accountId: string) => {
    const filteredAccounts = accounts.filter(acc => acc.id !== accountId);
    const deletedAccount = accounts.find(acc => acc.id === accountId);

    // If we're deleting the last classroom, create a new empty one
    if (filteredAccounts.length === 0) {
      const newAccount: Account = {
        id: `account-${Date.now()}`,
        classroomName: 'New Classroom',
        location: 'Unknown',
        size: 10,
        description: '',
        interests: [],
        schedule: {},
        // Inherit coordinates from the deleted account, or use default if not available
        x: deletedAccount?.x ?? -0.1278,
        y: deletedAccount?.y ?? 51.5074,
      };
      setAccounts([newAccount]);
      setCurrentAccountId(newAccount.id);
      toast.success('Classroom deleted. New classroom created.');
    } else {
      // Sort remaining classrooms alphabetically and switch to the first one
      const sortedAccounts = [...filteredAccounts].sort((a, b) =>
        a.classroomName.localeCompare(b.classroomName)
      );
      setAccounts(filteredAccounts);
      setCurrentAccountId(sortedAccounts[0].id);
      toast.success('Classroom deleted.');
    }
  };

  const handleLogin = async (email: string, password: string) => {
    setLoginError(''); // Clear previous errors
    setAuthLoading(true);
    
    try {
      // Call real backend authentication
      await AuthService.login({ email, password });
      
      // Get user data after successful login
      const userData = await AuthService.getCurrentUser();
      
      // Convert backend classrooms to frontend format
      const convertedAccounts = userData.classrooms.map(classroom => ({
        id: classroom.id.toString(),
        classroomName: classroom.name,
        location: classroom.location || 'Unknown',
        size: classroom.class_size || 20,
        description: `Classroom managed by ${userData.account.email}`,
        interests: classroom.interests || [],
        schedule: {}, // TODO: Convert availability to schedule format
        // Use coordinates from backend if available, otherwise use default location (London)
        x: classroom.longitude ? parseFloat(classroom.longitude) : -0.1278,
        y: classroom.latitude ? parseFloat(classroom.latitude) : 51.5074,
        recentCalls: [],
        friends: [],
      }));

      if (convertedAccounts.length > 0) {
        setAccounts(convertedAccounts);
        setCurrentAccountId(convertedAccounts[0].id);
      } else {
        // No classrooms yet, keep default state
        setAccounts([defaultAccount]);
        setCurrentAccountId(defaultAccount.id);
      }

      setIsAuthenticated(true);
      setShowLoginDialog(false);
      toast.success('Successfully logged in!');
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      
      // Set user-friendly error message
      if (errorMessage.includes('Invalid credentials') || errorMessage.includes('401')) {
        setLoginError('Incorrect email or password. Please try again.');
      } else if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
        setLoginError('Unable to connect to server. Please check your internet connection.');
      } else {
        setLoginError(errorMessage);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignup = async (email: string, password: string, classroomName: string, location?: SelectedLocation) => {
    setSignupError(''); // Clear previous errors
    setAuthLoading(true);
    
    try {
      // Register account with backend
      await AuthService.register({ email, password });
      
      // Login with new account
      await AuthService.login({ email, password });
      
      // Create first classroom with provided location
      const classroomResult = await ClassroomService.createClassroom({
        name: classroomName,
        location: location?.name || 'Unknown Location',
        latitude: location?.latitude?.toString(),
        longitude: location?.longitude?.toString(),
        interests: [],
      });

      // Convert to frontend format - use coordinates from first classroom for consistency
      const newAccount: Account = {
        id: classroomResult.classroom.id.toString(),
        classroomName: classroomResult.classroom.name,
        location: classroomResult.classroom.location || 'Unknown Location',
        size: classroomResult.classroom.class_size || 20,
        description: 'A new classroom on PenPals',
        interests: classroomResult.classroom.interests || [],
        schedule: {},
        // Use coordinates from backend if available, otherwise use default location (London)
        x: classroomResult.classroom.longitude ? parseFloat(classroomResult.classroom.longitude) : -0.1278,
        y: classroomResult.classroom.latitude ? parseFloat(classroomResult.classroom.latitude) : 51.5074,
        recentCalls: [],
        friends: [],
      };

      setAccounts([newAccount]);
      setCurrentAccountId(newAccount.id);
      setIsAuthenticated(true);
      setShowLoginDialog(false);
      toast.success('Account created successfully!');
    } catch (error) {
      console.error('Signup error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Signup failed';
      
      // Set user-friendly error message
      if (errorMessage.includes('already exists') || errorMessage.includes('409')) {
        setSignupError('An account with this email already exists. Please use a different email or try logging in.');
      } else if (errorMessage.includes('Password must')) {
        setSignupError('Password must be at least 8 characters with uppercase, lowercase, digit, and special character.');
      } else if (errorMessage.includes('Invalid email')) {
        setSignupError('Please enter a valid email address.');
      } else if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
        setSignupError('Unable to connect to server. Please check your internet connection.');
      } else {
        setSignupError(errorMessage);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    // Clear backend authentication
    AuthService.logout();
    setIsAuthenticated(false);
    setAccounts([defaultAccount]);
    setCurrentAccountId(defaultAccount.id);
    toast.success('Logged out successfully');
  };

  const handleReload = () => {
    window.location.reload();
  };

  const handleCreatePost = async (content: string, imageUrl?: string, quotedPost?: Post['quotedPost']) => {
    const newPost: Post = {
      id: `post-${Date.now()}`,
      authorId: currentAccountId,
      authorName: currentAccount.classroomName,
      content,
      imageUrl,
      timestamp: new Date(),
      likes: 0,
      comments: 0,
      quotedPost,
    };

    // Upload to ChromaDB for search functionality
    try {
      const { uploadPostToChromaDB } = await import('./services/chromadb');
      const result = await uploadPostToChromaDB(newPost.id, content, {
        postId: newPost.id,
        authorId: newPost.authorId,
        authorName: newPost.authorName,
        timestamp: newPost.timestamp.toISOString(),
        likes: newPost.likes,
        comments: newPost.comments,
        imageUrl: newPost.imageUrl,
      });

      if (result.status === 'success') {
        // Only add post to local state if backend upload succeeds
        setPosts([newPost, ...posts]);
        toast.success('Post created and indexed successfully!');
      } else {
        toast.error('Failed to create post. Backend error: ' + result.message);
        console.warn('ChromaDB indexing failed:', result.message);
      }
    } catch (error) {
      toast.error('Failed to create post. Cannot connect to backend server.');
      console.error('Error uploading to ChromaDB:', error);
    }
  };

  const handleLikePost = (postId: string) => {
    const isLiked = likedPosts.has(postId);

    setPosts(posts.map(post =>
      post.id === postId ? {
        ...post,
        likes: isLiked ? post.likes - 1 : post.likes + 1
      } : post
    ));

    if (isLiked) {
      const newLikedPosts = new Set(likedPosts);
      newLikedPosts.delete(postId);
      setLikedPosts(newLikedPosts);
    } else {
      setLikedPosts(new Set([...likedPosts, postId]));
    }
  };

  const myPosts = posts.filter(post => post.authorId === currentAccountId);

  // Show loading screen during initial authentication check
  if (initialLoading) {
    return (
      <div className="h-screen w-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center animate-pulse">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login dialog if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <LoginDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setLoginError('');
              setSignupError('');
            }
          }}
          onLogin={handleLogin}
          onSignup={handleSignup}
          loginError={loginError}
          signupError={signupError}
          isLoading={authLoading}
        />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-slate-900 dark:text-slate-100 text-xl hidden sm:block">Classroom Connect</h1>
            <span className="text-sm text-slate-600 dark:text-slate-400 hidden md:block">MirrorMirror</span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReload}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              title="Reload"
            >
              <RotateCw className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              title="Toggle Theme"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </Button>
            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 text-sm">
              {currentAccount.classroomName.charAt(0)}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowLogoutDialog(true)}
              className="text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden flex-col lg:flex-row">
        {/* Map Area */}
        <div className="flex-1 p-3 md:p-6 overflow-hidden">
          <MapView
            onClassroomSelect={handleClassroomSelect}
            selectedClassroom={selectedClassroom}
            myClassroom={currentAccount}
            theme={theme}
          />
        </div>

        {/* Side Panel */}
        <div className="hidden md:block">
          <SidePanel
            selectedClassroom={selectedClassroom}
            onClassroomSelect={handleClassroomSelect}
            currentAccount={currentAccount}
            accounts={accounts}
            onAccountChange={handleAccountChange}
            onAccountUpdate={handleAccountUpdate}
            onAccountCreate={handleAccountCreate}
            onAccountDelete={handleAccountDelete}
            allPosts={posts}
            myPosts={myPosts}
            onCreatePost={handleCreatePost}
            onLikePost={handleLikePost}
            likedPosts={likedPosts}
          />
        </div>

        {/* Mobile Side Panel Sheet */}
        <div className="md:hidden fixed bottom-4 right-4 z-50">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-lg bg-slate-50 dark:bg-slate-900 overflow-y-auto">
              <SheetTitle className="sr-only">Classroom Settings</SheetTitle>
              <SheetDescription className="sr-only">Manage your classroom settings, interests, schedule, and account information</SheetDescription>
              <div className="mt-6">
                <SidePanel
                  selectedClassroom={selectedClassroom}
                  onClassroomSelect={handleClassroomSelect}
                  currentAccount={currentAccount}
                  accounts={accounts}
                  onAccountChange={handleAccountChange}
                  onAccountUpdate={handleAccountUpdate}
                  onAccountCreate={handleAccountCreate}
                  onAccountDelete={handleAccountDelete}
                  allPosts={posts}
                  myPosts={myPosts}
                  onCreatePost={handleCreatePost}
                  onLikePost={handleLikePost}
                  likedPosts={likedPosts}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">Confirm Logout</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Are you sure you want to log out? You'll need to log in again to access your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowLogoutDialog(false)}
              className="border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowLogoutDialog(false);
                handleLogout();
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}

const defaultAccount: Account = {
  id: 'account-1',
  classroomName: 'My Classroom',
  location: 'London, England, United Kingdom',
  size: 25,
  description: 'A friendly learning environment focused on STEM subjects and outdoor activities.',
  interests: ['Math', 'Biology'],
  schedule: {
    Mon: [9, 10, 11, 14, 15],
    Tue: [9, 10, 11],
    Wed: [14, 15, 16],
    Thu: [9, 10, 11],
    Fri: [14, 15],
  },
  x: -0.1278, // London longitude
  y: 51.5074, // London latitude
  recentCalls: [
    {
      id: 'call-1',
      classroomId: '1',
      classroomName: "Lee's Classroom",
      timestamp: new Date('2025-11-03T14:30:00'),
      duration: 45,
      type: 'outgoing' as const,
    },
    {
      id: 'call-2',
      classroomId: '2',
      classroomName: 'Math Nerd House',
      timestamp: new Date('2025-11-02T10:15:00'),
      duration: 30,
      type: 'incoming' as const,
    },
    {
      id: 'call-3',
      classroomId: '5',
      classroomName: 'Studio Ghibli Fan Club',
      timestamp: new Date('2025-11-01T16:00:00'),
      duration: 0,
      type: 'missed' as const,
    },
  ],
  friends: [
    {
      id: 'friend-1',
      classroomId: '1',
      classroomName: "Lee's Classroom",
      location: 'Tokyo, Japan',
      addedDate: new Date('2025-10-15'),
      lastConnected: new Date('2025-11-03'),
    },
    {
      id: 'friend-2',
      classroomId: '2',
      classroomName: 'Math Nerd House',
      location: 'Berlin, Germany',
      addedDate: new Date('2025-10-20'),
      lastConnected: new Date('2025-11-02'),
    },
    {
      id: 'friend-3',
      classroomId: '7',
      classroomName: 'Outdoor Adventure Squad',
      location: 'Denver, USA',
      addedDate: new Date('2025-10-25'),
    },
  ],
};