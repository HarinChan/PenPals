import { useState } from 'react';
import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Languages, Loader2, Trash2, RotateCcw } from 'lucide-react';
import { Post } from './PostCreator';
import { toast } from 'sonner';
import ClassroomDetailDialog from './ClassroomDetailDialog';
import { FriendsService } from '../services/friends';
import type { Classroom, Account } from '../types';

interface PostFeedProps {
  posts: Post[];
  isLoading?: boolean;
  currentUserId?: string;
  onDeletePost?: (postId: string) => void;
  currentAccount: Account;
  classrooms: Classroom[];
  onAccountUpdate: (account: Account) => void;
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

// Inline styles instead of Tailwind classes — Tailwind v4 scans source at build time and
// cannot detect dynamically-assembled class strings (e.g. `from-${color}-500`).
const GRADIENT_PAIRS: [string, string][] = [
  ['#3b82f6', '#4f46e5'], // blue → indigo
  ['#8b5cf6', '#7c3aed'], // violet → purple
  ['#10b981', '#0d9488'], // emerald → teal
  ['#f97316', '#ef4444'], // orange → red
  ['#ec4899', '#e11d48'], // pink → rose
  ['#f59e0b', '#ea580c'], // amber → orange
  ['#06b6d4', '#3b82f6'], // cyan → blue
  ['#84cc16', '#16a34a'], // lime → green
];

const avatarStyle = (id: string): React.CSSProperties => {
  const idx = id.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % GRADIENT_PAIRS.length;
  const [a, b] = GRADIENT_PAIRS[idx];
  return { background: `linear-gradient(135deg, ${a}, ${b})` };
};

interface TranslationState {
  translatedText: string | null;
  isTranslating: boolean;
}

export default function PostFeed({ posts, isLoading, currentUserId, onDeletePost, currentAccount, classrooms, onAccountUpdate }: PostFeedProps) {
  const [translations, setTranslations] = useState<Record<string, TranslationState>>({});
  const [dialogClassroom, setDialogClassroom] = useState<Classroom | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fetchingAvatarId, setFetchingAvatarId] = useState<string | null>(null);

  // ── friendship helpers (same logic as SidePanel) ──────────────────
  const getFriendshipStatus = (classroomId: string): 'none' | 'pending' | 'accepted' | 'received' => {
    const friend = (currentAccount.friends || []).find(f => f.classroomId === classroomId);
    if (friend) return 'accepted';
    const received = (currentAccount.receivedFriendRequests || []).find(r => r.fromClassroomId === classroomId.toString());
    if (received) return 'received';
    return 'none';
  };

  const toggleFriendRequest = async (classroom: Classroom) => {
    const status = getFriendshipStatus(classroom.id);
    if (status === 'accepted') {
      if (confirm(`Remove ${classroom.name} from friends?`)) {
        try {
          await FriendsService.removeFriend(classroom.id);
          const updatedFriends = (currentAccount.friends || []).filter(f => f.classroomId !== classroom.id && f.id !== classroom.id);
          onAccountUpdate({ ...currentAccount, friends: updatedFriends });
          toast.success('Removed friend');
        } catch {
          toast.error('Failed to remove friend');
        }
      }
    } else if (status === 'received') {
      try {
        await FriendsService.acceptRequest(undefined, classroom.id);
        const updatedRequests = (currentAccount.receivedFriendRequests || []).filter(r => r.fromClassroomId !== classroom.id);
        onAccountUpdate({ ...currentAccount, receivedFriendRequests: updatedRequests });
        toast.success('Friend request accepted!');
      } catch {
        toast.error('Failed to accept request');
      }
    } else {
      try {
        await FriendsService.sendRequest(classroom.id);
        toast.success(`Friend request sent to ${classroom.name}`);
      } catch (error: any) {
        toast.error(error.message || 'Failed to send request');
      }
    }
  };

  const handleAvatarClick = async (authorId: string) => {
    const classroom = classrooms.find(c => String(c.id) === String(authorId));
    setFetchingAvatarId(authorId);
    try {
      if (!classroom) {
        toast.error('Could not load classroom details.');
        return;
      }
      setDialogClassroom(classroom);
      setDialogOpen(true);
    } catch {
      toast.error('Could not load classroom details.');
    } finally {
      setFetchingAvatarId(null);
    }
  };

  const getPostState = (postId: string): TranslationState =>
    translations[postId] ?? { translatedText: null, isTranslating: false };

  const setPostState = (postId: string, patch: Partial<TranslationState>) => {
    setTranslations(prev => {
      const cur = prev[postId] ?? { translatedText: null, isTranslating: false };
      return { ...prev, [postId]: { ...cur, ...patch } };
    });
  };

  const handleTranslate = async (post: Post, langCode: string) => {
    setPostState(post.id, { isTranslating: true });
    try {
      const translated = await translateText(post.content, langCode);
      setPostState(post.id, { translatedText: translated, isTranslating: false });
    } catch {
      toast.error('Translation failed. Please try again.');
      setPostState(post.id, { isTranslating: false });
    }
  };

  const formatTimestamp = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // ── Loading skeleton ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-full animate-pulse shrink-0" style={{ background: 'linear-gradient(135deg,#e2e8f0,#cbd5e1)' }} />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse w-1/4" />
                <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full animate-pulse w-1/6" />
                <div className="h-12 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse w-full mt-2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <span className="text-4xl">✍️</span>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">No posts yet — be the first!</p>
      </div>
    );
  }

  // ── Post list ─────────────────────────────────────────────────────
  return (
    <>
      <div className="space-y-3">
        {posts.map((post) => {
          const state = getPostState(post.id);
          const isOwn = post.authorId === currentUserId;
          const attachments = Array.isArray(post.attachments) ? post.attachments : [];

          return (
            <article
              key={post.id}
              className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700
                         shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div className="pt-2 pb-4 pr-4 pl-3">
                <div className="flex items-start gap-3">

                  {/* ── Avatar ── */}
                  <button
                    type="button"
                    onClick={() => handleAvatarClick(post.authorId)}
                    disabled={fetchingAvatarId === post.authorId || isOwn}
                    style={avatarStyle(post.authorId)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0
                      text-white shadow-sm focus:outline-none transition-all duration-150
                      ${isOwn
                        ? 'cursor-default'
                        : 'hover:scale-105 hover:shadow-md cursor-pointer'
                      }`}
                    title={isOwn ? undefined : `View ${post.authorName}'s classroom`}
                  >
                    {fetchingAvatarId === post.authorId
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : post.authorAvatar
                        ? <span className="text-xl leading-none select-none">{post.authorAvatar}</span>
                        : <span className="font-semibold text-sm select-none">{post.authorName.charAt(0).toUpperCase()}</span>
                    }
                  </button>

                  {/* ── Body ── */}
                  <div className="flex-1 min-w-0">

                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-tight block">
                          {post.authorName}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 block">
                          {formatTimestamp(post.timestamp)}
                        </span>
                      </div>

                      {/* Action buttons — fade in on card hover */}
                      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">

                        {/* Translate */}
                        <Popover open={state.translatedText ? false : undefined}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              onClick={() => {
                                if (state.translatedText) setPostState(post.id, { translatedText: null });
                              }}
                              disabled={state.isTranslating}
                              title={state.translatedText ? 'Show original' : 'Translate'}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors focus:outline-none
                                ${state.translatedText
                                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                  : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:text-blue-400 dark:hover:bg-slate-700'
                                }`}
                            >
                              {state.isTranslating
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : state.translatedText
                                  ? <RotateCcw className="w-3.5 h-3.5" />
                                  : <Languages className="w-3.5 h-3.5" />}
                              <span className="hidden sm:inline">
                                {state.translatedText ? 'Original' : 'Translate'}
                              </span>
                            </button>
                          </PopoverTrigger>
                          {!state.translatedText && (
                            <PopoverContent className="w-36 p-1.5 shadow-lg rounded-xl" align="end" side="bottom">
                              {LANGUAGES.map((lang) => (
                                <button
                                  key={lang.code}
                                  type="button"
                                  onClick={() => handleTranslate(post, lang.code)}
                                  className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-sm
                                    text-slate-700 dark:text-slate-200
                                    hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
                                >
                                  <span className="text-base leading-none">{lang.flag}</span>
                                  <span>{lang.label}</span>
                                </button>
                              ))}
                            </PopoverContent>
                          )}
                        </Popover>

                        {/* Delete — own posts only */}
                        {isOwn && onDeletePost && (
                          <button
                            type="button"
                            onClick={() => onDeletePost(post.id)}
                            title="Delete post"
                            className="p-1.5 rounded-lg text-red-400 dark:text-red-500
                              hover:text-red-600 dark:hover:text-red-400
                              hover:bg-red-50 dark:hover:bg-red-900/20
                              transition-colors focus:outline-none"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-slate-800 dark:text-slate-200">
                      {state.translatedText ?? post.content}
                    </p>

                    {/* Translated badge */}
                    {state.translatedText && (
                      <span className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400
                        bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full font-medium">
                        🌐 Translated · click to revert
                      </span>
                    )}

                    {/* Attachments */}
                    {attachments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {attachments.map((attachment, index) => {
                          const isImage = attachment.mimeType.startsWith('image/');
                          const attachmentKey = attachment.id || `${post.id}-attachment-${index}`;
                          if (isImage) {
                            return (
                              <div
                                key={attachmentKey}
                                className="rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700"
                              >
                                <ImageWithFallback
                                  src={attachment.url}
                                  alt={attachment.filename}
                                  className="w-full max-h-80 object-cover"
                                />
                              </div>
                            );
                          }

                          return (
                            <a
                              key={attachmentKey}
                              href={attachment.url}
                              target="_blank"
                              rel="noreferrer"
                              className="block rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2
                                text-sm text-blue-700 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                            >
                              {attachment.filename}
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <ClassroomDetailDialog
        classroom={dialogClassroom}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mySchedule={currentAccount.schedule}
        friendshipStatus={dialogClassroom ? getFriendshipStatus(dialogClassroom.id) : 'none'}
        onToggleFriend={toggleFriendRequest}
        accountLon={currentAccount.x}
      />
    </>
  );
}
