import { describe, expect, it } from 'vitest';
import * as ServicesIndex from '../index';

describe('services/index', () => {
  describe('service class exports', () => {
    it('exports ApiClient', () => {
      expect(ServicesIndex.ApiClient).toBeDefined();
      expect(typeof ServicesIndex.ApiClient).toBe('function');
    });

    it('exports AuthService', () => {
      expect(ServicesIndex.AuthService).toBeDefined();
      expect(typeof ServicesIndex.AuthService).toBe('function');
    });

    it('exports AccountService', () => {
      expect(ServicesIndex.AccountService).toBeDefined();
      expect(typeof ServicesIndex.AccountService).toBe('function');
    });

    it('exports ClassroomService', () => {
      expect(ServicesIndex.ClassroomService).toBeDefined();
      expect(typeof ServicesIndex.ClassroomService).toBe('function');
    });
  });

  describe('function exports from chromadb', () => {
    it('exports uploadPostToChromaDB', () => {
      expect(ServicesIndex.uploadPostToChromaDB).toBeDefined();
      expect(typeof ServicesIndex.uploadPostToChromaDB).toBe('function');
    });

    it('exports queryPostsFromChromaDB', () => {
      expect(ServicesIndex.queryPostsFromChromaDB).toBeDefined();
      expect(typeof ServicesIndex.queryPostsFromChromaDB).toBe('function');
    });

    it('exports deletePostFromChromaDB', () => {
      expect(ServicesIndex.deletePostFromChromaDB).toBeDefined();
      expect(typeof ServicesIndex.deletePostFromChromaDB).toBe('function');
    });
  });

  describe('function exports from chat', () => {
    it('exports sendChatMessage', () => {
      expect(ServicesIndex.sendChatMessage).toBeDefined();
      expect(typeof ServicesIndex.sendChatMessage).toBe('function');
    });

    it('exports transcribeChatAudio', () => {
      expect(ServicesIndex.transcribeChatAudio).toBeDefined();
      expect(typeof ServicesIndex.transcribeChatAudio).toBe('function');
    });
  });

  describe('error handling exports', () => {
    it('exports isValidApiBaseUrl', () => {
      expect(ServicesIndex.isValidApiBaseUrl).toBeDefined();
      expect(typeof ServicesIndex.isValidApiBaseUrl).toBe('function');
    });
  });

  describe('type exports verification', () => {
    it('has expected service module exports count', () => {
      const exportKeys = Object.keys(ServicesIndex);
      
      // Verify we have a reasonable number of exports (services + functions + utilities)
      expect(exportKeys.length).toBeGreaterThan(10);
    });

    it('does not export test-only utilities', () => {
      const exportKeys = Object.keys(ServicesIndex);
      
      // Ensure no test files are accidentally exported
      exportKeys.forEach((key) => {
        expect(key).not.toMatch(/test|mock|spec/i);
      });
    });
  });

  describe('service functionality validation', () => {
    it('ApiClient has required static methods', () => {
      expect(typeof ServicesIndex.ApiClient.get).toBe('function');
      expect(typeof ServicesIndex.ApiClient.post).toBe('function');
      expect(typeof ServicesIndex.ApiClient.put).toBe('function');
      expect(typeof ServicesIndex.ApiClient.delete).toBe('function');
      expect(typeof ServicesIndex.ApiClient.setToken).toBe('function');
      expect(typeof ServicesIndex.ApiClient.clearToken).toBe('function');
      expect(typeof ServicesIndex.ApiClient.getToken).toBe('function');
    });

    it('AuthService has required static methods', () => {
      expect(typeof ServicesIndex.AuthService.register).toBe('function');
      expect(typeof ServicesIndex.AuthService.login).toBe('function');
      expect(typeof ServicesIndex.AuthService.logout).toBe('function');
      expect(typeof ServicesIndex.AuthService.getCurrentUser).toBe('function');
      expect(typeof ServicesIndex.AuthService.isAuthenticated).toBe('function');
      expect(typeof ServicesIndex.AuthService.validateToken).toBe('function');
      expect(typeof ServicesIndex.AuthService.validatePassword).toBe('function');
      expect(typeof ServicesIndex.AuthService.validateEmail).toBe('function');
    });

    it('AccountService has required static methods', () => {
      expect(typeof ServicesIndex.AccountService.getAccountDetails).toBe('function');
      expect(typeof ServicesIndex.AccountService.updateAccount).toBe('function');
      expect(typeof ServicesIndex.AccountService.deleteAccount).toBe('function');
      expect(typeof ServicesIndex.AccountService.getAccountClassrooms).toBe('function');
      expect(typeof ServicesIndex.AccountService.getAccountStats).toBe('function');
      expect(typeof ServicesIndex.AccountService.validateUpdateData).toBe('function');
    });

    it('ClassroomService has required static methods', () => {
      expect(typeof ServicesIndex.ClassroomService.createClassroom).toBe('function');
      expect(typeof ServicesIndex.ClassroomService.getClassroom).toBe('function');
      expect(typeof ServicesIndex.ClassroomService.updateClassroom).toBe('function');
      expect(typeof ServicesIndex.ClassroomService.deleteClassroom).toBe('function');
      expect(typeof ServicesIndex.ClassroomService.searchClassrooms).toBe('function');
      expect(typeof ServicesIndex.ClassroomService.connectClassrooms).toBe('function');
      expect(typeof ServicesIndex.ClassroomService.disconnectClassrooms).toBe('function');
    });
  });
});
