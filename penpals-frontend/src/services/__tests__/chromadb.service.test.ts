import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  uploadPostToChromaDB,
  queryPostsFromChromaDB,
  deletePostFromChromaDB,
  type PostMetadata,
} from '../chromadb';

// Mock global fetch
global.fetch = vi.fn();

describe('chromadb service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadPostToChromaDB', () => {
    it('uploads post with correct payload and returns success response', async () => {
      const mockResponse = {
        status: 'success',
        message: 'Document uploaded',
        document_ids: ['post-123'],
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const metadata: PostMetadata = {
        postId: 'post-123',
        authorId: 'user-1',
        authorName: 'Alice',
        timestamp: '2026-03-09T12:00:00Z',
        likes: 5,
        comments: 2,
        attachmentCount: 1,
      };

      const result = await uploadPostToChromaDB('post-123', 'Hello world!', metadata);

      expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:5001/api/documents/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documents: ['Hello world!'],
          metadatas: [metadata],
          ids: ['post-123'],
        }),
      });
      expect(result).toEqual(mockResponse);
    });

    it('returns error response when fetch response is not ok', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const metadata: PostMetadata = {
        postId: 'post-456',
        authorId: 'user-2',
        authorName: 'Bob',
        timestamp: '2026-03-09T12:00:00Z',
        likes: 0,
        comments: 0,
      };

      const result = await uploadPostToChromaDB('post-456', 'Content', metadata);

      expect(result).toEqual({
        status: 'error',
        message: 'HTTP error! status: 500',
      });
    });

    it('catches and returns error when fetch throws', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network failure'));

      const metadata: PostMetadata = {
        postId: 'post-789',
        authorId: 'user-3',
        authorName: 'Charlie',
        timestamp: '2026-03-09T12:00:00Z',
        likes: 0,
        comments: 0,
      };

      const result = await uploadPostToChromaDB('post-789', 'Test', metadata);

      expect(result).toEqual({
        status: 'error',
        message: 'Network failure',
      });
    });

    it('handles non-Error thrown values gracefully', async () => {
      vi.mocked(fetch).mockRejectedValue('unexpected string error');

      const metadata: PostMetadata = {
        postId: 'post-999',
        authorId: 'user-4',
        authorName: 'Dana',
        timestamp: '2026-03-09T12:00:00Z',
        likes: 0,
        comments: 0,
      };

      const result = await uploadPostToChromaDB('post-999', 'Data', metadata);

      expect(result).toEqual({
        status: 'error',
        message: 'Unknown error',
      });
    });
  });

  describe('queryPostsFromChromaDB', () => {
    it('queries with default n_results and returns results', async () => {
      const mockResponse = {
        status: 'success',
        query: 'search term',
        results: [
          {
            id: 'post-1',
            document: 'First post',
            metadata: { postId: 'post-1', authorId: 'user-1' },
            distance: 0.1,
            similarity: 0.9,
          },
        ],
        count: 1,
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await queryPostsFromChromaDB('search term');

      expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:5001/api/documents/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'search term',
          n_results: 10,
        }),
      });
      expect(result).toEqual(mockResponse);
    });

    it('queries with custom n_results parameter', async () => {
      const mockResponse = {
        status: 'success',
        query: 'custom query',
        results: [],
        count: 0,
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await queryPostsFromChromaDB('custom query', 10);

      expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:5001/api/documents/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'custom query',
          n_results: 10,
        }),
      });
      expect(result).toEqual(mockResponse);
    });

    it('throws error when fetch response is not ok', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      await expect(queryPostsFromChromaDB('test query')).rejects.toThrow('Query failed: 404');
    });

    it('catches and throws error when fetch throws', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Connection refused'));

      await expect(queryPostsFromChromaDB('test')).rejects.toThrow('Connection refused');
    });

    it('handles non-Error thrown values gracefully', async () => {
      vi.mocked(fetch).mockRejectedValue(42);

      await expect(queryPostsFromChromaDB('numeric error')).rejects.toEqual(42);
    });
  });

  describe('deletePostFromChromaDB', () => {
    it('deletes post and returns success response', async () => {
      const mockResponse = {
        status: 'success',
        message: 'Document deleted',
        deleted_ids: ['post-123'],
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await deletePostFromChromaDB('post-123');

      expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:5001/api/documents/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: ['post-123'],
        }),
      });
      expect(result).toEqual(mockResponse);
    });

    it('returns error response when fetch response is not ok', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 403,
      } as Response);

      const result = await deletePostFromChromaDB('post-forbidden');

      expect(result).toEqual({
        status: 'error',
        message: 'HTTP error! status: 403',
      });
    });

    it('catches and returns error when fetch throws', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Timeout'));

      const result = await deletePostFromChromaDB('post-timeout');

      expect(result).toEqual({
        status: 'error',
        message: 'Timeout',
      });
    });

    it('handles non-Error thrown values gracefully', async () => {
      vi.mocked(fetch).mockRejectedValue({ code: 'ECONNRESET' });

      const result = await deletePostFromChromaDB('post-reset');

      expect(result).toEqual({
        status: 'error',
        message: 'Unknown error',
      });
    });
  });
});
