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
				{/* Close button removed */}
			</CardHeader>
			<CardContent className="flex-1 flex flex-col gap-4 p-0 bg-slate-50 dark:bg-slate-900/50">
				<ScrollArea className="flex-1 px-4 py-4" ref={scrollRef}>
					<div className="space-y-6">
						{messages.map((message, index) => (
							<div
								key={`${message.role}-${index}`}
								className={`flex gap-3 ${
									message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
								}`}
							>
								{/* Avatar */}
								<div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
									message.role === 'user' 
										? 'bg-blue-600' 
										: 'bg-slate-900 dark:bg-slate-100'
								}`}>
									{message.role === 'user' ? (
										<Users className="w-4 h-4 text-white" />
									) : (
										<div className="w-4 h-4 text-white dark:text-slate-900 font-bold text-sm">AI</div>
									)}
								</div>

								{/* Message Bubble */}
								<div className={`flex flex-col gap-1 max-w-[80%] ${
									message.role === 'user' ? 'items-end' : 'items-start'
								}`}>
									<div
										className={`rounded-2xl px-4 py-2.5 text-base shadow-sm ${
											message.role === 'user'
												? 'bg-blue-600 text-white rounded-tr-sm'
												: 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-sm'
										}`}
									>
										{message.content}
									</div>

									{/* Classroom Suggestions (Only for assistant) */}
									{message.role === 'assistant' && message.classroomIds && message.classroomIds.length > 0 && (
										<div className="w-full mt-2 space-y-2">
											{message.classroomIds
												.map(id => classrooms.find(classroom => classroom.id === id))
												.filter((classroom): classroom is Classroom => Boolean(classroom))
												.map(classroom => (
													<button
														key={`chat-classroom-${classroom.id}`}
														onClick={() => openClassroomDetails(classroom)}
														className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all text-left group shadow-sm hover:shadow-md"
													>
														<div className="flex items-start gap-3">
															<div className="mt-1 h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-slate-100 group-hover:scale-110 transition-transform">
																{classroom.name.charAt(0)}
															</div>
															<div className="flex-1 min-w-0">
																<div className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
																	{classroom.name}
																</div>
																<div className="flex items-center gap-2 mt-1">
																	<div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
																		<MapPin className="h-3 w-3" />
																		<span className="truncate">{classroom.location}</span>
																	</div>
																	{typeof classroom.size === 'number' && (
																		<>
																			<span className="text-slate-300 dark:text-slate-600">•</span>
																			<div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
																				<Users className="h-3 w-3" />
																				<span>{classroom.size}</span>
																			</div>
																		</>
																	)}
																</div>
																{classroom.interests.length > 0 && (
																	<div className="flex flex-wrap gap-1 mt-2">
																		{classroom.interests.slice(0, 3).map(interest => (
																			<Badge
																				key={`${classroom.id}-${interest}`}
																				variant="secondary"
																				className="text-xs px-1.5 py-0 h-5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 border-none"
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
							<div className="flex gap-3">
								<div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 dark:bg-slate-100 flex items-center justify-center">
									<div className="w-4 h-4 text-white dark:text-slate-900 font-bold text-sm">AI</div>
								</div>
								<div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-2">
									<Loader2 className="h-4 w-4 animate-spin text-slate-900 dark:text-slate-100" />
									<span className="text-base text-slate-500 dark:text-slate-400">Processing...</span>
								</div>
							</div>
						)}

						{error && (
							<div className="flex justify-center">
								<div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-3 py-1 rounded-full border border-red-200 dark:border-red-900/50">
									{error}
								</div>
							</div>
						)}
					</div>
				</ScrollArea>

				{/* Input Area */}
				<div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
					<form 
						onSubmit={(e) => {
							e.preventDefault();
							handleSend();
						}}
						className="flex gap-2 relative"
					>
						<Input
							value={input}
							onChange={(event) => setInput(event.target.value)}
							placeholder="Message PenPals AI..."
							disabled={loading}
							className="pr-12 py-6 rounded-xl border-slate-200 dark:border-slate-700 focus:ring-slate-900 focus:border-slate-900 dark:focus:ring-slate-100 dark:focus:border-slate-100 text-base"
						/>
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
