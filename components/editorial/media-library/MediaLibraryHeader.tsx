'use client';

import {
  Archive,
  Clock3,
  Grid2X2,
  Heart,
  Images,
  LayoutGrid,
  List,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react';

import { cn } from '@/lib/utils';

import type {
  MediaLibrarySection,
  MediaViewMode,
} from './MediaLibrary';

/* ========================================================= */
/* TYPES */
/* ========================================================= */

interface MediaLibraryHeaderProps {
  total: number;

  section: MediaLibrarySection;

  viewMode: MediaViewMode;

  selectedCount?: number;

  onSectionChange: (
    section: MediaLibrarySection
  ) => void;

  onViewModeChange: (
    mode: MediaViewMode
  ) => void;

  onUpload: () => void;
}

/* ========================================================= */
/* SECTION CONFIG */
/* ========================================================= */

const SECTIONS: {
  value: MediaLibrarySection;
  label: string;
  icon: typeof Images;
}[] = [
  {
    value: 'library',
    label: 'Library',
    icon: Images,
  },
  {
    value: 'recent',
    label: 'Recent',
    icon: Clock3,
  },
  {
    value: 'mine',
    label: 'My uploads',
    icon: UserRound,
  },
  {
    value: 'favorites',
    label: 'Favorites',
    icon: Heart,
  },
  {
    value: 'unused',
    label: 'Unused',
    icon: RotateCcw,
  },
  {
    value: 'archived',
    label: 'Archived',
    icon: Archive,
  },
  {
    value: 'trash',
    label: 'Trash',
    icon: Trash2,
  },
];

/* ========================================================= */
/* VIEW CONFIG */
/* ========================================================= */

const VIEW_MODES: {
  value: MediaViewMode;
  label: string;
  icon: typeof LayoutGrid;
}[] = [
  {
    value: 'grid',
    label: 'Grid view',
    icon: LayoutGrid,
  },
  {
    value: 'compact',
    label: 'Compact view',
    icon: Grid2X2,
  },
  {
    value: 'list',
    label: 'List view',
    icon: List,
  },
];

/* ========================================================= */
/* COMPONENT */
/* ========================================================= */

export function MediaLibraryHeader({
  total,
  section,
  viewMode,
  selectedCount = 0,
  onSectionChange,
  onViewModeChange,
  onUpload,
}: MediaLibraryHeaderProps) {
  return (
    <div
      className="
        border-b
        border-border
        bg-background
      "
    >
      {/* ================================================= */}
      {/* TOP ROW */}
      {/* ================================================= */}

      <div
        className="
          flex
          flex-col
          gap-5
          pb-5
          lg:flex-row
          lg:items-end
          lg:justify-between
        "
      >
        <div
          className="
            min-w-0
          "
        >
          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            <Images
              className="
                h-4
                w-4
                text-primary
              "
              aria-hidden
            />

            <span
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.16em]
                text-primary
              "
            >
              Newsroom
            </span>
          </div>

          <div
            className="
              mt-2
              flex
              flex-wrap
              items-end
              gap-x-3
              gap-y-1
            "
          >
            <h1
              className="
                font-headline
                text-[2rem]
                font-bold
                leading-none
                tracking-[-0.035em]
                text-deep
                sm:text-[2.25rem]
              "
            >
              Media Library
            </h1>

            <span
              className="
                pb-0.5
                text-sm
                font-medium
                text-muted-foreground
              "
            >
              {total.toLocaleString()}
              {' '}
              {total === 1
                ? 'asset'
                : 'assets'}
            </span>
          </div>

          <p
            className="
              mt-2
              max-w-2xl
              text-sm
              leading-6
              text-muted-foreground
            "
          >
            Manage newsroom images, video, audio, documents,
            rights, metadata, archive material, and reusable
            media assets.
          </p>
        </div>

        <div
          className="
            flex
            shrink-0
            flex-wrap
            items-center
            gap-2
          "
        >
          {selectedCount > 0 && (
            <div
              className="
                flex
                h-10
                items-center
                rounded-lg
                border
                border-border
                bg-surface-muted
                px-3
                text-sm
                font-semibold
                text-foreground
              "
            >
              {selectedCount}{' '}
              selected
            </div>
          )}

          <button
            type="button"
            onClick={onUpload}
            className="
              inline-flex
              h-10
              items-center
              justify-center
              gap-2
              rounded-lg
              bg-deep
              px-4
              text-sm
              font-bold
              text-white
              transition
              hover:opacity-90
              focus:outline-none
              focus:ring-2
              focus:ring-primary/30
            "
          >
            <Upload
              className="
                h-4
                w-4
              "
              aria-hidden
            />

            Upload media
          </button>

          <button
            type="button"
            onClick={onUpload}
            aria-label="Add media"
            title="Add media"
            className="
              inline-flex
              h-10
              w-10
              items-center
              justify-center
              rounded-lg
              border
              border-border
              bg-white
              text-foreground
              transition
              hover:bg-surface-muted
              sm:hidden
            "
          >
            <Plus
              className="
                h-4
                w-4
              "
              aria-hidden
            />
          </button>
        </div>
      </div>

      {/* ================================================= */}
      {/* NAVIGATION ROW */}
      {/* ================================================= */}

      <div
        className="
          flex
          flex-col
          gap-3
          pb-4
          xl:flex-row
          xl:items-center
          xl:justify-between
        "
      >
        <div
          className="
            min-w-0
            overflow-x-auto
          "
        >
          <div
            className="
              flex
              min-w-max
              items-center
              gap-1
            "
          >
            {SECTIONS.map(
              ({
                value,
                label,
                icon: Icon,
              }) => {
                const active =
                  section === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      onSectionChange(
                        value
                      )
                    }
                    className={cn(
                      `
                        inline-flex
                        h-9
                        items-center
                        gap-2
                        rounded-lg
                        px-3
                        text-sm
                        font-semibold
                        transition
                      `,
                      active
                        ? `
                          bg-deep
                          text-white
                        `
                        : `
                          text-muted-foreground
                          hover:bg-surface-muted
                          hover:text-foreground
                        `
                    )}
                  >
                    <Icon
                      className="
                        h-4
                        w-4
                      "
                      aria-hidden
                    />

                    {label}
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* =============================================== */}
        {/* VIEW CONTROLS */}
        {/* =============================================== */}

        <div
          className="
            flex
            items-center
            gap-1
            self-start
            rounded-lg
            border
            border-border
            bg-white
            p-1
            xl:self-auto
          "
        >
          {VIEW_MODES.map(
            ({
              value,
              label,
              icon: Icon,
            }) => {
              const active =
                viewMode === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    onViewModeChange(
                      value
                    )
                  }
                  aria-label={label}
                  title={label}
                  className={cn(
                    `
                      inline-flex
                      h-8
                      w-8
                      items-center
                      justify-center
                      rounded-md
                      transition
                    `,
                    active
                      ? `
                        bg-deep
                        text-white
                      `
                      : `
                        text-muted-foreground
                        hover:bg-surface-muted
                        hover:text-foreground
                      `
                  )}
                >
                  <Icon
                    className="
                      h-4
                      w-4
                    "
                    aria-hidden
                  />
                </button>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
}