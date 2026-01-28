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
    const response = await fetch(`${API_BASE_URL}/documents/upload`, {
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
    const response = await fetch(`${API_BASE_URL}/documents/delete`, {
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
    const response = await fetch(`${API_BASE_URL}/documents/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
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