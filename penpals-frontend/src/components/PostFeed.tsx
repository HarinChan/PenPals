import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Heart, Quote, Share2, Copy, Link as LinkIcon } from 'lucide-react';
import { Post } from './PostCreator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { toast } from 'sonner@2.0.3';

interface PostFeedProps {
  posts: Post[];
  onLikePost?: (postId: string) => void;
  likedPosts?: Set<string>;
  onQuotePost?: (post: Post) => void;
}

export default function PostFeed({ posts, onLikePost, likedPosts, onQuotePost }: PostFeedProps) {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

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

  const handleShareClick = (post: Post) => {
    setSelectedPost(post);
    setShareDialogOpen(true);
  };

  const copyPostContent = () => {
    if (!selectedPost) return;
    
    let content = `${selectedPost.authorName}\n\n${selectedPost.content}`;
    if (selectedPost.imageUrl) {
      content += `\n\nImage: ${selectedPost.imageUrl}`;
    }
    
    navigator.clipboard.writeText(content);
    toast.success('Post content copied to clipboard!');
    setShareDialogOpen(false);
  };

  const copyPostLink = () => {
    if (!selectedPost) return;
    
    const link = `https://mirrormirror.app/post/${selectedPost.id}`;
    navigator.clipboard.writeText(link);
    toast.success('Post link copied to clipboard!');
    setShareDialogOpen(false);
  };

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
        No posts yet. Be the first to share something!
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {posts.map((post) => {
          const isLiked = likedPosts?.has(post.id) || false;
          
          return (
            <Card key={post.id} className="p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
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
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words mb-3">
                    {post.content}
                  </p>
                  
                  {/* Quoted Post Display */}
                  {post.quotedPost && (
                    <div className="mb-3 p-3 border-l-4 border-blue-500 bg-slate-50 dark:bg-slate-700/50 rounded-r-lg">
                      <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                        @{post.quotedPost.authorName}
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {post.quotedPost.content}
                      </p>
                      {post.quotedPost.imageUrl && (
                        <div className="mt-2 w-32 h-32 rounded overflow-hidden bg-slate-100 dark:bg-slate-900">
                          <ImageWithFallback
                            src={post.quotedPost.imageUrl}
                            alt="Quoted post"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {post.imageUrl && (
                    <div className="relative w-full rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 mb-3">
                      <ImageWithFallback
                        src={post.imageUrl}
                        alt="Post image"
                        className="w-full max-h-96 object-cover"
                      />
                    </div>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onQuotePost?.(post)}
                      className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      <Quote className="w-4 h-4 mr-1" />
                      Quote
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShareClick(post)}
                      className="text-slate-600 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400"
                    >
                      <Share2 className="w-4 h-4 mr-1" />
                      Share
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">Share Post</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Choose how you want to share this post
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Button
              onClick={copyPostContent}
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-4 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <Copy className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div className="text-left">
                <div>Copy Post Content</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Copy formatted text including images
                </div>
              </div>
            </Button>
            <Button
              onClick={copyPostLink}
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-4 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <LinkIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div className="text-left">
                <div>Copy Post Link</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Share a link to this post
                </div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
