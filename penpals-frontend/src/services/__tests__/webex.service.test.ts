import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WebexService } from '../webex';
import { ApiClient } from '../api';

vi.mock('../api', () => ({
  ApiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('WebexService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAuthUrl', () => {
    it('calls ApiClient.get and returns auth URL', async () => {
      const mockResponse = {
        url: 'https://webexapis.com/v1/authorize?client_id=test&redirect_uri=http://localhost',
      };

      vi.mocked(ApiClient.get).mockResolvedValue(mockResponse as any);

      const result = await WebexService.getAuthUrl();

      expect(ApiClient.get).toHaveBeenCalledWith('/webex/auth-url');
      expect(result).toEqual(mockResponse);
      expect(result.url).toContain('webexapis.com');
    });

    it('returns URL object with url property', async () => {
      const mockResponse = { url: 'https://example.com/auth' };

      vi.mocked(ApiClient.get).mockResolvedValue(mockResponse as any);

      const result = await WebexService.getAuthUrl();

      expect(result).toHaveProperty('url');
      expect(typeof result.url).toBe('string');
    });
  });

  describe('connect', () => {
    it('posts authorization code and returns success message', async () => {
      const mockResponse = { msg: 'WebEx account connected successfully' };

      vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

      const result = await WebexService.connect('auth-code-123');

      expect(ApiClient.post).toHaveBeenCalledWith('/webex/connect', { code: 'auth-code-123' });
      expect(result).toEqual(mockResponse);
    });

    it('handles empty auth code', async () => {
      const mockResponse = { msg: 'Connected' };

      vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

      const result = await WebexService.connect('');

      expect(ApiClient.post).toHaveBeenCalledWith('/webex/connect', { code: '' });
      expect(result).toEqual(mockResponse);
    });

    it('handles long auth code', async () => {
      const longCode = 'a'.repeat(500);
      const mockResponse = { msg: 'WebEx connected' };

      vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

      const result = await WebexService.connect(longCode);

      expect(ApiClient.post).toHaveBeenCalledWith('/webex/connect', { code: longCode });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getStatus', () => {
    it('calls ApiClient.get and returns connected status true', async () => {
      const mockResponse = { connected: true };

      vi.mocked(ApiClient.get).mockResolvedValue(mockResponse as any);

      const result = await WebexService.getStatus();

      expect(ApiClient.get).toHaveBeenCalledWith('/webex/status');
      expect(result).toEqual(mockResponse);
      expect(result.connected).toBe(true);
    });

    it('calls ApiClient.get and returns connected status false', async () => {
      const mockResponse = { connected: false };

      vi.mocked(ApiClient.get).mockResolvedValue(mockResponse as any);

      const result = await WebexService.getStatus();

      expect(ApiClient.get).toHaveBeenCalledWith('/webex/status');
      expect(result).toEqual(mockResponse);
      expect(result.connected).toBe(false);
    });

    it('returns status object with connected property', async () => {
      const mockResponse = { connected: true };

      vi.mocked(ApiClient.get).mockResolvedValue(mockResponse as any);

      const result = await WebexService.getStatus();

      expect(result).toHaveProperty('connected');
      expect(typeof result.connected).toBe('boolean');
    });
  });

  describe('disconnect', () => {
    it('posts to disconnect endpoint and returns success message', async () => {
      const mockResponse = { msg: 'WebEx account disconnected' };

      vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

      const result = await WebexService.disconnect();

      expect(ApiClient.post).toHaveBeenCalledWith('/webex/disconnect');
      expect(result).toEqual(mockResponse);
    });

    it('calls disconnect with no payload', async () => {
      const mockResponse = { msg: 'Disconnected successfully' };

      vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

      await WebexService.disconnect();

      expect(ApiClient.post).toHaveBeenCalledTimes(1);
      expect(ApiClient.post).toHaveBeenCalledWith('/webex/disconnect');
      // Verify no second argument (no payload)
      expect(vi.mocked(ApiClient.post).mock.calls[0]).toHaveLength(1);
    });
  });
});
