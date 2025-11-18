import { useState } from 'react';
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
import { Calendar, MapPin, Users, Phone, Clock, Heart } from 'lucide-react';
import type { Classroom } from './MapView';

interface ClassroomDetailDialogProps {
  classroom: Classroom | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mySchedule: { [day: string]: number[] };
  isFriend?: boolean;
  onToggleFriend?: (classroom: Classroom) => void;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CURRENT_HOUR = new Date().getHours();
const CURRENT_DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];

export default function ClassroomDetailDialog({
  classroom,
  open,
  onOpenChange,
  mySchedule,
  isFriend = false,
  onToggleFriend,
}: ClassroomDetailDialogProps) {
  const [showScheduleCall, setShowScheduleCall] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedHours, setSelectedHours] = useState<number[]>([]);

  if (!classroom) return null;

  // Check if classroom is currently available
  const isCurrentlyAvailable = () => {
    const classroomHours = classroom.availability[CURRENT_DAY] || [];
    return classroomHours.includes(CURRENT_HOUR);
  };

  // Get common available hours for a given day
  const getCommonHours = (day: string) => {
    const myHours = mySchedule[day] || [];
    const theirHours = classroom.availability[day] || [];
    return myHours.filter(hour => theirHours.includes(hour));
  };

  // Get all days with common availability
  const daysWithCommonAvailability = DAYS.filter(day => getCommonHours(day).length > 0);

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

  const confirmScheduleCall = () => {
    if (selectedHours.length > 0 && selectedHours.length <= 12) {
      alert(`Call scheduled for ${selectedDay} from ${selectedHours[0]}:00 to ${selectedHours[selectedHours.length - 1] + 1}:00`);
      setShowScheduleCall(false);
      setSelectedHours([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white border-slate-200 text-slate-900">
        <DialogHeader>
          <DialogTitle className="text-2xl text-slate-900">{classroom.name}</DialogTitle>
          <DialogDescription className="text-slate-600">
            Connect with this classroom to learn together
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[600px]">
          <div className="space-y-6 pr-4">
            {/* Basic Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-700">
                <MapPin size={16} />
                <span>{classroom.location}</span>
              </div>
              {classroom.size && (
                <div className="flex items-center gap-2 text-slate-700">
                  <Users size={16} />
                  <span>{classroom.size} students</span>
                </div>
              )}
            </div>

            {/* Description */}
            {classroom.description && (
              <div className="space-y-2">
                <h3 className="text-slate-900">About</h3>
                <p className="text-slate-700 text-sm">{classroom.description}</p>
              </div>
            )}

            {/* Interests */}
            <div className="space-y-2">
              <h3 className="text-slate-900">Interests & Subjects</h3>
              <div className="flex flex-wrap gap-2">
                {classroom.interests.map((interest) => (
                  <Badge key={interest} variant="secondary" className="bg-blue-600 text-white">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-2">
              <h3 className="text-slate-900 flex items-center gap-2">
                <Calendar size={16} />
                Availability Schedule
              </h3>
              <div className="bg-slate-50 rounded-lg p-4 space-y-2 border border-slate-200">
                {DAYS.map((day) => {
                  const hours = classroom.availability[day] || [];
                  if (hours.length === 0) return null;
                  return (
                    <div key={day} className="flex gap-2 text-sm">
                      <span className="text-slate-600 w-12">{day}:</span>
                      <span className="text-slate-900">
                        {hours[0]}:00 - {hours[hours.length - 1] + 1}:00
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Schedule Call Interface */}
            {showScheduleCall && (
              <div className="space-y-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h3 className="text-slate-900">Schedule a Call</h3>
                
                {daysWithCommonAvailability.length > 0 ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm text-slate-700">Select Day</label>
                      <div className="flex gap-2 flex-wrap">
                        {daysWithCommonAvailability.map((day) => (
                          <button
                            key={day}
                            onClick={() => {
                              setSelectedDay(day);
                              setSelectedHours([]);
                            }}
                            className={`px-3 py-1 rounded ${
                              selectedDay === day
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedDay && (
                      <div className="space-y-2">
                        <label className="text-sm text-slate-700">
                          Select Time (1-12 hours, both available)
                        </label>
                        <div className="grid grid-cols-8 gap-1">
                          {getCommonHours(selectedDay).map((hour) => (
                            <button
                              key={hour}
                              onClick={() => toggleHour(hour)}
                              className={`p-2 text-xs rounded ${
                                selectedHours.includes(hour)
                                  ? 'bg-green-600 text-white'
                                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                              }`}
                            >
                              {hour}:00
                            </button>
                          ))}
                        </div>
                        {selectedHours.length > 0 && (
                          <p className="text-xs text-slate-600">
                            Selected: {selectedHours.length} hour(s) - {selectedHours[0]}:00 to {selectedHours[selectedHours.length - 1] + 1}:00
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={confirmScheduleCall}
                        disabled={selectedHours.length === 0 || selectedHours.length > 12}
                        className="bg-green-600 hover:bg-green-700"
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
                        className="border-slate-300 text-slate-700"
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-slate-600 text-sm">
                    No common availability found. Please adjust your schedule or interests.
                  </p>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        {!showScheduleCall && (
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            {onToggleFriend && (
              <Button
                onClick={() => onToggleFriend(classroom)}
                variant="outline"
                className={`border-slate-300 ${isFriend ? 'text-pink-600 border-pink-500' : 'text-slate-700'}`}
              >
                <Heart size={16} className="mr-2" fill={isFriend ? 'currentColor' : 'none'} />
                {isFriend ? 'Unfriend' : 'Add Friend'}
              </Button>
            )}
            <Button
              onClick={handleScheduleCall}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Calendar size={16} className="mr-2" />
              Schedule Call
            </Button>
            <Button
              disabled={!isCurrentlyAvailable()}
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
