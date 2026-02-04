// API Service for ChromaDB operations

const API_BASE_URL = 'http://localhost:5001/api';

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
    const token = localStorage.getItem('penpals_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      headers,
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
  nResults: number = 5
): Promise<ChromaDBQueryResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/documents/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        n_results: nResults,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error querying ChromaDB:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
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
    const token = localStorage.getItem('penpals_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/documents/delete`, {
      method: 'DELETE',
      headers,
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
/**
 * Update a post document in ChromaDB
 */
export async function updateDocument(
  documentId: string,
  document: string,
  metadata: Record<string, any>
): Promise<{
  status: 'success' | 'error';
  message: string;
}> {
  try {
    const token = localStorage.getItem('penpals_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/documents/update`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        id: documentId,
        document,
        metadata,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating document in ChromaDB:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fetch posts from the database
 */
export async function fetchPostsFromDatabase(): Promise<{
  status: 'success' | 'error';
  posts?: Array<{
    id: string;
    authorId: string;
    authorName: string;
    content: string;
    timestamp: string;
    likes: number;
    comments: number;
  }>;
  message?: string;
}> {
  try {
    const token = localStorage.getItem('penpals_token');
    if (!token) {
      return {
        status: 'error',
        message: 'No authentication token found',
        posts: [],
      };
    }

    const response = await fetch(`${API_BASE_URL}/documents/list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching posts from database:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      posts: [],
    };
  }
}