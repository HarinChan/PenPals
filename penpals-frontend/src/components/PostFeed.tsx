import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Heart, Trash2, Edit2 } from 'lucide-react';
import { Post } from './PostCreator';
import { toast } from 'sonner';
import { Textarea } from './ui/textarea';

interface PostFeedProps {
  posts: Post[];
  onLikePost?: (postId: string) => void;
  likedPosts?: Set<string>;
  onDeletePost?: (postId: string) => void;
  onEditPost?: (postId: string, newContent: string) => void;
  currentUserId?: string;
}

export default function PostFeed({ posts, onLikePost, likedPosts, onDeletePost, onEditPost, currentUserId }: PostFeedProps) {
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const handleEditClick = (post: Post) => {
    setEditingPostId(post.id);
    setEditContent(post.content);
  };

  const handleSaveEdit = async (postId: string) => {
    if (!editContent.trim()) {
      toast.error('Post content cannot be empty');
      return;
    }
    onEditPost?.(postId, editContent);
    setEditingPostId(null);
    setEditContent('');
  };

  const handleDeleteClick = async (postId: string) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      onDeletePost?.(postId);
    }
  };

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 px-4 text-slate-500 dark:text-slate-400">
        No posts yet. Be the first to share something!
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {posts.map((post) => {
          const isLiked = likedPosts?.has(post.id) || false;
          
          return (
            <div key={post.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shrink-0">
                  {post.authorName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-slate-900 dark:text-slate-100">{post.authorName}</span>
                    <span className="text-slate-500 dark:text-slate-400 text-sm">
                      {formatTimestamp(post.timestamp)}
                    </span>
                  </div>
                  {editingPostId === post.id ? (
                    <div className="space-y-2 mb-3">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[100px] resize-none bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingPostId(null)}
                          className="border-slate-300 dark:border-slate-600"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(post.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words mb-3">
                      {post.content}
                    </p>
                  )}
                  <div className="flex items-center gap-6 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onLikePost?.(post.id)}
                      className={`-ml-2 ${
                        isLiked
                          ? 'text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-600'
                          : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
                      }`}
                    >
                      <Heart className={`w-4 h-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                      {post.likes > 0 && <span>{post.likes}</span>}
                    </Button>
                    {currentUserId === post.authorId && !editingPostId && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(post)}
                          className="text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400"
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(post.id)}
                          className="text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
