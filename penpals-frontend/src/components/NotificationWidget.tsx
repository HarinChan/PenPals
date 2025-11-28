import { Card } from './ui/card';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Bell, ChevronDown, UserPlus, UserCheck, Heart, MessageSquare, Quote, X } from 'lucide-react';
import { Notification } from './SidePanel';

interface NotificationWidgetProps {
  notifications: Notification[];
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  onMarkAsRead: (id: string) => void;
  onClearNotification: (id: string) => void;
}

export default function NotificationWidget({
  notifications,
  isOpen,
  onToggle,
  onMarkAsRead,
  onClearNotification,
}: NotificationWidgetProps) {
  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'friend_request_received':
        return <UserPlus size={16} className="text-blue-600 dark:text-blue-400" />;
      case 'friend_request_accepted':
        return <UserCheck size={16} className="text-green-600 dark:text-green-400" />;
      case 'post_likes':
        return <Heart size={16} className="text-red-600 dark:text-red-400" />;
      case 'friend_posted':
        return <MessageSquare size={16} className="text-purple-600 dark:text-purple-400" />;
      case 'post_quoted':
        return <Quote size={16} className="text-orange-600 dark:text-orange-400" />;
      default:
        return <Bell size={16} className="text-slate-600 dark:text-slate-400" />;
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="p-6 space-y-4">
          <CollapsibleTrigger className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100 transition-colors w-full text-slate-700 dark:text-slate-300">
            <ChevronDown className={`transition-transform ${isOpen ? '' : '-rotate-90'}`} size={16} />
            <Bell className="text-blue-600 dark:text-blue-400" size={18} />
            <h3 className="text-slate-900 dark:text-slate-100">Notifications</h3>
            {unreadCount > 0 && (
              <span className="ml-auto bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </CollapsibleTrigger>

          <CollapsibleContent>
            <ScrollArea className="h-96">
              <div className="space-y-2 pr-4">
                {notifications.length === 0 ? (
                  <div className="text-center text-slate-500 dark:text-slate-400 py-8 text-sm">
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border transition-colors group ${
                        notification.read
                          ? 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600'
                          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      }`}
                      onClick={() => !notification.read && onMarkAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-slate-900 dark:text-slate-100">
                            {notification.message}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {formatTimestamp(notification.timestamp)}
                          </div>
                          {notification.link && (
                            <button
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle link click
                              }}
                            >
                              View post
                            </button>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            onClearNotification(notification.id);
                          }}
                        >
                          <X size={14} />
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
