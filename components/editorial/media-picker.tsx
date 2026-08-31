'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Search, Upload, Check } from 'lucide-react';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { MediaAsset } from '@/types/editorial';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/lib/services/media-config';
import { cn } from '@/lib/utils';

interface MediaPickerProps {
  dict: Dictionary;
  userId: string;
  onSelect: (media: MediaAsset) => void;
  onClose: () => void;
}

export function MediaPicker({ dict, userId, onSelect, onClose }: MediaPickerProps) {
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<MediaAsset | null>(null);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('page', String(page));
    const res = await fetch(`/api/media?${params}`);
    if (res.ok) {
      const data = await res.json();
      setMedia(data.items);
      setTotalPages(data.totalPages);
    }
    setLoading(false);
  }, [search, page]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
      setUploadError(dict.media.invalidType);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(dict.media.fileTooLarge);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('altText', '');

      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? dict.media.uploadError);
      }

      await fetchMedia();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : dict.media.uploadError);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep/60 p-4" role="dialog" aria-modal="true">
      <div className="flex h-[80vh] w-full max-w-4xl flex-col bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-headline text-lg font-bold text-deep">{dict.media.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center text-foreground hover:bg-surface-muted"
            aria-label={dict.nav.close}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {/* Search + upload */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={dict.media.searchPlaceholder}
              className="h-9 w-full border border-border bg-white pl-10 pr-3 text-sm focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 bg-primary px-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90">
            <Upload className="h-4 w-4" aria-hidden />
            {dict.media.upload}
            <input type="file" accept={ALLOWED_MIME_TYPES.join(',')} onChange={handleUpload} disabled={uploading} className="hidden" />
          </label>
        </div>

        {uploadError && (
          <div role="alert" className="border-b border-breaking/30 bg-breaking/5 px-4 py-2 text-sm text-breaking">
            {uploadError}
          </div>
        )}

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">{dict.common.loading}</p>
            </div>
          ) : media.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="font-headline text-lg font-semibold text-deep">{dict.media.noMedia}</p>
              <p className="mt-1 text-sm text-muted-foreground">{dict.media.noMediaDesc}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {media.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item)}
                  className={cn(
                    'group relative border-2 bg-surface-subtle transition-colors',
                    selected?.id === item.id ? 'border-primary' : 'border-transparent hover:border-border'
                  )}
                >
                  <img
                    src={item.url}
                    alt={item.altText}
                    className="aspect-square w-full object-cover"
                  />
                  {selected?.id === item.id && (
                    <span className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center bg-primary text-white">
                      <Check className="h-3 w-3" aria-hidden />
                    </span>
                  )}
                  <p className="truncate p-1.5 text-left text-xs text-muted-foreground">{item.fileName}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {selected && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="truncate text-sm font-medium text-foreground">{selected.fileName}</p>
            <button
              type="button"
              onClick={() => onSelect(selected)}
              className="inline-flex h-9 items-center bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              {dict.media.useImage}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
