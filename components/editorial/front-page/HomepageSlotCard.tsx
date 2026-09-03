'use client';

import { ImageIcon, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { FrontPageStoryOption } from '@/lib/services/front-page';
import type { Locale } from '@/types';

import { StoryPicker } from './StoryPicker';

interface HomepageSlotCardProps {
  locale: Locale;
  label: string;
  description?: string;
  stories: FrontPageStoryOption[];
  excludedStoryIds?: string[];
  story?: FrontPageStoryOption | null;
  disabled?: boolean;
  onSelect: (story: FrontPageStoryOption) => void;
  onRemove: () => void;
}

export function HomepageSlotCard({
  locale,
  label,
  description,
  stories,
  excludedStoryIds = [],
  story = null,
  disabled = false,
  onSelect,
  onRemove,
}: HomepageSlotCardProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const availableStories = useMemo(
    () =>
      stories.filter(
        (option) =>
          option.id === story?.id || !excludedStoryIds.includes(option.id)
      ),
    [excludedStoryIds, stories, story?.id]
  );

  return (
    <>
      <article className="flex min-h-[168px] min-w-0 flex-col rounded-xl border border-border bg-white p-4 shadow-sm shadow-black/[0.02]">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          {description && (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        {story ? (
          <div className="mt-4 flex min-w-0 flex-1 flex-col">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-muted">
                {story.featuredImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={story.featuredImage.url}
                    alt={story.featuredImage.altText}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon
                    className="h-5 w-5 text-muted-foreground/60"
                    aria-hidden
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em]">
                  {story.primaryCategory && (
                    <span className="text-primary">
                      {locale === 'es'
                        ? story.primaryCategory.nameEs
                        : story.primaryCategory.nameEn}
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    {story.language.toUpperCase()}
                  </span>
                </div>
                <h3 className="mt-1 line-clamp-3 font-headline text-sm font-bold leading-5 text-deep">
                  {story.headline}
                </h3>
              </div>
            </div>

            <div className="mt-auto flex flex-wrap gap-2 pt-4">
              <button
                type="button"
                disabled={disabled}
                onClick={() => setPickerOpen(true)}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-deep transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                {locale === 'es' ? 'Cambiar' : 'Change'}
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={onRemove}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-breaking/20 bg-white px-3 text-xs font-semibold text-breaking transition-colors hover:bg-breaking/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breaking/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                {locale === 'es' ? 'Quitar' : 'Remove'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setPickerOpen(true)}
            className="mt-4 flex min-h-[96px] flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-muted/20 px-4 py-5 text-center transition-colors hover:border-primary/50 hover:bg-primary/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Plus className="h-4 w-4" aria-hidden />
            </span>
            <span className="mt-2 text-xs font-semibold text-deep">
              {locale === 'es' ? 'Asignar historia' : 'Assign story'}
            </span>
            <span className="mt-1 text-[11px] text-muted-foreground">
              {locale === 'es'
                ? 'Selecciona una historia publicada.'
                : 'Choose a published story.'}
            </span>
          </button>
        )}
      </article>

      <StoryPicker
        open={pickerOpen}
        locale={locale}
        stories={availableStories}
        selectedStoryId={story?.id ?? null}
        title={label}
        onSelect={onSelect}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}
