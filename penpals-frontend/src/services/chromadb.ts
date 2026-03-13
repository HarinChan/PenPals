// API Service for ChromaDB operations
import { ApiClient } from './api';

// Use environment variable or default to localhost:5001
const runtimeImportMeta = import.meta as ImportMeta & {
  env?: Record<string, string | undefined>;
};
const API_BASE_URL = runtimeImportMeta.env?.VITE_API_BASE_URL?.trim() || 'http://127.0.0.1:5001/api';
const getApiBaseUrl = () => API_BASE_URL;

export interface ChromaDBUploadResponse {
  status: 'success' | 'error';
  message: string;
  document_ids?: string[];
}

export interface ChromaDBQueryResponse {
  status: 'success' | 'error';
  query?: string;
  results?: Array<{
    id: string;
    document: string;
    metadata: Record<string, any>;
    distance: number;
    similarity: number;
  }>;
  count?: number;
  message?: string;
}

export interface PostMetadata {
  postId: string;
  authorId: string;
  authorName: string;
  timestamp: string;
  likes: number;
  comments: number;
  attachmentCount?: number;
}

/**
 * Upload a post document to ChromaDB
 */
export async function uploadPostToChromaDB(
  postId: string,
  content: string,
  metadata: PostMetadata
): Promise<ChromaDBUploadResponse> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/documents/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documents: [content],
        metadatas: [metadata],
        ids: [postId],
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading post to ChromaDB:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Query ChromaDB for similar posts
 */
export async function queryPostsFromChromaDB(
  query: string,
  nResults: number = 10
): Promise<ChromaDBQueryResponse> {
  const token = localStorage.getItem('access_token') || localStorage.getItem('penpals_token');
  const response = await fetch(`${ApiClient.getBaseUrl()}/documents/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, n_results: nResults }),
  });

  if (!response.ok) {
    throw new Error(`Query failed: ${response.status}`);
  }

  return response.json() as Promise<ChromaDBQueryResponse>;
}

/**
 * Delete a post from ChromaDB
 */
export async function deletePostFromChromaDB(postId: string): Promise<{
  status: 'success' | 'error';
  message: string;
  deleted_ids?: string[];
}> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/documents/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ids: [postId],
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting post from ChromaDB:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
