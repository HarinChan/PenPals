import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, MapPin, Users, Bot, Mic, Square, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { sendChatMessage, transcribeChatAudio, ChatMessage } from '../services/chat';
import type { Account, Classroom } from '../types';
import ClassroomDetailDialog from './ClassroomDetailDialog';
import MeetingDetailsDialog from './MeetingDetailsDialog';

interface ChatBotProps {
    onClose?: () => void;
    classrooms: Classroom[];
    currentAccount: Account;
}

interface ChatMessageWithClassrooms extends ChatMessage {
    classroomIds?: string[];
    meetingIds?: string[];
    meetingSuggestions?: MeetingSuggestion[];
}

interface MeetingSuggestion {
    id: string;
    title: string;
    description?: string;
    startTime?: string;
    creatorName?: string;
    similarity?: number;
}

const CLASSROOM_TAG_RE = /<classroom\s+id="([^"]+)"\s*\/>/g;
const MEETING_TAG_RE = /<meeting\s+id="([^"]+)"\s*\/>/g;

const parseAssistantTags = (content: string) => {
    const classroomIds: string[] = [];
    const meetingIds: string[] = [];

    let cleaned = content.replace(CLASSROOM_TAG_RE, (_match, id) => {
        if (!classroomIds.includes(id)) {
            classroomIds.push(id);
        }
        return '';
    });

    cleaned = cleaned.replace(MEETING_TAG_RE, (_match, id) => {
        if (!meetingIds.includes(id)) {
            meetingIds.push(id);
        }
        return '';
    });

    return {
        cleaned: cleaned.replace(/\n{3,}/g, '\n\n').trim(),
        classroomIds: classroomIds.slice(0, 3),
        meetingIds: meetingIds.slice(0, 3),
    };
};

const buildMeetingSuggestions = (meetingIds: string[], context?: Array<Record<string, any>>): MeetingSuggestion[] => {
    if (!Array.isArray(context) || meetingIds.length === 0) {
        return [];
    }

    const suggestions: MeetingSuggestion[] = [];
    const seen = new Set<string>();

    for (const meetingId of meetingIds) {
        const match = context.find((doc) => {
            const metadata = doc?.metadata || {};
            if (metadata?.source !== 'meeting') return false;
            if (String(metadata?.meeting_id) !== String(meetingId)) return false;
            return true;
        });

        if (!match) continue;
        if (seen.has(String(meetingId))) continue;

        const metadata = match.metadata || {};
        suggestions.push({
            id: String(metadata.meeting_id || meetingId),
            title: String(metadata.title || 'Public Meeting'),
            description: metadata.description ? String(metadata.description) : undefined,
            startTime: metadata.start_time ? String(metadata.start_time) : undefined,
            creatorName: metadata.creator_name ? String(metadata.creator_name) : undefined,
            similarity: Number(match.similarity ?? 0),
        });
        seen.add(String(meetingId));
    }

    return suggestions;
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
    const bottomRef = useRef<HTMLDivElement>(null);
    const [detailDialogClassroom, setDetailDialogClassroom] = useState<Classroom | null>(null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [meetingDetailsOpen, setMeetingDetailsOpen] = useState(false);
    const [selectedMeetingId, setSelectedMeetingId] = useState<number | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [messages, loading]);

    useEffect(() => {
        if (!loading) {
            setElapsedSeconds(0);
            return;
        }
        const start = Date.now();
        const timer = window.setInterval(() => {
            setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
        }, 1000);
        return () => window.clearInterval(timer);
    }, [loading]);

    useEffect(() => {
        return () => {
            mediaRecorderRef.current?.stop();
            mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        };
    }, []);

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
        if (!input.trim() || loading || isTranscribing) return;

        const nextMessage: ChatMessageWithClassrooms = { role: 'user', content: input.trim() };
        const nextHistory = [...messages, nextMessage];
        setMessages(nextHistory);
        setInput('');
        setLoading(true);
        setError(null);

        try {
            const result = await sendChatMessage(nextMessage.content, messages, 5);
            if (result.status === 'success' && result.reply) {
                const parsed = parseAssistantTags(result.reply as string);
                const meetingSuggestions = buildMeetingSuggestions(parsed.meetingIds, result.context);
                setMessages(prev => [
                    ...prev,
                    {
                        role: 'assistant',
                        content: parsed.cleaned,
                        classroomIds: parsed.classroomIds,
                        meetingIds: parsed.meetingIds,
                        meetingSuggestions,
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

    const transcribeBlob = async (blob: Blob) => {
        setIsTranscribing(true);
        setError(null);

        try {
            const result = await transcribeChatAudio(blob);
            if (result.status === 'success' && result.transcript?.trim()) {
                setInput(result.transcript.trim());
            } else {
                setError(result.message || 'Transcription failed. Please try again.');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to transcribe audio.';
            setError(message);
        } finally {
            setIsTranscribing(false);
        }
    };

    const startRecording = async () => {
        if (isRecording || isTranscribing || loading) return;
        setError(null);

        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
            const platformMessage = navigator.userAgent.includes('Mac')
                ? 'On macOS, ensure microphone permission is granted in System Settings > Privacy & Security > Microphone.'
                : navigator.userAgent.includes('Windows')
                    ? 'On Windows, ensure microphone permission is granted in Settings > Privacy & security > Microphone.'
                    : 'Ensure microphone permissions are enabled for this app.';

            setError(`Microphone recording is unavailable in this runtime. ${platformMessage}`);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            mediaStreamRef.current = stream;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event: BlobEvent) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const mimeType = mediaRecorder.mimeType || 'audio/webm';
                const blob = new Blob(audioChunksRef.current, { type: mimeType });

                mediaStreamRef.current?.getTracks().forEach(track => track.stop());
                mediaStreamRef.current = null;
                mediaRecorderRef.current = null;
                setIsRecording(false);

                if (blob.size > 0) {
                    void transcribeBlob(blob);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to access microphone.';
            setError(message);
            setIsRecording(false);
            mediaStreamRef.current?.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
            mediaRecorderRef.current = null;
        }
    };

    const stopRecording = () => {
        if (!isRecording || !mediaRecorderRef.current) return;
        mediaRecorderRef.current.stop();
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSend();
        }
    };

    return (
        <Card className="h-full w-full flex flex-col min-h-0 border-0 shadow-none rounded-2xl overflow-hidden bg-white dark:bg-slate-800">
            {/* Header */}
            <CardHeader className="flex flex-row items-center justify-between py-4 px-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
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
            <CardContent className="flex-1 min-h-0 flex flex-col gap-3 p-0 bg-white dark:bg-slate-800 relative">
                <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto pr-2 px-4 sm:px-6 py-4 chat-scroll">
                    <div className="space-y-6 pb-2">
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

                                    {message.role === 'assistant' && message.meetingSuggestions && message.meetingSuggestions.length > 0 && (
                                        <div className="w-full mt-2 grid gap-3 min-w-[280px]">
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">Suggested Public Meetings</p>
                                            {message.meetingSuggestions.map((meeting) => (
                                                <button
                                                    key={`chat-meeting-${meeting.id}`}
                                                    onClick={() => {
                                                        setSelectedMeetingId(Number(meeting.id));
                                                        setMeetingDetailsOpen(true);
                                                    }}
                                                    className="group/card relative w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all duration-200 text-left overflow-hidden"
                                                >
                                                    <div className="absolute top-0 right-0 p-2 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                                        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-1.5 rounded-full">
                                                            <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5 pr-6">
                                                        <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{meeting.title}</div>
                                                        {meeting.startTime && (
                                                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                                                {new Date(meeting.startTime).toLocaleString()}
                                                            </div>
                                                        )}
                                                        {meeting.creatorName && (
                                                            <div className="text-xs text-slate-500 dark:text-slate-400">Host: {meeting.creatorName}</div>
                                                        )}
                                                        {meeting.description && (
                                                            <div className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                                                                {meeting.description}
                                                            </div>
                                                        )}
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
                                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                        Thinking... {elapsedSeconds > 0 ? `(${elapsedSeconds}s)` : ''}
                                    </span>
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
                        <div ref={bottomRef} />
                    </div>
                </div>

                {/* Input Area */}
                <div className="shrink-0 p-3 border-t border-slate-100 dark:border-slate-800">
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
                            disabled={loading || isTranscribing}
                            className="pr-24 pl-4 py-6 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 shadow-sm transition-all text-base"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                            <Button
                                type="button"
                                size="icon"
                                onClick={isRecording ? stopRecording : startRecording}
                                disabled={loading || isTranscribing}
                                className={`h-9 w-9 rounded-full transition-all duration-200 ${
                                    isRecording
                                        ? 'bg-red-600 hover:bg-red-700 text-white'
                                        : 'bg-transparent text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                {isTranscribing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : isRecording ? (
                                    <Square className="h-4 w-4" />
                                ) : (
                                    <Mic className="h-4 w-4" />
                                )}
                            </Button>
                            <Button 
                                type="submit" 
                                size="icon" 
                                disabled={!input.trim() || loading || isTranscribing || isRecording}
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

            <MeetingDetailsDialog
                meetingId={selectedMeetingId}
                open={meetingDetailsOpen}
                onOpenChange={setMeetingDetailsOpen}
                onMeetingUpdated={() => {}}
            />
        </Card>
    );
}