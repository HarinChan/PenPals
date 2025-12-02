import { useState, useEffect } from 'react';
import { Clock, Edit2, Check } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

const TIMEZONES = [
  { label: 'UTC', value: 'UTC' },
  { label: 'Eastern (ET)', value: 'America/New_York' },
  { label: 'Central (CT)', value: 'America/Chicago' },
  { label: 'Mountain (MT)', value: 'America/Denver' },
  { label: 'Pacific (PT)', value: 'America/Los_Angeles' },
  { label: 'Alaska (AKT)', value: 'America/Anchorage' },
  { label: 'Hawaii (HST)', value: 'Pacific/Honolulu' },
  { label: 'London (GMT)', value: 'Europe/London' },
  { label: 'Paris (CET)', value: 'Europe/Paris' },
  { label: 'Berlin (CET)', value: 'Europe/Berlin' },
  { label: 'Moscow (MSK)', value: 'Europe/Moscow' },
  { label: 'Dubai (GST)', value: 'Asia/Dubai' },
  { label: 'Mumbai (IST)', value: 'Asia/Kolkata' },
  { label: 'Bangkok (ICT)', value: 'Asia/Bangkok' },
  { label: 'Singapore (SGT)', value: 'Asia/Singapore' },
  { label: 'Hong Kong (HKT)', value: 'Asia/Hong_Kong' },
  { label: 'Tokyo (JST)', value: 'Asia/Tokyo' },
  { label: 'Seoul (KST)', value: 'Asia/Seoul' },
  { label: 'Sydney (AEDT)', value: 'Australia/Sydney' },
  { label: 'Auckland (NZDT)', value: 'Pacific/Auckland' },
];

export default function TimezoneClock() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timezone, setTimezone] = useState(() => {
    // Initialize with device timezone
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  });
  const [isEditing, setIsEditing] = useState(false);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Format time in military format (24-hour)
  const formatTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format date
  const formatDate = () => {
    return currentTime.toLocaleDateString('en-US', {
      timeZone: timezone,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get timezone abbreviation
  const getTimezoneAbbr = () => {
    const selectedTz = TIMEZONES.find(tz => tz.value === timezone);
    if (selectedTz) {
      // Extract abbreviation from label (e.g., "Eastern (ET)" -> "ET")
      const match = selectedTz.label.match(/\(([^)]+)\)/);
      return match ? match[1] : timezone.split('/')[1] || timezone;
    }
    return timezone.split('/')[1] || timezone;
  };

  return (
    <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 shadow-lg">
      <div className="flex items-center gap-3">
        <Clock className="text-blue-600 dark:text-blue-400" size={18} />
        
        <div className="flex flex-col">
          <div className="text-slate-900 dark:text-slate-100 text-xl tabular-nums">
            {formatTime()}
          </div>
          <div className="text-slate-600 dark:text-slate-400 text-xs flex items-center gap-2">
            <span>{formatDate()}</span>
            <span>•</span>
            <span>{getTimezoneAbbr()}</span>
          </div>
        </div>

        {isEditing ? (
          <div className="flex items-center gap-2">
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="w-[180px] bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 max-h-[300px]">
                {TIMEZONES.map((tz) => (
                  <SelectItem
                    key={tz.value}
                    value={tz.value}
                    className="text-slate-900 dark:text-slate-100 text-xs"
                  >
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={() => setIsEditing(false)}
              className="p-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
            >
              <Check size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <Edit2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}