import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: Date;
  likes: number;
  comments: number;
}

interface PostCreatorProps {
  onCreatePost: (content: string) => void;
  authorName: string;
}

export default function PostCreator({ onCreatePost, authorName }: PostCreatorProps) {
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onCreatePost(content);
      setContent('');
    }
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
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
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
