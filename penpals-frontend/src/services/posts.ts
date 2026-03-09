import { ApiClient } from './api';
import { Post } from '../components/PostCreator';

export interface PostResponse {
    posts: Post[];
}

const parseServerTimestamp = (value: string): Date => {
    if (!value) return new Date();
    const hasTimezone = /[zZ]|[+-]\d{2}:\d{2}$/.test(value);
    // Treat naive ISO strings from backend as UTC to avoid local-time skew.
    return new Date(hasTimezone ? value : `${value}Z`);
};

export const fetchPosts = async (): Promise<Post[]> => {
    const data = await ApiClient.get<{ posts: any[] }>('/posts');

    // Map backend response to frontend Post interface
    return data.posts.map((p: any) => ({
        ...p,
        timestamp: parseServerTimestamp(p.timestamp)
    }));
};

export const createPost = async (content: string, imageUrl?: string, classroomId?: string): Promise<Post> => {
    const data = await ApiClient.post<{ msg: string; post: any }>('/posts', { content, imageUrl, classroomId });

    return {
        ...data.post,
        timestamp: parseServerTimestamp(data.post.timestamp)
    };
};

export const deletePost = async (postId: string): Promise<void> => {
    await ApiClient.delete(`/posts/${postId}`);
};


export const likePost = async (postId: string): Promise<number> => {
    const data = await ApiClient.post<{ msg: string; likes: number }>(`/posts/${postId}/like`);
    return data.likes;
};

export const unlikePost = async (postId: string): Promise<number> => {
    const data = await ApiClient.post<{ msg: string; likes: number }>(`/posts/${postId}/unlike`);
    return data.likes;
};
