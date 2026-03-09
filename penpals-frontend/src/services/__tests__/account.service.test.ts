import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AccountService } from '../account'; // Adjust this path
import { ApiClient } from '../api'; // Adjust this path

// 1. Mock the ApiClient module
vi.mock('../api', () => ({
  ApiClient: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    clearToken: vi.fn(),
  },
}));

describe('AccountService', () => {
  // Clear mock history before each test to prevent test bleed
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('API Methods', () => {
    describe('getAccountDetails', () => {
      it('should call ApiClient.get with /account and return data', async () => {
        const mockResponse = { account: { id: 1, classroom_count: 0 }, classrooms: [] };
        
        // vi.mocked() is a great Vitest feature for TypeScript
        vi.mocked(ApiClient.get).mockResolvedValue(mockResponse);

        const result = await AccountService.getAccountDetails();

        expect(ApiClient.get).toHaveBeenCalledWith('/account');
        expect(ApiClient.get).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('updateAccount', () => {
      it('should call ApiClient.put with /account and payload, then return data', async () => {
        const payload = {
          email: 'updated@example.com',
          organization: 'PenPals Org',
        };

        const mockResponse = {
          msg: 'Account updated',
          account: {
            id: 1,
            email: 'updated@example.com',
            organization: 'PenPals Org',
          },
        };

        vi.mocked(ApiClient.put).mockResolvedValue(mockResponse as any);

        const result = await AccountService.updateAccount(payload);

        expect(ApiClient.put).toHaveBeenCalledWith('/account', payload);
        expect(ApiClient.put).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('deleteAccount', () => {
      it('should call ApiClient.delete and clear the token on success', async () => {
        const mockResponse = { msg: 'Deleted', deleted_classrooms: 3 };
        vi.mocked(ApiClient.delete).mockResolvedValue(mockResponse);

        const result = await AccountService.deleteAccount();

        expect(ApiClient.delete).toHaveBeenCalledWith('/account');
        // Crucial: verify the side-effect occurred
        expect(ApiClient.clearToken).toHaveBeenCalledTimes(1); 
        expect(result).toEqual(mockResponse);
      });

      it('should not clear token if delete request fails', async () => {
        // Simulate a network error
        vi.mocked(ApiClient.delete).mockRejectedValue(new Error('Network error'));

        // Assert that the error is thrown, and clearToken is NEVER called
        await expect(AccountService.deleteAccount()).rejects.toThrow('Network error');
        expect(ApiClient.clearToken).not.toHaveBeenCalled();
      });
    });

    describe('getAccountClassrooms', () => {
      it('should call ApiClient.get with /account/classrooms and return data', async () => {
        const mockResponse = {
          classrooms: [
            { id: 1, friends_count: 2 },
            { id: 2, friends_count: 5 },
          ],
          total_count: 2,
          account_id: 99,
        };

        vi.mocked(ApiClient.get).mockResolvedValue(mockResponse as any);

        const result = await AccountService.getAccountClassrooms();

        expect(ApiClient.get).toHaveBeenCalledWith('/account/classrooms');
        expect(ApiClient.get).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getAccountStats', () => {
      it('should call ApiClient.get with /account/stats and return stats', async () => {
        const mockStats = {
          account_id: 99,
          total_classrooms: 4,
          total_connections: 15,
          unique_interests: 6,
          account_created: '2024-01-01T00:00:00Z',
        };

        vi.mocked(ApiClient.get).mockResolvedValue(mockStats as any);

        const result = await AccountService.getAccountStats();

        expect(ApiClient.get).toHaveBeenCalledWith('/account/stats');
        expect(ApiClient.get).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockStats);
      });
    });
  });

  describe('validateUpdateData', () => {
    it('should return isValid: true for empty data', () => {
      const result = AccountService.validateUpdateData({});
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate email format correctly', () => {
      const invalidEmpty = AccountService.validateUpdateData({ email: '   ' });
      expect(invalidEmpty.isValid).toBe(false);
      expect(invalidEmpty.errors).toContain('Email cannot be empty');

      const invalidFormat = AccountService.validateUpdateData({ email: 'bademail.com' });
      expect(invalidFormat.isValid).toBe(false);
      expect(invalidFormat.errors).toContain('Invalid email format');

      const valid = AccountService.validateUpdateData({ email: 'test@example.com' });
      expect(valid.isValid).toBe(true);
    });

    it('should validate password complexity', () => {
      const result = AccountService.validateUpdateData({ password: 'weak' });
      expect(result.isValid).toBe(false);
      
      // It should catch multiple errors at once
      expect(result.errors).toContain('Password must be at least 8 characters long');
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
      expect(result.errors).toContain('Password must contain at least one digit');
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should require at least one lowercase letter', () => {
      const result = AccountService.validateUpdateData({ password: 'WEAK123!' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject organization names over 120 characters', () => {
      const tooLongOrganization = 'A'.repeat(121);
      const result = AccountService.validateUpdateData({ organization: tooLongOrganization });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Organization name too long (max 120 characters)');
    });

    it('should accept a fully valid, complex password', () => {
      const valid = AccountService.validateUpdateData({ password: 'StrongPass123!' });
      expect(valid.isValid).toBe(true);
      expect(valid.errors).toHaveLength(0);
    });
  });
});