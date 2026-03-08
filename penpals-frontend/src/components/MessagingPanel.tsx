import { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { MessagingService, Conversation, Message } from '../services/messaging';
import { MessageCircle, Send, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Account } from '../types';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      const response = await MessagingService.getMessages(conversationId);
      setMessages(response.messages);
      
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
              {currentAccount.friends.slice(0, 3).map(friend => (
                <Button
                  key={friend.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleStartConversation(friend.classroomId)}
                  className="text-xs"
                >
                  {friend.classroomName}
                </Button>
              ))}
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
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map(msg => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] ${isMe ? 'order-2' : 'order-1'}`}>
                  {!isMe && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 px-3">
                      {msg.senderName}
                    </p>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      isMe
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 px-3">
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

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
