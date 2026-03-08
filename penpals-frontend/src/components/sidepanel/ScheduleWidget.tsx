import { useState } from 'react';
import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ChevronDown, Calendar } from 'lucide-react';
import { Account } from '../../types';
import { DAYS } from './constants';
import { formatScheduleRanges } from './helpers';
import { ClassroomService } from '../../services';
import { toast } from 'sonner';

interface ScheduleWidgetProps {
  currentAccount: Account;
  onAccountUpdate: (account: Account) => void;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7am to 6pm

export default function ScheduleWidget({
  currentAccount,
  onAccountUpdate,
}: ScheduleWidgetProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const toggleHour = (day: string, hour: number) => {
    const currentHours = currentAccount.schedule[day] || [];
    const newHours = currentHours.includes(hour)
      ? currentHours.filter(h => h !== hour)
      : [...currentHours, hour].sort((a, b) => a - b);
    
    onAccountUpdate({
      ...currentAccount,
      schedule: { ...currentAccount.schedule, [day]: newHours },
    });
  };

  const saveSchedule = async () => {
    setIsSaving(true);
    const previousSchedule = currentAccount.schedule;

    try {
      const availability = Object.entries(currentAccount.schedule).flatMap(([d, hours]) =>
        (hours || []).map(hour => ({ day: d, time: `${hour}:00` }))
      );
      await ClassroomService.updateClassroom(Number(currentAccount.id), { availability });
      toast.success('Schedule saved');
      setShowEditor(false);
    } catch (error) {
      console.error('Failed to save schedule:', error);
      toast.error('Failed to save schedule');
      onAccountUpdate({ ...currentAccount, schedule: previousSchedule });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-slate-700 dark:text-slate-300">
              <ChevronDown className={`transition-transform ${isOpen ? '' : '-rotate-90'}`} size={16} />
              <Calendar className="text-green-600 dark:text-green-400" size={18} />
              <h3 className="text-slate-900 dark:text-slate-100">Your Availability</h3>
            </CollapsibleTrigger>
            {showEditor ? (
              <button
                onClick={saveSchedule}
                disabled={isSaving}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            ) : (
              <button
                onClick={() => setShowEditor(true)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500"
              >
                Edit
              </button>
            )}
          </div>

          <CollapsibleContent>
            {showEditor ? (
              <ScrollArea className="h-80">
                <div className="space-y-3 pr-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    Click on time slots to mark your availability (7am - 6pm)
                  </p>
                  {DAYS.map((day) => (
                    <div key={day} className="flex items-center gap-2">
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300 w-10 flex-shrink-0">
                        {day}
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {HOURS.map((hour) => {
                          const isSelected = (currentAccount.schedule[day] || []).includes(hour);
                          return (
                            <button
                              key={hour}
                              onClick={() => toggleHour(day, hour)}
                              className={`w-8 h-8 text-xs rounded transition-all font-medium ${
                                !isSelected 
                                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600' 
                                  : '' 
                              }`}
                              style={
                                isSelected 
                                  ? { backgroundColor: '#4ade80', color: '#064e3b' }
                                  : {}
                              }
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
                {(() => {
                  const hasAvailability = Object.values(currentAccount.schedule).some(hours => hours && hours.length > 0);

                  if (!hasAvailability) {
                    return (
                      <div className="text-center text-slate-500 dark:text-slate-400 py-4 text-sm">
                        No availability yet
                      </div>
                    );
                  }

                  return DAYS.map((day) => {
                    const hours = currentAccount.schedule[day] || [];
                    if (hours.length === 0) return null;
                    return (
                      <div key={day} className="flex gap-2 text-sm">
                        <span className="text-slate-600 dark:text-slate-400 w-12">{day}:</span>
                        <span className="text-slate-900 dark:text-slate-100">
                          {formatScheduleRanges(hours)}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </CollapsibleContent>
        </div>
      </Card>
    </Collapsible>
  );
}
