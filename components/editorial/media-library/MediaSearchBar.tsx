'use client';

import {
  Filter,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';

import { cn } from '@/lib/utils';

import type {
  MediaLibraryFilters,
  MediaSortOption,
} from './MediaLibrary';

/* ========================================================= */
/* TYPES */
/* ========================================================= */

interface MediaSearchBarProps {
  search: string;

  sort: MediaSortOption;

  filters: MediaLibraryFilters;

  onSearchChange: (
    value: string
  ) => void;

  onSortChange: (
    value: MediaSortOption
  ) => void;

  onFiltersClick: () => void;

  onClearFilters: () => void;
}

/* ========================================================= */
/* HELPERS */
/* ========================================================= */

function countActiveFilters(
  filters: MediaLibraryFilters
): number {
  let count = 0;

  if (
    filters.status !==
    'all'
  ) {
    count += 1;
  }

  if (
    filters.assetType !==
    'all'
  ) {
    count += 1;
  }

  if (
    filters.rightsStatus !==
    'all'
  ) {
    count += 1;
  }

  if (
    filters.island
  ) {
    count += 1;
  }

  if (
    filters.categoryId
  ) {
    count += 1;
  }

  if (
    filters.photographer
  ) {
    count += 1;
  }

  if (
    filters.source
  ) {
    count += 1;
  }

  return count;
}

/* ========================================================= */
/* COMPONENT */
/* ========================================================= */

export function MediaSearchBar({
  search,
  sort,
  filters,
  onSearchChange,
  onSortChange,
  onFiltersClick,
  onClearFilters,
}: MediaSearchBarProps) {
  const activeFilterCount =
    countActiveFilters(
      filters
    );

  const hasSearch =
    search.trim().length >
    0;

  const hasActiveFilters =
    activeFilterCount > 0;

  return (
    <div
      className="
        mt-5
        flex
        flex-col
        gap-3
        lg:flex-row
        lg:items-center
        lg:justify-between
      "
    >
      {/* ================================================= */}
      {/* SEARCH */}
      {/* ================================================= */}

      <div
        className="
          relative
          min-w-0
          flex-1
        "
      >
        <Search
          className="
            pointer-events-none
            absolute
            left-3
            top-1/2
            h-4
            w-4
            -translate-y-1/2
            text-muted-foreground
          "
          aria-hidden
        />

        <input
          type="search"
          value={search}
          onChange={(
            event
          ) =>
            onSearchChange(
              event.target
                .value
            )
          }
          placeholder="Search filename, title, caption, credit, photographer, source, or location"
          className="
            h-11
            w-full
            rounded-lg
            border
            border-border
            bg-white
            pl-10
            pr-10
            text-sm
            text-foreground
            outline-none
            transition
            placeholder:text-muted-foreground
            focus:border-primary
            focus:ring-2
            focus:ring-primary/10
          "
        />

        {hasSearch && (
          <button
            type="button"
            onClick={() =>
              onSearchChange(
                ''
              )
            }
            aria-label="Clear search"
            className="
              absolute
              right-2
              top-1/2
              inline-flex
              h-7
              w-7
              -translate-y-1/2
              items-center
              justify-center
              rounded-md
              text-muted-foreground
              transition
              hover:bg-surface-muted
              hover:text-foreground
            "
          >
            <X
              className="
                h-3.5
                w-3.5
              "
              aria-hidden
            />
          </button>
        )}
      </div>

      {/* ================================================= */}
      {/* CONTROLS */}
      {/* ================================================= */}

      <div
        className="
          flex
          flex-wrap
          items-center
          gap-2
        "
      >
        <button
          type="button"
          onClick={
            onFiltersClick
          }
          className={cn(
            `
              inline-flex
              h-11
              items-center
              justify-center
              gap-2
              rounded-lg
              border
              px-3.5
              text-sm
              font-semibold
              transition
            `,
            hasActiveFilters
              ? `
                border-primary/30
                bg-primary/5
                text-primary
              `
              : `
                border-border
                bg-white
                text-foreground
                hover:bg-surface-muted
              `
          )}
        >
          <Filter
            className="
              h-4
              w-4
            "
            aria-hidden
          />

          Filters

          {hasActiveFilters && (
            <span
              className="
                inline-flex
                min-w-5
                items-center
                justify-center
                rounded-full
                bg-primary
                px-1.5
                py-0.5
                text-[10px]
                font-black
                leading-none
                text-white
              "
            >
              {
                activeFilterCount
              }
            </span>
          )}
        </button>

        <div
          className="
            relative
          "
        >
          <SlidersHorizontal
            className="
              pointer-events-none
              absolute
              left-3
              top-1/2
              h-4
              w-4
              -translate-y-1/2
              text-muted-foreground
            "
            aria-hidden
          />

          <select
            value={sort}
            onChange={(
              event
            ) =>
              onSortChange(
                event.target
                  .value as MediaSortOption
              )
            }
            aria-label="Sort media"
            className="
              h-11
              appearance-none
              rounded-lg
              border
              border-border
              bg-white
              pl-9
              pr-9
              text-sm
              font-medium
              text-foreground
              outline-none
              transition
              focus:border-primary
              focus:ring-2
              focus:ring-primary/10
            "
          >
            <option value="newest">
              Newest first
            </option>

            <option value="oldest">
              Oldest first
            </option>

            <option value="updated">
              Recently updated
            </option>

            <option value="filename_asc">
              Name A–Z
            </option>

            <option value="filename_desc">
              Name Z–A
            </option>

            <option value="largest">
              Largest first
            </option>

            <option value="smallest">
              Smallest first
            </option>
          </select>
        </div>

        {(hasSearch ||
          hasActiveFilters) && (
          <button
            type="button"
            onClick={
              onClearFilters
            }
            className="
              inline-flex
              h-11
              items-center
              justify-center
              gap-2
              rounded-lg
              px-3
              text-sm
              font-semibold
              text-muted-foreground
              transition
              hover:bg-surface-muted
              hover:text-foreground
            "
          >
            <X
              className="
                h-4
                w-4
              "
              aria-hidden
            />

            Clear
          </button>
        )}
      </div>
    </div>
  );
}