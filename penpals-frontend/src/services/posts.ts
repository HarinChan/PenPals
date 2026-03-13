import { ApiClient, ApiError } from './api';
import { CreateAttachment, Post } from '../components/PostCreator';

export interface PostResponse {
    posts: Post[];
}

const runtimeImportMeta = import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
};

const runtimeEnv = (import.meta as ImportMeta & {
    env?: Record<string, unknown>;
}).env;

const UPLOAD_ENDPOINTS = (runtimeImportMeta.env?.VITE_POST_ATTACHMENT_UPLOAD_ENDPOINTS || '/posts/attachments/upload,/posts/attachments')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const sanitizeFileName = (fileName: string): string =>
    fileName.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '_');

const FORCE_HTTPS_UPLOAD_URLS =
    runtimeImportMeta.env?.VITE_FORCE_HTTPS_UPLOAD_URLS === 'true' || runtimeEnv?.PROD === true;

const normalizeAttachmentUrl = (url: unknown): string => {
    if (typeof url !== 'string' || !url.trim()) {
        throw new Error('Upload response did not include an attachment URL.');
    }

    const normalizedUrl = url.trim();
    if (FORCE_HTTPS_UPLOAD_URLS && !normalizedUrl.startsWith('https://')) {
        throw new Error(`Upload URL must be https:// but got: ${url}`);
    }

    return normalizedUrl;
};

const normalizeUploadedAttachment = (uploaded: any, file: File): CreateAttachment => {
    const source = uploaded?.attachment || uploaded?.file || uploaded?.data || uploaded || {};
    const url = normalizeAttachmentUrl(
        source.url || source.publicUrl || source.httpsUrl || source.fileUrl || uploaded?.url || uploaded?.publicUrl || uploaded?.httpsUrl
    );

    return {
        filename: source.filename || source.name || file.name,
        mimeType: source.mimeType || source.contentType || file.type || 'application/octet-stream',
        sizeBytes: typeof source.sizeBytes === 'number' ? source.sizeBytes : file.size,
        storageKey: source.storageKey || source.key || source.path || `posts/tmp/${Date.now()}-${sanitizeFileName(file.name)}`,
        url,
    };
};

export const uploadPostAttachmentFile = async (file: File): Promise<CreateAttachment> => {
    const formData = new FormData();
    formData.append('file', file, file.name);

    let lastError: unknown = null;
    for (const endpoint of UPLOAD_ENDPOINTS) {
        try {
            const uploaded = await ApiClient.request<any>(endpoint, {
                method: 'POST',
                body: formData,
            });
            return normalizeUploadedAttachment(uploaded, file);
        } catch (error) {
            lastError = error;
            if (error instanceof ApiError && error.status === 404) {
                continue;
            }
            throw error;
        }
    }

    throw lastError instanceof Error
        ? lastError
        : new Error('Attachment upload endpoint not found. Set VITE_POST_ATTACHMENT_UPLOAD_ENDPOINTS.');
};

export const uploadPostAttachments = async (files: File[]): Promise<CreateAttachment[]> => {
    return Promise.all(files.map((file) => uploadPostAttachmentFile(file)));
};

export const fetchPosts = async (): Promise<Post[]> => {
    const data = await ApiClient.get<{ posts: any[] }>('/posts');

    // Map backend response to frontend Post interface
    return data.posts.map((p: any) => ({
        ...p,
        attachments: Array.isArray(p.attachments) ? p.attachments : [],
        quotedPost: p.quotedPost
            ? {
                ...p.quotedPost,
                attachments: Array.isArray(p.quotedPost.attachments) ? p.quotedPost.attachments : [],
            }
            : undefined,
        timestamp: new Date(p.timestamp)
    }));
};

export const createPost = async (content: string, attachments?: CreateAttachment[]): Promise<Post> => {
    const data = await ApiClient.post<{ msg: string; post: any }>('/posts', {
        content,
        attachments: attachments ?? [],
    });

    return {
        ...data.post,
        attachments: Array.isArray(data.post.attachments) ? data.post.attachments : [],
        quotedPost: data.post.quotedPost
            ? {
                ...data.post.quotedPost,
                attachments: Array.isArray(data.post.quotedPost.attachments) ? data.post.quotedPost.attachments : [],
            }
            : undefined,
        timestamp: new Date(data.post.timestamp)
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
