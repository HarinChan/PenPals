import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPosts, createPost, deletePost, likePost, unlikePost } from '../posts';
import { ApiClient } from '../api';

vi.mock('../api', () => ({
  ApiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('posts service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchPosts', () => {
    it('fetches posts and transforms timestamps to Date objects', async () => {
      const mockResponse = {
        posts: [
          {
            id: 'post-1',
            content: 'First post',
            authorId: 'user-1',
            timestamp: '2026-03-09T12:00:00Z',
            likes: 5,
            comments: 2,
          },
          {
            id: 'post-2',
            content: 'Second post',
            authorId: 'user-2',
            timestamp: '2026-03-09T13:00:00Z',
            likes: 10,
            comments: 3,
          },
        ],
      };

      vi.mocked(ApiClient.get).mockResolvedValue(mockResponse as any);

      const result = await fetchPosts();

      expect(ApiClient.get).toHaveBeenCalledWith('/posts');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('post-1');
      expect(result[0].timestamp).toBeInstanceOf(Date);
      expect(result[0].timestamp.toISOString()).toBe('2026-03-09T12:00:00.000Z');
      expect(result[1].id).toBe('post-2');
      expect(result[1].timestamp).toBeInstanceOf(Date);
      expect(result[1].timestamp.toISOString()).toBe('2026-03-09T13:00:00.000Z');
    });

    it('returns empty array when no posts exist', async () => {
      const mockResponse = { posts: [] };

      vi.mocked(ApiClient.get).mockResolvedValue(mockResponse as any);

      const result = await fetchPosts();

      expect(ApiClient.get).toHaveBeenCalledWith('/posts');
      expect(result).toEqual([]);
    });
  });

  describe('createPost', () => {
    it('creates post with content only and transforms timestamp', async () => {
      const mockResponse = {
        msg: 'Post created',
        post: {
          id: 'new-post-1',
          content: 'New post content',
          authorId: 'user-1',
          timestamp: '2026-03-09T14:00:00Z',
          likes: 0,
          comments: 0,
        },
      };

      vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

      const result = await createPost('New post content');

      expect(ApiClient.post).toHaveBeenCalledWith('/posts', {
        content: 'New post content',
        imageUrl: undefined,
        classroomId: undefined,
      });
      expect(result.id).toBe('new-post-1');
      expect(result.content).toBe('New post content');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.timestamp.toISOString()).toBe('2026-03-09T14:00:00.000Z');
    });

    it('creates post with content and imageUrl', async () => {
      const mockResponse = {
        msg: 'Post created',
        post: {
          id: 'new-post-2',
          content: 'Post with image',
          authorId: 'user-1',
          timestamp: '2026-03-09T15:00:00Z',
          imageUrl: 'https://example.com/image.jpg',
          likes: 0,
          comments: 0,
        },
      };

      vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

      const result = await createPost('Post with image', 'https://example.com/image.jpg');

      expect(ApiClient.post).toHaveBeenCalledWith('/posts', {
        content: 'Post with image',
        imageUrl: 'https://example.com/image.jpg',
        classroomId: undefined,
      });
      expect(result.imageUrl).toBe('https://example.com/image.jpg');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('creates post with content, imageUrl, and classroomId', async () => {
      const mockResponse = {
        msg: 'Post created',
        post: {
          id: 'new-post-3',
          content: 'Classroom post',
          authorId: 'user-1',
          classroomId: 'classroom-99',
          timestamp: '2026-03-09T16:00:00Z',
          likes: 0,
          comments: 0,
        },
      };

      vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

      const result = await createPost('Classroom post', undefined, 'classroom-99');

      expect(ApiClient.post).toHaveBeenCalledWith('/posts', {
        content: 'Classroom post',
        imageUrl: undefined,
        classroomId: 'classroom-99',
      });
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('creates post with all optional parameters', async () => {
      const mockResponse = {
        msg: 'Post created',
        post: {
          id: 'new-post-4',
          content: 'Full post',
          authorId: 'user-1',
          classroomId: 'classroom-100',
          timestamp: '2026-03-09T17:00:00Z',
          imageUrl: 'https://example.com/full.jpg',
          likes: 0,
          comments: 0,
        },
      };

      vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

      const result = await createPost(
        'Full post',
        'https://example.com/full.jpg',
        'classroom-100'
      );

      expect(ApiClient.post).toHaveBeenCalledWith('/posts', {
        content: 'Full post',
        imageUrl: 'https://example.com/full.jpg',
        classroomId: 'classroom-100',
      });
      expect(result.imageUrl).toBe('https://example.com/full.jpg');
    });
  });

  describe('deletePost', () => {
    it('deletes post by postId', async () => {
      vi.mocked(ApiClient.delete).mockResolvedValue(undefined as any);

      await deletePost('post-to-delete');

      expect(ApiClient.delete).toHaveBeenCalledWith('/posts/post-to-delete');
    });

    it('returns void on successful delete', async () => {
      vi.mocked(ApiClient.delete).mockResolvedValue({ msg: 'Deleted' } as any);

      const result = await deletePost('post-123');

      expect(result).toBeUndefined();
    });
  });

  describe('likePost', () => {
    it('likes post and returns updated like count', async () => {
      const mockResponse = { msg: 'Post liked', likes: 42 };
      vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

      const result = await likePost('post-like-1');

      expect(ApiClient.post).toHaveBeenCalledWith('/posts/post-like-1/like');
      expect(result).toBe(42);
    });

    it('returns 0 when like count is 0', async () => {
      const mockResponse = { msg: 'Post liked', likes: 0 };
      vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

      const result = await likePost('post-first-like');

      expect(result).toBe(0);
    });
  });

  describe('unlikePost', () => {
    it('unlikes post and returns updated like count', async () => {
      const mockResponse = { msg: 'Post unliked', likes: 15 };
      vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

      const result = await unlikePost('post-unlike-1');

      expect(ApiClient.post).toHaveBeenCalledWith('/posts/post-unlike-1/unlike');
      expect(result).toBe(15);
    });

    it('returns 0 when no likes remain', async () => {
      const mockResponse = { msg: 'Post unliked', likes: 0 };
      vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

      const result = await unlikePost('post-no-likes');

      expect(result).toBe(0);
    });
  });
});
