'use client';

import {
  Archive,
  CheckCircle2,
  Copy,
  ExternalLink,
  Heart,
  MoreHorizontal,
  RotateCcw,
  Trash2,
} from 'lucide-react';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import { cn } from '@/lib/utils';

import type {
  MediaAsset,
} from '@/types/editorial';

/* ========================================================= */
/* TYPES */
/* ========================================================= */

interface MediaAssetMenuProps {
  asset: MediaAsset;

  onOpen: (
    asset: MediaAsset
  ) => void;

  onFavorite: (
    asset: MediaAsset
  ) => void;

  onApprove: (
    asset: MediaAsset
  ) => void;

  onArchive: (
    asset: MediaAsset
  ) => void;

  onTrash: (
    asset: MediaAsset
  ) => void;

  onRestore: (
    asset: MediaAsset
  ) => void;

  loadingAction?:
    | 'favorite'
    | 'approve'
    | 'archive'
    | 'trash'
    | 'restore'
    | null;
}

/* ========================================================= */
/* COMPONENT */
/* ========================================================= */

export function MediaAssetMenu({
  asset,
  onOpen,
  onFavorite,
  onApprove,
  onArchive,
  onTrash,
  onRestore,
  loadingAction = null,
}: MediaAssetMenuProps) {
  const [
    open,
    setOpen,
  ] = useState(false);

  const containerRef =
    useRef<HTMLDivElement | null>(
      null
    );

  /* ======================================================= */
  /* CLOSE ON OUTSIDE CLICK */
  /* ======================================================= */

  useEffect(
    () => {
      if (!open) {
        return;
      }

      function handlePointerDown(
        event: MouseEvent
      ) {
        const target =
          event.target as Node;

        if (
          !containerRef.current?.contains(
            target
          )
        ) {
          setOpen(
            false
          );
        }
      }

      window.addEventListener(
        'mousedown',
        handlePointerDown
      );

      return () => {
        window.removeEventListener(
          'mousedown',
          handlePointerDown
        );
      };
    },
    [
      open,
    ]
  );

  /* ======================================================= */
  /* CLOSE ON ESCAPE */
  /* ======================================================= */

  useEffect(
    () => {
      if (!open) {
        return;
      }

      function handleKeyDown(
        event: KeyboardEvent
      ) {
        if (
          event.key ===
          'Escape'
        ) {
          setOpen(
            false
          );
        }
      }

      window.addEventListener(
        'keydown',
        handleKeyDown
      );

      return () => {
        window.removeEventListener(
          'keydown',
          handleKeyDown
        );
      };
    },
    [
      open,
    ]
  );

  /* ======================================================= */
  /* HELPERS */
  /* ======================================================= */

  function runAction(
    callback: () => void
  ) {
    callback();

    setOpen(
      false
    );
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(
        asset.url
      );
    } catch {
      /*
       * Clipboard failures are intentionally silent here.
       * The inspector exposes the same action with fuller
       * error handling.
       */
    }

    setOpen(
      false
    );
  }

  const busy =
    Boolean(
      loadingAction
    );

  /* ======================================================= */
  /* RENDER */
  /* ======================================================= */

  return (
    <div
      ref={
        containerRef
      }
      className="
        relative
      "
    >
      <button
        type="button"
        onClick={(
          event
        ) => {
          event.stopPropagation();

          setOpen(
            (
              current
            ) =>
              !current
          );
        }}
        aria-label={`More options for ${asset.fileName}`}
        aria-expanded={
          open
        }
        title="More options"
        className={cn(
          `
            inline-flex
            h-8
            w-8
            items-center
            justify-center
            rounded-lg
            border
            border-black/10
            bg-white/95
            text-muted-foreground
            shadow-sm
            backdrop-blur
            transition
            hover:bg-white
            hover:text-foreground
          `,
          open &&
            `
              bg-white
              text-foreground
            `
        )}
      >
        <MoreHorizontal
          className="
            h-4
            w-4
          "
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="menu"
          className="
            absolute
            right-0
            top-[calc(100%+0.4rem)]
            z-50
            w-52
            overflow-hidden
            rounded-xl
            border
            border-border
            bg-white
            p-1.5
            shadow-xl
          "
          onClick={(
            event
          ) =>
            event.stopPropagation()
          }
        >
          {/* =============================================== */}
          {/* PRIMARY */}
          {/* =============================================== */}

          <MenuButton
            label="Open details"
            icon={
              ExternalLink
            }
            disabled={
              busy
            }
            onClick={() =>
              runAction(
                () =>
                  onOpen(
                    asset
                  )
              )
            }
          />

          <MenuButton
            label={
              asset.isFavorite
                ? 'Remove favorite'
                : 'Add to favorites'
            }
            icon={
              Heart
            }
            active={
              asset.isFavorite
            }
            loading={
              loadingAction ===
              'favorite'
            }
            disabled={
              busy
            }
            onClick={() =>
              runAction(
                () =>
                  onFavorite(
                    asset
                  )
              )
            }
          />

          <MenuButton
            label="Copy media URL"
            icon={
              Copy
            }
            disabled={
              busy
            }
            onClick={() =>
              void copyUrl()
            }
          />

          <div
            className="
              my-1.5
              h-px
              bg-border
            "
          />

          {/* =============================================== */}
          {/* WORKFLOW */}
          {/* =============================================== */}

          {asset.status !==
            'approved' &&
            asset.status !==
              'trashed' && (
              <MenuButton
                label="Approve"
                icon={
                  CheckCircle2
                }
                loading={
                  loadingAction ===
                  'approve'
                }
                disabled={
                  busy
                }
                onClick={() =>
                  runAction(
                    () =>
                      onApprove(
                        asset
                      )
                  )
                }
              />
            )}

          {asset.status !==
            'archived' &&
            asset.status !==
              'trashed' && (
              <MenuButton
                label="Archive"
                icon={
                  Archive
                }
                loading={
                  loadingAction ===
                  'archive'
                }
                disabled={
                  busy
                }
                onClick={() =>
                  runAction(
                    () =>
                      onArchive(
                        asset
                      )
                  )
                }
              />
            )}

          {asset.status !==
            'trashed' && (
              <MenuButton
                label="Move to trash"
                icon={
                  Trash2
                }
                danger
                loading={
                  loadingAction ===
                  'trash'
                }
                disabled={
                  busy
                }
                onClick={() =>
                  runAction(
                    () =>
                      onTrash(
                        asset
                      )
                  )
                }
              />
            )}

          {asset.status ===
            'trashed' && (
              <MenuButton
                label="Restore"
                icon={
                  RotateCcw
                }
                loading={
                  loadingAction ===
                  'restore'
                }
                disabled={
                  busy
                }
                onClick={() =>
                  runAction(
                    () =>
                      onRestore(
                        asset
                      )
                  )
                }
              />
            )}
        </div>
      )}
    </div>
  );
}

/* ========================================================= */
/* MENU BUTTON */
/* ========================================================= */

function MenuButton({
  label,
  icon: Icon,
  danger = false,
  active = false,
  loading = false,
  disabled = false,
  onClick,
}: {
  label: string;

  icon: typeof Archive;

  danger?: boolean;

  active?: boolean;

  loading?: boolean;

  disabled?: boolean;

  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={
        onClick
      }
      disabled={
        disabled
      }
      className={cn(
        `
          flex
          w-full
          items-center
          gap-2.5
          rounded-lg
          px-2.5
          py-2
          text-left
          text-sm
          font-medium
          transition
          disabled:cursor-not-allowed
          disabled:opacity-40
        `,
        danger
          ? `
            text-breaking
            hover:bg-breaking/5
          `
          : active
            ? `
              bg-primary/5
              text-primary
              hover:bg-primary/10
            `
            : `
              text-foreground
              hover:bg-surface-muted
            `
      )}
    >
      <Icon
        className={cn(
          `
            h-4
            w-4
            shrink-0
          `,
          loading &&
            'animate-pulse'
        )}
        aria-hidden
      />

      <span
        className="
          min-w-0
          flex-1
        "
      >
        {loading
          ? 'Working...'
          : label}
      </span>
    </button>
  );
}