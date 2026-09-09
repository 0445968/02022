'use client';

import {
  Archive,
  CheckCircle2,
  Heart,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';

import { cn } from '@/lib/utils';

/* ========================================================= */
/* TYPES */
/* ========================================================= */

interface MediaBulkActionsProps {
  selectedCount: number;

  mode:
    | 'library'
    | 'archived'
    | 'trash';

  loadingAction?:
    | 'approve'
    | 'archive'
    | 'trash'
    | 'restore'
    | 'favorite'
    | null;

  onApprove: () => void;

  onArchive: () => void;

  onTrash: () => void;

  onRestore: () => void;

  onFavorite: () => void;

  onClear: () => void;
}

/* ========================================================= */
/* COMPONENT */
/* ========================================================= */

export function MediaBulkActions({
  selectedCount,
  mode,
  loadingAction = null,
  onApprove,
  onArchive,
  onTrash,
  onRestore,
  onFavorite,
  onClear,
}: MediaBulkActionsProps) {
  if (
    selectedCount <= 0
  ) {
    return null;
  }

  return (
    <div
      className="
        fixed
        bottom-5
        left-1/2
        z-40
        w-[calc(100%-2rem)]
        max-w-4xl
        -translate-x-1/2
      "
    >
      <div
        className="
          flex
          flex-col
          gap-3
          rounded-2xl
          border
          border-border
          bg-white
          px-4
          py-3
          shadow-2xl
          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >
        {/* ================================================= */}
        {/* COUNT */}
        {/* ================================================= */}

        <div
          className="
            flex
            min-w-0
            items-center
            gap-3
          "
        >
          <div
            className="
              flex
              h-8
              min-w-8
              items-center
              justify-center
              rounded-lg
              bg-deep
              px-2
              text-xs
              font-black
              text-white
            "
          >
            {
              selectedCount
            }
          </div>

          <div
            className="
              min-w-0
            "
          >
            <p
              className="
                text-sm
                font-bold
                text-foreground
              "
            >
              {selectedCount ===
              1
                ? 'Asset selected'
                : 'Assets selected'}
            </p>

            <p
              className="
                text-xs
                text-muted-foreground
              "
            >
              Apply an action to all selected media.
            </p>
          </div>
        </div>

        {/* ================================================= */}
        {/* ACTIONS */}
        {/* ================================================= */}

        <div
          className="
            flex
            flex-wrap
            items-center
            gap-2
          "
        >
          {mode ===
            'library' && (
            <>
              <BulkButton
                label="Approve"
                icon={
                  CheckCircle2
                }
                loading={
                  loadingAction ===
                  'approve'
                }
                disabled={
                  Boolean(
                    loadingAction
                  )
                }
                onClick={
                  onApprove
                }
              />

              <BulkButton
                label="Favorite"
                icon={
                  Heart
                }
                loading={
                  loadingAction ===
                  'favorite'
                }
                disabled={
                  Boolean(
                    loadingAction
                  )
                }
                onClick={
                  onFavorite
                }
              />

              <BulkButton
                label="Archive"
                icon={
                  Archive
                }
                loading={
                  loadingAction ===
                  'archive'
                }
                disabled={
                  Boolean(
                    loadingAction
                  )
                }
                onClick={
                  onArchive
                }
              />

              <BulkButton
                label="Trash"
                icon={
                  Trash2
                }
                danger
                loading={
                  loadingAction ===
                  'trash'
                }
                disabled={
                  Boolean(
                    loadingAction
                  )
                }
                onClick={
                  onTrash
                }
              />
            </>
          )}

          {mode ===
            'archived' && (
            <>
              <BulkButton
                label="Restore"
                icon={
                  RotateCcw
                }
                loading={
                  loadingAction ===
                  'restore'
                }
                disabled={
                  Boolean(
                    loadingAction
                  )
                }
                onClick={
                  onRestore
                }
              />

              <BulkButton
                label="Trash"
                icon={
                  Trash2
                }
                danger
                loading={
                  loadingAction ===
                  'trash'
                }
                disabled={
                  Boolean(
                    loadingAction
                  )
                }
                onClick={
                  onTrash
                }
              />
            </>
          )}

          {mode ===
            'trash' && (
            <BulkButton
              label="Restore"
              icon={
                RotateCcw
              }
              loading={
                loadingAction ===
                'restore'
              }
              disabled={
                Boolean(
                  loadingAction
                )
              }
              onClick={
                onRestore
              }
            />
          )}

          <div
            className="
              mx-1
              hidden
              h-6
              w-px
              bg-border
              sm:block
            "
          />

          <button
            type="button"
            onClick={
              onClear
            }
            disabled={
              Boolean(
                loadingAction
              )
            }
            aria-label="Clear selection"
            title="Clear selection"
            className="
              inline-flex
              h-9
              items-center
              justify-center
              gap-2
              rounded-lg
              border
              border-border
              bg-white
              px-3
              text-xs
              font-semibold
              text-muted-foreground
              transition
              hover:bg-surface-muted
              hover:text-foreground
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            <X
              className="
                h-3.5
                w-3.5
              "
              aria-hidden
            />

            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========================================================= */
/* BUTTON */
/* ========================================================= */

function BulkButton({
  label,
  icon: Icon,
  danger = false,
  loading = false,
  disabled = false,
  onClick,
}: {
  label: string;

  icon: typeof Archive;

  danger?: boolean;

  loading?: boolean;

  disabled?: boolean;

  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      disabled={
        disabled
      }
      className={cn(
        `
          inline-flex
          h-9
          items-center
          justify-center
          gap-2
          rounded-lg
          border
          px-3
          text-xs
          font-bold
          transition
          disabled:cursor-not-allowed
          disabled:opacity-40
        `,
        danger
          ? `
            border-breaking/20
            bg-breaking/5
            text-breaking
            hover:bg-breaking/10
          `
          : `
            border-border
            bg-white
            text-foreground
            hover:bg-surface-muted
          `
      )}
    >
      <Icon
        className={cn(
          `
            h-3.5
            w-3.5
          `,
          loading &&
            'animate-pulse'
        )}
        aria-hidden
      />

      {loading
        ? 'Working...'
        : label}
    </button>
  );
}