import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ImagePlus, X, Quote } from 'lucide-react';
import { Input } from './ui/input';
import { useRef, useEffect } from 'react';

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  imageUrl?: string;
  timestamp: Date;
  likes: number;
  comments: number;
  quotedPost?: {
    id: string;
    authorName: string;
    content: string;
    imageUrl?: string;
  };
}

interface PostCreatorProps {
  onCreatePost: (content: string, file?: File | null, imageUrl?: string, quotedPost?: Post['quotedPost']) => void;
  authorName: string;
  allPosts?: Post[];
}

export default function PostCreator({ onCreatePost, authorName, allPosts = [] }: PostCreatorProps) {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [showImageInput, setShowImageInput] = useState(false);
  const [quoteLinkInput, setQuoteLinkInput] = useState('');
  const [quotedPost, setQuotedPost] = useState<Post['quotedPost'] | null>(null);
  const [showQuoteInput, setShowQuoteInput] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onCreatePost(content, file || undefined, imageUrl || undefined, quotedPost || undefined);
      setContent('');
      setImageUrl('');
      setFile(null);
      setQuoteLinkInput('');
      setQuotedPost(null);
      setShowImageInput(false);
      setShowQuoteInput(false);
    }
  };

  const handleQuoteLink = () => {
    // Extract post ID from dummy link format: https://mirrormirror.app/post/[postId]
    const postId = quoteLinkInput.split('/').pop();
    const post = allPosts.find(p => p.id === postId);
    
    if (post) {
      setQuotedPost({
        id: post.id,
        authorName: post.authorName,
        content: post.content,
        imageUrl: post.imageUrl,
      });
      setQuoteLinkInput('');
    }
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    setShowImageInput(false);
    if (file) {
      URL.revokeObjectURL((file as any).__preview || '');
      setFile(null);
    }
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (file) {
        URL.revokeObjectURL((file as any).__preview || '');
      }
    };
  }, [file]);

  return (
    <Card className="p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shrink-0">
            {authorName.charAt(0)}
          </div>
          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="Share something with the community..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px] resize-none bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            
            {showImageInput && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="url"
                    placeholder="Image URL (optional)"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                  />
                  <input
                    type="file"
                    accept="image/*,video/*,application/pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      if (f) {
                        // attach preview url for cleanup
                        (f as any).__preview = URL.createObjectURL(f);
                      }
                      setFile(f);
                    }}
                    className="ml-2"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveImage}
                    className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                {(imageUrl || file) && (
                  <div className="relative w-full h-48 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900">
                    {file ? (
                      // preview local file
                      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                      // @ts-ignore
                      <img src={(file as any).__preview || URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageWithFallback
                        src={imageUrl}
                        alt="Post preview"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {showQuoteInput && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder="Paste post link (e.g., https://mirrormirror.app/post/123)"
                    value={quoteLinkInput}
                    onChange={(e) => setQuoteLinkInput(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleQuoteLink}
                    className="text-blue-600 dark:text-blue-400"
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowQuoteInput(false)}
                    className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {quotedPost && (
              <div className="p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                      Quoting @{quotedPost.authorName}
                    </div>
                    <div className="text-sm text-slate-900 dark:text-slate-100">
                      {quotedPost.content.length > 100 
                        ? quotedPost.content.substring(0, 100) + '...' 
                        : quotedPost.content}
                    </div>
                    {quotedPost.imageUrl && (
                      <div className="mt-2 w-20 h-20 rounded overflow-hidden bg-slate-100 dark:bg-slate-900">
                        <ImageWithFallback
                          src={quotedPost.imageUrl}
                          alt="Quoted post"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuotedPost(null)}
                    className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowImageInput(!showImageInput)}
              className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <ImagePlus className="w-4 h-4 mr-2" />
              {showImageInput ? 'Hide' : 'Image'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowQuoteInput(!showQuoteInput)}
              className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <Quote className="w-4 h-4 mr-2" />
              {showQuoteInput ? 'Hide' : 'Quote'}
            </Button>
          </div>
          <Button
            type="submit"
            disabled={!content.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            Post
          </Button>
        </div>
      </form>
    </Card>
  );
}
