import { useEffect, useRef, useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { sendChatMessage, ChatMessage } from '../services/chat';

interface ChatBotProps {
	onClose?: () => void;
}

export default function ChatBot({ onClose }: ChatBotProps) {
	const [messages, setMessages] = useState<ChatMessage[]>([
		{
			role: 'assistant',
			content: 'Hi! I can answer questions using the documents in our library. How can I help?',
		},
	]);
	const [input, setInput] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages, loading]);

	const handleSend = async () => {
		if (!input.trim() || loading) return;

		const nextMessage: ChatMessage = { role: 'user', content: input.trim() };
		const nextHistory = [...messages, nextMessage];
		setMessages(nextHistory);
		setInput('');
		setLoading(true);
		setError(null);

		try {
			const result = await sendChatMessage(nextMessage.content, messages, 5);
			if (result.status === 'success' && result.reply) {
				setMessages(prev => [...prev, { role: 'assistant', content: result.reply as string }]);
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
		</Card>
	);
}
