import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ChevronDown, UserPlus, Check, X } from 'lucide-react';
import { Account } from '../../types';

interface FriendRequestsWidgetProps {
  currentAccount: Account;
  onAcceptRequest: (senderId: string, requestId?: string) => void;
  onRejectRequest: (senderId: string, requestId?: string) => void;
}

export default function FriendRequestsWidget({
  currentAccount,
  onAcceptRequest,
  onRejectRequest,
}: FriendRequestsWidgetProps) {
  const [isOpen, setIsOpen] = useState(true);
  const requests = currentAccount.receivedFriendRequests || [];

  if (requests.length === 0) {
    return null; // Don't show widget if no requests
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="p-6 space-y-4">
          <CollapsibleTrigger className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100 transition-colors w-full text-slate-700 dark:text-slate-300">
            <ChevronDown className={`transition-transform ${isOpen ? '' : '-rotate-90'}`} size={16} />
            <UserPlus className="text-blue-600 dark:text-blue-400" size={18} />
            <h3 className="text-slate-900 dark:text-slate-100">Friend Requests</h3>
            <span className="ml-auto bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
              {requests.length}
            </span>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <ScrollArea className="max-h-64">
              <div className="space-y-2 pr-4">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-slate-900 dark:text-slate-100 font-medium truncate">
                          {request.fromClassroomName}
                        </div>
                        {request.fromLocation && (
                          <div className="text-slate-600 dark:text-slate-400 text-xs mt-1">
                            {request.fromLocation}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => onAcceptRequest(request.fromClassroomId, request.id)}
                          className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700"
                          title="Accept"
                        >
                          <Check size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onRejectRequest(request.fromClassroomId, request.id)}
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Reject"
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CollapsibleContent>
        </div>
      </Card>
    </Collapsible>
  );
}
