import { ApiClient, ApiError } from './api';

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

  try {
    return await ApiClient.request<TranscribeResponse>('/chat/transcribe', {
      method: 'POST',
      body: formData,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 404) {
        return {
          status: 'error',
          message: 'Transcription endpoint not found. Start the latest backend and ensure /api/chat/transcribe is available.',
        };
      }

      if (error.status === 0) {
        return {
          status: 'error',
          message: 'Could not reach transcription service. Ensure backend is running on port 5001 and microphone upload is allowed.',
        };
      }
    }

    throw error;
  }
}
