'use client';

import type {
  MediaAsset,
} from '@/types/editorial';

import {
  MediaCard,
} from './MediaCard';

import type {
  MediaCardAction,
} from './MediaCard';

import type {
  MediaViewMode,
} from './MediaLibrary';

/* ========================================================= */
/* TYPES */
/* ========================================================= */

interface MediaGridProps {
  items: MediaAsset[];

  viewMode: MediaViewMode;

  selectedIds: Set<string>;

  loadingAssetId?: string | null;

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
/* COMPONENT */
/* ========================================================= */

export function MediaGrid({
  items,
  viewMode,
  selectedIds,
  loadingAssetId = null,
  loadingAction = null,
  onOpen,
  onToggleSelected,
  onFavorite,
  onApprove,
  onArchive,
  onTrash,
  onRestore,
}: MediaGridProps) {
  const cardProps = (
    asset: MediaAsset
  ) => ({
    asset,

    selected:
      selectedIds.has(
        asset.id
      ),

    loadingAction:
      loadingAssetId ===
      asset.id
        ? loadingAction
        : null,

    onOpen,

    onToggleSelected,

    onFavorite,

    onApprove,

    onArchive,

    onTrash,

    onRestore,
  });

  if (
    viewMode ===
    'list'
  ) {
    return (
      <div
        className="
          mt-6
          flex
          flex-col
          gap-2
        "
      >
        {items.map(
          (
            asset
          ) => (
            <MediaCard
              key={
                asset.id
              }
              {...cardProps(
                asset
              )}
              viewMode="list"
            />
          )
        )}
      </div>
    );
  }

  if (
    viewMode ===
    'compact'
  ) {
    return (
      <div
        className="
          mt-6
          grid
          grid-cols-3
          gap-3
          sm:grid-cols-4
          md:grid-cols-6
          xl:grid-cols-8
          2xl:grid-cols-10
        "
      >
        {items.map(
          (
            asset
          ) => (
            <MediaCard
              key={
                asset.id
              }
              {...cardProps(
                asset
              )}
              viewMode="compact"
            />
          )
        )}
      </div>
    );
  }

  return (
    <div
      className="
        mt-6
        grid
        grid-cols-2
        gap-4
        sm:grid-cols-3
        md:grid-cols-4
        xl:grid-cols-5
        2xl:grid-cols-6
      "
    >
      {items.map(
        (
          asset
        ) => (
          <MediaCard
            key={
              asset.id
            }
            {...cardProps(
              asset
            )}
            viewMode="grid"
          />
        )
      )}
    </div>
  );
}