'use client';

import {
  FileAudio,
  FileText,
  FileVideo,
  Image as ImageIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';

import type {
  MediaAsset,
} from '@/types/editorial';

import {
  MediaAssetMenu,
} from './MediaAssetMenu';

import type {
  MediaViewMode,
} from './MediaLibrary';

/* ========================================================= */
/* TYPES */
/* ========================================================= */

export type MediaCardAction =
  | 'favorite'
  | 'approve'
  | 'archive'
  | 'trash'
  | 'restore';

interface MediaCardProps {
  asset: MediaAsset;

  viewMode: MediaViewMode;

  selected: boolean;

  loadingAction?:
    | MediaCardAction
    | null;

  onOpen: (
    asset: MediaAsset
  ) => void;

  onToggleSelected: (
    id: string
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
}

/* ========================================================= */
/* HELPERS */
/* ========================================================= */

function formatFileSize(
  bytes: number | null
): string {
  if (
    bytes === null ||
    bytes < 0
  ) {
    return 'Unknown size';
  }

  if (
    bytes < 1024
  ) {
    return `${bytes} B`;
  }

  const kb =
    bytes / 1024;

  if (
    kb < 1024
  ) {
    return `${kb.toFixed(1)} KB`;
  }

  const mb =
    kb / 1024;

  if (
    mb < 1024
  ) {
    return `${mb.toFixed(1)} MB`;
  }

  return `${(
    mb / 1024
  ).toFixed(1)} GB`;
}

function formatDimensions(
  asset: MediaAsset
): string | null {
  if (
    asset.width === null ||
    asset.height === null
  ) {
    return null;
  }

  return `${asset.width} × ${asset.height}`;
}

function getStatusLabel(
  asset: MediaAsset
): string {
  switch (
    asset.status
  ) {
    case 'draft':
      return 'Draft';

    case 'approved':
      return 'Approved';

    case 'restricted':
      return 'Restricted';

    case 'archived':
      return 'Archived';

    case 'trashed':
      return 'Trash';

    default:
      return asset.status;
  }
}

/* ========================================================= */
/* PREVIEW */
/* ========================================================= */

function MediaPreview({
  asset,
  compact = false,
}: {
  asset: MediaAsset;

  compact?: boolean;
}) {
  const commonIconClass =
    compact
      ? 'h-6 w-6'
      : 'h-8 w-8';

  if (
    asset.assetType ===
      'image' ||
    asset.assetType ===
      'graphic' ||
    asset.assetType ===
      'logo' ||
    asset.assetType ===
      'social'
  ) {
    return (
      <img
        src={
          asset.url
        }
        alt={
          asset.altText
        }
        className="
          h-full
          w-full
          object-cover
        "
      />
    );
  }

  if (
    asset.assetType ===
      'video' ||
    asset.assetType ===
      'broadcast'
  ) {
    return (
      <PreviewFallback>
        <FileVideo
          className={
            commonIconClass
          }
          aria-hidden
        />

        {!compact && (
          <span>
            Video
          </span>
        )}
      </PreviewFallback>
    );
  }

  if (
    asset.assetType ===
    'audio'
  ) {
    return (
      <PreviewFallback>
        <FileAudio
          className={
            commonIconClass
          }
          aria-hidden
        />

        {!compact && (
          <span>
            Audio
          </span>
        )}
      </PreviewFallback>
    );
  }

  if (
    asset.assetType ===
    'document'
  ) {
    return (
      <PreviewFallback>
        <FileText
          className={
            commonIconClass
          }
          aria-hidden
        />

        {!compact && (
          <span>
            Document
          </span>
        )}
      </PreviewFallback>
    );
  }

  return (
    <PreviewFallback>
      <ImageIcon
        className={
          commonIconClass
        }
        aria-hidden
      />

      {!compact && (
        <span>
          Media
        </span>
      )}
    </PreviewFallback>
  );
}

function PreviewFallback({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <div
      className="
        flex
        h-full
        w-full
        flex-col
        items-center
        justify-center
        gap-2
        bg-surface-muted
        text-xs
        font-semibold
        text-muted-foreground
      "
    >
      {children}
    </div>
  );
}

/* ========================================================= */
/* COMPONENT */
/* ========================================================= */

export function MediaCard({
  asset,
  viewMode,
  selected,
  loadingAction = null,
  onOpen,
  onToggleSelected,
  onFavorite,
  onApprove,
  onArchive,
  onTrash,
  onRestore,
}: MediaCardProps) {
  if (
    viewMode ===
    'list'
  ) {
    return (
      <ListMediaCard
        asset={
          asset
        }
        selected={
          selected
        }
        loadingAction={
          loadingAction
        }
        onOpen={
          onOpen
        }
        onToggleSelected={
          onToggleSelected
        }
        onFavorite={
          onFavorite
        }
        onApprove={
          onApprove
        }
        onArchive={
          onArchive
        }
        onTrash={
          onTrash
        }
        onRestore={
          onRestore
        }
      />
    );
  }

  const compact =
    viewMode ===
    'compact';

  const dimensions =
    formatDimensions(
      asset
    );

  return (
    <article
      className={cn(
        `
          group
          relative
          overflow-visible
          rounded-xl
          border
          bg-white
          transition
        `,
        selected
          ? `
            border-primary
            ring-2
            ring-primary/10
          `
          : `
            border-border
            hover:border-primary/30
            hover:shadow-sm
          `
      )}
    >
      {/* ================================================= */}
      {/* IMAGE / PREVIEW WRAPPER */}
      {/* ================================================= */}

      <div
        className="
          relative
          overflow-hidden
          rounded-t-xl
        "
      >
        {/* =============================================== */}
        {/* SELECT */}
        {/* =============================================== */}

        <label
          className="
            absolute
            left-2
            top-2
            z-20
            flex
            h-8
            w-8
            cursor-pointer
            items-center
            justify-center
            rounded-lg
            border
            border-black/10
            bg-white/95
            shadow-sm
            backdrop-blur
          "
          onClick={(
            event
          ) =>
            event.stopPropagation()
          }
        >
          <input
            type="checkbox"
            checked={
              selected
            }
            onChange={() =>
              onToggleSelected(
                asset.id
              )
            }
            aria-label={`Select ${asset.fileName}`}
            className="
              h-3.5
              w-3.5
            "
          />
        </label>

        {/* =============================================== */}
        {/* ASSET MENU */}
        {/* =============================================== */}

        <div
          className="
            absolute
            right-2
            top-2
            z-30
            opacity-0
            transition
            group-hover:opacity-100
            focus-within:opacity-100
          "
        >
          <MediaAssetMenu
            asset={
              asset
            }
            loadingAction={
              loadingAction
            }
            onOpen={
              onOpen
            }
            onFavorite={
              onFavorite
            }
            onApprove={
              onApprove
            }
            onArchive={
              onArchive
            }
            onTrash={
              onTrash
            }
            onRestore={
              onRestore
            }
          />
        </div>

        <button
          type="button"
          onClick={() =>
            onOpen(
              asset
            )
          }
          className="
            block
            w-full
            text-left
          "
        >
          <div
            className="
              relative
              aspect-square
              overflow-hidden
              bg-surface-subtle
            "
          >
            <MediaPreview
              asset={
                asset
              }
              compact={
                compact
              }
            />

            {!compact && (
              <div
                className="
                  pointer-events-none
                  absolute
                  inset-x-0
                  bottom-0
                  flex
                  items-end
                  justify-between
                  gap-2
                  bg-gradient-to-t
                  from-black/50
                  to-transparent
                  px-3
                  pb-2
                  pt-8
                  opacity-0
                  transition
                  group-hover:opacity-100
                "
              >
                <span
                  className="
                    truncate
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-wide
                    text-white
                  "
                >
                  {
                    asset.assetType
                  }
                </span>

                {dimensions && (
                  <span
                    className="
                      shrink-0
                      text-[10px]
                      font-medium
                      text-white/80
                    "
                  >
                    {
                      dimensions
                    }
                  </span>
                )}
              </div>
            )}
          </div>
        </button>
      </div>

      {/* ================================================= */}
      {/* INFORMATION */}
      {/* ================================================= */}

      <button
        type="button"
        onClick={() =>
          onOpen(
            asset
          )
        }
        className="
          block
          w-full
          rounded-b-xl
          text-left
        "
      >
        <div
          className={
            compact
              ? 'p-2'
              : 'p-3'
          }
        >
          <div
            className="
              flex
              items-start
              justify-between
              gap-2
            "
          >
            <div
              className="
                min-w-0
                flex-1
              "
            >
              <p
                className="
                  truncate
                  text-sm
                  font-semibold
                  text-foreground
                "
              >
                {asset.title ||
                  asset.fileName}
              </p>

              {!compact && (
                <p
                  className="
                    mt-1
                    truncate
                    text-xs
                    text-muted-foreground
                  "
                >
                  {
                    asset.fileName
                  }
                </p>
              )}
            </div>

            {!compact && (
              <span
                className={cn(
                  `
                    shrink-0
                    rounded-full
                    px-2
                    py-1
                    text-[9px]
                    font-black
                    uppercase
                    tracking-[0.08em]
                  `,
                  asset.status ===
                    'approved'
                    ? `
                      bg-live/10
                      text-green-700
                    `
                    : asset.status ===
                        'draft'
                      ? `
                        bg-surface-muted
                        text-muted-foreground
                      `
                      : asset.status ===
                          'restricted'
                        ? `
                          bg-breaking/10
                          text-breaking
                        `
                        : `
                          bg-surface-subtle
                          text-muted-foreground
                        `
                )}
              >
                {
                  getStatusLabel(
                    asset
                  )
                }
              </span>
            )}
          </div>

          {!compact && (
            <div
              className="
                mt-3
                flex
                items-center
                justify-between
                gap-2
                border-t
                border-border
                pt-2
                text-[11px]
                text-muted-foreground
              "
            >
              <span
                className="
                  truncate
                "
              >
                {asset.photographer ||
                  asset.credit ||
                  'No credit'}
              </span>

              <span
                className="
                  shrink-0
                "
              >
                {formatFileSize(
                  asset.fileSize
                )}
              </span>
            </div>
          )}
        </div>
      </button>
    </article>
  );
}

/* ========================================================= */
/* LIST CARD */
/* ========================================================= */

function ListMediaCard({
  asset,
  selected,
  loadingAction,
  onOpen,
  onToggleSelected,
  onFavorite,
  onApprove,
  onArchive,
  onTrash,
  onRestore,
}: Omit<
  MediaCardProps,
  'viewMode'
>) {
  const dimensions =
    formatDimensions(
      asset
    );

  return (
    <article
      className={cn(
        `
          group
          relative
          flex
          min-w-0
          items-center
          gap-3
          overflow-visible
          rounded-xl
          border
          bg-white
          p-3
          transition
        `,
        selected
          ? `
            border-primary
            ring-2
            ring-primary/10
          `
          : `
            border-border
            hover:border-primary/30
            hover:shadow-sm
          `
      )}
    >
      <input
        type="checkbox"
        checked={
          selected
        }
        onChange={() =>
          onToggleSelected(
            asset.id
          )
        }
        aria-label={`Select ${asset.fileName}`}
        className="
          h-4
          w-4
          shrink-0
        "
      />

      <button
        type="button"
        onClick={() =>
          onOpen(
            asset
          )
        }
        className="
          flex
          min-w-0
          flex-1
          items-center
          gap-3
          text-left
        "
      >
        <div
          className="
            h-14
            w-14
            shrink-0
            overflow-hidden
            rounded-lg
            bg-surface-subtle
          "
        >
          <MediaPreview
            asset={
              asset
            }
            compact
          />
        </div>

        <div
          className="
            min-w-0
            flex-1
          "
        >
          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            <p
              className="
                truncate
                text-sm
                font-semibold
                text-foreground
              "
            >
              {asset.title ||
                asset.fileName}
            </p>

            <span
              className="
                shrink-0
                rounded-full
                bg-surface-muted
                px-2
                py-0.5
                text-[9px]
                font-black
                uppercase
                tracking-wide
                text-muted-foreground
              "
            >
              {
                getStatusLabel(
                  asset
                )
              }
            </span>
          </div>

          <p
            className="
              mt-1
              truncate
              text-xs
              text-muted-foreground
            "
          >
            {
              asset.fileName
            }
          </p>
        </div>

        <div
          className="
            hidden
            w-24
            shrink-0
            text-xs
            capitalize
            text-muted-foreground
            md:block
          "
        >
          {
            asset.assetType
          }
        </div>

        <div
          className="
            hidden
            w-28
            shrink-0
            text-xs
            text-muted-foreground
            lg:block
          "
        >
          {dimensions ||
            '—'}
        </div>

        <div
          className="
            hidden
            w-24
            shrink-0
            text-right
            text-xs
            text-muted-foreground
            xl:block
          "
        >
          {formatFileSize(
            asset.fileSize
          )}
        </div>
      </button>

      <MediaAssetMenu
        asset={
          asset
        }
        loadingAction={
          loadingAction
        }
        onOpen={
          onOpen
        }
        onFavorite={
          onFavorite
        }
        onApprove={
          onApprove
        }
        onArchive={
          onArchive
        }
        onTrash={
          onTrash
        }
        onRestore={
          onRestore
        }
      />
    </article>
  );
}