import { useState, useMemo } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ChevronDown, Phone, Clock } from 'lucide-react';
import { formatMeetingTimeRange } from './helpers';

interface InvitationsWidgetProps {
  receivedInvitations: any[];
  sentInvitations: any[];
  onAcceptInvitation: (invitationId: number) => void;
  onDeclineInvitation: (invitationId: number) => void;
  onCancelInvitation: (invitationId: number) => void;
}

export default function InvitationsWidget({
  receivedInvitations,
  sentInvitations,
  onAcceptInvitation,
  onDeclineInvitation,
  onCancelInvitation,
}: InvitationsWidgetProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

  const groupedSentInvitations = useMemo(() => {
    const groups = new Map<string, {
      key: string;
      meetingId: number | null;
      title: string;
      start_time: string;
      end_time: string;
      invitations: any[];
    }>();

    sentInvitations.forEach((invitation) => {
      const groupKey = invitation.meeting_id ? `meeting-${invitation.meeting_id}` : `inv-${invitation.id}`;
      const existing = groups.get(groupKey);
      if (existing) {
        existing.invitations.push(invitation);
      } else {
        groups.set(groupKey, {
          key: groupKey,
          meetingId: invitation.meeting_id ?? null,
          title: invitation.title,
          start_time: invitation.start_time,
          end_time: invitation.end_time,
          invitations: [invitation],
        });
      }
    });

    return Array.from(groups.values());
  }, [sentInvitations]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="p-6 space-y-4">
          <CollapsibleTrigger className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100 transition-colors w-full text-slate-700 dark:text-slate-300 mb-4">
            <ChevronDown className={`transition-transform ${isOpen ? '' : '-rotate-90'}`} size={16} />
            <Phone className="text-blue-600 dark:text-blue-400" size={18} />
            <h3 className="text-slate-900 dark:text-slate-100">Meeting Invitations</h3>
            {(activeTab === 'received' ? receivedInvitations.length : groupedSentInvitations.length) > 0 && (
              <Badge className="ml-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {activeTab === 'received' ? receivedInvitations.length : groupedSentInvitations.length}
              </Badge>
            )}
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="flex gap-2 mb-4">
              <Button
                size="sm"
                variant={activeTab === 'received' ? 'default' : 'outline'}
                onClick={() => setActiveTab('received')}
                className="flex-1 h-8 text-xs"
              >
                Received
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'sent' ? 'default' : 'outline'}
                onClick={() => setActiveTab('sent')}
                className="flex-1 h-8 text-xs"
              >
                Sent
              </Button>
            </div>

            <ScrollArea className="h-48">
              <div className="space-y-2 pr-4">
                {activeTab === 'received' ? (
                  <>
                    {receivedInvitations.length === 0 ? (
                      <div className="text-center text-slate-500 dark:text-slate-400 py-8 text-sm">
                        No incoming invitations
                      </div>
                    ) : (
                      receivedInvitations.map((invitation) => (
                        <div
                          key={invitation.id}
                          className="p-3 rounded-lg border bg-green-50 dark:bg-slate-700 border-green-200 dark:border-slate-600"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="text-slate-900 dark:text-slate-100 font-medium text-sm">{invitation.title}</div>
                              <div className="text-slate-600 dark:text-slate-400 text-xs mt-1 flex items-center gap-2">
                                <Clock size={12} />
                                {formatMeetingTimeRange(invitation.start_time, invitation.end_time)}
                              </div>
                              <div className="text-slate-600 dark:text-slate-400 text-xs mt-1">
                                From: {invitation.sender_name}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              onClick={() => onAcceptInvitation(invitation.id)}
                              className="flex-1 h-7 text-xs bg-green-600 hover:bg-green-700"
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-7 text-xs"
                              onClick={() => onDeclineInvitation(invitation.id)}
                            >
                              Decline
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </>
                ) : (
                  <>
                    {groupedSentInvitations.length === 0 ? (
                      <div className="text-center text-slate-500 dark:text-slate-400 py-8 text-sm">
                        No pending outgoing invitations
                      </div>
                    ) : (
                      groupedSentInvitations.map((group) => (
                        <div
                          key={group.key}
                          className="p-3 rounded-lg border bg-amber-50 dark:bg-slate-700 border-amber-200 dark:border-slate-600"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="text-slate-900 dark:text-slate-100 font-medium text-sm">{group.title}</div>
                              <div className="text-slate-600 dark:text-slate-400 text-xs mt-1 flex items-center gap-2">
                                <Clock size={12} />
                                {formatMeetingTimeRange(group.start_time, group.end_time)}
                              </div>
                              <div className="text-slate-600 dark:text-slate-400 text-xs mt-1">
                                Invited classrooms: {group.invitations.length}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 space-y-1">
                            {group.invitations.map((invitation) => (
                              <div key={invitation.id} className="flex items-center justify-between gap-2 rounded border border-amber-200 dark:border-slate-600 px-2 py-1">
                                <span className="text-xs text-slate-700 dark:text-slate-300 truncate">{invitation.receiver_name}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                                  onClick={() => onCancelInvitation(invitation.id)}
                                >
                                  Withdraw
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </CollapsibleContent>
        </div>
      </Card>
    </Collapsible>
  );
}
