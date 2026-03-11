import { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { MessagingService, Conversation, Message } from '../services/messaging';
import { MessageCircle, Send, ArrowLeft, Loader2, MoreVertical, Pencil, Trash2, Smile } from 'lucide-react';
import { toast } from 'sonner';
import { Account } from '../types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';

interface MessagingPanelProps {
  currentAccount: Account;
}

export default function MessagingPanel({ currentAccount }: MessagingPanelProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef<number>(0);

  // Load conversations
  useEffect(() => {
    loadConversations();
  }, []);

  // Load messages when conversation selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  // Auto-scroll to bottom only when new messages are added (not on reactions/edits)
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading conversations...');
      const response = await MessagingService.getConversations();
      console.log('Conversations response:', response);
      setConversations(response.conversations || []);
    } catch (error: any) {
      console.error('Failed to load conversations:', error);
      console.error('Error details:', error.response || error.message);
      setError(error.message || 'Failed to load conversations');
      setConversations([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: number) => {
    try {
      // Load latest 30 messages
      const response = await MessagingService.getMessages(conversationId, 1, 30);
      // Reverse to show oldest first (newest at bottom)
      setMessages(response.messages.reverse());
      
      // Mark all as read
      await MessagingService.markAllRead(conversationId);
      
      // Update unread count in conversations list
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
      ));
    } catch (error: any) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    try {
      setSending(true);
      const response = await MessagingService.sendMessage(
        selectedConversation.id,
        newMessage.trim()
      );
      
      setMessages(prev => [...prev, response.message]);
      setNewMessage('');
      
      // Update last message in conversations list
      setConversations(prev => prev.map(conv => 
        conv.id === selectedConversation.id 
          ? { 
              ...conv, 
              lastMessage: {
                id: response.message.id,
                content: response.message.content,
                senderId: response.message.senderId,
                createdAt: response.message.createdAt,
                messageType: response.message.messageType
              },
              updatedAt: response.message.createdAt
            } 
          : conv
      ));
    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleStartConversation = async (friendId: string) => {
    try {
      const response = await MessagingService.startConversation(parseInt(friendId));
      
      // Check if conversation already exists
      const existing = conversations.find(c => c.id === response.conversation.id);
      if (!existing) {
        setConversations(prev => [response.conversation, ...prev]);
      }
      
      setSelectedConversation(response.conversation);
    } catch (error: any) {
      console.error('Failed to start conversation:', error);
      toast.error('Failed to start conversation');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleEditMessage = async (messageId: number) => {
    if (!editContent.trim()) return;

    try {
      console.log('Editing message:', messageId, 'with content:', editContent);
      const response = await MessagingService.editMessage(messageId, editContent.trim());
      console.log('Edit response:', response);
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: editContent.trim(), editedAt: new Date().toISOString() }
          : msg
      ));
      setEditingMessageId(null);
      setEditContent('');
      toast.success('Message updated');
    } catch (error: any) {
      console.error('Failed to edit message:', error);
      toast.error(error.message || 'Failed to edit message');
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    try {
      console.log('Deleting message:', messageId);
      const response = await MessagingService.deleteMessage(messageId);
      console.log('Delete response:', response);
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: '[Message deleted]', deleted: true }
          : msg
      ));
      toast.success('Message deleted');
    } catch (error: any) {
      console.error('Failed to delete message:', error);
      toast.error(error.message || 'Failed to delete message');
    }
  };

  const handleReaction = async (messageId: number, emoji: string) => {
    try {
      const response = await MessagingService.addReaction(messageId, emoji);
      
      // Update message reactions locally
      setMessages(prev => prev.map(msg => {
        if (msg.id !== messageId) return msg;
        
        if (response.action === 'removed') {
          // Remove reaction
          return {
            ...msg,
            reactions: []
          };
        } else {
          // Add reaction (replace any existing)
          return {
            ...msg,
            reactions: [{
              emoji,
              count: 1,
              profiles: [{ id: parseInt(currentAccount.id), name: currentAccount.classroomName }],
              hasReacted: true
            }]
          };
        }
      }));
    } catch (error: any) {
      console.error('Failed to add reaction:', error);
      toast.error('Failed to add reaction');
    }
  };

  // Conversation list view
  if (!selectedConversation) {
    return (
      <Card className="h-full flex flex-col bg-white dark:bg-slate-800">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Messages</h2>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 text-red-300 dark:text-red-600" />
              <p className="text-red-600 dark:text-red-400 text-sm font-medium mb-2">Error loading conversations</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs mb-4">{error}</p>
              <Button onClick={loadConversations} size="sm" variant="outline">
                Try Again
              </Button>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">No conversations yet</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                Start chatting with your friends!
              </p>
            </div>
          ) : (
            <div className="p-2">
              {conversations.map(conv => {
                const friend = conv.participants[0];
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className="w-full p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-sm font-medium">
                        {friend.avatar || friend.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                            {friend.name}
                          </span>
                          {conv.lastMessage && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {formatTime(conv.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        {conv.lastMessage && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                            {conv.lastMessage.content}
                          </p>
                        )}
                        {conv.unreadCount > 0 && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Quick start conversation from friends */}
        {currentAccount.friends && currentAccount.friends.length > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Start a conversation:</p>
            <div className="flex flex-wrap gap-2">
              {(() => {
                // Get friend IDs that already have conversations
                const conversationFriendIds = new Set(
                  conversations.flatMap(conv => 
                    conv.participants.map(p => p.id.toString())
                  )
                );
                
                // Filter out friends with existing conversations and remove duplicates
                const availableFriends = currentAccount.friends
                  .filter((friend, index, self) => 
                    // Remove duplicates by classroomId
                    index === self.findIndex(f => f.classroomId === friend.classroomId) &&
                    // Exclude friends with existing conversations
                    !conversationFriendIds.has(friend.classroomId)
                  );
                
                if (availableFriends.length === 0) {
                  return (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                      All friends have active conversations
                    </p>
                  );
                }
                
                return availableFriends.map(friend => (
                  <Button
                    key={friend.classroomId}
                    variant="outline"
                    size="sm"
                    onClick={() => handleStartConversation(friend.classroomId)}
                    className="text-xs"
                  >
                    {friend.classroomName}
                  </Button>
                ));
              })()}
            </div>
          </div>
        )}
      </Card>
    );
  }

  // Chat view
  const friend = selectedConversation.participants[0];
  const currentUserId = parseInt(currentAccount.id);

  return (
    <Card className="h-full flex flex-col bg-white dark:bg-slate-800">
      {/* Chat header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSelectedConversation(null)}
          className="text-slate-600 dark:text-slate-400"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-sm font-medium">
          {friend.avatar || friend.name.charAt(0)}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">{friend.name}</h3>
          {friend.location && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{friend.location}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {messages.map(msg => {
              const isMe = msg.senderId === currentUserId;
              const isEditing = editingMessageId === msg.id;
              
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] ${isMe ? 'order-2' : 'order-1'}`}>
                    {!isMe && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 px-3">
                        {msg.senderName}
                      </p>
                    )}
                    <div className="relative group">
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          msg.deleted
                            ? 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 italic'
                            : isMe
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {isEditing ? (
                          <div className="space-y-2 min-w-[200px]">
                            <Input
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleEditMessage(msg.id);
                                } else if (e.key === 'Escape') {
                                  setEditingMessageId(null);
                                  setEditContent('');
                                }
                              }}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleEditMessage(msg.id)}
                                className="text-xs h-7"
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingMessageId(null);
                                  setEditContent('');
                                }}
                                className="text-xs h-7"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        )}
                      </div>
                      
                      {/* Message actions - only for own messages and not deleted */}
                      {isMe && !msg.deleted && !isEditing && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingMessageId(msg.id);
                                setEditContent(msg.content);
                              }}
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      
                      {/* Reaction button - only for counterpart's messages and max 1 reaction */}
                      {!isMe && !msg.deleted && (!msg.reactions || msg.reactions.length === 0) && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                            >
                              <Smile className="w-4 h-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2" align="end">
                            <div className="flex gap-1">
                              {['👍', '❤️', '😂', '😮', '😢', '🎉'].map(emoji => (
                                <Button
                                  key={emoji}
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReaction(msg.id, emoji)}
                                  className="text-lg p-1 h-8 w-8"
                                >
                                  {emoji}
                                </Button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                    
                    {/* Reactions display */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1 px-3">
                        {msg.reactions.map(reaction => (
                          <button
                            key={reaction.emoji}
                            onClick={() => !isMe && handleReaction(msg.id, reaction.emoji)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                              reaction.hasReacted
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            } ${!isMe ? 'hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer' : 'cursor-default'}`}
                            disabled={isMe}
                          >
                            <span>{reaction.emoji}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 px-3">
                      {formatTime(msg.createdAt)}
                      {msg.editedAt && !msg.deleted && ' (edited)'}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Message input */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-2"
        >
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1"
          />
          <Button type="submit" disabled={!newMessage.trim() || sending} size="icon">
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
}
