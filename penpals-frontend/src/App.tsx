import { useState, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import MapView from './components/MapView';
import SidePanel from './components/SidePanel';
import LoginDialog from './components/LoginDialog';
import ChatBot from './components/ChatBot';
import { ThemeProvider, useTheme } from './components/ThemeProvider';
import { Account, Classroom } from './types';
import { GraduationCap, Moon, Sun, LogOut, Menu, RotateCw, MessageCircle } from 'lucide-react';
import { Post } from './components/PostCreator';
import { Button } from './components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from './components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './components/ui/dialog';
import { toast } from 'sonner';
import { Toaster } from './components/Toaster';
import { AuthService, ClassroomService, WebexService } from './services';
import { fetchPosts, createPost, likePost, unlikePost, PostResponse } from './services/posts';
import type { ClassroomMapData } from './services/classroom';
import type { SelectedLocation } from './services/location';

// Helper to transform backend availability to frontend schedule format
const transformAvailability = (backendAvailability: any): { [day: string]: number[] } => {
  if (!backendAvailability) return {};

  // Case 1: Already in the correct format { "Mon": [9, 10], ... }
  if (typeof backendAvailability === 'object' && !Array.isArray(backendAvailability)) {
    // Basic validation to ensure values are arrays
    const cleanSchedule: { [day: string]: number[] } = {};
    Object.entries(backendAvailability).forEach(([day, hours]) => {
      if (Array.isArray(hours)) {
        cleanSchedule[day] = hours.map(h => Number(h)).filter(h => !isNaN(h));
      }
    });
    return cleanSchedule;
  }

  // Case 2: Array format [{day: 'Mon', time: '10:00'}, ...] (Legacy/Alternative)
  const schedule: { [day: string]: number[] } = {};
  if (Array.isArray(backendAvailability)) {
    backendAvailability.forEach(slot => {
      // Handle both string time "10:00" and potential other formats if they exist
      if (slot.day && slot.time) {
        const hour = parseInt(slot.time.split(':')[0], 10);
        if (!isNaN(hour)) {
          if (!schedule[slot.day]) {
            schedule[slot.day] = [];
          }
          if (!schedule[slot.day].includes(hour)) {
            schedule[slot.day].push(hour);
          }
        }
      }
    });
  }
  return schedule;
};

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
  const [showChatBot, setShowChatBot] = useState(false);
  const [loginError, setLoginError] = useState<string>('');
  const [signupError, setSignupError] = useState<string>('');
  const [authLoading, setAuthLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | undefined>();
  const [accounts, setAccounts] = useState<Account[]>([EMPTY_ACCOUNT]);
  const [currentAccountId, setCurrentAccountId] = useState(EMPTY_ACCOUNT.id);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);

  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  const currentAccount = accounts.find(acc => acc.id === currentAccountId) || EMPTY_ACCOUNT;

  // Fetch classrooms when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const fetchClassrooms = async () => {
        try {
          const response = await ClassroomService.getAllClassrooms(100);

          // Transform backend data to frontend model
          const mappedClassrooms: Classroom[] = response.classrooms
            .filter(c => c.latitude && c.longitude) // Only show classrooms with location
            .map(c => {
              // Transform availability from [{day, time}] to {[day]: [hours]}
              const availability = transformAvailability(c.availability);

              return {
                id: String(c.id),
                name: c.name,
                location: c.location || 'Unknown Location',
                lat: parseFloat(c.latitude || '0'),
                lon: parseFloat(c.longitude || '0'),
                interests: c.interests || [],
                availability: availability,
                size: c.class_size,
                description: `Friends: ${c.friends_count || 0}`
              };
            });

          setClassrooms(mappedClassrooms);
        } catch (error) {
          console.error("Failed to fetch classrooms", error);
        }
      };

      fetchClassrooms();

      // Poll for updates every minute
      const interval = setInterval(fetchClassrooms, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Check for existing authentication on component mount
  useEffect(() => {
    const handleWebExCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        try {
          // Clear URL params immediately
          window.history.replaceState({}, document.title, window.location.pathname);

          // Show loading toast
          const toastId = toast.loading("Connecting WebEx...");

          await WebexService.connect(code);
          toast.success("WebEx connected successfully!", { id: toastId });

          // Refresh full user data? or just let components reload status
        } catch (error: any) {
          toast.error(`WebEx connection failed: ${error.message || 'Unknown error'}`);
        }
      }
    };
    handleWebExCallback();

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
            schedule: transformAvailability(classroom.availability),
            // Use coordinates from backend if available, otherwise use default location (London)
            x: classroom.longitude ? parseFloat(classroom.longitude) : -0.1278,
            y: classroom.latitude ? parseFloat(classroom.latitude) : 51.5074,
            recentCalls: classroom.recent_calls || [],
            friends: classroom.friends || [],
            receivedFriendRequests: classroom.receivedFriendRequests || [],
            notifications: userData.account.notifications || [],
          }));

          if (convertedAccounts.length > 0) {
            setAccounts(convertedAccounts);
            setCurrentAccountId(convertedAccounts[0].id);
          } else {
            // No classrooms yet, keep default state
            setAccounts([EMPTY_ACCOUNT]);
            setCurrentAccountId(EMPTY_ACCOUNT.id);
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

    const loadData = async () => {
      // Fetch posts
      try {
        setLoadingPosts(true);
        const fetchedPosts = await fetchPosts();
        setPosts(fetchedPosts);

        // Initialize likedPosts set based on backend data
        const initialLikedPosts = new Set<string>();
        fetchedPosts.forEach(p => {
          if (p.isLiked) {
            initialLikedPosts.add(p.id);
          }
        });
        setLikedPosts(initialLikedPosts);
      } catch (error) {
        console.error("Failed to fetch posts:", error);
        toast.error("Failed to load posts");
      } finally {
        setLoadingPosts(false);
      }
    };

    checkAuthStatus();
    loadData();
  }, []);

  const handleClassroomSelect = (classroom: Classroom) => {
    setSelectedClassroom(classroom);
  };

  const handleAccountChange = (accountId: string) => {
    setCurrentAccountId(accountId);
  };

  const handleAccountUpdate = (updatedAccount: Account) => {
    // Check if location changed
    const currentAccount = accounts.find(acc => acc.id === updatedAccount.id);
    const locationChanged = currentAccount && (
      currentAccount.location !== updatedAccount.location ||
      currentAccount.x !== updatedAccount.x ||
      currentAccount.y !== updatedAccount.y
    );

    if (locationChanged) {
      // Sync location to all accounts
      setAccounts(accounts.map(acc => {
        if (acc.id === updatedAccount.id) {
          return updatedAccount;
        }
        return {
          ...acc,
          location: updatedAccount.location,
          x: updatedAccount.x,
          y: updatedAccount.y,
        };
      }));
    } else {
      // Regular update for single account
      setAccounts(accounts.map(acc =>
        acc.id === updatedAccount.id ? updatedAccount : acc
      ));
    }
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
        schedule: transformAvailability(classroom.availability),
        // Use coordinates from backend if available, otherwise use default location (London)
        x: classroom.longitude ? parseFloat(classroom.longitude) : -0.1278,
        y: classroom.latitude ? parseFloat(classroom.latitude) : 51.5074,
        recentCalls: classroom.recent_calls || [],
        friends: classroom.friends || [],
        receivedFriendRequests: classroom.receivedFriendRequests || [],
        notifications: userData.account.notifications || [],
      }));

      if (convertedAccounts.length > 0) {
        setAccounts(convertedAccounts);
        setCurrentAccountId(convertedAccounts[0].id);
      } else {
        // No classrooms yet, keep default state
        setAccounts([EMPTY_ACCOUNT]);
        setCurrentAccountId(EMPTY_ACCOUNT.id);
      }

      setIsAuthenticated(true);
      setShowLoginDialog(false);

      // Force cleanup of body styles that might be left by Radix Dialog
      // This prevents the "cannot interact after login" bug
      setTimeout(() => {
        document.body.style.pointerEvents = '';
        document.body.style.overflow = '';
        document.body.removeAttribute('data-scroll-locked');
      }, 50);

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
        schedule: transformAvailability(classroomResult.classroom.availability),
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

      // Force cleanup of body styles that might be left by Radix Dialog
      setTimeout(() => {
        document.body.style.pointerEvents = '';
        document.body.style.overflow = '';
        document.body.removeAttribute('data-scroll-locked');
      }, 50);

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
    setAccounts([EMPTY_ACCOUNT]);
    setCurrentAccountId(EMPTY_ACCOUNT.id);
    toast.success('Logged out successfully');
  };

  const handleReload = () => {
    window.location.reload();
  };

  const handleCreatePost = async (content: string, imageUrl?: string, quotedPost?: Post['quotedPost']) => {
    try {
      const newPost = await createPost(content, imageUrl, quotedPost?.id);

      // Update local state
      setPosts([newPost, ...posts]);
      toast.success('Post created successfully!');

      // Upload to ChromaDB for search functionality
      try {
        const { uploadPostToChromaDB } = await import('./services/chromadb');
        await uploadPostToChromaDB(newPost.id, content, {
          postId: newPost.id,
          authorId: newPost.authorId,
          authorName: newPost.authorName,
          timestamp: newPost.timestamp.toISOString(),
          likes: newPost.likes,
          comments: newPost.comments,
          imageUrl: newPost.imageUrl,
        });
      } catch (dbError) {
        console.warn('ChromaDB indexing failed:', dbError);
      }

    } catch (error: any) {
      console.error('Error creating post:', error);
      toast.error(error.message || 'Failed to create post');
    }
  };

  const handleLikePost = async (postId: string) => {
    // Determine current state
    const isLiked = likedPosts.has(postId);

    if (isLiked) {
      // UNLIKE FLOW

      // Optimistic update
      setPosts(prevPosts => prevPosts.map(post =>
        post.id === postId ? { ...post, likes: Math.max(0, post.likes - 1) } : post
      ));

      setLikedPosts(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });

      try {
        const newLikes = await unlikePost(postId);
        // Update with server truth
        setPosts(prevPosts => prevPosts.map(post =>
          post.id === postId ? { ...post, likes: newLikes } : post
        ));
      } catch (error: any) {
        // Revert on error
        console.error("Failed to unlike post:", error);

        setPosts(prevPosts => prevPosts.map(post =>
          post.id === postId ? { ...post, likes: post.likes + 1 } : post
        ));

        setLikedPosts(prev => new Set([...prev, postId]));

        toast.error(`Failed to unlike post: ${error.message || 'Unknown error'}`);
      }

    } else {
      // LIKE FLOW

      // Update UI immediately (optimistic)
      setPosts(prevPosts => prevPosts.map(post =>
        post.id === postId ? { ...post, likes: post.likes + 1 } : post
      ));
      setLikedPosts(prev => new Set([...prev, postId]));

      try {
        const newLikes = await likePost(postId);
        // Update with server truth
        setPosts(prevPosts => prevPosts.map(post =>
          post.id === postId ? { ...post, likes: newLikes } : post
        ));
      } catch (error: any) {
        // Revert on error
        console.error("Failed to like post:", error);

        setPosts(prevPosts => prevPosts.map(post =>
          post.id === postId ? { ...post, likes: post.likes - 1 } : post
        ));

        setLikedPosts(prev => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });

        toast.error(`Failed to like post: ${error.message || 'Unknown error'}`);
      }
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
            <h1 className="text-slate-900 dark:text-slate-100 text-xl hidden sm:block">PenPals AI</h1>
            <span className="text-sm text-slate-600 dark:text-slate-400 hidden md:block">powered by MirrorMirror</span>
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
              onClick={() => setShowChatBot(true)}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              title="Chat Assistant"
            >
              <MessageCircle className="w-5 h-5" />
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
          <ErrorBoundary name="Map View">
            <MapView
              onClassroomSelect={handleClassroomSelect}
              selectedClassroom={selectedClassroom}
              myClassroom={currentAccount}
              classrooms={classrooms}
              theme={theme}
            />
          </ErrorBoundary>
        </div>

        {/* Side Panel */}
        <div className="hidden md:block">
          <SidePanel
            selectedClassroom={selectedClassroom}
            onClassroomSelect={handleClassroomSelect}
            currentAccount={currentAccount}
            accounts={accounts}
            classrooms={classrooms}
            onAccountChange={handleAccountChange}
            onAccountUpdate={handleAccountUpdate}
            onAccountCreate={handleAccountCreate}
            onAccountDelete={handleAccountDelete}
            allPosts={posts}
            myPosts={myPosts}
            onCreatePost={handleCreatePost}
            onLikePost={handleLikePost}
            likedPosts={likedPosts}
            loadingPosts={loadingPosts}
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
                  classrooms={classrooms}
                  onAccountChange={handleAccountChange}
                  onAccountUpdate={handleAccountUpdate}
                  onAccountCreate={handleAccountCreate}
                  onAccountDelete={handleAccountDelete}
                  allPosts={posts}
                  myPosts={myPosts}
                  onCreatePost={handleCreatePost}
                  onLikePost={handleLikePost}
                  likedPosts={likedPosts}
                  loadingPosts={loadingPosts}
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

      <Dialog open={showChatBot} onOpenChange={setShowChatBot}>
        <DialogContent className="sm:max-w-xl h-[600px] max-h-85vh overflow-hidden p-0 bg-transparent border-none shadow-none flex flex-col">
          <ChatBot
            onClose={() => setShowChatBot(false)}
            classrooms={classrooms}
            currentAccount={currentAccount}
          />
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}

const EMPTY_ACCOUNT: Account = {
  id: 'guest',
  classroomName: 'New Classroom',
  location: 'London, England, United Kingdom',
  size: 20,
  description: 'Welcome to PenPals! Create a classroom to get started.',
  interests: [],
  schedule: {},
  x: -0.1278,
  y: 51.5074,
  recentCalls: [],
  friends: [],
  notifications: [],
};