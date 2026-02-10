import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, MapPin, Users, Sparkles, Bot } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { sendChatMessage, ChatMessage } from '../services/chat';
import type { Account, Classroom } from '../types';
import ClassroomDetailDialog from './ClassroomDetailDialog';

interface ChatBotProps {
    onClose?: () => void;
    classrooms: Classroom[];
    currentAccount: Account;
}

interface ChatMessageWithClassrooms extends ChatMessage {
    classroomIds?: string[];
}

const CLASSROOM_TAG_RE = /<classroom\s+id="([^"]+)"\s*\/>/g;

const parseClassroomTags = (content: string) => {
    const classroomIds: string[] = [];
    const cleaned = content.replace(CLASSROOM_TAG_RE, (_match, id) => {
        if (!classroomIds.includes(id)) {
            classroomIds.push(id);
        }
        return '';
    });

    return {
        cleaned: cleaned.replace(/\n{3,}/g, '\n\n').trim(),
        classroomIds: classroomIds.slice(0, 3),
    };
};

export default function ChatBot({ onClose, classrooms, currentAccount }: ChatBotProps) {
    const [messages, setMessages] = useState<ChatMessageWithClassrooms[]>([
        {
            role: 'assistant',
            content: 'Hi! I can answer questions using the documents in our library. How can I help?',
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [detailDialogClassroom, setDetailDialogClassroom] = useState<Classroom | null>(null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [messages, loading]);

    const openClassroomDetails = (classroom: Classroom) => {
        setDetailDialogClassroom(classroom);
        setDetailDialogOpen(true);
    };

    const getFriendshipStatus = (classroomId: string): 'none' | 'pending' | 'accepted' | 'received' => {
        const friend = currentAccount.friends?.find(f => f.classroomId === classroomId);
        if (friend) return 'accepted';
        return 'none';
    };

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const nextMessage: ChatMessageWithClassrooms = { role: 'user', content: input.trim() };
        const nextHistory = [...messages, nextMessage];
        setMessages(nextHistory);
        setInput('');
        setLoading(true);
        setError(null);

        try {
            const result = await sendChatMessage(nextMessage.content, messages, 5);
            if (result.status === 'success' && result.reply) {
                const parsed = parseClassroomTags(result.reply as string);
                setMessages(prev => [
                    ...prev,
                    {
                        role: 'assistant',
                        content: parsed.cleaned,
                        classroomIds: parsed.classroomIds,
                    },
                ]);
            } else {
                setError(result.message || 'Unexpected response from server.');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to reach chat service.';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSend();
        }
    };

    return (
        <Card className="h-full flex flex-col border-0 shadow-none rounded-2xl overflow-hidden bg-white dark:bg-slate-800">
            {/* Header */}
            <CardHeader className="flex flex-row items-center justify-between py-6 px-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Bot className="w-6 h-6" />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">AI Assistant</CardTitle>
                    </div>
                </div>
            </CardHeader>

            {/* Chat Area */}
            <CardContent className="flex-1 flex flex-col gap-4 p-0 bg-white dark:bg-slate-800 relative">
                <ScrollArea className="flex-1 px-4 sm:px-6 py-6" ref={scrollRef}>
                    <div className="space-y-10 pb-4">
                        {messages.map((message, index) => (
                            <div
                                key={`${message.role}-${index}`}
                                className={`flex gap-4 group ${
                                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                                }`}
                            >
                                {/* Avatar */}
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                                    message.role === 'user' 
                                        ? 'bg-slate-100 dark:bg-slate-700' 
                                        : 'bg-blue-100 dark:bg-blue-900/50'
                                }`}>
                                    {message.role === 'user' ? (
                                        <Users className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                    ) : (
                                        <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    )}
                                </div>

                                {/* Message Content Group */}
                                <div className={`flex flex-col gap-2 max-w-[90%] sm:max-w-[85%] ${
                                    message.role === 'user' ? 'items-end' : 'items-start'
                                }`}>
                                    <div
                                        className={`rounded-3xl px-6 py-4 text-base shadow-sm leading-relaxed ${
                                            message.role === 'user'
                                                ? 'bg-blue-600 text-white rounded-tr-sm'
                                                : 'bg-slate-100 dark:bg-slate-700/50 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                                        }`}
                                    >
                                        {message.content}
                                    </div>

                                    {/* Classroom Suggestions */}
                                    {message.role === 'assistant' && message.classroomIds && message.classroomIds.length > 0 && (
                                        <div className="w-full mt-2 grid gap-3 min-w-[280px]">
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">Suggested Classrooms</p>
                                            {message.classroomIds
                                                .map(id => classrooms.find(classroom => classroom.id === id))
                                                .filter((classroom): classroom is Classroom => Boolean(classroom))
                                                .map(classroom => (
                                                    <button
                                                        key={`chat-classroom-${classroom.id}`}
                                                        onClick={() => openClassroomDetails(classroom)}
                                                        className="group/card relative w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all duration-200 text-left overflow-hidden"
                                                    >
                                                        <div className="absolute top-0 right-0 p-2 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                                            <div className="bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded-full">
                                                                <Users className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-3.5">
                                                            <div className="mt-0.5 h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold text-lg shadow-inner">
                                                                {classroom.name.charAt(0)}
                                                            </div>
                                                            <div className="flex-1 min-w-0 space-y-1">
                                                                <div className="font-semibold text-slate-900 dark:text-slate-100 truncate pr-6">
                                                                    {classroom.name}
                                                                </div>
                                                                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                                                    <div className="flex items-center gap-1">
                                                                        <MapPin className="h-3 w-3 text-slate-400" />
                                                                        <span className="truncate max-w-[100px]">{classroom.location}</span>
                                                                    </div>
                                                                    {typeof classroom.size === 'number' && (
                                                                        <div className="flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-slate-700">
                                                                            <Users className="h-3 w-3 text-slate-400" />
                                                                            <span>{classroom.size}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {classroom.interests.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                                                                        {classroom.interests.slice(0, 3).map(interest => (
                                                                            <Badge
                                                                                key={`${classroom.id}-${interest}`}
                                                                                variant="secondary"
                                                                                className="text-[10px] px-1.5 py-0 h-5 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600/50"
                                                                            >
                                                                                {interest}
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Loading State */}
                        {loading && (
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shadow-sm">
                                    <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
                                </div>
                                <div className="bg-slate-100 dark:bg-slate-800 border-none rounded-3xl rounded-tl-sm px-5 py-3.5 shadow-sm flex items-center gap-2.5">
                                    <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Thinking...</span>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="flex justify-center w-full py-2">
                                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium px-4 py-2 rounded-full border border-red-200 dark:border-red-900/50 flex items-center shadow-sm">
                                    {error}
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                    <form 
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSend();
                        }}
                        className="relative flex items-center"
                    >
                        <Input
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about classrooms, topics, or help..."
                            disabled={loading}
                            className="pr-14 pl-4 py-6 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 shadow-sm transition-all text-base"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <Button 
                                type="submit" 
                                size="icon" 
                                disabled={!input.trim() || loading}
                                className={`h-9 w-9 rounded-full transition-all duration-200 ${
                                    input.trim() 
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20' 
                                        : 'bg-transparent text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                <Send className={`h-4 w-4 ${input.trim() ? 'ml-0.5' : ''}`} />
                            </Button>
                        </div>
                    </form>
                </div>
            </CardContent>
            
            <ClassroomDetailDialog
                classroom={detailDialogClassroom}
                open={detailDialogOpen}
                onOpenChange={setDetailDialogOpen}
                mySchedule={currentAccount.schedule}
                friendshipStatus={detailDialogClassroom ? getFriendshipStatus(detailDialogClassroom.id) : 'none'}
                accountLon={currentAccount.x}
            />
        </Card>
    );
}