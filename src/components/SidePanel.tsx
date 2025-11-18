import { useState, useMemo } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Search, Calendar, BookOpen, Plus, User, MapPin, Users, Edit2, ChevronDown, ChevronRight, ChevronLeft, Phone, Heart, Clock } from 'lucide-react';
import type { Classroom } from './MapView';
import { classrooms } from './MapView';
import ClassroomDetailDialog from './ClassroomDetailDialog';
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

export interface RecentCall {
  id: string;
  classroomId: string;
  classroomName: string;
  timestamp: Date;
  duration: number; // in minutes
  type: 'incoming' | 'outgoing' | 'missed';
}

export interface Friend {
  id: string;
  classroomId: string;
  classroomName: string;
  location: string;
  addedDate: Date;
  lastConnected?: Date;
}

export interface Account {
  id: string;
  classroomName: string;
  location: string;
  size: number;
  description: string;
  interests: string[];
  schedule: { [day: string]: number[] };
  x: number;
  y: number;
  recentCalls?: RecentCall[];
  friends?: Friend[];
}

interface SidePanelProps {
  selectedClassroom?: Classroom;
  onClassroomSelect: (classroom: Classroom) => void;
  currentAccount: Account;
  accounts: Account[];
  onAccountChange: (accountId: string) => void;
  onAccountUpdate: (account: Account) => void;
  onAccountCreate: (account: Account) => void;
}

export default function SidePanel({
  selectedClassroom,
  onClassroomSelect,
  currentAccount,
  accounts,
  onAccountChange,
  onAccountUpdate,
  onAccountCreate,
}: SidePanelProps) {
  const [customInterest, setCustomInterest] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [editingAccount, setEditingAccount] = useState(false);
  const [detailDialogClassroom, setDetailDialogClassroom] = useState<Classroom | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Collapsible widget states
  const [accountInfoOpen, setAccountInfoOpen] = useState(true);
  const [interestsOpen, setInterestsOpen] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(true);
  const [classroomsOpen, setClassroomsOpen] = useState(true);
  const [recentCallsOpen, setRecentCallsOpen] = useState(true);
  const [friendsOpen, setFriendsOpen] = useState(true);

  const [accountForm, setAccountForm] = useState({
    classroomName: currentAccount.classroomName,
    location: currentAccount.location,
    size: currentAccount.size,
    description: currentAccount.description,
  });

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
    onAccountUpdate({
      ...currentAccount,
      ...accountForm,
    });
    setEditingAccount(false);
  };

  const createNewAccount = () => {
    const newAccount: Account = {
      id: `account-${Date.now()}`,
      classroomName: 'New Classroom',
      location: 'Unknown',
      size: 10,
      description: '',
      interests: [],
      schedule: {},
      x: Math.random() * 80 + 10,
      y: Math.random() * 60 + 20,
    };
    onAccountCreate(newAccount);
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

  const removeFriend = (friendId: string) => {
    const updatedFriends = (currentAccount.friends || []).filter(f => f.id !== friendId);
    onAccountUpdate({ ...currentAccount, friends: updatedFriends });
  };

  const addFriend = (classroom: Classroom) => {
    const newFriend: Friend = {
      id: `friend-${Date.now()}`,
      classroomId: classroom.id,
      classroomName: classroom.name,
      location: classroom.location,
      addedDate: new Date(),
    };
    const updatedFriends = [...(currentAccount.friends || []), newFriend];
    onAccountUpdate({ ...currentAccount, friends: updatedFriends });
  };

  const isFriend = (classroomId: string) => {
    return (currentAccount.friends || []).some(f => f.classroomId === classroomId);
  };

  return (
    <div className={`h-full bg-white border-l border-slate-200 overflow-y-auto transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-96'}`}>
      {/* Collapse Toggle Button */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        {!sidebarCollapsed && <span className="text-slate-900">Controls</span>}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-600 hover:text-slate-900"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {sidebarCollapsed ? (
        // Collapsed view with icons only
        <div className="p-4 space-y-4 flex flex-col items-center">
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
        <div className="p-6 space-y-6">
        {/* Account Switcher */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="text-purple-600" size={18} />
                <h3 className="text-slate-900">Account</h3>
              </div>
              <button
                onClick={createNewAccount}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus size={16} />
              </button>
            </div>

            <Select value={currentAccount.id} onValueChange={onAccountChange}>
              <SelectTrigger className="bg-slate-50 border-slate-300 text-slate-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-300">
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id} className="text-slate-900">
                    {account.classroomName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Account Information - Collapsible */}
        <Collapsible open={accountInfoOpen} onOpenChange={setAccountInfoOpen}>
          <Card className="bg-white border-slate-200 shadow-sm">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <CollapsibleTrigger className="flex items-center gap-2 hover:text-slate-900 transition-colors text-slate-700">
                  <ChevronDown className={`transition-transform ${accountInfoOpen ? '' : '-rotate-90'}`} size={16} />
                  <h3 className="text-slate-900">Classroom Information</h3>
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
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {editingAccount ? 'Save' : <Edit2 size={16} />}
                </button>
              </div>

              <CollapsibleContent>

            {editingAccount ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-slate-700">Classroom Name</Label>
                  <Input
                    value={accountForm.classroomName}
                    onChange={(e) => setAccountForm({ ...accountForm, classroomName: e.target.value })}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-700">Location</Label>
                  <Input
                    value={accountForm.location}
                    onChange={(e) => setAccountForm({ ...accountForm, location: e.target.value })}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-700">Class Size</Label>
                  <Input
                    type="number"
                    value={accountForm.size}
                    onChange={(e) => setAccountForm({ ...accountForm, size: parseInt(e.target.value) || 0 })}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-700">Description</Label>
                  <Textarea
                    value={accountForm.description}
                    onChange={(e) => setAccountForm({ ...accountForm, description: e.target.value })}
                    className="bg-white border-slate-300 text-slate-900"
                    rows={3}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-700">
                  <MapPin size={16} />
                  <span>{currentAccount.location}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Users size={16} />
                  <span>{currentAccount.size} students</span>
                </div>
                {currentAccount.description && (
                  <p className="text-slate-700 text-sm">{currentAccount.description}</p>
                )}
              </div>
            )}
              </CollapsibleContent>
            </div>
          </Card>
        </Collapsible>

        {/* Interests Widget - Collapsible */}
        <Collapsible open={interestsOpen} onOpenChange={setInterestsOpen}>
          <Card className="bg-white border-slate-200 shadow-sm">
            <div className="p-6 space-y-4">
              <CollapsibleTrigger className="flex items-center gap-2 hover:text-slate-900 transition-colors w-full text-slate-700">
                <ChevronDown className={`transition-transform ${interestsOpen ? '' : '-rotate-90'}`} size={16} />
                <BookOpen className="text-blue-600" size={18} />
                <h3 className="text-slate-900">Your Interests & Subjects</h3>
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
                      className="text-slate-900 cursor-pointer"
                    >
                      {subject}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex gap-2 pt-2 border-t border-slate-200">
              <Input
                type="text"
                value={customInterest}
                onChange={(e) => setCustomInterest(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCustomInterest()}
                placeholder="Add custom interest..."
                className="flex-1 bg-white border-slate-300 text-slate-900"
              />
              <button
                onClick={addCustomInterest}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                <Plus size={16} className="text-white" />
              </button>
            </div>

            {currentAccount.interests.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
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
          <Card className="bg-white border-slate-200 shadow-sm">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <CollapsibleTrigger className="flex items-center gap-2 hover:text-slate-900 transition-colors text-slate-700">
                  <ChevronDown className={`transition-transform ${scheduleOpen ? '' : '-rotate-90'}`} size={16} />
                  <Calendar className="text-green-600" size={18} />
                  <h3 className="text-slate-900">Your Availability</h3>
                </CollapsibleTrigger>
                <button
                  onClick={() => setShowScheduleEditor(!showScheduleEditor)}
                  className="text-sm text-blue-600 hover:text-blue-700"
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
                      <div className="text-slate-700">{day}</div>
                      <div className="grid grid-cols-8 gap-1">
                        {HOURS.map((hour) => {
                          const isSelected = currentAccount.schedule[day]?.includes(hour);
                          return (
                            <button
                              key={hour}
                              onClick={() => toggleScheduleSlot(day, hour)}
                              className={`p-1 text-xs rounded transition-colors ${
                                isSelected
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                      <span className="text-slate-600 w-12">{day}:</span>
                      <span className="text-slate-900">
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
          <Card className="bg-white border-slate-200 shadow-sm">
            <div className="p-6 space-y-4">
              <CollapsibleTrigger className="flex items-center gap-2 hover:text-slate-900 transition-colors w-full text-slate-700">
                <ChevronDown className={`transition-transform ${recentCallsOpen ? '' : '-rotate-90'}`} size={16} />
                <Phone className="text-orange-600" size={18} />
                <h3 className="text-slate-900">Recent Calls</h3>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2 pr-4">
                    {(currentAccount.recentCalls || []).length === 0 ? (
                      <div className="text-center text-slate-500 py-8 text-sm">
                        No recent calls
                      </div>
                    ) : (
                      (currentAccount.recentCalls || []).map((call) => (
                        <div
                          key={call.id}
                          className="p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="text-slate-900">{call.classroomName}</div>
                              <div className="text-slate-600 text-xs mt-1 flex items-center gap-2">
                                <Clock size={12} />
                                {new Date(call.timestamp).toLocaleDateString()} at {new Date(call.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <div className="text-slate-600 text-xs mt-1">
                                {call.duration} min · {call.type}
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                call.type === 'incoming'
                                  ? 'border-green-600 text-green-600'
                                  : call.type === 'outgoing'
                                  ? 'border-blue-600 text-blue-600'
                                  : 'border-red-600 text-red-600'
                              }`}
                            >
                              {call.type}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CollapsibleContent>
            </div>
          </Card>
        </Collapsible>

        {/* Friend List Widget - Collapsible */}
        <Collapsible open={friendsOpen} onOpenChange={setFriendsOpen}>
          <Card className="bg-white border-slate-200 shadow-sm">
            <div className="p-6 space-y-4">
              <CollapsibleTrigger className="flex items-center gap-2 hover:text-slate-900 transition-colors w-full text-slate-700">
                <ChevronDown className={`transition-transform ${friendsOpen ? '' : '-rotate-90'}`} size={16} />
                <Heart className="text-pink-600" size={18} />
                <h3 className="text-slate-900">Friends</h3>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2 pr-4">
                    {(currentAccount.friends || []).length === 0 ? (
                      <div className="text-center text-slate-500 py-8 text-sm">
                        No friends added yet
                      </div>
                    ) : (
                      (currentAccount.friends || []).map((friend) => (
                        <div
                          key={friend.id}
                          className="p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="text-slate-900">{friend.classroomName}</div>
                              <div className="text-slate-600 text-xs mt-1 flex items-center gap-1">
                                <MapPin size={12} />
                                {friend.location}
                              </div>
                              {friend.lastConnected && (
                                <div className="text-slate-600 text-xs mt-1">
                                  Last connected: {new Date(friend.lastConnected).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => removeFriend(friend.id)}
                              className="text-red-600 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove friend"
                            >
                              <Heart size={16} fill="currentColor" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CollapsibleContent>
            </div>
          </Card>
        </Collapsible>

        {/* Classrooms List Widget - Collapsible */}
        <Collapsible open={classroomsOpen} onOpenChange={setClassroomsOpen}>
          <Card className="bg-white border-slate-200 shadow-sm">
            <div className="p-6 space-y-4">
              <CollapsibleTrigger className="flex items-center gap-2 hover:text-slate-900 transition-colors w-full text-slate-700">
                <ChevronDown className={`transition-transform ${classroomsOpen ? '' : '-rotate-90'}`} size={16} />
                <Search className="text-purple-600" size={18} />
                <h3 className="text-slate-900">Find Classrooms</h3>
              </CollapsibleTrigger>

              <CollapsibleContent>

            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, location, or interest..."
              className="bg-white border-slate-300 text-slate-900"
            />

            <ScrollArea className="h-96">
              <div className="space-y-3 pr-4">
                {filteredClassrooms.map((classroom) => (
                  <button
                    key={classroom.id}
                    onClick={() => handleClassroomClick(classroom)}
                    className={`w-full p-4 rounded-lg border transition-all ${
                      selectedClassroom?.id === classroom.id
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
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
                        <div className="text-slate-900">{classroom.name}</div>
                        
                        {/* Location */}
                        <div className="text-slate-600 text-xs">{classroom.location}</div>

                        {/* Matching Interests */}
                        {classroom.relevancy.matchingInterests.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {classroom.relevancy.matchingInterests.map((interest) => (
                              <Badge
                                key={interest}
                                variant="outline"
                                className="text-xs border-slate-300 text-slate-700"
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
                  <div className="text-center text-slate-500 py-8">
                    No classrooms found matching your criteria
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Legend */}
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <div className="text-slate-600 text-xs">Relevancy Legend:</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-slate-700">Perfect</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <span className="text-slate-700">Good</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-slate-700">Partial</span>
                </div>
              </div>
            </div>
              </CollapsibleContent>
            </div>
          </Card>
        </Collapsible>
        </div>
      )}

      {/* Classroom Detail Dialog */}
      <ClassroomDetailDialog
        classroom={detailDialogClassroom}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        mySchedule={currentAccount.schedule}
        isFriend={detailDialogClassroom ? isFriend(detailDialogClassroom.id) : false}
        onToggleFriend={(classroom) => {
          if (isFriend(classroom.id)) {
            const friendToRemove = currentAccount.friends?.find(f => f.classroomId === classroom.id);
            if (friendToRemove) removeFriend(friendToRemove.id);
          } else {
            addFriend(classroom);
          }
        }}
      />
    </div>
  );
}
