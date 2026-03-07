import { useState } from 'react';
import React from 'react';
import { Textarea } from './ui/textarea';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ImagePlus, X, Send } from 'lucide-react';
import { Input } from './ui/input';

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
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
  authorAvatar?: string;
}

// Inline gradient styles — Tailwind v4 can't detect dynamically-assembled class strings
// so we use inline CSS for the avatar gradient instead.
const GRADIENT_PAIRS: [string, string][] = [
  ['#3b82f6', '#4f46e5'],
  ['#8b5cf6', '#7c3aed'],
  ['#10b981', '#0d9488'],
  ['#f97316', '#ef4444'],
  ['#ec4899', '#e11d48'],
  ['#f59e0b', '#ea580c'],
  ['#06b6d4', '#3b82f6'],
  ['#84cc16', '#16a34a'],
];

const avatarStyleFor = (name: string): React.CSSProperties => {
  const idx = name.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % GRADIENT_PAIRS.length;
  const [a, b] = GRADIENT_PAIRS[idx];
  return { background: `linear-gradient(135deg, ${a}, ${b})` };
};

export default function PostCreator({ onCreatePost, authorName, authorAvatar }: PostCreatorProps) {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [focused, setFocused] = useState(false);

  const canPost = content.trim().length > 0;
  const firstName = authorName.split(' ')[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canPost) {
      onCreatePost(content, imageUrl || undefined);
      setContent('');
      setImageUrl('');
      setShowImageInput(false);
      setFocused(false);
    }
  };

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-2xl border transition-all duration-200 shadow-sm overflow-hidden
        ${focused
          ? 'border-blue-300 dark:border-blue-600 shadow-md'
          : 'border-slate-100 dark:border-slate-700'
        }`}
    >
      <form onSubmit={handleSubmit}>
        <div className="flex items-start gap-3 p-4 pb-3">
          {/* Avatar */}
          <div
            style={avatarStyleFor(authorName)}
            className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-white shadow-sm"
          >
            {authorAvatar
              ? <span className="text-xl leading-none select-none">{authorAvatar}</span>
              : <span className="font-semibold text-sm select-none">{authorName.charAt(0).toUpperCase()}</span>
            }
          </div>

          {/* Textarea */}
          <Textarea
            placeholder={`What's on your mind, ${firstName}?`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(content.length > 0)}
            rows={focused || content.length > 0 ? 3 : 1}
            className="flex-1 resize-none border-0 bg-transparent p-0 pt-2.5 text-sm
              text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500
              focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed transition-all duration-150"
          />
        </div>

        {/* Image URL input */}
        {showImageInput && (
          <div className="px-4 pb-3 space-y-2">
            <div className="flex items-center gap-2">
              <Input
                type="url"
                placeholder="Paste image URL…"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="flex-1 h-8 text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600
                  text-slate-900 dark:text-slate-100 rounded-lg"
              />
              <button
                type="button"
                onClick={() => { setImageUrl(''); setShowImageInput(false); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100
                  dark:hover:text-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {imageUrl && (
              <div className="relative w-full h-44 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900">
                <ImageWithFallback
                  src={imageUrl}
                  alt="Post preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        )}

        {/* Footer toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setShowImageInput(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors focus:outline-none
              ${showImageInput
                ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400'
                : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:text-blue-400 dark:hover:bg-slate-700'
              }`}
          >
            <ImagePlus className="w-3.5 h-3.5" />
            {showImageInput ? 'Hide image' : 'Add image'}
          </button>

          <button
            type="submit"
            disabled={!canPost}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold transition-all duration-150 focus:outline-none
              ${canPost
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md active:scale-95'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }`}
          >
            <Send className="w-3.5 h-3.5" />
            Post
          </button>
        </div>
      </form>
    </div>
  );
}
