// API Service for ChromaDB operations

const API_BASE_URL = 'http://localhost:5001';

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
  imageUrl?: string;
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
    // Backend exposes a /search endpoint that returns posts
    const params = new URLSearchParams({ q: query, n: String(nResults) });
    const response = await fetch(`${API_BASE_URL}/search?${params.toString()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();

    // Map backend /search response to the previous chroma-like shape expected by UI
    // Backend returns: { status: 'success', count, posts: [ { id, authorId, content, timestamp, imageUrl, media_url, media_mimetype } ] }
    if (json.status !== 'success' || !Array.isArray(json.posts)) {
      return { status: 'error', message: json.message || 'Invalid response' };
    }

    const results = json.posts.map((p: any) => ({
      id: p.id,
      document: p.content,
      metadata: {
        authorName: p.authorId || p.metadata?.authorName,
        timestamp: p.timestamp,
        imageUrl: p.imageUrl || p.media_url,
      },
      // If the backend included similarity/distance (future-proof), use it.
      distance: typeof p.distance === 'number' ? p.distance : (typeof p.media_distance === 'number' ? p.media_distance : null),
      similarity: typeof p.similarity === 'number' ? p.similarity : (typeof p.distance === 'number' ? 1 - p.distance : null),
    }));

    return { status: 'success', results, count: results.length };
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
