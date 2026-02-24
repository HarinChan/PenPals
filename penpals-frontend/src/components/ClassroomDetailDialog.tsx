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
import type { Classroom } from '../types';
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
const SCHEDULE_WINDOW_DAYS = 14;
const ALLOWED_DURATIONS = [15, 30, 45, 60];
const CURRENT_HOUR = new Date().getHours();
const CURRENT_DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];

// Helper function to get timezone from coordinates
import tzLookup from 'tz-lookup';

const getClassroomTimezone = (lat: number, lon: number): string => {
  try {
    return tzLookup(lat, lon);
  } catch (e) {
    console.error('Error looking up timezone:', e);
    return 'UTC'; // Fallback
  }
};

// Format time with timezone
const formatLocalTime = (timezone: string): string => {
  return new Date().toLocaleTimeString('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

// Format date with timezone
const formatLocalDate = (timezone: string): string => {
  return new Date().toLocaleDateString('en-US', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

// Convert UTC hour to local timezone hour
const convertUtcToLocalHour = (utcHour: number, timezone: string): number => {
  const date = new Date();
  date.setUTCHours(utcHour, 0, 0, 0);
  
  const localTimeString = date.toLocaleTimeString('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false,
  });
  
  return parseInt(localTimeString, 10);
};

// Convert availability hours from UTC to local timezone
const convertAvailabilityToLocal = (utcHours: number[]): number[] => {
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const converted = utcHours.map(hour => convertUtcToLocalHour(hour, userTimezone));
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
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [selectedStartMinutes, setSelectedStartMinutes] = useState<number | null>(null);
  const [localTime, setLocalTime] = useState<string>('');
  const [localDate, setLocalDate] = useState<string>('');

  // Update local time every second
  useEffect(() => {
    if (classroom) {
      const timezone = getClassroomTimezone(classroom.lat, classroom.lon);
      setLocalTime(formatLocalTime(timezone));
      setLocalDate(formatLocalDate(timezone));

      const interval = setInterval(() => {
        setLocalTime(formatLocalTime(timezone));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [classroom]);

  if (!classroom) return null;

  // Get classroom timezone for display
  const classroomTimezone = getClassroomTimezone(classroom.lat, classroom.lon);
  
  // Check if classroom is currently available
  const isCurrentlyAvailable = () => {
    const classroomHours = classroom.availability[CURRENT_DAY] || [];
    return classroomHours.includes(CURRENT_HOUR);
  };

  // Get classroom's local availability (converted from UTC to USER'S timezone)
  const getClassroomLocalAvailability = (day: string): number[] => {
    const utcHours = classroom.availability[day] || [];
    return convertAvailabilityToLocal(utcHours);
  };

  // Get common available hours accounting for timezone conversion
  const getCommonHours = (day: string) => {
    const myHours = mySchedule[day] || [];
    const theirLocalHours = getClassroomLocalAvailability(day);
    return myHours.filter(hour => theirLocalHours.includes(hour));
  };

  // Get all days with common availability
  const getDateOptions = () => {
    const now = new Date();
    const options: { value: string; label: string; day: string }[] = [];

    for (let offset = 0; offset <= SCHEDULE_WINDOW_DAYS; offset++) {
      const date = new Date(now);
      date.setDate(now.getDate() + offset);
      const day = getDayLabel(date);
      if (getCommonHours(day).length > 0) {
        options.push({
          value: toYmd(date),
          label: formatMeetingDay(date),
          day,
        });
      }
    }

    return options;
  };

  const dateOptions = getDateOptions();
  const selectedDateOption = dateOptions.find(option => option.value === selectedDate);
  const selectedDateDay = selectedDateOption?.day || '';
  const selectedDayCommonHours = selectedDateDay ? getCommonHours(selectedDateDay) : [];

  const timeBounds = selectedDayCommonHours.length > 0
    ? {
      minStart: selectedDayCommonHours[0] * 60,
      maxEnd: (selectedDayCommonHours[selectedDayCommonHours.length - 1] + 1) * 60,
    }
    : null;

  const getAllStartTimes = (): number[] => {
    if (!timeBounds) return [];
    const allTimes: number[] = [];
    for (let minutes = timeBounds.minStart; minutes < timeBounds.maxEnd; minutes += 15) {
      allTimes.push(minutes);
    }
    return allTimes;
  };

  const isTimeSelectable = (minutes: number): boolean => {
    if (!timeBounds) return false;
    return minutes + durationMinutes <= timeBounds.maxEnd;
  };

  const allStartTimes = getAllStartTimes();
  const hasValidTimeRange = allStartTimes.some(m => isTimeSelectable(m));

  // Get account timezone for display
  const accountTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const handleScheduleCall = () => {
    setShowScheduleCall(true);
    if (dateOptions.length > 0) {
      setSelectedDate(dateOptions[0].value);
      setDurationMinutes(30);
      const initialHours = getCommonHours(dateOptions[0].day);
      if (initialHours.length > 0) {
        setSelectedStartMinutes(initialHours[0] * 60);
      }
    }
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
    if (!selectedDate || selectedStartMinutes === null || !ALLOWED_DURATIONS.includes(durationMinutes)) {
      toast.error('Please select a valid date, start time, and duration.');
      return;
    }

    const targetDate = new Date(`${selectedDate}T00:00:00`);
    const now = new Date();
    const maxAllowedDate = new Date(now);
    maxAllowedDate.setDate(now.getDate() + SCHEDULE_WINDOW_DAYS);

    if (targetDate > maxAllowedDate) {
      toast.error('Meetings can be scheduled up to 2 weeks in advance.');
      return;
    }

    const startTime = new Date(targetDate);
    startTime.setHours(Math.floor(selectedStartMinutes / 60), selectedStartMinutes % 60, 0, 0);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    if (durationMinutes < 15 || durationMinutes > 60) {
      toast.error('Meeting duration must be between 15 and 60 minutes.');
      return;
    }

    toast.promise(createMeeting(`Call with ${classroom.name}`, startTime, endTime), {
      loading: 'Sending meeting invitation...',
      success: (data) => {
        if (data) {
          setShowScheduleCall(false);
          setSelectedStartMinutes(null);
          return `Meeting invitation sent to ${classroom.name}!`;
        }
        throw new Error('Failed');
      },
      error: 'Failed to send meeting invitation'
    });
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
                <span className="text-xs text-slate-500 dark:text-slate-500 ml-1">{classroomTimezone}</span>
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
                  Your timezone: {accountTimezone}
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

                {dateOptions.length > 0 ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm text-slate-700 dark:text-slate-300">Select Day (up to 2 weeks)</label>
                      <div className="flex gap-2 flex-wrap">
                        {dateOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setSelectedDate(option.value);
                              const nextHours = getCommonHours(option.day);
                              setSelectedStartMinutes(nextHours.length > 0 ? nextHours[0] * 60 : null);
                            }}
                            className={`px-3 py-1 rounded ${selectedDate === option.value
                              ? 'bg-blue-600 dark:bg-blue-700 text-white'
                              : 'bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-500 border border-slate-300 dark:border-slate-500'
                              }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedDate && timeBounds && (
                      <div className="space-y-3">
                        {/* Two-column grid for start time and duration */}
                        <div className="grid grid-cols-2 gap-4">
                          {/* Start Time Column */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              Start Time
                            </label>
                            {hasValidTimeRange ? (
                              <div className="grid grid-cols-2 gap-1">
                                {allStartTimes.map((minutes) => {
                                  const canSelect = isTimeSelectable(minutes);
                                  return (
                                    <button
                                      key={minutes}
                                      onClick={() => canSelect && setSelectedStartMinutes(minutes)}
                                      disabled={!canSelect}
                                      className={`p-2 text-xs rounded transition-colors ${
                                        selectedStartMinutes === minutes
                                          ? 'bg-green-600 dark:bg-green-700 text-white'
                                          : canSelect
                                            ? 'bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-500 border border-slate-300 dark:border-slate-500'
                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-600 cursor-not-allowed'
                                      }`}
                                    >
                                      {formatMinutes(minutes)}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                Selected duration does not fit this window.
                              </p>
                            )}
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Window: {formatMinutes(timeBounds.minStart)} - {formatMinutes(timeBounds.maxEnd)}
                            </p>
                          </div>

                          {/* Duration Column */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              Duration
                            </label>
                            <div className="grid grid-cols-2 gap-1">
                              {ALLOWED_DURATIONS.map((minutes) => (
                                <button
                                  key={minutes}
                                  onClick={() => {
                                    setDurationMinutes(minutes);
                                    if (timeBounds && selectedStartMinutes !== null) {
                                      const maxStart = timeBounds.maxEnd - minutes;
                                      if (selectedStartMinutes > maxStart) {
                                        setSelectedStartMinutes(maxStart);
                                      }
                                    }
                                  }}
                                  className={`p-2 text-xs rounded transition-colors ${
                                    durationMinutes === minutes
                                      ? 'bg-green-600 dark:bg-green-700 text-white'
                                      : 'bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-500 border border-slate-300 dark:border-slate-500'
                                  }`}
                                >
                                  {minutes}m
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Prominent Selected Summary */}
                        {selectedStartMinutes !== null && hasValidTimeRange && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {selectedDateOption?.label} • {formatMinutes(selectedStartMinutes)} - {formatMinutes(selectedStartMinutes + durationMinutes)}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              {durationMinutes} minute meeting
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={confirmScheduleCall}
                        disabled={!selectedDate || selectedStartMinutes === null || !hasValidTimeRange}
                        className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                      >
                        <Clock size={16} className="mr-2" />
                        Confirm Schedule
                      </Button>
                      <Button
                        onClick={() => {
                          setShowScheduleCall(false);
                          setSelectedStartMinutes(null);
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
