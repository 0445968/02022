'use client';

import {
  useState,
} from 'react';

import {
  Archive,
  ArrowLeft,
  Eye,
  RotateCcw,
  Save,
  Send,
  X,
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

  locale:
    | 'en'
    | 'es';

  status:
    StoryStatus;

  saveState:
    SaveState;

  isSaving:
    boolean;

  userIsAuthor:
    boolean;

  userIsEditor:
    boolean;

  /**
   * True when the editor was opened from an
   * already-published West Island Times story.
   */
  isPublishedStory:
    boolean;

  /**
   * True when a saved story_revisions row already
   * exists for this published article.
   */
  hasPendingRevision:
    boolean;

  onBackToStories:
    () => void;

  onPreview:
    () => void;

  onSave:
    () => void;

  onSubmitReview:
    () => void;

  onPublish:
    () => void;

  onPublishUpdate:
    () => void;

  onRevertChanges:
    () => void;

  onReturnToDraft:
    () => void;

  onArchive:
    () => void;
}

export function StoryEditorHeader({
  dict,
  locale,
  status,
  saveState,
  isSaving,
  userIsAuthor,
  userIsEditor,
  isPublishedStory,
  hasPendingRevision,
  onBackToStories,
  onPreview,
  onSave,
  onSubmitReview,
  onPublish,
  onPublishUpdate,
  onRevertChanges,
  onReturnToDraft,
  onArchive,
}: StoryEditorHeaderProps) {
  const [
    revertDialogOpen,
    setRevertDialogOpen,
  ] = useState(false);

  const saveStateLabel:
    Record<
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
      dict.story
        .errorSaving,
  };

  const saveStateColor:
    Record<
      SaveState,
      string
    > = {
    saved:
      'text-star',

    saving:
      'text-primary',

    unsaved:
      'text-muted-foreground',

    error:
      'text-breaking',
  };

  const pendingChangesLabel =
    locale === 'es'
      ? 'Cambios sin publicar'
      : 'Unpublished changes';

  const publishUpdateLabel =
    locale === 'es'
      ? 'Publicar actualización'
      : 'Publish update';

  const revertChangesLabel =
    locale === 'es'
      ? 'Revertir cambios'
      : 'Revert changes';

      const savedForEditorLabel =
    locale === 'es'
      ? 'Guardado para el editor'
      : 'Saved for editor';

  const revertTitle =
    locale === 'es'
      ? '¿Revertir cambios no publicados?'
      : 'Revert unpublished changes?';

  const revertDescription =
    locale === 'es'
      ? 'Esto descartará permanentemente todos los cambios realizados desde la versión actualmente publicada. La versión publicada permanecerá sin cambios.'
      : 'This will permanently discard all changes made since the currently published version. The published version will remain unchanged.';

  function confirmRevert() {
    setRevertDialogOpen(
      false
    );

    onRevertChanges();
  }

  return (
    <>
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
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={
              onBackToStories
            }
            className="
              inline-flex
              shrink-0
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

          <span className="hidden text-xs text-muted-foreground sm:inline">
            /
          </span>

          <span className="hidden text-xs font-medium text-muted-foreground md:inline">
            {
              dict.story
                .editing
            }
          </span>

          <StoryStatusBadge
            status={
              status
            }
            locale={
              locale
            }
          />

{isPublishedStory &&
  hasPendingRevision && (
    <span
      className="
        hidden
        items-center
        rounded-lg
        border
        border-star/30
        bg-star/10
        px-2
        py-1
        text-[0.6875rem]
        font-semibold
        text-star
        lg:inline-flex
      "
    >
      {userIsEditor
        ? pendingChangesLabel
        : savedForEditorLabel}
    </span>
  )}
        </div>

        {/* Right side */}
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              `
                hidden
                text-xs
                font-medium
                xl:inline
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
            onClick={
              onPreview
            }
            className="
              inline-flex
              h-8
              items-center
              gap-1
              rounded-lg
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
                dict.story
                  .preview
              }
            </span>
          </button>

          {/* Manual save */}
          <button
            type="button"
            onClick={
              onSave
            }
            disabled={
              isSaving
            }
            className="
              inline-flex
              h-8
              items-center
              gap-1
              rounded-lg
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
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            <Save
              className="h-3.5 w-3.5"
              aria-hidden
            />

            <span className="hidden sm:inline">
              {
                dict.story
                  .save
              }
            </span>
          </button>

          {/* Author submit */}
          {userIsAuthor &&
            !userIsEditor &&
            !isPublishedStory &&
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
                  rounded-lg
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
                  disabled:cursor-not-allowed
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

          {/* Initial publish */}
          {userIsEditor &&
            !isPublishedStory &&
            status !==
              'published' &&
            status !==
              'archived' && (
              <button
                type="button"
                onClick={
                  onPublish
                }
                disabled={
                  isSaving
                }
                className="
                  inline-flex
                  h-8
                  items-center
                  gap-1
                  rounded-lg
                  bg-star
                  px-3
                  text-xs
                  font-semibold
                  text-white
                  transition-colors
                  hover:bg-star/90
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                  disabled:cursor-not-allowed
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

          {/* Publish revision */}
          {userIsEditor &&
            isPublishedStory && (
              <button
                type="button"
                onClick={
                  onPublishUpdate
                }
                disabled={
                  isSaving
                }
                className="
                  inline-flex
                  h-8
                  items-center
                  gap-1
                  rounded-lg
                  bg-star
                  px-3
                  text-xs
                  font-semibold
                  text-white
                  transition-colors
                  hover:bg-star/90
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
                title={
                  publishUpdateLabel
                }
              >
                <Send
                  className="h-3.5 w-3.5"
                  aria-hidden
                />

                <span className="hidden sm:inline">
                  {
                    publishUpdateLabel
                  }
                </span>
              </button>
            )}

          {/* Return non-published review story to draft */}
          {userIsEditor &&
            !isPublishedStory &&
            status ===
              'in_review' && (
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
                  rounded-lg
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
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                <RotateCcw
                  className="h-3.5 w-3.5"
                  aria-hidden
                />

                <span className="hidden lg:inline">
                  {
                    dict.story
                      .returnToDraft
                  }
                </span>
              </button>
            )}

          {/* Revert unpublished revision */}
          {isPublishedStory && (
            <button
              type="button"
              onClick={() =>
                setRevertDialogOpen(
                  true
                )
              }
              disabled={
                isSaving
              }
              className="
                inline-flex
                h-8
                items-center
                gap-1
                rounded-lg
                border
                border-border
                bg-white
                px-3
                text-xs
                font-semibold
                text-muted-foreground
                transition-colors
                hover:border-breaking/30
                hover:bg-breaking/5
                hover:text-breaking
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
              aria-label={
                revertChangesLabel
              }
              title={
                revertChangesLabel
              }
            >
              <RotateCcw
                className="h-3.5 w-3.5"
                aria-hidden
              />

              <span className="hidden xl:inline">
                {
                  revertChangesLabel
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
                onClick={
                  onArchive
                }
                disabled={
                  isSaving
                }
                className="
                  inline-flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-border
                  bg-white
                  text-muted-foreground
                  transition-colors
                  hover:border-breaking/30
                  hover:bg-breaking/5
                  hover:text-breaking
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
                aria-label={
                  dict.story
                    .archive
                }
                title={
                  dict.story
                    .archive
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

      {/* Revert confirmation dialog */}
      {revertDialogOpen && (
        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            p-4
          "
          role="dialog"
          aria-modal="true"
          aria-labelledby="revert-changes-title"
        >
          <button
            type="button"
            className="
              absolute
              inset-0
              bg-deep/55
            "
            aria-label={
              locale === 'es'
                ? 'Cerrar'
                : 'Close'
            }
            onClick={() =>
              setRevertDialogOpen(
                false
              )
            }
          />

          <div
            className="
              relative
              z-10
              w-full
              max-w-md
              rounded-xl
              border
              border-border
              bg-white
              shadow-2xl
            "
          >
            <div
              className="
                flex
                items-start
                justify-between
                gap-4
                border-b
                border-border
                px-5
                py-4
              "
            >
              <div>
                <h2
                  id="revert-changes-title"
                  className="
                    text-base
                    font-semibold
                    text-foreground
                  "
                >
                  {
                    revertTitle
                  }
                </h2>

                <p
                  className="
                    mt-1.5
                    text-sm
                    leading-6
                    text-muted-foreground
                  "
                >
                  {
                    revertDescription
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setRevertDialogOpen(
                    false
                  )
                }
                className="
                  inline-flex
                  h-8
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  text-muted-foreground
                  transition-colors
                  hover:bg-surface-muted
                  hover:text-foreground
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                "
                aria-label={
                  locale === 'es'
                    ? 'Cerrar'
                    : 'Close'
                }
              >
                <X
                  className="h-4 w-4"
                  aria-hidden
                />
              </button>
            </div>

            <div
              className="
                flex
                items-center
                justify-end
                gap-2
                px-5
                py-4
              "
            >
              <button
                type="button"
                onClick={() =>
                  setRevertDialogOpen(
                    false
                  )
                }
                className="
                  inline-flex
                  h-9
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-border
                  bg-white
                  px-4
                  text-sm
                  font-semibold
                  text-foreground
                  transition-colors
                  hover:bg-surface-muted
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                "
              >
                {locale === 'es'
                  ? 'Cancelar'
                  : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={
                  confirmRevert
                }
                className="
                  inline-flex
                  h-9
                  items-center
                  justify-center
                  gap-2
                  rounded-lg
                  bg-breaking
                  px-4
                  text-sm
                  font-semibold
                  text-white
                  transition-colors
                  hover:bg-breaking/90
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-breaking/30
                "
              >
                <RotateCcw
                  className="h-4 w-4"
                  aria-hidden
                />

                {
                  revertChangesLabel
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}