import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth';
import { ApiClient } from '../api';

vi.mock('../api', () => ({
  ApiClient: {
    post: vi.fn(),
    get: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
    getToken: vi.fn(),
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('API methods', () => {
    it('register calls ApiClient.post and returns response', async () => {
      const payload = {
        email: 'new@penpals.org',
        password: 'StrongPass123!',
        organization: 'PenPals Org',
      };
      const mockResponse = { account_id: 42, msg: 'Account registered' };

      vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

      const result = await AuthService.register(payload);

      expect(ApiClient.post).toHaveBeenCalledWith('/auth/register', payload);
      expect(result).toEqual(mockResponse);
    });

    it('login calls ApiClient.post, stores token, and returns response', async () => {
      const credentials = { email: 'user@penpals.org', password: 'StrongPass123!' };
      const mockResponse = { access_token: 'jwt-token', account_id: 10 };

      vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

      const result = await AuthService.login(credentials);

      expect(ApiClient.post).toHaveBeenCalledWith('/auth/login', credentials);
      expect(ApiClient.setToken).toHaveBeenCalledWith('jwt-token');
      expect(result).toEqual(mockResponse);
    });

    it('logout clears token', () => {
      AuthService.logout();
      expect(ApiClient.clearToken).toHaveBeenCalledTimes(1);
    });

    it('getCurrentUser calls ApiClient.get and returns user payload', async () => {
      const mockResponse = {
        account: {
          id: 1,
          email: 'user@penpals.org',
          created_at: '2026-01-01T00:00:00Z',
          classroom_count: 2,
        },
        classrooms: [
          {
            id: 1,
            name: 'Class A',
            interests: ['music'],
          },
        ],
      };

      vi.mocked(ApiClient.get).mockResolvedValue(mockResponse as any);

      const result = await AuthService.getCurrentUser();

      expect(ApiClient.get).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('authentication state', () => {
    it('isAuthenticated returns true when token exists', () => {
      vi.mocked(ApiClient.getToken).mockReturnValue('token-value');
      expect(AuthService.isAuthenticated()).toBe(true);
    });

    it('isAuthenticated returns false when token is null', () => {
      vi.mocked(ApiClient.getToken).mockReturnValue(null);
      expect(AuthService.isAuthenticated()).toBe(false);
    });

    it('validateToken returns true when getCurrentUser succeeds', async () => {
      vi.mocked(ApiClient.get).mockResolvedValue({ account: {}, classrooms: [] } as any);

      const result = await AuthService.validateToken();

      expect(result).toBe(true);
      expect(ApiClient.clearToken).not.toHaveBeenCalled();
    });

    it('validateToken returns false and logs out when getCurrentUser fails', async () => {
      vi.mocked(ApiClient.get).mockRejectedValue(new Error('Unauthorized'));

      const result = await AuthService.validateToken();

      expect(result).toBe(false);
      expect(ApiClient.clearToken).toHaveBeenCalledTimes(1);
    });
  });

  describe('validatePassword', () => {
    it('returns invalid with all relevant errors for weak password', () => {
      const result = AuthService.validatePassword('weak');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
      expect(result.errors).toContain('Password must contain at least one digit');
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('returns invalid when lowercase letter is missing', () => {
      const result = AuthService.validatePassword('UPPER123!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('returns valid when password satisfies all rules', () => {
      const result = AuthService.validatePassword('StrongPass123!');

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('validateEmail', () => {
    it('returns true for valid email formats', () => {
      expect(AuthService.validateEmail('hello.world+test@penpals.org')).toBe(true);
    });

    it('returns false for invalid email formats', () => {
      expect(AuthService.validateEmail('not-an-email')).toBe(false);
      expect(AuthService.validateEmail('no-domain@')).toBe(false);
      expect(AuthService.validateEmail('@no-local-part.com')).toBe(false);
    });
  });
});