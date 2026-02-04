import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Calendar, MapPin, Users, Phone, Clock, Heart, Globe } from 'lucide-react';
import type { Classroom } from './MapView';
import { toast } from 'sonner';

interface ClassroomDetailDialogProps {
  classroom: Classroom | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mySchedule: { [day: string]: number[] };
  friendshipStatus: 'none' | 'pending' | 'accepted' | 'received';
  onToggleFriend?: (classroom: Classroom) => void;
  accountLon?: number;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CURRENT_HOUR = new Date().getHours();
const CURRENT_DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];

// Helper function to estimate timezone offset from coordinates
const getTimezoneOffsetFromCoords = (lat: number, lon: number): number => {
  // Approximate timezone offset based on longitude
  // This is a simplified calculation; for production, use a proper timezone library
  const offset = Math.round(lon / 15);
  return offset;
};

// Format time with timezone offset (24-hour format)
const formatLocalTime = (lat: number, lon: number): string => {
  const now = new Date();
  const offset = getTimezoneOffsetFromCoords(lat, lon);
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  const localTime = new Date(utcTime + offset * 3600000);
  
  return localTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

// Format date with timezone
const formatLocalDate = (lat: number, lon: number): string => {
  const now = new Date();
  const offset = getTimezoneOffsetFromCoords(lat, lon);
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  const localTime = new Date(utcTime + offset * 3600000);
  
  return localTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

// Convert UTC hour to local timezone hour
const convertUtcToLocalHour = (utcHour: number, timezoneOffset: number): number => {
  const localHour = (utcHour + timezoneOffset + 24) % 24;
  return Math.floor(localHour);
};

// Convert availability hours from UTC to local timezone
const convertAvailabilityToLocal = (utcHours: number[], accountLon: number): number[] => {
  const timezoneOffset = getTimezoneOffsetFromCoords(0, accountLon);
  const converted = utcHours.map(hour => convertUtcToLocalHour(hour, timezoneOffset));
  // Remove duplicates and sort
  return [...new Set(converted)].sort((a, b) => a - b);
};

export default function ClassroomDetailDialog({
  classroom,
  open,
  onOpenChange,
  mySchedule,
  friendshipStatus = 'none',
  onToggleFriend,
  accountLon = 0,
}: ClassroomDetailDialogProps) {
  const [showScheduleCall, setShowScheduleCall] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedHours, setSelectedHours] = useState<number[]>([]);
  const [localTime, setLocalTime] = useState<string>('');
  const [localDate, setLocalDate] = useState<string>('');

  // Update local time every second
  useEffect(() => {
    if (classroom) {
      setLocalTime(formatLocalTime(classroom.lat, classroom.lon));
      setLocalDate(formatLocalDate(classroom.lat, classroom.lon));

      const interval = setInterval(() => {
        setLocalTime(formatLocalTime(classroom.lat, classroom.lon));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [classroom]);

  if (!classroom) return null;

  // Get classroom timezone offset for display
  const classroomTimezoneOffset = getTimezoneOffsetFromCoords(classroom.lat, classroom.lon);
  const classroomTimezoneLabel = classroomTimezoneOffset >= 0 ? `UTC+${classroomTimezoneOffset}` : `UTC${classroomTimezoneOffset}`;

  // Check if classroom is currently available
  const isCurrentlyAvailable = () => {
    const classroomHours = classroom.availability[CURRENT_DAY] || [];
    return classroomHours.includes(CURRENT_HOUR);
  };

  // Get classroom's local availability (converted from UTC using account's timezone)
  const getClassroomLocalAvailability = (day: string): number[] => {
    const utcHours = classroom.availability[day] || [];
    return convertAvailabilityToLocal(utcHours, accountLon);
  };

  // Get common available hours accounting for timezone conversion
  const getCommonHours = (day: string) => {
    const myHours = mySchedule[day] || [];
    const theirLocalHours = getClassroomLocalAvailability(day);
    return myHours.filter(hour => theirLocalHours.includes(hour));
  };

  // Get all days with common availability
  const daysWithCommonAvailability = DAYS.filter(day => getCommonHours(day).length > 0);

  // Get account timezone offset for display
  const accountTimezoneOffset = getTimezoneOffsetFromCoords(0, accountLon);
  const accountTimezoneLabel = accountTimezoneOffset >= 0 ? `UTC+${accountTimezoneOffset}` : `UTC${accountTimezoneOffset}`;

  const handleScheduleCall = () => {
    setShowScheduleCall(true);
    if (daysWithCommonAvailability.length > 0) {
      setSelectedDay(daysWithCommonAvailability[0]);
    }
  };

  const toggleHour = (hour: number) => {
    setSelectedHours(prev =>
      prev.includes(hour) ? prev.filter(h => h !== hour) : [...prev, hour].sort((a, b) => a - b)
    );
  };

  const createMeeting = async (title: string, start: Date | null, end: Date | null) => {
    try {
      const token = localStorage.getItem('penpals_token');
      if (!token) {
        toast.error("You must be logged in to schedule a meeting");
        return;
      }

      const response = await fetch('http://127.0.0.1:5001/api/webex/meeting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          start_time: start?.toISOString(),
          end_time: end?.toISOString(),
          classroom_id: classroom.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 403) {
          toast.error("Please connect WebEx in Account settings first");
          return null;
        }
        throw new Error(error.msg || 'Failed to schedule meeting');
      }

      const data = await response.json();
      return data.invitation;

    } catch (error: any) {
      toast.error(error.message);
      return null;
    }
  };

  const confirmScheduleCall = async () => {
    if (selectedHours.length > 0 && selectedHours.length <= 12) {
      // Calculate date
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const now = new Date();
      const currentDayIndex = now.getDay();
      const targetDayIndex = days.indexOf(selectedDay); // selectedDay is like 'Mon'

      let daysToAdd = targetDayIndex - currentDayIndex;
      if (daysToAdd <= 0) daysToAdd += 7;

      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + daysToAdd);

      // Start time
      const startTime = new Date(targetDate);
      startTime.setHours(selectedHours[0], 0, 0, 0);

      // End time (last hour + 1)
      const endTime = new Date(targetDate);
      endTime.setHours(selectedHours[selectedHours.length - 1] + 1, 0, 0, 0);

      // Create meeting invitation
      toast.promise(createMeeting(`Call with ${classroom.name}`, startTime, endTime), {
        loading: 'Sending meeting invitation...',
        success: (data) => {
          if (data) {
            setShowScheduleCall(false);
            setSelectedHours([]);
            return `Meeting invitation sent to ${classroom.name}!`;
          } else {
            throw new Error("Failed");
          }
        },
        error: 'Failed to send meeting invitation'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-2xl text-slate-900 dark:text-slate-100">{classroom.name}</DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400">
            Connect with this classroom to learn together
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[600px]">
          <div className="space-y-6 pr-4">


            {/* Basic Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <MapPin size={16} />
                <span>{classroom.location}</span>
              </div>
            {/* Local Time Bubble */}
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-slate-600 dark:text-slate-400" />
                <span className="text-xs text-slate-600 dark:text-slate-400">Local time:</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{localTime}</span>
                <span className="text-xs text-slate-500 dark:text-slate-500 ml-1">{classroomTimezoneLabel}</span>
                <span className="text-xs text-slate-600 dark:text-slate-400">({localDate})</span>
            </div>
              {classroom.size && (
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Users size={16} />
                  <span>{classroom.size} students</span>
                </div>
              )}
            </div>

            {/* Description */}
            {classroom.description && (
              <div className="space-y-2">
                <h3 className="text-slate-900 dark:text-slate-100">About</h3>
                <p className="text-slate-700 dark:text-slate-300 text-sm">{classroom.description}</p>
              </div>
            )}

            {/* Interests */}
            <div className="space-y-2">
              <h3 className="text-slate-900 dark:text-slate-100">Interests & Subjects</h3>
              <div className="flex flex-wrap gap-2">
                {classroom.interests.map((interest) => (
                  <Badge key={interest} variant="secondary" className="bg-blue-600 dark:bg-blue-700 text-white">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-2">
              <h3 className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Calendar size={16} />
                Availability Schedule (classroom local time)
              </h3>
              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 space-y-2 border border-slate-200 dark:border-slate-600">
                <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                  Your timezone: {accountTimezoneLabel}
                </div>
                {DAYS.map((day) => {
                  const hours = getClassroomLocalAvailability(day);
                  if (hours.length === 0) return null;
                  return (
                    <div key={day} className="flex gap-2 text-sm">
                      <span className="text-slate-600 dark:text-slate-400 w-12">{day}:</span>
                      <span className="text-slate-900 dark:text-slate-100">
                        {hours[0]}:00 - {hours[hours.length - 1] + 1}:00
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Schedule Call Interface */}
            {showScheduleCall && (
              <div className="space-y-4 bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                <h3 className="text-slate-900 dark:text-slate-100">Schedule a Call</h3>

                {daysWithCommonAvailability.length > 0 ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm text-slate-700 dark:text-slate-300">Select Day</label>
                      <div className="flex gap-2 flex-wrap">
                        {daysWithCommonAvailability.map((day) => (
                          <button
                            key={day}
                            onClick={() => {
                              setSelectedDay(day);
                              setSelectedHours([]);
                            }}
                            className={`px-3 py-1 rounded ${selectedDay === day
                              ? 'bg-blue-600 dark:bg-blue-700 text-white'
                              : 'bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-500 border border-slate-300 dark:border-slate-500'
                              }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedDay && (
                      <div className="space-y-2">
                        <label className="text-sm text-slate-700 dark:text-slate-300">
                          Select Time (1-12 hours, both available)
                        </label>
                        <div className="grid grid-cols-8 gap-1">
                          {getCommonHours(selectedDay).map((hour) => (
                            <button
                              key={hour}
                              onClick={() => toggleHour(hour)}
                              className={`p-2 text-xs rounded ${selectedHours.includes(hour)
                                ? 'bg-green-600 dark:bg-green-700 text-white'
                                : 'bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-500 border border-slate-300 dark:border-slate-500'
                                }`}
                            >
                              {hour}:00
                            </button>
                          ))}
                        </div>
                        {selectedHours.length > 0 && (
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Selected: {selectedHours.length} hour(s) - {selectedHours[0]}:00 to {selectedHours[selectedHours.length - 1] + 1}:00
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={confirmScheduleCall}
                        disabled={selectedHours.length === 0 || selectedHours.length > 12}
                        className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                      >
                        <Clock size={16} className="mr-2" />
                        Confirm Schedule
                      </Button>
                      <Button
                        onClick={() => {
                          setShowScheduleCall(false);
                          setSelectedHours([]);
                        }}
                        variant="outline"
                        className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    No common availability found. Please adjust your schedule or interests.
                  </p>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        {!showScheduleCall && (
          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            {onToggleFriend && (
              <Button
                onClick={() => onToggleFriend(classroom)}
                variant="outline"
                className={`border-slate-300 ${friendshipStatus === 'accepted'
                  ? 'text-pink-600 border-pink-500 dark:text-pink-400 dark:border-pink-400'
                  : friendshipStatus === 'pending'
                    ? 'text-yellow-600 border-yellow-500 dark:text-yellow-400 dark:border-yellow-400'
                    : friendshipStatus === 'received'
                      ? 'text-green-600 border-green-500 dark:text-green-400 dark:border-green-400'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
              >
                <Heart size={16} className="mr-2" fill={friendshipStatus === 'accepted' ? 'currentColor' : 'none'} />
                {friendshipStatus === 'accepted'
                  ? 'Unfriend'
                  : friendshipStatus === 'pending'
                    ? 'Cancel Request'
                    : friendshipStatus === 'received'
                      ? 'Accept Request'
                      : 'Send Friend Request'}
              </Button>
            )}
            <Button
              onClick={handleScheduleCall}
              className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              <Calendar size={16} className="mr-2" />
              Schedule Call
            </Button>
            <Button
              disabled={!isCurrentlyAvailable()}
              onClick={async () => {
                toast.promise(createMeeting(`Instant Call with ${classroom.name}`, null, null), {
                  loading: 'Starting call...',
                  success: (data) => {
                    if (data) {
                      window.open(data.web_link, '_blank');
                      return 'Call started in new tab';
                    }
                    throw new Error("Failed");
                  },
                  error: 'Failed to start call'
                });
              }}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              <Phone size={16} className="mr-2" />
              Call Now
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
