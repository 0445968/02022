'use client';

import {
  Archive,
  ArrowLeft,
  Eye,
  RotateCcw,
  Save,
  Send,
} from 'lucide-react';

import type {
  Dictionary,
} from '@/lib/i18n/dictionaries';

import type {
  StoryStatus,
} from '@/lib/db/database.types';

import type {
  SaveState,
} from './types';

import {
  StoryStatusBadge,
} from './StoryStatusBadge';

import {
  cn,
} from '@/lib/utils';

interface StoryEditorHeaderProps {
  dict: Dictionary;
  locale: 'en' | 'es';

  status: StoryStatus;

  saveState: SaveState;
  isSaving: boolean;

  userIsAuthor: boolean;
  userIsEditor: boolean;

  onBackToStories: () => void;
  onPreview: () => void;
  onSave: () => void;

  onSubmitReview: () => void;
  onPublish: () => void;
  onReturnToDraft: () => void;
  onArchive: () => void;
}

export function StoryEditorHeader({
  dict,
  locale,
  status,
  saveState,
  isSaving,
  userIsAuthor,
  userIsEditor,
  onBackToStories,
  onPreview,
  onSave,
  onSubmitReview,
  onPublish,
  onReturnToDraft,
  onArchive,
}: StoryEditorHeaderProps) {
  const saveStateLabel: Record<
    SaveState,
    string
  > = {
    saved:
      dict.story.saved,

    saving:
      dict.story.saving,

    unsaved:
      dict.story
        .unsavedChanges,

    error:
      dict.story.errorSaving,
  };

  const saveStateColor: Record<
    SaveState,
    string
  > = {
    saved:
      'text-live',

    saving:
      'text-primary',

    unsaved:
      'text-muted-foreground',

    error:
      'text-breaking',
  };

  return (
    <div
      className="
        flex
        items-center
        justify-between
        gap-3
        border-b
        border-border
        bg-white
        px-4
        py-2.5
      "
    >
      {/* Left side */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={
            onBackToStories
          }
          className="
            inline-flex
            items-center
            gap-1
            text-sm
            font-medium
            text-muted-foreground
            transition-colors
            hover:text-primary
            focus-visible:outline-none
            focus-visible:underline
          "
        >
          <ArrowLeft
            className="h-4 w-4"
            aria-hidden
          />

          <span className="hidden sm:inline">
            {
              dict.story
                .backToStories
            }
          </span>
        </button>

        <span className="text-xs text-muted-foreground">
          /
        </span>

        <span className="text-xs font-medium text-muted-foreground">
          {dict.story.editing}
        </span>

        <StoryStatusBadge
          status={status}
          locale={locale}
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            `
              hidden
              text-xs
              font-medium
              sm:inline
            `,
            saveStateColor[
              saveState
            ]
          )}
        >
          {
            saveStateLabel[
              saveState
            ]
          }
        </span>

        {/* Preview */}
        <button
          type="button"
          onClick={onPreview}
          className="
            inline-flex
            h-8
            items-center
            gap-1
            border
            border-border
            bg-white
            px-3
            text-xs
            font-semibold
            text-foreground
            transition-colors
            hover:bg-surface-muted
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-ring
          "
        >
          <Eye
            className="h-3.5 w-3.5"
            aria-hidden
          />

          <span className="hidden sm:inline">
            {
              dict.story.preview
            }
          </span>
        </button>

        {/* Manual save */}
        <button
          type="button"
          onClick={onSave}
          className="
            inline-flex
            h-8
            items-center
            gap-1
            border
            border-border
            bg-white
            px-3
            text-xs
            font-semibold
            text-foreground
            transition-colors
            hover:bg-surface-muted
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-ring
          "
        >
          <Save
            className="h-3.5 w-3.5"
            aria-hidden
          />

          <span className="hidden sm:inline">
            {dict.story.save}
          </span>
        </button>

        {/* Author submit */}
        {userIsAuthor &&
          !userIsEditor &&
          status ===
            'draft' && (
            <button
              type="button"
              onClick={
                onSubmitReview
              }
              disabled={
                isSaving
              }
              className="
                inline-flex
                h-8
                items-center
                gap-1
                bg-primary
                px-3
                text-xs
                font-semibold
                text-white
                transition-colors
                hover:bg-primary/90
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                disabled:opacity-50
              "
            >
              <Send
                className="h-3.5 w-3.5"
                aria-hidden
              />

              <span className="hidden sm:inline">
                {
                  dict.story
                    .submitReview
                }
              </span>
            </button>
          )}

        {/* Editor publish */}
        {userIsEditor &&
          status !==
            'published' &&
          status !==
            'archived' && (
            <button
              type="button"
              onClick={onPublish}
              disabled={
                isSaving
              }
              className="
                inline-flex
                h-8
                items-center
                gap-1
                bg-live
                px-3
                text-xs
                font-semibold
                text-white
                transition-colors
                hover:bg-live/90
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                disabled:opacity-50
              "
            >
              <Send
                className="h-3.5 w-3.5"
                aria-hidden
              />

              <span className="hidden sm:inline">
                {
                  dict.story
                    .publish
                }
              </span>
            </button>
          )}

        {/* Return to draft */}
        {userIsEditor &&
          (status ===
            'published' ||
            status ===
              'in_review') && (
            <button
              type="button"
              onClick={
                onReturnToDraft
              }
              disabled={
                isSaving
              }
              className="
                inline-flex
                h-8
                items-center
                gap-1
                border
                border-border
                bg-white
                px-3
                text-xs
                font-semibold
                text-foreground
                transition-colors
                hover:bg-surface-muted
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                disabled:opacity-50
              "
            >
              <RotateCcw
                className="h-3.5 w-3.5"
                aria-hidden
              />

              <span className="hidden sm:inline">
                {
                  dict.story
                    .returnToDraft
                }
              </span>
            </button>
          )}

        {/* Archive */}
        {userIsEditor &&
          status !==
            'archived' && (
            <button
              type="button"
              onClick={onArchive}
              disabled={
                isSaving
              }
              className="
                inline-flex
                h-8
                items-center
                gap-1
                border
                border-border
                bg-white
                px-3
                text-xs
                font-semibold
                text-muted-foreground
                transition-colors
                hover:text-breaking
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                disabled:opacity-50
              "
              aria-label={
                dict.story.archive
              }
              title={
                dict.story.archive
              }
            >
              <Archive
                className="h-3.5 w-3.5"
                aria-hidden
              />
            </button>
          )}
      </div>
    </div>
  );
}