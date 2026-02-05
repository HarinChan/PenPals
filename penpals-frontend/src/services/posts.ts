import { ApiClient } from './api';
import { Post } from '../components/PostCreator';

export interface PostResponse {
    posts: Post[];
}

export const fetchPosts = async (): Promise<Post[]> => {
    const data = await ApiClient.get<{ posts: any[] }>('/posts');

    // Map backend response to frontend Post interface
    return data.posts.map((p: any) => ({
        ...p,
        timestamp: new Date(p.timestamp)
    }));
};

export const createPost = async (content: string, imageUrl?: string, quotedPostId?: string): Promise<Post> => {
    const data = await ApiClient.post<{ msg: string; post: any }>('/posts', { content, imageUrl, quotedPostId });

    return {
        ...data.post,
        timestamp: new Date(data.post.timestamp)
    };
};

export const likePost = async (postId: string): Promise<number> => {
    const data = await ApiClient.post<{ msg: string; likes: number }>(`/posts/${postId}/like`);
    return data.likes;
};

export const unlikePost = async (postId: string): Promise<number> => {
    const data = await ApiClient.post<{ msg: string; likes: number }>(`/posts/${postId}/unlike`);
    return data.likes;
};
