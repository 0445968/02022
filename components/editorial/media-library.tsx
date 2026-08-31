'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Upload, X, Copy, Check, Trash2 } from 'lucide-react';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { MediaAsset } from '@/types/editorial';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/lib/services/media-config';
import { cn } from '@/lib/utils';

interface MediaLibraryProps {
  dict: Dictionary;
  userId: string;
}

export function MediaLibrary({ dict, userId }: MediaLibraryProps) {
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [copied, setCopied] = useState(false);

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
      setTotal(data.total);
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

  async function handleSaveDetails() {
    if (!selected) return;
    const res = await fetch(`/api/media/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        altText: selected.altText,
        caption: selected.caption,
        credit: selected.credit,
      }),
    });
    if (res.ok) {
      await fetchMedia();
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (!confirm(dict.media.deleteConfirm)) return;
    const res = await fetch(`/api/media/${selected.id}?storagePath=${encodeURIComponent(selected.storagePath)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setSelected(null);
      await fetchMedia();
    }
  }

  function copyUrl() {
    if (!selected) return;
    navigator.clipboard.writeText(selected.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div>
          <h1 className="font-headline text-2xl font-bold text-deep">{dict.media.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{total} {dict.common.results}</p>
        </div>
        <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90">
          <Upload className="h-4 w-4" aria-hidden />
          {dict.media.upload}
          <input type="file" accept={ALLOWED_MIME_TYPES.join(',')} onChange={handleUpload} disabled={uploading} className="hidden" />
        </label>
      </div>

      {uploadError && (
        <div role="alert" className="mt-4 border border-breaking/30 bg-breaking/5 px-4 py-3 text-sm text-breaking">
          {uploadError}
        </div>
      )}

      {/* Search */}
      <div className="mt-4 relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={dict.media.searchPlaceholder}
          className="h-10 w-full border border-border bg-white pl-10 pr-3 text-sm focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Grid */}
      <div className="mt-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-sm text-muted-foreground">{dict.common.loading}</p>
          </div>
        ) : media.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <p className="font-headline text-xl font-semibold text-deep">{dict.media.noMedia}</p>
            <p className="mt-1 text-sm text-muted-foreground">{dict.media.noMediaDesc}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
                <p className="truncate p-1.5 text-left text-xs text-muted-foreground">{item.fileName}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="inline-flex h-8 items-center border border-border bg-white px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted disabled:opacity-40"
          >
            {dict.common.previous}
          </button>
          <span className="text-xs text-muted-foreground">
            {dict.pagination.page.replace('{page}', String(page)).replace('{total}', String(totalPages))}
          </span>
          <button
            type="button"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="inline-flex h-8 items-center border border-border bg-white px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted disabled:opacity-40"
          >
            {dict.common.next}
          </button>
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep/60 p-4" role="dialog" aria-modal="true">
          <div className="flex w-full max-w-3xl flex-col bg-white">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="font-semibold text-deep">{dict.media.detail}</h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="inline-flex h-8 w-8 items-center justify-center text-foreground hover:bg-surface-muted"
                aria-label={dict.nav.close}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="flex flex-col gap-6 p-6 md:flex-row">
              <div className="md:w-1/2">
                <img
                  src={selected.url}
                  alt={selected.altText}
                  className="w-full bg-surface-subtle object-cover"
                />
              </div>

              <div className="flex-1 space-y-4">
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{dict.media.fileName}</dt>
                    <dd className="text-foreground">{selected.fileName}</dd>
                  </div>
                  {selected.width && selected.height && (
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{dict.media.dimensions}</dt>
                      <dd className="text-foreground">{selected.width} × {selected.height}</dd>
                    </div>
                  )}
                  {selected.fileSize && (
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{dict.media.fileSize}</dt>
                      <dd className="text-foreground">{(selected.fileSize / 1024).toFixed(0)} KB</dd>
                    </div>
                  )}
                </dl>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={copyUrl}
                    className="inline-flex h-8 items-center gap-1.5 border border-border bg-white px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                    {copied ? dict.media.copied : dict.media.copyUrl}
                  </button>
                </div>

                <div className="space-y-3 border-t border-border pt-4">
                  <div>
                    <label className="text-xs font-semibold text-foreground">{dict.story.altText}</label>
                    <input
                      type="text"
                      value={selected.altText}
                      onChange={(e) => setSelected({ ...selected, altText: e.target.value })}
                      className="mt-1 h-9 w-full border border-border bg-white px-2 text-sm focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground">{dict.story.imageCaption}</label>
                    <input
                      type="text"
                      value={selected.caption ?? ''}
                      onChange={(e) => setSelected({ ...selected, caption: e.target.value })}
                      className="mt-1 h-9 w-full border border-border bg-white px-2 text-sm focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground">{dict.story.imageCredit}</label>
                    <input
                      type="text"
                      value={selected.credit ?? ''}
                      onChange={(e) => setSelected({ ...selected, credit: e.target.value })}
                      className="mt-1 h-9 w-full border border-border bg-white px-2 text-sm focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSaveDetails}
                      className="inline-flex h-9 items-center bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                    >
                      {dict.common.save}
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="inline-flex h-9 items-center gap-1.5 border border-border bg-white px-4 text-sm font-semibold text-breaking transition-colors hover:bg-breaking/5"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      {dict.common.delete}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
