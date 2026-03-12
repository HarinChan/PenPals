import { useEffect, useRef, useState } from 'react';
import React from 'react';
import { Textarea } from './ui/textarea';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { X, Send, Paperclip, Upload, AlertCircle } from 'lucide-react';

export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  url: string;
}

export interface CreateAttachment {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  url: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  attachments: Attachment[];
  timestamp: Date;
  likes: number;
  comments: number;
  isLiked?: boolean;
  quotedPost?: {
    id: string;
    authorName: string;
    content: string;
    attachments: Attachment[];
  };
}

interface PostCreatorProps {
  onCreatePost: (content: string, files?: File[]) => Promise<void> | void;
  authorName: string;
  authorAvatar?: string;
}

interface DraftAttachment {
  localId: string;
  file: File;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  previewUrl: string;
}

const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;

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
  const [attachments, setAttachments] = useState<DraftAttachment[]>([]);
  const [showAttachmentInput, setShowAttachmentInput] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef<DraftAttachment[]>([]);

  const canPost = content.trim().length > 0;
  const firstName = authorName.split(' ')[0];

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((a) => URL.revokeObjectURL(a.previewUrl));
    };
  }, []);

  const addFiles = (files: FileList | File[]) => {
    const incoming = Array.from(files);
    const accepted = incoming.filter((file) => file.size <= MAX_ATTACHMENT_BYTES);
    const rejected = incoming.filter((file) => file.size > MAX_ATTACHMENT_BYTES);

    if (rejected.length > 0) {
      const names = rejected.slice(0, 2).map((file) => file.name).join(', ');
      const hasMore = rejected.length > 2 ? ` and ${rejected.length - 2} more` : '';
      setFileError(`Skipped ${rejected.length} file${rejected.length > 1 ? 's' : ''} over 2MB: ${names}${hasMore}.`);
    } else {
      setFileError(null);
    }

    if (accepted.length === 0) return;

    const next = accepted.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      return {
        localId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        file,
        previewUrl,
      };
    });
    setAttachments((prev) => [...prev, ...next]);
  };

  const removeAttachment = (localId: string) => {
    setAttachments((prev) => {
      const match = prev.find((a) => a.localId === localId);
      if (match) URL.revokeObjectURL(match.previewUrl);
      return prev.filter((a) => a.localId !== localId);
    });
  };

  const clearAttachments = () => {
    setAttachments((prev) => {
      prev.forEach((a) => URL.revokeObjectURL(a.previewUrl));
      return [];
    });
    setFileError(null);
  };

  const hasDraggedFiles = (e: React.DragEvent<HTMLElement>) => {
    return Array.from(e.dataTransfer?.types ?? []).includes('Files');
  };

  const handleComposerDragOver = (e: React.DragEvent<HTMLElement>) => {
    if (!hasDraggedFiles(e)) return;
    e.preventDefault();
    setIsDragOver(true);
    if (!showAttachmentInput) setShowAttachmentInput(true);
  };

  const handleComposerDragLeave = (e: React.DragEvent<HTMLElement>) => {
    const next = e.relatedTarget;
    if (next instanceof Node && e.currentTarget.contains(next)) return;
    setIsDragOver(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (canPost && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await onCreatePost(
          content,
          attachments.length ? attachments.map((attachment) => attachment.file) : undefined
        );
      } catch {
        setIsSubmitting(false);
        return;
      }
      setContent('');
      clearAttachments();
      setShowAttachmentInput(false);
      setFocused(false);
      setIsSubmitting(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    addFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (!showAttachmentInput) setShowAttachmentInput(true);
    if (e.dataTransfer.files?.length) {
      addFiles(e.dataTransfer.files);
    }
  };

  const formatSize = (sizeBytes: number) => {
    if (sizeBytes < 1024) return `${sizeBytes} B`;
    if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      onDragOver={handleComposerDragOver}
      onDragLeave={handleComposerDragLeave}
      onDrop={handleDrop}
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
            onDragOver={handleComposerDragOver}
            onDrop={handleDrop}
            rows={focused || content.length > 0 ? 3 : 1}
            className="flex-1 resize-none border-0 bg-transparent p-0 pt-2.5 text-sm
              text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500
              focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed transition-all duration-150"
          />
        </div>

        {fileError && (
          <div className="px-4 pb-3">
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2.5 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-sm font-medium leading-snug">{fileError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Attachment input */}
        {showAttachmentInput && (
          <div className="px-4 pb-3 space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`rounded-xl border border-dashed p-4 transition-colors
                ${isDragOver
                  ? 'border-blue-400 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-900/20'
                  : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900'
                }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm">
                  <Upload className="w-4 h-4" />
                  <span>Drag and drop files here, or</span>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-blue-700 bg-blue-100
                    hover:bg-blue-200 dark:text-blue-300 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 transition-colors"
                >
                  Choose files
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Max file size: 2MB each. Files are uploaded first and post payloads use shareable https links.
              </p>
            </div>

            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((attachment) => {
                  const isImage = attachment.mimeType.startsWith('image/');
                  return (
                    <div key={attachment.localId} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-slate-800 dark:text-slate-100 truncate">{attachment.filename}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {attachment.mimeType} • {formatSize(attachment.sizeBytes)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(attachment.localId)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100
                            dark:hover:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {isImage && (
                        <div className="relative w-full h-40 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 mt-2">
                          <ImageWithFallback
                            src={attachment.previewUrl}
                            alt={attachment.filename}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setShowAttachmentInput((v) => !v)}
            disabled={isSubmitting}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors focus:outline-none
              ${showAttachmentInput
                ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400'
                : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:text-blue-400 dark:hover:bg-slate-700'
              }`}
          >
            <Paperclip className="w-3.5 h-3.5" />
            {showAttachmentInput ? 'Hide files' : 'Add files (max 2MB)'}
          </button>

          <button
            type="submit"
            disabled={!canPost || isSubmitting}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold transition-all duration-150 focus:outline-none
              ${canPost && !isSubmitting
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md active:scale-95'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }`}
          >
            <Send className="w-3.5 h-3.5" />
            {isSubmitting ? 'Uploading...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
}
