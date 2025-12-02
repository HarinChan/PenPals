# ChromaDB Integration - PenPals

## Overview

This integration adds semantic search capabilities to the PenPals application using ChromaDB for document embeddings. Posts are automatically indexed when created, allowing users to search through content using natural language queries.

## Architecture

### Backend (`penpals-backend/`)

#### ChromaDB Service (`src/chromadb_service.py`)

- **Collection Management**: Persistent storage in `./chroma_db` directory
- **Default Embeddings**: Uses ChromaDB's built-in embedding function (lightweight)
- **Operations**:
  - Add documents with metadata
  - Query for similar documents
  - Update/delete documents
  - Get collection statistics

#### API Endpoints (`main.py`)

- `POST /api/documents/upload` - Upload post documents
- `POST /api/documents/query` - Search for similar posts
- `DELETE /api/documents/delete` - Remove documents
- `GET /api/documents/info` - Collection statistics
- `PUT /api/documents/update` - Update existing documents

### Frontend (`penpals-frontend/`)

#### New Files

1. **`src/types.ts`** - Centralized type definitions
2. **`src/services/chromadb.ts`** - API client for ChromaDB operations
3. **`src/components/PostSearch.tsx`** - Search UI component

#### Modified Files

1. **`App.tsx`** - Post creation now uploads to ChromaDB
2. **`FeedPanel.tsx`** - Added "Search" tab with search interface

## Features

### Automatic Indexing

When a post is created:

```typescript
{
  documents: [post.content],
  metadatas: [{
    postId: string,
    authorId: string,
    authorName: string,
    timestamp: ISO string,
    likes: number,
    comments: number,
    imageUrl?: string
  }],
  ids: [postId]
}
```

### Semantic Search

- Natural language queries
- Similarity scoring (0-100%)
- Color-coded results:
  - 🟢 Green: 80%+ match
  - 🔵 Blue: 60-79% match
  - 🟡 Yellow: 40-59% match
  - ⚪ Gray: <40% match

### Search UI

- Real-time search with loading states
- Result cards with author, timestamp, and content
- Similarity percentage badges
- Clear search functionality

## Installation

### Backend

```bash
cd penpals-backend
pip install -r requirements.txt
python main.py
```

### Frontend

```bash
cd penpals-frontend
npm install
npm run dev
```

## Dependencies

### Backend

- `flask==3.0.0`
- `flask-cors==4.0.0`
- `chromadb==0.4.22`
- `requests==2.31.0`
- `numpy<2.0.0` (for ChromaDB compatibility)

### Frontend

- Existing React dependencies
- No additional packages needed

## Usage

### Creating Posts

Posts are automatically indexed in ChromaDB when created through the UI. No additional action required.

### Searching Posts

1. Navigate to the "Search" tab in the Feed panel
2. Enter a natural language query (e.g., "teaching math", "outdoor activities")
3. Click "Search" or press Enter
4. View results sorted by similarity score

### API Examples

**Upload a post:**

```bash
curl -X POST http://localhost:5001/api/documents/upload \
  -H "Content-Type: application/json" \
  -d '{
    "documents": ["Excited to teach biology today!"],
    "metadatas": [{
      "postId": "post-123",
      "authorId": "user-1",
      "authorName": "John Doe",
      "timestamp": "2025-12-01T10:00:00Z",
      "likes": 0,
      "comments": 0
    }],
    "ids": ["post-123"]
  }'
```

**Search posts:**

```bash
curl -X POST http://localhost:5001/api/documents/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "teaching science",
    "n_results": 5
  }'
```

## Technical Details

### Embedding Strategy

- Uses ChromaDB's default embedding function
- Lightweight and fast
- No external model downloads required
- Suitable for moderate-sized datasets

### Storage

- Data persisted in `penpals-backend/chroma_db/`
- Collection name: `penpals_documents`
- Survives server restarts

### Error Handling

- Frontend gracefully handles backend unavailability
- Posts still created even if indexing fails
- User feedback via toast notifications

## Future Enhancements

- [ ] Batch upload existing posts on app startup
- [ ] Advanced filters (by author, date range, etc.)
- [ ] Post recommendations based on interests
- [ ] Export/import ChromaDB collections
- [ ] Analytics dashboard for popular topics
- [ ] Multi-language support

## Troubleshooting

**Issue**: ChromaDB fails to start

- **Solution**: Ensure `numpy<2.0.0` is installed

**Issue**: Search returns no results

- **Solution**: Check backend is running on `localhost:5001`
- **Solution**: Verify posts have been created and indexed

**Issue**: CORS errors

- **Solution**: Backend `flask-cors` properly configured for `localhost`

## Performance Considerations

- ChromaDB collection grows with each post
- Recommended: Implement cleanup for old/deleted posts
- Current setup suitable for ~10,000 posts
- For larger datasets, consider ChromaDB cloud or dedicated server
