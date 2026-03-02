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

export interface TranscribeResponse {
  status: 'success' | 'error';
  transcript?: string;
  raw?: unknown;
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

export async function transcribeChatAudio(
  audioBlob: Blob,
  hotwords?: string
): Promise<TranscribeResponse> {
  const formData = new FormData();
  formData.append('audio', audioBlob, `chat-${Date.now()}.webm`);
  if (hotwords?.trim()) {
    formData.append('hotwords', hotwords.trim());
  }

  return ApiClient.request<TranscribeResponse>('/chat/transcribe', {
    method: 'POST',
    body: formData,
  });
}
