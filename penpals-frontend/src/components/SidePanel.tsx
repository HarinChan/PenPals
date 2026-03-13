import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { ChevronRight, ChevronLeft, User, BookOpen, Calendar, Search, Phone, Heart, MessageCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Account, Classroom } from '../types';
import { ClassroomService, MeetingsService } from '../services';
import { ApiClient } from '../services/api';
import type { MeetingDto } from '../services/meetings';
import { FriendsService } from '../services/friends';

import ClassroomDetailDialog from './ClassroomDetailDialog';
import FeedPanel from './FeedPanel';
import { Post } from './PostCreator';
import { toast } from 'sonner';
import MeetingDetailsDialog from './MeetingDetailsDialog';

import ClassroomSwitcher from './sidepanel/ClassroomSwitcher';
import AccountInfo from './sidepanel/AccountInfo';
import InterestsWidget from './sidepanel/InterestsWidget';
import ScheduleWidget from './sidepanel/ScheduleWidget';
import UpcomingMeetingsWidget from './sidepanel/UpcomingMeetingsWidget';
import PublicMeetingsWidget from './sidepanel/PublicMeetingsWidget';
import InvitationsWidget from './sidepanel/InvitationsWidget';
import RecentCallsWidget from './sidepanel/RecentCallsWidget';
import FriendsWidget from './sidepanel/FriendsWidget';
import FriendRequestsWidget from './sidepanel/FriendRequestsWidget';
import ClassroomsList from './sidepanel/ClassroomsList';
import MessagingPanel from './MessagingPanel';



interface SidePanelProps {
  selectedClassroom?: Classroom;
  onClassroomSelect: (classroom: Classroom) => void;
  currentAccount: Account;
  accounts: Account[];
  classrooms: Classroom[];
  onAccountChange: (accountId: string) => void;
  onAccountUpdate: (account: Account) => void;
  onAccountCreate: (account: Account) => void;
  onAccountDelete: (accountId: string) => void;
  // Feed props
  allPosts: Post[];
  myPosts: Post[];
  onCreatePost: (content: string, files?: File[]) => Promise<void> | void;
  onDeletePost: (postId: string) => void;
  loadingPosts?: boolean;
}

export default function SidePanel({
  selectedClassroom,
  onClassroomSelect,
  currentAccount,
  accounts,
  classrooms,
  onAccountChange,
  onAccountUpdate,
  onAccountCreate,
  onAccountDelete,
  // Feed props
  allPosts,
  myPosts,
  onCreatePost,
  onDeletePost,
  loadingPosts = false,
}: SidePanelProps) {
  const [detailDialogClassroom, setDetailDialogClassroom] = useState<Classroom | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<number | null>(null);
  const [meetingDetailsOpen, setMeetingDetailsOpen] = useState(false);

  const [upcomingMeetings, setUpcomingMeetings] = useState<any[]>([]);
  const [receivedInvitations, setReceivedInvitations] = useState<any[]>([]);
  const [sentInvitations, setSentInvitations] = useState<any[]>([]);
  const [trendingMeetings, setTrendingMeetings] = useState<MeetingDto[]>([]);

  // Create Classroom Dialog State
  const [createClassroomDialogOpen, setCreateClassroomDialogOpen] = useState(false);
  const [newClassroomData, setNewClassroomData] = useState({
    name: '',
    size: 20,
    description: '',
    avatar: '',
  });

  // Resize logic
  const [width, setWidth] = useState(384);
  const [isResizing, setIsResizing] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);

  const fetchMeetings = async () => {
    try {
      const data = await MeetingsService.getUpcoming();
      setUpcomingMeetings(data.meetings);
    } catch (err) {
      console.error("Failed to fetch meetings", err);
    }
  };

  const fetchPublicMeetings = async () => {
    try {
      const trendingData = await MeetingsService.getTrendingMeetings();
      setTrendingMeetings(trendingData.meetings || []);
    } catch (err) {
      console.error("Failed to fetch public meetings", err);
    }
  };

  const fetchInvitations = async () => {
    try {
      const [receivedData, sentData] = await Promise.all([
        ApiClient.get('/webex/invitations'),
        ApiClient.get('/webex/invitations/sent'),
      ]);
      setReceivedInvitations(receivedData.invitations);
      setSentInvitations(sentData.sent_invitations);
    } catch (err) {
      console.error("Failed to fetch invitations", err);
    }
  };

  const refreshMeetingWidgets = useCallback(() => {
    fetchMeetings();
    fetchInvitations();
    fetchPublicMeetings();
  }, [currentAccount.id]);

  useEffect(() => {
    refreshMeetingWidgets();
    const interval = setInterval(() => {
      refreshMeetingWidgets();
    }, 60000);
    return () => clearInterval(interval);
  }, [refreshMeetingWidgets]);

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

  const handleAcceptInvitation = async (invitationId: number) => {
    try {
      const data = await ApiClient.post(`/webex/invitations/${invitationId}/accept`);
      const message = data.meeting?.web_link
        ? `Meeting invitation accepted! Meeting link: ${data.meeting.web_link}`
        : "Meeting invitation accepted! The meeting has been created.";
      toast.success(message);
      fetchInvitations();
      fetchMeetings();
    } catch (err: any) {
      console.error("Failed to accept invitation", err);
      toast.error(err.message || "Error accepting invitation");
    }
  };

  const handleDeclineInvitation = async (invitationId: number) => {
    try {
      await ApiClient.post(`/webex/invitations/${invitationId}/decline`);
      toast.success("Invitation declined");
      fetchInvitations();
    } catch (err: any) {
      console.error("Failed to decline invitation", err);
      toast.error(err.message || "Error declining invitation");
    }
  };

  const handleCancelInvitation = async (invitationId: number) => {
    try {
      await ApiClient.post(`/webex/invitations/${invitationId}/cancel`);
      toast.success("Invitation cancelled");
      fetchInvitations();
    } catch (err: any) {
      console.error("Failed to cancel invitation", err);
      toast.error(err.message || "Error cancelling invitation");
    }
  };

  const handleCancelPublicMeeting = async (meeting: MeetingDto) => {
    if (!confirm('Cancel this public meeting?')) {
      return;
    }

    try {
      const response = await MeetingsService.cancelMeeting(meeting.id);
      toast.success(response.msg || 'Meeting cancelled');
      fetchMeetings();
      fetchInvitations();
      fetchPublicMeetings();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to cancel meeting');
    }
  };

  const saveAccountInfo = async (formData: {
    classroomName: string;
    location: string;
    size: number;
    description: string;
    avatar: string;
  }) => {
    const duplicateName = accounts.some(
      acc => acc.id !== currentAccount.id && acc.classroomName === formData.classroomName
    );

    if (duplicateName) {
      toast.error('A classroom with this name already exists. Please choose a different name.');
      return;
    }

    try {
      const numericId = Number(currentAccount.id);
      await ClassroomService.updateClassroom(numericId, {
        name: formData.classroomName,
        class_size: formData.size,
        description: formData.description,
        avatar: formData.avatar
      });

      onAccountUpdate({
        ...currentAccount,
        ...formData,
      });
      toast.success('Classroom information saved');
    } catch (error: any) {
      console.error('Failed to save classroom settings:', error);
      toast.error(error.message || 'Failed to update classroom');
    }
  };

  const createNewAccount = () => {
    if (accounts.length >= 12) {
      return;
    }

    setNewClassroomData({
      name: '',
      size: 20,
      description: 'Classroom managed by: ',
      avatar: '',
    });
    setCreateClassroomDialogOpen(true);
  };

  const submitCreateClassroom = async () => {
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

      const classroomResponse = await ClassroomService.createClassroom({
        name: newClassroomData.name.trim(),
        location: currentAccount.location,
        latitude: currentAccount.y.toString(),
        longitude: currentAccount.x.toString(),
        class_size: newClassroomData.size,
        description: newClassroomData.description.trim() || undefined,
        interests: [],
      });

      const backendClassroom = classroomResponse.classroom;

      const newAccount: Account = {
        id: String(backendClassroom.id),
        classroomName: backendClassroom.name,
        location: backendClassroom.location || currentAccount.location,
        size: backendClassroom.class_size || 20,
        description: newClassroomData.description,
        interests: backendClassroom.interests || [],
        schedule: {},
        // Use coordinates from backend or fallback to current
        x: backendClassroom.longitude ? parseFloat(backendClassroom.longitude) : currentAccount.x,
        y: backendClassroom.latitude ? parseFloat(backendClassroom.latitude) : currentAccount.y,
        recentCalls: [],
        friends: [],
        receivedFriendRequests: [],
        notifications: [],
      };

      onAccountCreate(newAccount);
      setCreateClassroomDialogOpen(false);
      toast.success('New classroom created!');
    } catch (err: any) {
      console.error(err);
      toast.error('Error creating classroom: ' + (err.message || 'Unknown error'));
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

  const openClassroomDetails = (classroom: Classroom) => {
    setDetailDialogClassroom(classroom);
    setShowDetailDialog(true);
  };

  const handleClassroomClick = (classroom: Classroom) => {
    if (selectedClassroom?.id !== classroom.id) {
      onClassroomSelect(classroom);
    }
    openClassroomDetails(classroom);
  };

  useEffect(() => {
    if (selectedClassroom) {
      openClassroomDetails(selectedClassroom);
    }
  }, [selectedClassroom]);



  // ...

  const removeFriend = async (friendId: string) => {
    try {
      await FriendsService.removeFriend(friendId);

      const updatedFriends = (currentAccount.friends || []).filter(f => f.classroomId !== friendId && f.id !== friendId);
      onAccountUpdate({ ...currentAccount, friends: updatedFriends });
      toast.success('Removed friend');
    } catch (error) {
      console.error("Failed to remove friend", error);
      toast.error("Failed to remove friend");
    }
  };

  const addFriend = async (classroom: Classroom) => {
    try {
      await FriendsService.sendRequest(classroom.id);

      // Optimistically update local state to show sent request immediately
      const newSentRequest: FriendRequest = {
        id: `temp-${Date.now()}`, // Temporary ID
        fromClassroomId: currentAccount.id,
        fromClassroomName: currentAccount.classroomName,
        toClassroomId: classroom.id,
        toClassroomName: classroom.name,
        timestamp: new Date(),
        location: classroom.location,
        status: 'pending'
      };

      onAccountUpdate({
        ...currentAccount,
        sentFriendRequests: [...(currentAccount.sentFriendRequests || []), newSentRequest]
      });

      toast.success(`Friend request sent to ${classroom.name}`);

    } catch (error: any) {
      console.error("Failed to send friend request", error);
      toast.error(error.message || "Failed to send request");
      
      // Revert optimistic update on error
      onAccountUpdate({
        ...currentAccount,
        sentFriendRequests: (currentAccount.sentFriendRequests || []).filter(r => !r.id.startsWith('temp-'))
      });
    }
  };

  const getFriendshipStatus = (classroomId: string): 'none' | 'pending' | 'accepted' | 'received' => {
    // Check accepted friends
    const friend = (currentAccount.friends || []).find(f => f.classroomId === classroomId);
    if (friend) return 'accepted';

    // Check if we received a request from them (support both field names)
    const received = (currentAccount.receivedFriendRequests || []).find(r => 
      (r.fromClassroomId === classroomId.toString()) || (r.senderId === classroomId.toString())
    );
    if (received) return 'received';

    // Check if we sent a request to them
    const sent = (currentAccount.sentFriendRequests || []).find(r => 
      r.toClassroomId === classroomId.toString()
    );
    if (sent) return 'pending';

    return 'none';
  };

  // Improved toggle function
  const toggleFriendRequest = (classroom: Classroom) => {
    const status = getFriendshipStatus(classroom.id);

    if (status === 'accepted') {
      // Confirm before deleting?
      if (confirm(`Remove ${classroom.name} from friends?`)) {
        removeFriend(classroom.id);
      }
    } else if (status === 'received') {
      // Accept request
      acceptFriendRequest(classroom.id);
    } else {
      // Send request
      addFriend(classroom);
    }
  };

  const acceptFriendRequest = async (senderId: string, requestId?: string) => {
    try {
      await FriendsService.acceptRequest(requestId, senderId);

      // Find the request to get sender details
      const request = (currentAccount.receivedFriendRequests || []).find(r => 
        ((r.fromClassroomId === senderId || r.senderId === senderId) || r.id === requestId)
      );

      // Remove from requests (support both field names)
      const updatedRequests = (currentAccount.receivedFriendRequests || []).filter(r => 
        (r.fromClassroomId !== senderId && r.senderId !== senderId) && r.id !== requestId
      );

      // Add to friends list
      const newFriend = {
        id: senderId,
        classroomId: senderId,
        classroomName: request?.senderName || request?.fromClassroomName || 'Unknown',
        location: request?.location || request?.fromLocation || '',
        addedDate: new Date().toISOString(),
        friendshipStatus: 'accepted'
      };

      const updatedFriends = [...(currentAccount.friends || []), newFriend];

      onAccountUpdate({ 
        ...currentAccount, 
        receivedFriendRequests: updatedRequests,
        friends: updatedFriends
      });

      toast.success("Friend request accepted!");

    } catch (error) {
      console.error("Failed to accept request", error);
      toast.error("Failed to accept request");
    }
  };

  const rejectFriendRequest = async (senderId: string, requestId?: string) => {
    try {
      await FriendsService.rejectRequest(requestId, senderId);
      const updatedRequests = (currentAccount.receivedFriendRequests || []).filter(r => 
        (r.fromClassroomId !== senderId && r.senderId !== senderId) && r.id !== requestId
      );
      onAccountUpdate({ ...currentAccount, receivedFriendRequests: updatedRequests });
      toast.success("Friend request rejected");
    } catch (error) {
      console.error("Failed to reject request", error);
      toast.error("Failed to reject request");
    }
  }

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await FriendsService.markNotificationRead(notificationId);
      const updatedNotifications = (currentAccount.notifications || []).map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      );
      onAccountUpdate({ ...currentAccount, notifications: updatedNotifications });
    } catch (e) { console.error(e); }
  };

  const clearNotification = async (notificationId: string) => {
    try {
      await FriendsService.deleteNotification(notificationId);
      const updatedNotifications = (currentAccount.notifications || []).filter(n => n.id !== notificationId);
      onAccountUpdate({ ...currentAccount, notifications: updatedNotifications });
    } catch (e) {
      console.error(e);
      // optimistic remove anyway
      const updatedNotifications = (currentAccount.notifications || []).filter(n => n.id !== notificationId);
      onAccountUpdate({ ...currentAccount, notifications: updatedNotifications });
    }
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
                value="messages"
                className="text-slate-700 dark:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm rounded-md"
              >
                Messages
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
            <ClassroomSwitcher
              accounts={accounts}
              currentAccount={currentAccount}
              onAccountChange={onAccountChange}
              onCreateNew={createNewAccount}
              onDelete={handleDeleteClassroom}
            />

            <AccountInfo
              currentAccount={currentAccount}
              accounts={accounts}
              onSave={saveAccountInfo}
            />

            <InterestsWidget
              currentAccount={currentAccount}
              onAccountUpdate={onAccountUpdate}
            />

            <ScheduleWidget
              currentAccount={currentAccount}
              onAccountUpdate={onAccountUpdate}
            />

            <UpcomingMeetingsWidget
              upcomingMeetings={upcomingMeetings}
              onMeetingClick={(meetingId) => {
                setSelectedMeetingId(meetingId);
                setMeetingDetailsOpen(true);
              }}
            />

            <PublicMeetingsWidget
              trendingMeetings={trendingMeetings}
              currentAccountId={currentAccount.id}
              onMeetingClick={(meetingId: number) => {
                setSelectedMeetingId(meetingId);
                setMeetingDetailsOpen(true);
              }}
              onCancelMeeting={handleCancelPublicMeeting}
            />

            <InvitationsWidget
              receivedInvitations={receivedInvitations}
              sentInvitations={sentInvitations}
              onAcceptInvitation={handleAcceptInvitation}
              onDeclineInvitation={handleDeclineInvitation}
              onCancelInvitation={handleCancelInvitation}
            />

            <RecentCallsWidget
              currentAccount={currentAccount}
              classrooms={classrooms}
              onCallClick={handleClassroomClick}
            />

            <FriendRequestsWidget
              currentAccount={currentAccount}
              classrooms={classrooms}
              onAcceptRequest={acceptFriendRequest}
              onRejectRequest={rejectFriendRequest}
              onClassroomClick={handleClassroomClick}
            />

            <FriendsWidget
              currentAccount={currentAccount}
              classrooms={classrooms}
              onFriendClick={handleClassroomClick}
              onRemoveFriend={removeFriend}
            />

            <ClassroomsList
              classrooms={classrooms}
              currentAccount={currentAccount}
              selectedClassroom={selectedClassroom}
              onClassroomClick={handleClassroomClick}
            />
          </TabsContent>


          <TabsContent value="messages" className="flex-1 m-0 p-0 overflow-hidden">
            <div className="h-full p-6">
              <MessagingPanel currentAccount={currentAccount} />
            </div>
          </TabsContent>

          <TabsContent value="feed" className="flex-1 m-0 p-6 space-y-6 overflow-y-auto">
            <FeedPanel
              currentUserName={currentAccount.classroomName}
              currentUserId={currentAccount.id}
              currentUserAvatar={currentAccount.avatar}
              allPosts={allPosts}
              myPosts={myPosts}
              onCreatePost={onCreatePost}
              onDeletePost={onDeletePost}
              isLoading={loadingPosts}
              currentAccount={currentAccount}
              classrooms={classrooms}
              onAccountUpdate={onAccountUpdate}
            />
          </TabsContent>


        </Tabs>
      )}

      {/* Classroom Detail Dialog */}
      <ClassroomDetailDialog
        classroom={detailDialogClassroom}
        open={showDetailDialog}
        onOpenChange={(open) => {
          setShowDetailDialog(open);
          if (!open) {
            onClassroomSelect(null as any);
          }
        }}
        mySchedule={currentAccount.schedule}
        friendshipStatus={detailDialogClassroom ? getFriendshipStatus(detailDialogClassroom.id) : 'none'}
        onToggleFriend={toggleFriendRequest}
        accountLon={currentAccount.x}
        onMeetingCreated={refreshMeetingWidgets}
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
              onClick={submitCreateClassroom}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Create Classroom
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <MeetingDetailsDialog
        meetingId={selectedMeetingId}
        open={meetingDetailsOpen}
        onOpenChange={setMeetingDetailsOpen}
        onMeetingUpdated={refreshMeetingWidgets}
      />
    </div>
  );
}