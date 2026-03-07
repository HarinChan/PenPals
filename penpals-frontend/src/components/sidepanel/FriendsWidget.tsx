import { useState } from 'react';
import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ChevronDown, Heart, MapPin } from 'lucide-react';
import { Account, Friend, Classroom } from '../../types';

interface FriendsWidgetProps {
  currentAccount: Account;
  classrooms: Classroom[];
  onFriendClick: (classroom: Classroom) => void;
  onRemoveFriend: (friendId: string) => void;
}

export default function FriendsWidget({
  currentAccount,
  classrooms,
  onFriendClick,
  onRemoveFriend,
}: FriendsWidgetProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="p-6 space-y-4">
          <CollapsibleTrigger className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100 transition-colors w-full text-slate-700 dark:text-slate-300">
            <ChevronDown className={`transition-transform ${isOpen ? '' : '-rotate-90'}`} size={16} />
            <Heart className="text-pink-600 dark:text-pink-400" size={18} />
            <h3 className="text-slate-900 dark:text-slate-100">Friends</h3>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <ScrollArea className="h-64">
              <div className="space-y-2 pr-4">
                {(currentAccount.friends || []).length === 0 ? (
                  <div className="text-center text-slate-500 dark:text-slate-400 py-8 text-sm">
                    No friends added yet
                  </div>
                ) : (
                  (currentAccount.friends || []).map((friend) => {
                    const friendClassroom = classrooms.find(c => c.id === friend.classroomId);

                    return (
                      <div
                        key={friend.id}
                        className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-650 transition-colors group cursor-pointer"
                        onClick={() => {
                          if (friendClassroom) {
                            onFriendClick(friendClassroom);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-slate-900 dark:text-slate-100">{friend.classroomName}</div>
                            <div className="text-slate-600 dark:text-slate-400 text-xs mt-1 flex items-center gap-1">
                              <MapPin size={12} />
                              {friend.location}
                            </div>
                            {friend.lastConnected && (
                              <div className="text-slate-600 dark:text-slate-400 text-xs mt-1">
                                Last connected: {new Date(friend.lastConnected).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveFriend(friend.id);
                            }}
                            className="text-red-600 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove friend"
                          >
                            <Heart size={16} fill="currentColor" />
                          </button>
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
