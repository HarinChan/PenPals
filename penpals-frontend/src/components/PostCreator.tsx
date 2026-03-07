import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ImagePlus, X } from 'lucide-react';
import { Input } from './ui/input';

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  imageUrl?: string;
  timestamp: Date;
  likes: number;
  comments: number;
  isLiked?: boolean;
  quotedPost?: {
    id: string;
    authorName: string;
    content: string;
    imageUrl?: string;
  };
}

interface PostCreatorProps {
  onCreatePost: (content: string, imageUrl?: string) => void;
  authorName: string;
}

export default function PostCreator({ onCreatePost, authorName }: PostCreatorProps) {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onCreatePost(content, imageUrl || undefined);
      setContent('');
      setImageUrl('');
      setShowImageInput(false);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    setShowImageInput(false);
  };

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
                {imageUrl && (
                  <div className="relative w-full h-48 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900">
                    <ImageWithFallback
                      src={imageUrl}
                      alt="Post preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
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
