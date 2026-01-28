import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, Loader2, X, Trash2, Edit2 } from 'lucide-react';
import { queryPostsFromChromaDB, ChromaDBQueryResponse } from '../services/chromadb';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { Post } from './PostCreator';

interface SearchResult {
  id: string;
  content: string;
  authorName: string;
  authorId: string;
  timestamp: string;
  similarity: number;
  imageUrl?: string;
}

interface PostSearchProps {
  currentUserId?: string;
  onDeletePost?: (postId: string) => void;
  onEditPost?: (postId: string, newContent: string) => void;
}

export default function PostSearch({ currentUserId, onDeletePost, onEditPost }: PostSearchProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);

    try {
      const response = await queryPostsFromChromaDB(query, 10);
      
      if (response.status === 'success' && response.results) {
        const searchResults: SearchResult[] = response.results.map(result => ({
          id: result.id,
          content: result.document,
          authorName: result.metadata.authorName || 'Unknown',
          authorId: result.metadata.authorId || '',
          timestamp: result.metadata.timestamp || new Date().toISOString(),
          similarity: result.similarity,
          imageUrl: result.metadata.imageUrl,
        }));
        setResults(searchResults);
      } else {
        setResults([]);
        console.error('Search failed:', response.message);
      }
    } catch (error) {
      console.error('Error searching posts:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Unknown date';
    }
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.8) return 'bg-green-500';
    if (similarity >= 0.6) return 'bg-blue-500';
    if (similarity >= 0.4) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const handleEditClick = (result: SearchResult) => {
    setEditingPostId(result.id);
    setEditContent(result.content);
  };

  const handleSaveEdit = async (postId: string) => {
    if (!editContent.trim()) {
      toast.error('Post content cannot be empty');
      return;
    }

    if (onEditPost) {
      await onEditPost(postId, editContent);
      setEditingPostId(null);
      setEditContent('');
      
      // Update the result in the search results
      setResults(results.map(r => 
        r.id === postId ? { ...r, content: editContent } : r
      ));
    }
  };

  const handleDeleteClick = (postId: string) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      if (onDeletePost) {
        onDeletePost(postId);
        setResults(results.filter(r => r.id !== postId));
        toast.success('Post deleted successfully!');
      }
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search posts by content..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                disabled={isSearching}
              />
            </div>
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClear}
                className="text-slate-600 dark:text-slate-400"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSearching || !query.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Semantic search powered by ChromaDB - finds posts by meaning, not just keywords
          </p>
        </form>
      </Card>

      {/* Search Results */}
      {hasSearched && (
        <Card className="p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Search Results
              </h3>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {results.length} result{results.length !== 1 ? 's' : ''} found
              </span>
            </div>

            {results.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                {isSearching ? 'Searching...' : 'No posts found matching your search.'}
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((result) => (
                  <Card
                    key={result.id}
                    className="p-3 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm shrink-0">
                              {result.authorName.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-slate-900 dark:text-slate-100 block truncate">
                                {result.authorName}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {formatTimestamp(result.timestamp)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge
                          className={`${getSimilarityColor(result.similarity)} text-white text-xs shrink-0`}
                        >
                          {(result.similarity * 100).toFixed(0)}% match
                        </Badge>
                      </div>

                      {editingPostId === result.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                            rows={3}
                          />
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingPostId(null)}
                              className="text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600"
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(result.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                            {result.content}
                          </p>
                          {result.imageUrl && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 italic">
                              📷 Contains image
                            </div>
                          )}

                          {currentUserId === result.authorId && (
                            <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditClick(result)}
                                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex-1"
                              >
                                <Edit2 className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteClick(result.id)}
                                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex-1"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
