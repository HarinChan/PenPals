import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ChevronDown, Calendar } from 'lucide-react';
import { Account } from '../../types';
import { DAYS } from './constants';
import { formatScheduleToString, formatScheduleRanges, parseScheduleInput } from './helpers';
import { ClassroomService } from '../../services';
import { toast } from 'sonner';

interface ScheduleWidgetProps {
  currentAccount: Account;
  onAccountUpdate: (account: Account) => void;
}

export default function ScheduleWidget({
  currentAccount,
  onAccountUpdate,
}: ScheduleWidgetProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [scheduleInputs, setScheduleInputs] = useState<{ [day: string]: string }>({});

  useEffect(() => {
    if (showEditor) {
      const inputs: { [day: string]: string } = {};
      DAYS.forEach(day => {
        inputs[day] = formatScheduleToString(currentAccount.schedule[day]);
      });
      setScheduleInputs(inputs);
    }
  }, [showEditor, currentAccount.id]);

  const handleScheduleInputChange = (day: string, value: string) => {
    setScheduleInputs(prev => ({ ...prev, [day]: value }));
  };

  const handleScheduleInputBlur = async (day: string) => {
    const value = scheduleInputs[day] || '';
    const newSchedule = parseScheduleInput(value);
    const previousSchedule = currentAccount.schedule;

    // Optimistic update
    onAccountUpdate({
      ...currentAccount,
      schedule: { ...currentAccount.schedule, [day]: newSchedule },
    });

    setScheduleInputs(prev => ({
      ...prev,
      [day]: formatScheduleToString(newSchedule)
    }));

    // Persist to backend — convert schedule dict to the API's availability format
    try {
      const fullSchedule = { ...currentAccount.schedule, [day]: newSchedule };
      const availability = Object.entries(fullSchedule).flatMap(([d, hours]) =>
        (hours || []).map(hour => ({ day: d, time: `${hour}:00` }))
      );
      await ClassroomService.updateClassroom(Number(currentAccount.id), { availability });
      toast.success('Schedule saved');
    } catch (error) {
      console.error('Failed to save schedule:', error);
      toast.error('Failed to save schedule');
      // Rollback optimistic update
      onAccountUpdate({ ...currentAccount, schedule: previousSchedule });
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
            <button
              onClick={() => setShowEditor(!showEditor)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500"
            >
              {showEditor ? 'Save' : 'Edit'}
            </button>
          </div>

          <CollapsibleContent>
            {showEditor ? (
              <ScrollArea className="h-80">
                <div className="space-y-4 pr-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Enter available hours (0-23) separated by commas or ranges. Example: "9, 10, 14-16"
                  </p>
                  {DAYS.map((day) => (
                    <div key={day} className="space-y-1">
                      <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">{day}</Label>
                      <Input
                        value={scheduleInputs[day] ?? ''}
                        onChange={(e) => handleScheduleInputChange(day, e.target.value)}
                        onBlur={() => handleScheduleInputBlur(day)}
                        placeholder="e.g. 9-12, 14, 15"
                        className="h-8 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                      />
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
