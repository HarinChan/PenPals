import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError } from '../api';
import { sendChatMessage, transcribeChatAudio } from '../chat';

vi.mock('../api', () => ({
  ApiClient: {
    post: vi.fn(),
    request: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    response?: any;

    constructor(message: string, status: number, response?: any) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.response = response;
    }
  },
}));

describe('chat service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendChatMessage', () => {
    it('posts chat payload with default history and n_results', async () => {
      const mockResponse = { status: 'success', reply: 'Hello there!' };
      vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

      const result = await sendChatMessage('Hi');

      expect(ApiClient.post).toHaveBeenCalledWith('/chat', {
        message: 'Hi',
        history: [],
        n_results: 5,
      });
      expect(result).toEqual(mockResponse);
    });

    it('posts chat payload with provided history and n_results', async () => {
      const history = [
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi, how can I help?' },
      ];
      const mockResponse = { status: 'success', reply: 'I can help with that.' };

      vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

      const result = await sendChatMessage('Need support', history, 8);

      expect(ApiClient.post).toHaveBeenCalledWith('/chat', {
        message: 'Need support',
        history,
        n_results: 8,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('transcribeChatAudio', () => {
    it('requests transcription with audio file and trimmed hotwords', async () => {
      const audioBlob = new Blob(['audio-bytes'], { type: 'audio/webm' });
      const appendSpy = vi.spyOn(FormData.prototype, 'append');
      const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
      const mockResponse = { status: 'success', transcript: 'Hello world' };

      vi.mocked(ApiClient.request).mockResolvedValue(mockResponse as any);

      const result = await transcribeChatAudio(audioBlob, '  school, friends  ');

      expect(ApiClient.request).toHaveBeenCalledTimes(1);
      expect(vi.mocked(ApiClient.request).mock.calls[0]?.[0]).toBe('/chat/transcribe');
      expect(vi.mocked(ApiClient.request).mock.calls[0]?.[1]).toMatchObject({ method: 'POST' });
      expect(vi.mocked(ApiClient.request).mock.calls[0]?.[1]?.body).toBeInstanceOf(FormData);

      expect(appendSpy).toHaveBeenCalledWith('audio', audioBlob, 'chat-1700000000000.webm');
      expect(appendSpy).toHaveBeenCalledWith('hotwords', 'school, friends');
      expect(result).toEqual(mockResponse);

      appendSpy.mockRestore();
      dateNowSpy.mockRestore();
    });

    it('does not append hotwords when value is blank after trim', async () => {
      const audioBlob = new Blob(['audio-bytes'], { type: 'audio/webm' });
      const appendSpy = vi.spyOn(FormData.prototype, 'append');

      vi.mocked(ApiClient.request).mockResolvedValue({ status: 'success', transcript: 'ok' } as any);

      await transcribeChatAudio(audioBlob, '   ');

      expect(appendSpy).toHaveBeenCalledTimes(1);
      expect(appendSpy).toHaveBeenCalledWith('audio', audioBlob, expect.stringMatching(/^chat-\d+\.webm$/));

      appendSpy.mockRestore();
    });

    it('returns friendly message when transcription endpoint is missing (404)', async () => {
      const audioBlob = new Blob(['audio-bytes'], { type: 'audio/webm' });
      vi.mocked(ApiClient.request).mockRejectedValue(new ApiError('Not Found', 404));

      const result = await transcribeChatAudio(audioBlob);

      expect(result).toEqual({
        status: 'error',
        message:
          'Transcription endpoint not found. Start the latest backend and ensure /api/chat/transcribe is available.',
      });
    });

    it('returns friendly message when backend is unreachable (status 0)', async () => {
      const audioBlob = new Blob(['audio-bytes'], { type: 'audio/webm' });
      vi.mocked(ApiClient.request).mockRejectedValue(new ApiError('Network error', 0));

      const result = await transcribeChatAudio(audioBlob);

      expect(result).toEqual({
        status: 'error',
        message:
          'Could not reach transcription service. Ensure backend is running on port 5001 and microphone upload is allowed.',
      });
    });

    it('rethrows ApiError for unhandled status codes', async () => {
      const audioBlob = new Blob(['audio-bytes'], { type: 'audio/webm' });
      const error = new ApiError('Server error', 500);
      vi.mocked(ApiClient.request).mockRejectedValue(error);

      await expect(transcribeChatAudio(audioBlob)).rejects.toBe(error);
    });

    it('rethrows non-ApiError errors', async () => {
      const audioBlob = new Blob(['audio-bytes'], { type: 'audio/webm' });
      const error = new Error('Unexpected failure');
      vi.mocked(ApiClient.request).mockRejectedValue(error);

      await expect(transcribeChatAudio(audioBlob)).rejects.toThrow('Unexpected failure');
    });
  });
});