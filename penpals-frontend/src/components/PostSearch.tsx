import { useState } from 'react';
import { Card } from './ui/card';
import { Search, Loader2, X, Languages, RotateCcw } from 'lucide-react';
import { queryPostsFromChromaDB } from '../services/chromadb';
import { Badge } from './ui/badge';
import type { Attachment } from './PostCreator';
import type { Account, Classroom } from '../types';
import { FriendsService } from '../services/friends';
import ClassroomDetailDialog from './ClassroomDetailDialog';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface SearchResult {
  id: string;
  authorId: string;
  content: string;
  authorName: string;
  timestamp: string;
  similarity: number;
  attachments: Attachment[];
}

interface TranslationState {
  translatedText: string | null;
  isTranslating: boolean;
}

// Same gradient palette as PostFeed/PostCreator for visual consistency
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

const avatarStyle = (id: string): React.CSSProperties => {
  const idx = id.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % GRADIENT_PAIRS.length;
  const [a, b] = GRADIENT_PAIRS[idx];
  return { background: `linear-gradient(135deg, ${a}, ${b})` };
};

const matchStyle = (sim: number): React.CSSProperties => {
  if (sim >= 0.8) return { background: '#10b981', color: '#fff' };
  if (sim >= 0.6) return { background: '#3b82f6', color: '#fff' };
  if (sim >= 0.4) return { background: '#f59e0b', color: '#fff' };
  return { background: '#94a3b8', color: '#fff' };
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

const translateText = async (text: string, targetLang: string): Promise<string> => {
  const res = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|${targetLang}`
  );
  if (!res.ok) throw new Error('Translation request failed');
  const data = await res.json();
  if (data.responseStatus !== 200) throw new Error(data.responseDetails || 'Translation error');
  return data.responseData.translatedText;
};

const fmtTs = (iso: string) => {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hrs  = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hrs  < 24) return `${hrs}h ago`;
    if (days <  7) return `${days}d ago`;
    return d.toLocaleDateString();
  } catch { return 'Unknown date'; }
};

const resolveClassroomId = (resultId: string, metadata: Record<string, any>): string => {
  const directId = metadata.classroom_id ?? metadata.authorId ?? metadata.profile_id;
  if (directId !== undefined && directId !== null && String(directId).trim().length > 0) {
    return String(directId);
  }

  // Fallback for document ids stored as "post-<id>" when metadata is incomplete.
  const postIdMatch = /^post-(\d+)$/.exec(resultId);
  if (postIdMatch) {
    return postIdMatch[1];
  }

  return resultId;
};

interface PostSearchProps {
  currentAccount: Account;
  classrooms: Classroom[];
  onAccountUpdate: (account: Account) => void;
}

export default function PostSearch({ currentAccount, classrooms, onAccountUpdate }: PostSearchProps) {
  const [query, setQuery]           = useState('');
  const [isSearching, setSearching] = useState(false);
  const [results, setResults]       = useState<SearchResult[]>([]);
  const [hasSearched, setSearched]  = useState(false);

  // Per-result translation state
  const [translations, setTranslations] = useState<Record<string, TranslationState>>({});

  // Classroom dialog (avatar click)
  const [dialogClassroom, setDialogClassroom] = useState<Classroom | null>(null);
  const [dialogOpen, setDialogOpen]           = useState(false);
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

  // ── search ────────────────────────────────────────────────────────
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearched(true);
    setTranslations({});
    try {
      const response = await queryPostsFromChromaDB(query, 10);
      if (response.status === 'success' && response.results) {
        const searchResults: SearchResult[] = response.results.map(result => ({
          id: result.id,
          authorId: resolveClassroomId(result.id, result.metadata),
          content: result.document,
          authorName: result.metadata.authorName || result.metadata.author || 'Unknown',
          timestamp: result.metadata.timestamp || new Date().toISOString(),
          similarity: result.similarity,
          attachments: Array.isArray(result.metadata.attachments)
            ? result.metadata.attachments
            : [],
        }));
        setResults(searchResults);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleClear = () => { setQuery(''); setResults([]); setSearched(false); setTranslations({}); };

  // ── translation ───────────────────────────────────────────────────
  const getTx = (id: string): TranslationState =>
    translations[id] ?? { translatedText: null, isTranslating: false };

  const setTx = (id: string, patch: Partial<TranslationState>) =>
    setTranslations(prev => ({
      ...prev,
      [id]: { ...(prev[id] ?? { translatedText: null, isTranslating: false }), ...patch },
    }));

  const handleTranslate = async (result: SearchResult, langCode: string) => {
    setTx(result.id, { isTranslating: true });
    try {
      const translated = await translateText(result.content, langCode);
      setTx(result.id, { translatedText: translated, isTranslating: false });
    } catch {
      toast.error('Translation failed. Please try again.');
      setTx(result.id, { isTranslating: false });
    }
  };

  // ── avatar click ──────────────────────────────────────────────────
  const handleAvatarClick = async (authorId: string, authorName: string) => {
    const numericId = Number(authorId);
    if (isNaN(numericId) || numericId <= 0) return;
    const classroom = classrooms.find(c => String(c.id) === String(authorId));
    setFetchingAvatarId(authorId);
    try {
      if (!classroom) {
        toast.error(`Could not load ${authorName}'s classroom.`);
        return;
      }
      setDialogClassroom(classroom);
      setDialogOpen(true);
    } catch {
      toast.error(`Could not load ${authorName}'s classroom.`);
    } finally {
      setFetchingAvatarId(null);
    }
  };

  // ── render ────────────────────────────────────────────────────────
  return (
    <>
      <div className="space-y-3">

        {/* Search bar */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4">
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Search posts"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  disabled={isSearching}
                  className="w-full pl-10 pr-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-600
                    bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100
                    placeholder:text-slate-400 dark:placeholder:text-slate-500
                    focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600
                    transition-shadow duration-150"
                />
              </div>

              {query && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300
                    hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <button
                type="submit"
                disabled={isSearching || !query.trim()}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 focus:outline-none
                  ${isSearching || !query.trim()
                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md active:scale-95'
                  }`}
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {isSearching ? 'Searching…' : 'Search'}
              </button>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Semantic search powered by ChromaDB — finds posts by meaning, not just keywords
            </p>
          </form>
        </div>

        {/* Results */}
        {hasSearched && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Results
              </span>
              {!isSearching && (
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {results.length} {results.length === 1 ? 'match' : 'matches'}
                </span>
              )}
            </div>

            {results.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                {isSearching ? 'Searching...' : 'No posts found matching your search.'}
              </div>
            ) : null}

            {results.map(result => {
              const tx = getTx(result.id);
              return (
                <article
                  key={result.id}
                  className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700
                             shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <div className="pt-2 pb-4 pr-4 pl-3">
                    <div className="flex items-start gap-3">

                      {/* Clickable avatar */}
                      <button
                        type="button"
                        onClick={() => handleAvatarClick(result.authorId, result.authorName)}
                        disabled={fetchingAvatarId === result.authorId}
                        style={avatarStyle(result.authorId)}
                        title={`View ${result.authorName}'s classroom`}
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0
                          text-white shadow-sm focus:outline-none transition-all duration-150
                          hover:scale-105 hover:shadow-md cursor-pointer
                          ring-2 ring-transparent hover:ring-blue-300 dark:hover:ring-blue-500"
                      >
                        {fetchingAvatarId === result.authorId
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <span className="font-semibold text-sm select-none">
                              {result.authorName.charAt(0).toUpperCase()}
                            </span>
                        }
                      </button>

                      {/* Body */}
                      <div className="flex-1 min-w-0">

                        {/* Header row */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-tight block">
                              {result.authorName}
                            </span>
                            <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 block">
                              {fmtTs(result.timestamp)}
                            </span>
                          </div>

                          {/* Translate + match badge */}
                          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            <Popover open={tx.translatedText ? false : undefined}>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => { if (tx.translatedText) setTx(result.id, { translatedText: null }); }}
                                  disabled={tx.isTranslating}
                                  title={tx.translatedText ? 'Show original' : 'Translate'}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors focus:outline-none
                                    ${tx.translatedText
                                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                      : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:text-blue-400 dark:hover:bg-slate-700'
                                    }`}
                                >
                                  {tx.isTranslating
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : tx.translatedText
                                      ? <RotateCcw className="w-3.5 h-3.5" />
                                      : <Languages className="w-3.5 h-3.5" />}
                                  <span className="hidden sm:inline">
                                    {tx.translatedText ? 'Original' : 'Translate'}
                                  </span>
                                </button>
                              </PopoverTrigger>
                              {!tx.translatedText && (
                                <PopoverContent className="w-36 p-1.5 shadow-lg rounded-xl" align="end" side="bottom">
                                  {LANGUAGES.map(lang => (
                                    <button
                                      key={lang.code}
                                      type="button"
                                      onClick={() => handleTranslate(result, lang.code)}
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

                            {/* Match badge — always visible */}
                            <span
                              style={matchStyle(result.similarity)}
                              className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            >
                              {(result.similarity * 100).toFixed(0)}%
                            </span>
                          </div>

                        </div>

                        {/* Content */}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-slate-800 dark:text-slate-200">
                          {tx.translatedText ?? result.content}
                        </p>

                        {/* Translated badge */}
                        {tx.translatedText && (
                          <span className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400
                            bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full font-medium">
                            🌐 Translated · click to revert
                          </span>
                        )}

                        {result.attachments.some((a) => a.mimeType?.startsWith('image/')) && (
                          <span className="inline-flex items-center gap-1 mt-2 text-xs text-slate-400 dark:text-slate-500
                            bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                            📷 Contains image
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
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
