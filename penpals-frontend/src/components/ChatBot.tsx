import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, MapPin, Users } from 'lucide-react';
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
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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
		<Card className="h-full flex flex-col">
			<CardHeader className="flex flex-row items-center justify-between space-y-0">
				<CardTitle>Chat Assistant</CardTitle>
				{onClose && (
					<Button variant="ghost" size="sm" onClick={onClose}>
						Close
					</Button>
				)}
			</CardHeader>
			<CardContent className="flex-1 flex flex-col gap-4 p-0">
				<ScrollArea className="flex-1 px-6" ref={scrollRef}>
					<div className="space-y-4 pb-4">
						{messages.map((message, index) => (
							<div
								key={`${message.role}-${index}`}
								className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
									message.role === 'user'
										? 'ml-auto bg-blue-600 text-white'
										: 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
								}`}
							>
								{message.content}
								{message.role === 'assistant' && message.classroomIds && message.classroomIds.length > 0 && (
									<div className="mt-3 space-y-2">
										{message.classroomIds
											.map(id => classrooms.find(classroom => classroom.id === id))
											.filter((classroom): classroom is Classroom => Boolean(classroom))
											.map(classroom => (
												<button
													key={`chat-classroom-${classroom.id}`}
													onClick={() => openClassroomDetails(classroom)}
													className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
												>
													<div className="flex items-start gap-3">
														<div className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-500" />
														<div className="flex-1 space-y-1">
															<div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
																{classroom.name}
															</div>
															<div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
																<MapPin className="h-3 w-3" />
																<span>{classroom.location}</span>
															</div>
															{typeof classroom.size === 'number' && (
																<div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
																	<Users className="h-3 w-3" />
																	<span>{classroom.size} students</span>
																</div>
															)}
															{classroom.interests.length > 0 && (
																<div className="flex flex-wrap gap-1">
																	{classroom.interests.slice(0, 3).map(interest => (
																		<Badge
																			key={`${classroom.id}-${interest}`}
																			variant="outline"
																			className="text-[10px] border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300"
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
						))}
						{loading && (
							<div className="inline-flex items-center gap-2 text-sm text-slate-500">
								<Loader2 className="h-4 w-4 animate-spin" />
								Thinking...
							</div>
						)}
						{error && (
							<div className="text-sm text-red-600">{error}</div>
						)}
					</div>
				</ScrollArea>
				<div className="px-6 pb-6">
					<div className="flex gap-2">
						<Input
							value={input}
							onChange={(event) => setInput(event.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="Ask a question..."
							disabled={loading}
						/>
						<Button onClick={handleSend} disabled={loading || !input.trim()} size="icon">
							{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
						</Button>
					</div>
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
