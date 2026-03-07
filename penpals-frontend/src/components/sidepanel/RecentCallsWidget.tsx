import { useState } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ChevronDown, Phone, Clock } from 'lucide-react';
import { Account, RecentCall, Classroom } from '../../types';

interface RecentCallsWidgetProps {
  currentAccount: Account;
  classrooms: Classroom[];
  onCallClick: (classroom: Classroom) => void;
}

export default function RecentCallsWidget({
  currentAccount,
  classrooms,
  onCallClick,
}: RecentCallsWidgetProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="p-6 space-y-4">
          <CollapsibleTrigger className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100 transition-colors w-full text-slate-700 dark:text-slate-300">
            <ChevronDown className={`transition-transform ${isOpen ? '' : '-rotate-90'}`} size={16} />
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
                    const callClassroom = classrooms.find(c => c.id === call.classroomId);

                    return (
                      <div
                        key={call.id}
                        className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-650 transition-colors cursor-pointer"
                        onClick={() => {
                          if (callClassroom) {
                            onCallClick(callClassroom);
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
  );
}
