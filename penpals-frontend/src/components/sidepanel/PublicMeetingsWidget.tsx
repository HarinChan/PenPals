import { useState } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ChevronDown, Users, Clock } from 'lucide-react';
import type { MeetingDto } from '../../services/meetings';
import { formatMeetingDateTime } from './helpers';

interface PublicMeetingsWidgetProps {
  trendingMeetings: MeetingDto[];
  currentAccountId: string;
  onMeetingClick: (meetingId: number) => void;
  onCancelMeeting: (meeting: MeetingDto) => void;
}

export default function PublicMeetingsWidget({
  trendingMeetings,
  currentAccountId,
  onMeetingClick,
  onCancelMeeting,
}: PublicMeetingsWidgetProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="p-6 space-y-4">
          <CollapsibleTrigger className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100 transition-colors w-full text-slate-700 dark:text-slate-300 mb-4">
            <ChevronDown className={`transition-transform ${isOpen ? '' : '-rotate-90'}`} size={16} />
            <Users className="text-indigo-600 dark:text-indigo-400" size={18} />
            <h3 className="text-slate-900 dark:text-slate-100">Public Meetings</h3>
            {trendingMeetings.length > 0 && (
              <Badge className="ml-2 bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                {trendingMeetings.length}
              </Badge>
            )}
          </CollapsibleTrigger>

          <CollapsibleContent>
            <ScrollArea className="h-52">
              <div className="space-y-2 pr-4">
                {trendingMeetings.length === 0 ? (
                  <div className="text-center text-slate-500 dark:text-slate-400 py-8 text-sm">
                    No public meetings available
                  </div>
                ) : (
                  trendingMeetings.map((meeting) => {
                    const isMeetingHost = String(meeting.creator_id) === String(currentAccountId);
                    const canOpenDirectly = !!meeting.web_link && !!meeting.is_participant;
                    const isJoinDisabled = !isMeetingHost && !canOpenDirectly && !!meeting.is_full;

                    return (
                      <div
                        key={meeting.id}
                        onClick={() => onMeetingClick(meeting.id)}
                        className="p-3 rounded-lg border bg-indigo-50 dark:bg-slate-700 border-indigo-200 dark:border-slate-600 cursor-pointer hover:bg-indigo-100 dark:hover:bg-slate-650"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="text-slate-900 dark:text-slate-100 font-medium text-sm">{meeting.title}</div>
                            <div className="text-slate-600 dark:text-slate-400 text-xs mt-1 flex items-center gap-2">
                              <Clock size={12} />
                              {formatMeetingDateTime(meeting.start_time)}
                            </div>
                            <div className="text-slate-600 dark:text-slate-400 text-xs mt-1">
                              Host: {meeting.creator_name}
                            </div>
                            <div className="text-slate-600 dark:text-slate-400 text-xs mt-1">
                              Participants: {meeting.participant_count}
                              {meeting.max_participants ? ` / ${meeting.max_participants}` : ''}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={(event: React.MouseEvent) => {
                              event.stopPropagation();
                              if (isMeetingHost) {
                                onCancelMeeting(meeting);
                              } else {
                                onMeetingClick(meeting.id);
                              }
                            }}
                            disabled={isJoinDisabled}
                            className={`h-7 text-xs ${isMeetingHost
                              ? 'bg-red-600 hover:bg-red-700'
                              : 'bg-green-600 hover:bg-green-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {isMeetingHost
                              ? 'Cancel'
                              : canOpenDirectly
                                ? 'Open'
                                : meeting.is_full
                                  ? 'Full'
                                  : 'Join'}
                          </Button>
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
