import { useState, useMemo, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Search, Calendar, BookOpen, Plus, User, MapPin, Users, Edit2, ChevronDown, ChevronRight, ChevronLeft, Phone, Heart, Clock, Trash2, AlertTriangle } from 'lucide-react';
import type { Classroom } from './MapView';
import { classrooms } from './MapView';
import { Account, RecentCall, Friend, FriendRequest, Notification } from '../types';

import ClassroomDetailDialog from './ClassroomDetailDialog';
import FeedPanel from './FeedPanel';
import { Post } from './PostCreator';
import { toast } from 'sonner';
import NotificationWidget from './NotificationWidget';
import LocationAutocomplete from './LocationAutocomplete';
import type { SelectedLocation } from '../services/location';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

const AVAILABLE_SUBJECTS = [
  'Math',
  'English',
  'Biology',
  'Chemistry',
  'Physics',
  'History',
  'Geography',
  'Computer Science',
  'Art',
  'Music',
  'Spanish',
  'French',
  'Mandarin',
  'Japanese',
  'Korean',
  'Rock Climbing',
  'Knitting',
  'Dance',
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);



interface SidePanelProps {
  selectedClassroom?: Classroom;
  onClassroomSelect: (classroom: Classroom) => void;
  currentAccount: Account;
  accounts: Account[];
  onAccountChange: (accountId: string) => void;
  onAccountUpdate: (account: Account) => void;
  onAccountCreate: (account: Account) => void;
  onAccountDelete: (accountId: string) => void;
  // Feed props
  allPosts: Post[];
  myPosts: Post[];
  onCreatePost: (content: string, imageUrl?: string) => void;
  onLikePost: (postId: string) => void;
  likedPosts?: Set<string>;
}

export default function SidePanel({
  selectedClassroom,
  onClassroomSelect,
  currentAccount,
  accounts,
  onAccountChange,
  onAccountUpdate,
  onAccountCreate,
  onAccountDelete,
  // Feed props
  allPosts,
  myPosts,
  onCreatePost,
  onLikePost,
  likedPosts,
}: SidePanelProps) {
  const [customInterest, setCustomInterest] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [editingAccount, setEditingAccount] = useState(false);
  const [detailDialogClassroom, setDetailDialogClassroom] = useState<Classroom | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  
  // Create Classroom Dialog State
  const [createClassroomDialogOpen, setCreateClassroomDialogOpen] = useState(false);
  const [newClassroomData, setNewClassroomData] = useState({
    name: '',
    size: 20,
    description: '',
  });

  // Collapsible widget states
  const [accountInfoOpen, setAccountInfoOpen] = useState(true);
  const [interestsOpen, setInterestsOpen] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(true);
  const [classroomsOpen, setClassroomsOpen] = useState(true);
  const [recentCallsOpen, setRecentCallsOpen] = useState(true);
  const [friendsOpen, setFriendsOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(true);

  // Resize logic
  const [width, setWidth] = useState(384);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = window.innerWidth - e.clientX;

      if (newWidth >= 256 && newWidth <= 800) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
  }, [isResizing]);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const [accountForm, setAccountForm] = useState({
    classroomName: currentAccount.classroomName,
    location: currentAccount.location,
    size: currentAccount.size,
    description: currentAccount.description,
  });

  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [editingAccountLocation, setEditingAccountLocation] = useState(false);

  const allInterests = [...AVAILABLE_SUBJECTS];

  const toggleInterest = (interest: string) => {
    const newInterests = currentAccount.interests.includes(interest)
      ? currentAccount.interests.filter(i => i !== interest)
      : [...currentAccount.interests, interest];

    onAccountUpdate({ ...currentAccount, interests: newInterests });
  };

  const addCustomInterest = () => {
    if (customInterest.trim() && !allInterests.includes(customInterest.trim())) {
      const newInterests = [...currentAccount.interests, customInterest.trim()];
      onAccountUpdate({ ...currentAccount, interests: newInterests });
      setCustomInterest('');
    }
  };

  const toggleScheduleSlot = (day: string, hour: number) => {
    const daySchedule = currentAccount.schedule[day] || [];
    const newSchedule = daySchedule.includes(hour)
      ? daySchedule.filter(h => h !== hour)
      : [...daySchedule, hour].sort((a, b) => a - b);

    onAccountUpdate({
      ...currentAccount,
      schedule: { ...currentAccount.schedule, [day]: newSchedule },
    });
  };

  const saveAccountInfo = () => {
    // Check for duplicate classroom names (excluding current classroom)
    const duplicateName = accounts.some(
      acc => acc.id !== currentAccount.id && acc.classroomName === accountForm.classroomName
    );

    if (duplicateName) {
      toast.error('A classroom with this name already exists. Please choose a different name.');
      return;
    }

    onAccountUpdate({
      ...currentAccount,
      ...accountForm,
    });
    setEditingAccount(false);
  };



  const createNewAccount = () => {
    if (accounts.length >= 12) {
      return; // Don't create if at limit
    }
    
    // Reset form and open dialog
    setNewClassroomData({
      name: '',
      size: 20,
      description: '',
    });
    setCreateClassroomDialogOpen(true);
  };

  const submitCreateClassroom = () => {
    toast.info('Attempting to create classroom...'); // DEBUG
    try {
    // Validate
    if (!newClassroomData.name.trim()) {
      toast.error('Please enter a classroom name');
      return;
    }
    
    const duplicateName = accounts.some(acc => acc.classroomName === newClassroomData.name.trim());
    if (duplicateName) {
      toast.error('A classroom with this name already exists');
      return;
    }

    const newAccount: Account = {
      id: `account-${Date.now()}`,
      classroomName: newClassroomData.name.trim(),
      location: currentAccount.location, // Inherit location
      size: newClassroomData.size,
      description: newClassroomData.description,
      interests: [],
      schedule: {},
      // Inherit coordinates from the current account
      x: currentAccount.x,
      y: currentAccount.y,
      recentCalls: [],
      friends: [],
    };
    
    onAccountCreate(newAccount);
    setCreateClassroomDialogOpen(false);
    toast.success('New classroom created!');
    } catch (err: any) {
      console.error(err);
      toast.error('Error creating classroom: ' + err.message);
    }
  };



  const handleDeleteClassroom = (accountId: string) => {
    if (accounts.length <= 1) {
      return; // Don't delete if it's the last classroom
    }
    setAccountToDelete(accountId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (accountToDelete) {
      onAccountDelete(accountToDelete);
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
    }
  };

  // Calculate relevancy for each classroom
  const calculateRelevancy = (classroom: Classroom) => {
    let scheduleMatches = false;
    for (const day in currentAccount.schedule) {
      const myHours = currentAccount.schedule[day] || [];
      const classroomHours = classroom.availability[day] || [];
      const hasOverlap = myHours.some(hour => classroomHours.includes(hour));
      if (hasOverlap) {
        scheduleMatches = true;
        break;
      }
    }

    const matchingInterests = classroom.interests.filter(interest =>
      currentAccount.interests.includes(interest)
    );
    const interestMatchRatio = currentAccount.interests.length > 0
      ? matchingInterests.length / currentAccount.interests.length
      : 0;

    if (scheduleMatches && interestMatchRatio === 1) {
      return { level: 'high', color: 'bg-green-500', matchingInterests };
    } else if (scheduleMatches && interestMatchRatio > 0) {
      return { level: 'medium', color: 'bg-yellow-500', matchingInterests };
    } else if (!scheduleMatches && interestMatchRatio > 0) {
      return { level: 'low', color: 'bg-red-500', matchingInterests };
    }
    return { level: 'none', color: 'bg-slate-500', matchingInterests };
  };

  const filteredClassrooms = useMemo(() => {
    return classrooms
      .map(classroom => ({
        ...classroom,
        relevancy: calculateRelevancy(classroom),
      }))
      .filter(classroom => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          classroom.name.toLowerCase().includes(query) ||
          classroom.location.toLowerCase().includes(query) ||
          classroom.interests.some(i => i.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2, none: 3 };
        return order[a.relevancy.level as keyof typeof order] - order[b.relevancy.level as keyof typeof order];
      });
  }, [searchQuery, currentAccount.interests, currentAccount.schedule]);

  const handleClassroomClick = (classroom: Classroom) => {
    setDetailDialogClassroom(classroom);
    setShowDetailDialog(true);
  };

  useEffect(() => {
    if (selectedClassroom) {
      handleClassroomClick(selectedClassroom);
    }
  }, [selectedClassroom]);

  const removeFriend = (friendId: string) => {
    const friend = (currentAccount.friends || []).find(f => f.id === friendId);
    const updatedFriends = (currentAccount.friends || []).filter(f => f.id !== friendId);
    onAccountUpdate({ ...currentAccount, friends: updatedFriends });
    if (friend) {
      toast.success(`Removed ${friend.classroomName} from friends`);
    }
  };

  const addFriend = (classroom: Classroom) => {
    const newFriend: Friend = {
      id: `friend-${Date.now()}`,
      classroomId: classroom.id,
      classroomName: classroom.name,
      location: classroom.location,
      addedDate: new Date(),
      friendshipStatus: 'pending',
    };
    const updatedFriends = [...(currentAccount.friends || []), newFriend];

    // Add notification for the other user (simulated)
    const notification: Notification = {
      id: `notif-${Date.now()}`,
      type: 'friend_request_received',
      title: 'New Friend Request',
      message: `${currentAccount.classroomName} sent you a friend request!`,
      timestamp: new Date(),
      read: false,
      relatedId: classroom.id,
    };
    const updatedNotifications = [...(currentAccount.notifications || []), notification];

    onAccountUpdate({ ...currentAccount, friends: updatedFriends, notifications: updatedNotifications });
    toast.success(`Friend request sent to ${classroom.name}`);
  };

  const getFriendshipStatus = (classroomId: string): 'none' | 'pending' | 'accepted' => {
    const friend = (currentAccount.friends || []).find(f => f.classroomId === classroomId);
    if (!friend) return 'none';
    return friend.friendshipStatus || 'none';
  };

  const toggleFriendRequest = (classroom: Classroom) => {
    const status = getFriendshipStatus(classroom.id);

    if (status === 'accepted') {
      // Unfriend
      const friendToRemove = currentAccount.friends?.find(f => f.classroomId === classroom.id);
      if (friendToRemove) removeFriend(friendToRemove.id);
    } else if (status === 'pending') {
      // Cancel request
      const friendToRemove = currentAccount.friends?.find(f => f.classroomId === classroom.id);
      if (friendToRemove) {
        const updatedFriends = (currentAccount.friends || []).filter(f => f.id !== friendToRemove.id);
        onAccountUpdate({ ...currentAccount, friends: updatedFriends });
        toast.success(`Friend request to ${classroom.name} cancelled`);
      }
    } else {
      // Send friend request
      addFriend(classroom);
    }
  };

  const acceptFriendRequest = (classroomId: string) => {
    const updatedFriends = (currentAccount.friends || []).map(f =>
      f.classroomId === classroomId ? { ...f, friendshipStatus: 'accepted' as const } : f
    );

    // Add notification
    const friend = (currentAccount.friends || []).find(f => f.classroomId === classroomId);
    if (friend) {
      const notification: Notification = {
        id: `notif-${Date.now()}`,
        type: 'friend_request_accepted',
        title: 'Friend Request Accepted',
        message: `${friend.classroomName} accepted your friend request!`,
        timestamp: new Date(),
        read: false,
        relatedId: classroomId,
      };
      const updatedNotifications = [...(currentAccount.notifications || []), notification];
      onAccountUpdate({ ...currentAccount, friends: updatedFriends, notifications: updatedNotifications });
      toast.success(`You are now friends with ${friend.classroomName}!`);
    }
  };

  const markNotificationAsRead = (notificationId: string) => {
    const updatedNotifications = (currentAccount.notifications || []).map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    onAccountUpdate({ ...currentAccount, notifications: updatedNotifications });
  };

  const clearNotification = (notificationId: string) => {
    const updatedNotifications = (currentAccount.notifications || []).filter(n => n.id !== notificationId);
    onAccountUpdate({ ...currentAccount, notifications: updatedNotifications });
  };



  return (
    <div
      className={`h-full bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col relative ${sidebarCollapsed ? 'transition-all duration-300' : isResizing ? 'transition-none' : 'transition-[width] duration-300'}`}
      style={{ width: sidebarCollapsed ? '4rem' : width }}
    >
      {/* Drag Handle */}
      {!sidebarCollapsed && (
        <div
          className="absolute -left-2 top-0 bottom-0 w-4 cursor-col-resize z-50 group flex items-center justify-center"
          onMouseDown={startResizing}
        >
          {/* Visual line on hover/active */}
          <div className="w-[1px] h-full bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      {sidebarCollapsed ? (
        // Collapsed view with icons only
        <div className="p-4 space-y-4 flex flex-col items-center overflow-y-auto">
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors text-slate-600 dark:text-slate-400"
            title="Expand sidebar"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="p-2 hover:bg-slate-100 rounded-md transition-colors text-purple-600"
            title="Account"
          >
            <User size={20} />
          </button>
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="p-2 hover:bg-slate-100 rounded-md transition-colors text-blue-600"
            title="Interests"
          >
            <BookOpen size={20} />
          </button>
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="p-2 hover:bg-slate-100 rounded-md transition-colors text-green-600"
            title="Schedule"
          >
            <Calendar size={20} />
          </button>
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="p-2 hover:bg-slate-100 rounded-md transition-colors text-purple-600"
            title="Find Classrooms"
          >
            <Search size={20} />
          </button>
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="p-2 hover:bg-slate-100 rounded-md transition-colors text-orange-600"
            title="Recent Calls"
          >
            <Phone size={20} />
          </button>
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="p-2 hover:bg-slate-100 rounded-md transition-colors text-pink-600"
            title="Friends"
          >
            <Heart size={20} />
          </button>
        </div>
      ) : (
        <Tabs defaultValue="controls" className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 p-2 border-b border-slate-200 dark:border-slate-700 shrink-0 bg-slate-50 dark:bg-slate-900">
            <TabsList className="flex-1 grid grid-cols-3 h-9 bg-transparent p-0 gap-1">
              <TabsTrigger
                value="controls"
                className="text-slate-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm rounded-md"
              >
                Classrooms
              </TabsTrigger>
              <TabsTrigger
                value="account"
                className="text-slate-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm rounded-md"
              >
                Account
              </TabsTrigger>
              <TabsTrigger
                value="feed"
                className="text-slate-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm rounded-md"
              >
                Feed
              </TabsTrigger>
            </TabsList>
            <Button
              onClick={() => setSidebarCollapsed(true)}
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              title="Collapse sidebar"
            >
              <ChevronRight size={18} />
            </Button>
          </div>

          <TabsContent value="controls" className="flex-1 m-0 p-6 space-y-6 overflow-y-auto">
            {/* Classrooms Switcher */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="text-purple-600 dark:text-purple-400" size={18} />
                    <h3 className="text-slate-900 dark:text-slate-100">Classrooms</h3>
                    <Badge variant="secondary" className="text-xs">
                      {accounts.length}/12
                    </Badge>
                  </div>
                  <Button
                    onClick={createNewAccount}
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    disabled={accounts.length >= 12}
                    title={accounts.length >= 12 ? "Maximum classrooms reached" : "Add new classroom"}
                  >
                    <Plus size={16} />
                  </Button>
                </div>

                {accounts.length >= 12 && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                    <AlertTriangle className="text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" size={16} />
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      You've reached the maximum limit of 12 classrooms. Delete a classroom to create a new one.
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Select value={currentAccount.id} onValueChange={onAccountChange}>
                    <SelectTrigger className="flex-1 bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600">
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id} className="text-slate-900 dark:text-slate-100">
                          {account.classroomName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => handleDeleteClassroom(currentAccount.id)}
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20"
                    disabled={accounts.length <= 1}
                    title={accounts.length <= 1 ? "Cannot delete last classroom" : "Delete classroom"}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Account Information - Collapsible */}
            <Collapsible open={accountInfoOpen} onOpenChange={setAccountInfoOpen}>
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <CollapsibleTrigger className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-slate-700 dark:text-slate-300">
                      <ChevronDown className={`transition-transform ${accountInfoOpen ? '' : '-rotate-90'}`} size={16} />
                      <h3 className="text-slate-900 dark:text-slate-100">Classroom Information</h3>
                    </CollapsibleTrigger>
                    <button
                      onClick={() => {
                        if (editingAccount) {
                          saveAccountInfo();
                        } else {
                          setAccountForm({
                            classroomName: currentAccount.classroomName,
                            location: currentAccount.location,
                            size: currentAccount.size,
                            description: currentAccount.description,
                          });
                          setEditingAccount(true);
                        }
                      }}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500"
                    >
                      {editingAccount ? 'Save' : <Edit2 size={16} />}
                    </button>
                  </div>

                  <CollapsibleContent>

                    {editingAccount ? (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label className="text-slate-700 dark:text-slate-300">Classroom Name</Label>
                          <Input
                            value={accountForm.classroomName}
                            onChange={(e) => setAccountForm({ ...accountForm, classroomName: e.target.value })}
                            className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-slate-700 dark:text-slate-300">Class Size</Label>
                          <Input
                            type="number"
                            value={accountForm.size}
                            onChange={(e) => setAccountForm({ ...accountForm, size: parseInt(e.target.value) || 0 })}
                            className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-slate-700 dark:text-slate-300">Description</Label>
                          <Textarea
                            value={accountForm.description}
                            onChange={(e) => setAccountForm({ ...accountForm, description: e.target.value })}
                            className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                            rows={3}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <MapPin size={16} />
                          <span>{currentAccount.location}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">(Account location)</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <Users size={16} />
                          <span>{currentAccount.size} students</span>
                        </div>
                        {currentAccount.description && (
                          <p className="text-slate-700 dark:text-slate-300 text-sm">{currentAccount.description}</p>
                        )}
                      </div>
                    )}
                  </CollapsibleContent>
                </div>
              </Card>
            </Collapsible>

            {/* Interests Widget - Collapsible */}
            <Collapsible open={interestsOpen} onOpenChange={setInterestsOpen}>
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="p-6 space-y-4">
                  <CollapsibleTrigger className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100 transition-colors w-full text-slate-700 dark:text-slate-300">
                    <ChevronDown className={`transition-transform ${interestsOpen ? '' : '-rotate-90'}`} size={16} />
                    <BookOpen className="text-blue-600 dark:text-blue-400" size={18} />
                    <h3 className="text-slate-900 dark:text-slate-100">Your Interests & Subjects</h3>
                  </CollapsibleTrigger>

                  <CollapsibleContent>

                    <ScrollArea className="h-64">
                      <div className="space-y-3 pr-4">
                        {allInterests.map((subject) => (
                          <div key={subject} className="flex items-center space-x-2">
                            <Checkbox
                              id={subject}
                              checked={currentAccount.interests.includes(subject)}
                              onCheckedChange={() => toggleInterest(subject)}
                            />
                            <Label
                              htmlFor={subject}
                              className="text-slate-900 dark:text-slate-100 cursor-pointer"
                            >
                              {subject}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <Input
                        type="text"
                        value={customInterest}
                        onChange={(e) => setCustomInterest(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addCustomInterest()}
                        placeholder="Add custom interest..."
                        className="flex-1 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                      />
                      <button
                        onClick={addCustomInterest}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                      >
                        <Plus size={16} className="text-white" />
                      </button>
                    </div>

                    {currentAccount.interests.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                        {currentAccount.interests.map((interest) => (
                          <Badge key={interest} variant="secondary" className="bg-blue-600 text-white">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CollapsibleContent>
                </div>
              </Card>
            </Collapsible>

            {/* Schedule Widget - Collapsible */}
            <Collapsible open={scheduleOpen} onOpenChange={setScheduleOpen}>
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <CollapsibleTrigger className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-slate-700 dark:text-slate-300">
                      <ChevronDown className={`transition-transform ${scheduleOpen ? '' : '-rotate-90'}`} size={16} />
                      <Calendar className="text-green-600 dark:text-green-400" size={18} />
                      <h3 className="text-slate-900 dark:text-slate-100">Your Availability</h3>
                    </CollapsibleTrigger>
                    <button
                      onClick={() => setShowScheduleEditor(!showScheduleEditor)}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500"
                    >
                      {showScheduleEditor ? 'Hide' : 'Edit'}
                    </button>
                  </div>

                  <CollapsibleContent>

                    {showScheduleEditor ? (
                      <ScrollArea className="h-80">
                        <div className="space-y-4 pr-4">
                          {DAYS.map((day) => (
                            <div key={day} className="space-y-2">
                              <div className="text-slate-700 dark:text-slate-300">{day}</div>
                              <div className="grid grid-cols-8 gap-1">
                                {HOURS.map((hour) => {
                                  const isSelected = currentAccount.schedule[day]?.includes(hour);
                                  return (
                                    <button
                                      key={hour}
                                      onClick={() => toggleScheduleSlot(day, hour)}
                                      className={`p-1 text-xs rounded transition-colors ${isSelected
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                        }`}
                                      title={`${hour}:00`}
                                    >
                                      {hour}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="space-y-2">
                        {DAYS.map((day) => {
                          const hours = currentAccount.schedule[day] || [];
                          if (hours.length === 0) return null;
                          return (
                            <div key={day} className="flex gap-2 text-sm">
                              <span className="text-slate-600 dark:text-slate-400 w-12">{day}:</span>
                              <span className="text-slate-900 dark:text-slate-100">
                                {hours.length > 0 ? `${hours[0]}:00 - ${hours[hours.length - 1] + 1}:00` : 'Not available'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CollapsibleContent>
                </div>
              </Card>
            </Collapsible>

            {/* Recent Calls Widget - Collapsible */}
            <Collapsible open={recentCallsOpen} onOpenChange={setRecentCallsOpen}>
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="p-6 space-y-4">
                  <CollapsibleTrigger className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100 transition-colors w-full text-slate-700 dark:text-slate-300">
                    <ChevronDown className={`transition-transform ${recentCallsOpen ? '' : '-rotate-90'}`} size={16} />
                    <Phone className="text-orange-600 dark:text-orange-400" size={18} />
                    <h3 className="text-slate-900 dark:text-slate-100">Recent Calls</h3>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-2 pr-4">
                        {(currentAccount.recentCalls || []).length === 0 ? (
                          <div className="text-center text-slate-500 dark:text-slate-400 py-8 text-sm">
                            No recent calls
                          </div>
                        ) : (
                          (currentAccount.recentCalls || []).map((call) => {
                            // Find the full classroom data
                            const callClassroom = classrooms.find(c => c.id === call.classroomId);

                            return (
                              <div
                                key={call.id}
                                className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-650 transition-colors cursor-pointer"
                                onClick={() => {
                                  if (callClassroom) {
                                    handleClassroomClick(callClassroom);
                                  }
                                }}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="text-slate-900 dark:text-slate-100">{call.classroomName}</div>
                                    <div className="text-slate-600 dark:text-slate-400 text-xs mt-1 flex items-center gap-2">
                                      <Clock size={12} />
                                      {new Date(call.timestamp).toLocaleDateString()} at {new Date(call.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div className="text-slate-600 dark:text-slate-400 text-xs mt-1">
                                      {call.duration} min · {call.type}
                                    </div>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${call.type === 'incoming'
                                      ? 'border-green-600 text-green-600 dark:border-green-400 dark:text-green-400'
                                      : call.type === 'outgoing'
                                        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                        : 'border-red-600 text-red-600 dark:border-red-400 dark:text-red-400'
                                      }`}
                                  >
                                    {call.type}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </CollapsibleContent>
                </div>
              </Card>
            </Collapsible>

            {/* Friend List Widget - Collapsible */}
            <Collapsible open={friendsOpen} onOpenChange={setFriendsOpen}>
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="p-6 space-y-4">
                  <CollapsibleTrigger className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100 transition-colors w-full text-slate-700 dark:text-slate-300">
                    <ChevronDown className={`transition-transform ${friendsOpen ? '' : '-rotate-90'}`} size={16} />
                    <Heart className="text-pink-600 dark:text-pink-400" size={18} />
                    <h3 className="text-slate-900 dark:text-slate-100">Friends</h3>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-2 pr-4">
                        {(currentAccount.friends || []).length === 0 ? (
                          <div className="text-center text-slate-500 dark:text-slate-400 py-8 text-sm">
                            No friends added yet
                          </div>
                        ) : (
                          (currentAccount.friends || []).map((friend) => {
                            // Find the full classroom data
                            const friendClassroom = classrooms.find(c => c.id === friend.classroomId);

                            return (
                              <div
                                key={friend.id}
                                className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-650 transition-colors group cursor-pointer"
                                onClick={() => {
                                  if (friendClassroom) {
                                    handleClassroomClick(friendClassroom);
                                  }
                                }}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="text-slate-900 dark:text-slate-100">{friend.classroomName}</div>
                                    <div className="text-slate-600 dark:text-slate-400 text-xs mt-1 flex items-center gap-1">
                                      <MapPin size={12} />
                                      {friend.location}
                                    </div>
                                    {friend.lastConnected && (
                                      <div className="text-slate-600 dark:text-slate-400 text-xs mt-1">
                                        Last connected: {new Date(friend.lastConnected).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation(); // Prevent opening the dialog when removing
                                      removeFriend(friend.id);
                                    }}
                                    className="text-red-600 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Remove friend"
                                  >
                                    <Heart size={16} fill="currentColor" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </CollapsibleContent>
                </div>
              </Card>
            </Collapsible>

            {/* Classrooms List Widget - Collapsible */}
            <Collapsible open={classroomsOpen} onOpenChange={setClassroomsOpen}>
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="p-6 space-y-4">
                  <CollapsibleTrigger className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100 transition-colors w-full text-slate-700 dark:text-slate-300">
                    <ChevronDown className={`transition-transform ${classroomsOpen ? '' : '-rotate-90'}`} size={16} />
                    <Search className="text-purple-600 dark:text-purple-400" size={18} />
                    <h3 className="text-slate-900 dark:text-slate-100">Find Classrooms</h3>
                  </CollapsibleTrigger>

                  <CollapsibleContent>

                    <Input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name, location, or interest..."
                      className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                    />

                    <ScrollArea className="h-96">
                      <div className="space-y-3 pr-4">
                        {filteredClassrooms.map((classroom) => (
                          <button
                            key={classroom.id}
                            onClick={() => handleClassroomClick(classroom)}
                            className={`w-full p-4 rounded-lg border transition-all ${selectedClassroom?.id === classroom.id
                              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400'
                              : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-650 hover:border-slate-300 dark:hover:border-slate-500'
                              }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Relevancy Indicator */}
                              <div
                                className={`w-3 h-3 rounded-full mt-1 ${classroom.relevancy.color}`}
                                title={`Relevancy: ${classroom.relevancy.level}`}
                              ></div>

                              <div className="flex-1 text-left space-y-1">
                                {/* Name */}
                                <div className="text-slate-900 dark:text-slate-100">{classroom.name}</div>

                                {/* Location */}
                                <div className="text-slate-600 dark:text-slate-400 text-xs">{classroom.location}</div>

                                {/* Matching Interests */}
                                {classroom.relevancy.matchingInterests.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {classroom.relevancy.matchingInterests.map((interest) => (
                                      <Badge
                                        key={interest}
                                        variant="outline"
                                        className="text-xs border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                                      >
                                        {interest}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}

                        {filteredClassrooms.length === 0 && (
                          <div className="text-center text-slate-500 dark:text-slate-400 py-8">
                            No classrooms found matching your criteria
                          </div>
                        )}
                      </div>
                    </ScrollArea>

                    {/* Legend */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="text-slate-600 dark:text-slate-400 text-xs">Relevancy Legend:</div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span className="text-slate-700 dark:text-slate-300">Perfect</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          <span className="text-slate-700 dark:text-slate-300">Good</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          <span className="text-slate-700 dark:text-slate-300">Partial</span>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Card>
            </Collapsible>
          </TabsContent>

          <TabsContent value="account" className="flex-1 m-0 p-6 space-y-6 overflow-y-auto">
            {/* Account Location Management */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-slate-900 dark:text-slate-100 font-medium">Account Location</h3>
                  <button
                    onClick={() => {
                      if (editingAccountLocation) {
                        // Save location changes
                        if (selectedLocation) {
                          // Update all classrooms with new coordinates
                          const updatedAccounts = accounts.map(account => ({
                            ...account,
                            location: selectedLocation.name,
                            x: selectedLocation.longitude,
                            y: selectedLocation.latitude,
                          }));
                          
                          // Update each account
                          updatedAccounts.forEach(account => {
                            onAccountUpdate(account);
                          });
                          
                          toast.success('Location updated for all classrooms');
                        }
                        setEditingAccountLocation(false);
                        setSelectedLocation(null);
                      } else {
                        setEditingAccountLocation(true);
                      }
                    }}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500"
                  >
                    {editingAccountLocation ? 'Save' : <Edit2 size={16} />}
                  </button>
                </div>

                {editingAccountLocation ? (
                  <div className="space-y-3">
                    <LocationAutocomplete
                      label="Account Location"
                      placeholder="Search for your location..."
                      value={selectedLocation}
                      onChange={setSelectedLocation}
                      id="account-location"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      This will update the location for all your classrooms. Current: {currentAccount.location}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <MapPin size={16} />
                      <span>{currentAccount.location}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      All your classrooms are located at this address. Change this to update the location for all classrooms.
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Account Statistics */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="p-6 space-y-4">
                <h3 className="text-slate-900 dark:text-slate-100 font-medium">Account Overview</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{accounts.length}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Classrooms</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {accounts.reduce((total, acc) => total + (acc.friends?.length || 0), 0)}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Total Friends</div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="feed" className="flex-1 m-0 p-6 space-y-6 overflow-y-auto">
            <FeedPanel
              currentUserName={currentAccount.classroomName}
              currentUserId={currentAccount.id}
              allPosts={allPosts}
              myPosts={myPosts}
              onCreatePost={onCreatePost}
              onLikePost={onLikePost}
              likedPosts={likedPosts}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Classroom Detail Dialog */}
      <ClassroomDetailDialog
        classroom={detailDialogClassroom}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        mySchedule={currentAccount.schedule}
        friendshipStatus={detailDialogClassroom ? getFriendshipStatus(detailDialogClassroom.id) : 'none'}
        onToggleFriend={toggleFriendRequest}
      />

      {/* Delete Classroom Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-slate-100">Delete Classroom?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
              Are you sure you want to delete <span className="font-semibold">{currentAccount.classroomName}</span>? This action cannot be undone. All classroom data, including interests, schedule, and connections will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Classroom Dialog */}
      <Dialog open={createClassroomDialogOpen} onOpenChange={setCreateClassroomDialogOpen}>
        <DialogContent className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">Create New Classroom</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Classroom Name</Label>
              <Input
                value={newClassroomData.name}
                onChange={(e) => setNewClassroomData({ ...newClassroomData, name: e.target.value })}
                placeholder="e.g. Science Class 101"
                className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Number of Students</Label>
              <Input
                type="number"
                value={newClassroomData.size}
                onChange={(e) => setNewClassroomData({ ...newClassroomData, size: parseInt(e.target.value) || 0 })}
                min={1}
                className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Description</Label>
              <Textarea
                value={newClassroomData.description}
                onChange={(e) => setNewClassroomData({ ...newClassroomData, description: e.target.value })}
                placeholder="Tell us about your classroom..."
                className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Your new classroom will be created at: <span className="font-medium text-slate-700 dark:text-slate-300">{currentAccount.location}</span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateClassroomDialogOpen(false)}
              className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={submitCreateClassroom}
              className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
            >
              Create Classroom
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}