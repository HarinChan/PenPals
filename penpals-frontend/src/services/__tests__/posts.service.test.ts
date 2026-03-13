import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchPosts,
  createPost,
  deletePost,
  likePost,
  unlikePost,
  uploadPostAttachmentFile,
  uploadPostAttachments,
} from '../posts';
import { ApiClient, ApiError } from '../api';

vi.mock('../api', () => ({
  ApiError: class MockApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
    }
  },
  ApiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
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

    it('normalizes missing attachment arrays in post and quoted post', async () => {
      vi.mocked(ApiClient.get).mockResolvedValue({
        posts: [
          {
            id: 'post-with-quote',
            content: 'Main post',
            authorId: 'user-1',
            timestamp: '2026-03-09T12:00:00Z',
            likes: 0,
            comments: 0,
            quotedPost: {
              id: 'quoted-1',
              content: 'Quoted post',
              authorId: 'user-2',
              timestamp: '2026-03-09T10:00:00Z',
              likes: 0,
              comments: 0,
            },
          },
        ],
      } as any);

      const [post] = await fetchPosts();

      expect(post.attachments).toEqual([]);
      expect(post.quotedPost?.attachments).toEqual([]);
      expect(post.timestamp).toBeInstanceOf(Date);
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
        attachments: [],
      });
      expect(result.id).toBe('new-post-1');
      expect(result.content).toBe('New post content');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.timestamp.toISOString()).toBe('2026-03-09T14:00:00.000Z');
    });

    it('creates post with content and attachments', async () => {
      const mockAttachment = {
        filename: 'image.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024,
        storageKey: 'tests/image.jpg',
        url: 'https://example.com/image.jpg',
      };
      const mockResponse = {
        msg: 'Post created',
        post: {
          id: 'new-post-2',
          content: 'Post with image',
          authorId: 'user-1',
          timestamp: '2026-03-09T15:00:00Z',
          attachments: [mockAttachment],
          likes: 0,
          comments: 0,
        },
      };

      vi.mocked(ApiClient.post).mockResolvedValue(mockResponse as any);

      const result = await createPost('Post with image', [mockAttachment]);

      expect(ApiClient.post).toHaveBeenCalledWith('/posts', {
        content: 'Post with image',
        attachments: [mockAttachment],
      });
      expect(result.attachments).toEqual([mockAttachment]);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('normalizes missing attachments in created post payload', async () => {
      vi.mocked(ApiClient.post).mockResolvedValue({
        msg: 'Post created',
        post: {
          id: 'new-post-3',
          content: 'No attachments key',
          authorId: 'user-1',
          timestamp: '2026-03-09T16:00:00Z',
          likes: 0,
          comments: 0,
        },
      } as any);

      const result = await createPost('No attachments key');

      expect(result.attachments).toEqual([]);
      expect(result.timestamp.toISOString()).toBe('2026-03-09T16:00:00.000Z');
    });
  });

  describe('uploadPostAttachmentFile', () => {
    it('uploads file and maps response to CreateAttachment', async () => {
      const file = new File(['img-bytes'], 'my photo.jpg', { type: 'image/jpeg' });
      vi.mocked(ApiClient.request).mockResolvedValue({
        attachment: {
          publicUrl: 'https://cdn.example.com/my-photo.jpg',
          key: 'uploads/my-photo.jpg',
          sizeBytes: 9,
          contentType: 'image/jpeg',
        },
      } as any);

      const result = await uploadPostAttachmentFile(file);

      expect(ApiClient.request).toHaveBeenCalledWith(
        '/posts/attachments/upload',
        expect.objectContaining({ method: 'POST', body: expect.any(FormData) })
      );
      expect(result).toEqual({
        filename: 'my photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 9,
        storageKey: 'uploads/my-photo.jpg',
        url: 'https://cdn.example.com/my-photo.jpg',
      });
    });

    it('falls back to second endpoint on 404 from first endpoint', async () => {
      const file = new File(['doc'], 'notes.txt', { type: 'text/plain' });

      vi.mocked(ApiClient.request)
        .mockRejectedValueOnce(new ApiError('Not Found', 404))
        .mockResolvedValueOnce({
          url: 'https://cdn.example.com/notes.txt',
          name: 'notes.txt',
          mimeType: 'text/plain',
          sizeBytes: 3,
          storageKey: 'uploads/notes.txt',
        } as any);

      const result = await uploadPostAttachmentFile(file);

      expect(ApiClient.request).toHaveBeenNthCalledWith(
        1,
        '/posts/attachments/upload',
        expect.objectContaining({ method: 'POST', body: expect.any(FormData) })
      );
      expect(ApiClient.request).toHaveBeenNthCalledWith(
        2,
        '/posts/attachments',
        expect.objectContaining({ method: 'POST', body: expect.any(FormData) })
      );
      expect(result.url).toBe('https://cdn.example.com/notes.txt');
    });

    it('throws when upload response has no valid URL', async () => {
      const file = new File(['bad'], 'bad.png', { type: 'image/png' });
      vi.mocked(ApiClient.request).mockResolvedValue({ attachment: {} } as any);

      await expect(uploadPostAttachmentFile(file)).rejects.toThrow(
        'Upload response did not include an attachment URL.'
      );
    });

    it('throws non-404 errors without trying fallback endpoint', async () => {
      const file = new File(['x'], 'x.txt', { type: 'text/plain' });
      vi.mocked(ApiClient.request).mockRejectedValue(new ApiError('Server Error', 500));

      await expect(uploadPostAttachmentFile(file)).rejects.toMatchObject({
        message: 'Server Error',
        status: 500,
      });
      expect(ApiClient.request).toHaveBeenCalledTimes(1);
    });
  });

  describe('uploadPostAttachments', () => {
    it('uploads all files and resolves mapped attachments', async () => {
      const first = new File(['a'], 'first.png', { type: 'image/png' });
      const second = new File(['b'], 'second.png', { type: 'image/png' });

      vi.mocked(ApiClient.request)
        .mockResolvedValueOnce({ url: 'https://cdn.example.com/first.png', storageKey: 'k1' } as any)
        .mockResolvedValueOnce({ url: 'https://cdn.example.com/second.png', storageKey: 'k2' } as any);

      const result = await uploadPostAttachments([first, second]);

      expect(result).toHaveLength(2);
      expect(result[0].url).toBe('https://cdn.example.com/first.png');
      expect(result[1].url).toBe('https://cdn.example.com/second.png');
      expect(ApiClient.request).toHaveBeenCalledTimes(2);
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
