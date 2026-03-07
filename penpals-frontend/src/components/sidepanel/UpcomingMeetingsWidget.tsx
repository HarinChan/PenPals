import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ChevronDown, Video, Clock } from 'lucide-react';
import { formatMeetingDateTime } from './helpers';

interface UpcomingMeetingsWidgetProps {
  upcomingMeetings: any[];
  onMeetingClick: (meetingId: number) => void;
}

export default function UpcomingMeetingsWidget({
  upcomingMeetings,
  onMeetingClick,
}: UpcomingMeetingsWidgetProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="p-6 space-y-4">
          <CollapsibleTrigger className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100 transition-colors w-full text-slate-700 dark:text-slate-300">
            <ChevronDown className={`transition-transform ${isOpen ? '' : '-rotate-90'}`} size={16} />
            <Video className="text-purple-600 dark:text-purple-400" size={18} />
            <h3 className="text-slate-900 dark:text-slate-100">Upcoming Meetings</h3>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <ScrollArea className="h-48">
              <div className="space-y-2 pr-4">
                {upcomingMeetings.length === 0 ? (
                  <div className="text-center text-slate-500 dark:text-slate-400 py-8 text-sm">
                    No upcoming meetings
                  </div>
                ) : (
                  upcomingMeetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      onClick={() => onMeetingClick(meeting.id)}
                      className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-650 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-slate-900 dark:text-slate-100 font-medium text-sm">{meeting.title}</div>
                          <div className="text-slate-600 dark:text-slate-400 text-xs mt-1 flex items-center gap-2">
                            <Clock size={12} />
                            {formatMeetingDateTime(meeting.start_time)}
                          </div>
                          <div className="text-slate-600 dark:text-slate-400 text-xs mt-1">
                            Host: {meeting.creator_name}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            meeting.web_link && window.open(meeting.web_link, '_blank');
                          }}
                          disabled={!meeting.web_link}
                          className="h-7 text-xs bg-green-600 hover:bg-green-700 ml-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Join
                        </Button>
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
  );
}
