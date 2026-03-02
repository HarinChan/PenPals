import { ApiClient } from './api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  status: 'success' | 'error';
  reply?: string;
  context?: Array<Record<string, any>>;
  message?: string;
}

export async function sendChatMessage(
  message: string,
  history: ChatMessage[] = [],
  nResults: number = 5
): Promise<ChatResponse> {
  return ApiClient.post<ChatResponse>('/chat', {
    message,
    history,
    n_results: nResults,
  });
}
