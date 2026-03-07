import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Languages, Loader2, Trash2 } from 'lucide-react';
import { Post } from './PostCreator';
import { toast } from 'sonner';
import ClassroomDetailDialog from './ClassroomDetailDialog';
import { ClassroomService } from '../services/classroom';
import type { Classroom } from '../types';

interface PostFeedProps {
  posts: Post[];
  isLoading?: boolean;
  currentUserId?: string;
  onDeletePost?: (postId: string) => void;
}

// MyMemory free translation API — no key needed, auto-detects source language
const translateText = async (text: string, targetLang: string): Promise<string> => {
  const response = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|${targetLang}`
  );
  if (!response.ok) throw new Error('Translation request failed');
  const data = await response.json();
  if (data.responseStatus !== 200) throw new Error(data.responseDetails || 'Translation error');
  return data.responseData.translatedText;
};

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
  { code: 'pt', flag: '🇵🇹', label: 'Português' },
  { code: 'ar', flag: '🇸🇦', label: 'العربية' },
  { code: 'zh', flag: '🇨🇳', label: '中文' },
  { code: 'ja', flag: '🇯🇵', label: '日本語' },
];

interface TranslationState {
  translatedText: string | null;
  isTranslating: boolean;
}

export default function PostFeed({ posts, isLoading, currentUserId, onDeletePost }: PostFeedProps) {
  const [translations, setTranslations] = useState<Record<string, TranslationState>>({}); 

  // Classroom dialog state
  const [dialogClassroom, setDialogClassroom] = useState<Classroom | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fetchingAvatarId, setFetchingAvatarId] = useState<string | null>(null);

  const handleAvatarClick = async (authorId: string) => {
    setFetchingAvatarId(authorId);
    try {
      const { classroom: cl } = await ClassroomService.getClassroom(Number(authorId));
      const mapped: Classroom = {
        id: String(cl.id),
        name: cl.name,
        location: cl.location || '',
        lat: cl.latitude ? parseFloat(cl.latitude) : 0,
        lon: cl.longitude ? parseFloat(cl.longitude) : 0,
        interests: cl.interests || [],
        availability: (() => {
          // Convert array [{day, time}] to {day: number[]}
          const avail: { [day: string]: number[] } = {};
          if (Array.isArray(cl.availability)) {
            for (const slot of cl.availability as { day: string; time: string }[]) {
              const hour = parseInt(slot.time?.split(':')[0] ?? '0', 10);
              if (!avail[slot.day]) avail[slot.day] = [];
              if (!avail[slot.day].includes(hour)) avail[slot.day].push(hour);
            }
          } else if (cl.availability && typeof cl.availability === 'object') {
            Object.assign(avail, cl.availability);
          }
          return avail;
        })(),
        size: cl.class_size,
        description: cl.description,
      };
      setDialogClassroom(mapped);
      setDialogOpen(true);
    } catch (err) {
      toast.error('Could not load classroom details.');
    } finally {
      setFetchingAvatarId(null);
    }
  };;

  const getPostState = (postId: string): TranslationState =>
    translations[postId] ?? { translatedText: null, isTranslating: false };

  const setPostState = (postId: string, patch: Partial<TranslationState>) => {
    setTranslations(prev => {
      const currentState = prev[postId] ?? { translatedText: null, isTranslating: false };
      return { ...prev, [postId]: { ...currentState, ...patch } };
    });
  };

  const handleTranslate = async (post: Post, langCode: string) => {
    setPostState(post.id, { isTranslating: true });
    try {
      const translated = await translateText(post.content, langCode);
      setPostState(post.id, { translatedText: translated, isTranslating: false });
    } catch (err) {
      console.error('Translation failed:', err);
      toast.error('Translation failed. Please try again.');
      setPostState(post.id, { isTranslating: false });
    }
  };

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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/3" />
                <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-full" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

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
        const state = getPostState(post.id);

        return (
          <Card key={post.id} className="p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <div className="flex items-start gap-3">
              {/* Clickable avatar — opens ClassroomDetailDialog (disabled for own posts) */}
              <button
                type="button"
                onClick={() => handleAvatarClick(post.authorId)}
                disabled={fetchingAvatarId === post.authorId || post.authorId === currentUserId}
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-blue-600 text-white
                  focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all
                  ${
                    post.authorId === currentUserId
                      ? 'cursor-default'
                      : 'hover:ring-2 hover:ring-blue-400 cursor-pointer disabled:opacity-70'
                  }`}
                title={post.authorId === currentUserId ? undefined : `View ${post.authorName}'s classroom`}
              >
                {fetchingAvatarId === post.authorId
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : post.authorAvatar
                    ? <span className="text-xl leading-none">{post.authorAvatar}</span>
                    : <span className="font-medium">{post.authorName.charAt(0)}</span>
                }
              </button>

              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-900 dark:text-slate-100 font-medium">{post.authorName}</span>
                    <span className="text-slate-500 dark:text-slate-400 text-sm">
                      {formatTimestamp(post.timestamp)}
                    </span>
                  </div>

                  {/* Actions: translate + delete (own posts only) */}
                  <div className="flex items-center gap-1">
                  <Popover
                    open={state.translatedText ? false : undefined}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (state.translatedText) {
                            // Reset to original
                            setPostState(post.id, { translatedText: null });
                          }
                        }}
                        disabled={state.isTranslating}
                        className={`h-7 px-2 text-xs gap-1 ${
                          state.translatedText
                            ? 'text-blue-600 dark:text-blue-400 hover:text-slate-600 dark:hover:text-slate-400'
                            : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'
                        }`}
                        title={state.translatedText ? 'Show original' : 'Translate post'}
                      >
                        {state.isTranslating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Languages className="w-3.5 h-3.5" />
                        )}
                        {state.translatedText ? 'Original' : 'Translate'}
                      </Button>
                    </PopoverTrigger>

                    {/* Only show picker when not yet translated */}
                    {!state.translatedText && (
                      <PopoverContent className="w-36 p-1" align="end" side="bottom">
                        {LANGUAGES.map((lang) => (
                          <button
                            key={lang.code}
                            type="button"
                            onClick={() => handleTranslate(post, lang.code)}
                            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
                          >
                            <span className="text-base leading-none">{lang.flag}</span>
                            <span>{lang.label}</span>
                          </button>
                        ))}
                      </PopoverContent>
                    )}
                  </Popover>

                  {/* Delete button — own posts only */}
                  {post.authorId === currentUserId && onDeletePost && (
                    <button
                      type="button"
                      onClick={() => onDeletePost(post.id)}
                      className="p-1.5 rounded text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Delete post"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                  </div>

                </div>

                {/* Post content (original or translated) */}
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                  {state.translatedText ?? post.content}
                </p>

                {/* "Translated" label */}
                {state.translatedText && (
                  <p className="mt-1 text-xs text-blue-500 dark:text-blue-400 italic">
                    Translated — click "Original" to revert
                  </p>
                )}

                {/* Post image */}
                {post.imageUrl && (
                  <div className="relative w-full rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 mt-3">
                    <ImageWithFallback
                      src={post.imageUrl}
                      alt="Post image"
                      className="w-full max-h-96 object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>

      {/* Classroom detail dialog — opened when a post avatar is clicked */}
      <ClassroomDetailDialog
        classroom={dialogClassroom}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mySchedule={{}}
        friendshipStatus="none"
      />
    </>
  );
}
