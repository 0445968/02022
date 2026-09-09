'use client';

import {
  RotateCcw,
  X,
} from 'lucide-react';

import type {
  MediaAssetType,
  MediaRightsStatus,
  MediaStatus,
} from '@/types/editorial';

import type {
  MediaLibraryFilters,
} from './MediaLibrary';

/* ========================================================= */
/* TYPES */
/* ========================================================= */

interface MediaFiltersProps {
  open: boolean;

  filters: MediaLibraryFilters;

  onChange: (
    filters: MediaLibraryFilters
  ) => void;

  onReset: () => void;

  onClose: () => void;
}

/* ========================================================= */
/* OPTIONS */
/* ========================================================= */

const STATUS_OPTIONS: {
  value:
    | MediaStatus
    | 'all';
  label: string;
}[] = [
  {
    value: 'all',
    label: 'All statuses',
  },
  {
    value: 'draft',
    label: 'Draft',
  },
  {
    value: 'approved',
    label: 'Approved',
  },
  {
    value: 'restricted',
    label: 'Restricted',
  },
  {
    value: 'archived',
    label: 'Archived',
  },
  {
    value: 'trashed',
    label: 'Trash',
  },
];

const TYPE_OPTIONS: {
  value:
    | MediaAssetType
    | 'all';
  label: string;
}[] = [
  {
    value: 'all',
    label: 'All media types',
  },
  {
    value: 'image',
    label: 'Images',
  },
  {
    value: 'graphic',
    label: 'Graphics',
  },
  {
    value: 'video',
    label: 'Video',
  },
  {
    value: 'audio',
    label: 'Audio',
  },
  {
    value: 'document',
    label: 'Documents',
  },
  {
    value: 'logo',
    label: 'Logos',
  },
  {
    value: 'social',
    label: 'Social media',
  },
  {
    value: 'broadcast',
    label: 'Broadcast',
  },
  {
    value: 'other',
    label: 'Other',
  },
];

const RIGHTS_OPTIONS: {
  value:
    | MediaRightsStatus
    | 'all';
  label: string;
}[] = [
  {
    value: 'all',
    label: 'All rights',
  },
  {
    value: 'owned',
    label: 'Owned by West Island Times',
  },
  {
    value: 'staff_created',
    label: 'Staff created',
  },
  {
    value: 'freelancer',
    label: 'Freelancer',
  },
  {
    value: 'licensed',
    label: 'Licensed',
  },
  {
    value: 'wire_service',
    label: 'Wire / agency',
  },
  {
    value: 'government',
    label: 'Government',
  },
  {
    value: 'public_domain',
    label: 'Public domain',
  },
  {
    value: 'creative_commons',
    label: 'Creative Commons',
  },
  {
    value: 'reader_submitted',
    label: 'Reader submitted',
  },
  {
    value: 'restricted',
    label: 'Restricted',
  },
  {
    value: 'unknown',
    label: 'Unknown',
  },
];

const ISLAND_OPTIONS = [
  {
    value: '',
    label: 'All locations',
  },
  {
    value: 'san_andres',
    label: 'San Andrés',
  },
  {
    value: 'old_providence',
    label: 'Old Providence',
  },
  {
    value: 'saint_catalina',
    label: 'Saint Catalina',
  },
  {
    value: 'archipelago',
    label: 'Archipelago-wide',
  },
  {
    value: 'none',
    label: 'Not location-specific',
  },
];

/* ========================================================= */
/* COMPONENT */
/* ========================================================= */

export function MediaFilters({
  open,
  filters,
  onChange,
  onReset,
  onClose,
}: MediaFiltersProps) {
  if (!open) {
    return null;
  }

  function updateField<
    K extends keyof MediaLibraryFilters,
  >(
    key: K,
    value:
      MediaLibraryFilters[K]
  ) {
    onChange({
      ...filters,
      [key]:
        value,
    });
  }

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        justify-end
        bg-black/30
        backdrop-blur-[1px]
      "
      onMouseDown={
        onClose
      }
    >
      <aside
        className="
          flex
          h-full
          w-full
          max-w-md
          flex-col
          border-l
          border-border
          bg-white
          shadow-2xl
        "
        onMouseDown={(
          event
        ) =>
          event.stopPropagation()
        }
      >
        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div
          className="
            flex
            items-center
            justify-between
            border-b
            border-border
            px-5
            py-4
          "
        >
          <div>
            <p
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.14em]
                text-primary
              "
            >
              Media Library
            </p>

            <h2
              className="
                mt-1
                font-headline
                text-xl
                font-bold
                text-deep
              "
            >
              Filters
            </h2>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            aria-label="Close filters"
            className="
              inline-flex
              h-9
              w-9
              items-center
              justify-center
              rounded-lg
              border
              border-border
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
          </button>
        </div>

        {/* ================================================= */}
        {/* FILTER FIELDS */}
        {/* ================================================= */}

        <div
          className="
            flex-1
            space-y-6
            overflow-y-auto
            px-5
            py-5
          "
        >
          {/* STATUS */}

          <FilterGroup
            label="Status"
          >
            <select
              value={
                filters.status
              }
              onChange={(
                event
              ) =>
                updateField(
                  'status',
                  event.target
                    .value as
                    | MediaStatus
                    | 'all'
                )
              }
              className={selectClassName}
            >
              {STATUS_OPTIONS.map(
                (
                  option
                ) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                )
              )}
            </select>
          </FilterGroup>

          {/* TYPE */}

          <FilterGroup
            label="Media type"
          >
            <select
              value={
                filters.assetType
              }
              onChange={(
                event
              ) =>
                updateField(
                  'assetType',
                  event.target
                    .value as
                    | MediaAssetType
                    | 'all'
                )
              }
              className={selectClassName}
            >
              {TYPE_OPTIONS.map(
                (
                  option
                ) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                )
              )}
            </select>
          </FilterGroup>

          {/* RIGHTS */}

          <FilterGroup
            label="Rights"
          >
            <select
              value={
                filters.rightsStatus
              }
              onChange={(
                event
              ) =>
                updateField(
                  'rightsStatus',
                  event.target
                    .value as
                    | MediaRightsStatus
                    | 'all'
                )
              }
              className={selectClassName}
            >
              {RIGHTS_OPTIONS.map(
                (
                  option
                ) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                )
              )}
            </select>
          </FilterGroup>

          {/* ISLAND */}

          <FilterGroup
            label="Island / scope"
          >
            <select
              value={
                filters.island
              }
              onChange={(
                event
              ) =>
                updateField(
                  'island',
                  event.target
                    .value
                )
              }
              className={selectClassName}
            >
              {ISLAND_OPTIONS.map(
                (
                  option
                ) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                )
              )}
            </select>
          </FilterGroup>

          {/* CATEGORY */}

          <FilterGroup
            label="Category"
            description="Category selection will become a newsroom taxonomy picker later."
          >
            <input
              type="text"
              value={
                filters.categoryId
              }
              onChange={(
                event
              ) =>
                updateField(
                  'categoryId',
                  event.target
                    .value
                )
              }
              placeholder="Category ID"
              className={inputClassName}
            />
          </FilterGroup>

          {/* PHOTOGRAPHER */}

          <FilterGroup
            label="Photographer"
          >
            <input
              type="text"
              value={
                filters.photographer
              }
              onChange={(
                event
              ) =>
                updateField(
                  'photographer',
                  event.target
                    .value
                )
              }
              placeholder="Photographer name"
              className={inputClassName}
            />
          </FilterGroup>

          {/* SOURCE */}

          <FilterGroup
            label="Source"
          >
            <input
              type="text"
              value={
                filters.source
              }
              onChange={(
                event
              ) =>
                updateField(
                  'source',
                  event.target
                    .value
                )
              }
              placeholder="Agency, archive, organization..."
              className={inputClassName}
            />
          </FilterGroup>
        </div>

        {/* ================================================= */}
        {/* FOOTER */}
        {/* ================================================= */}

        <div
          className="
            flex
            items-center
            justify-between
            gap-3
            border-t
            border-border
            bg-white
            px-5
            py-4
          "
        >
          <button
            type="button"
            onClick={
              onReset
            }
            className="
              inline-flex
              h-10
              items-center
              justify-center
              gap-2
              rounded-lg
              border
              border-border
              bg-white
              px-4
              text-sm
              font-semibold
              text-foreground
              transition
              hover:bg-surface-muted
            "
          >
            <RotateCcw
              className="
                h-4
                w-4
              "
              aria-hidden
            />

            Reset
          </button>

          <button
            type="button"
            onClick={
              onClose
            }
            className="
              inline-flex
              h-10
              items-center
              justify-center
              rounded-lg
              bg-deep
              px-5
              text-sm
              font-bold
              text-white
              transition
              hover:opacity-90
            "
          >
            Done
          </button>
        </div>
      </aside>
    </div>
  );
}

/* ========================================================= */
/* FILTER GROUP */
/* ========================================================= */

function FilterGroup({
  label,
  description,
  children,
}: {
  label: string;

  description?: string;

  children:
    React.ReactNode;
}) {
  return (
    <div>
      <label
        className="
          block
          text-sm
          font-bold
          text-foreground
        "
      >
        {label}
      </label>

      {description && (
        <p
          className="
            mt-1
            text-xs
            leading-5
            text-muted-foreground
          "
        >
          {description}
        </p>
      )}

      <div
        className="
          mt-2
        "
      >
        {children}
      </div>
    </div>
  );
}

/* ========================================================= */
/* CONTROL STYLES */
/* ========================================================= */

const selectClassName = `
  h-10
  w-full
  rounded-lg
  border
  border-border
  bg-white
  px-3
  text-sm
  text-foreground
  outline-none
  transition
  focus:border-primary
  focus:ring-2
  focus:ring-primary/10
`;

const inputClassName = `
  h-10
  w-full
  rounded-lg
  border
  border-border
  bg-white
  px-3
  text-sm
  text-foreground
  outline-none
  transition
  placeholder:text-muted-foreground
  focus:border-primary
  focus:ring-2
  focus:ring-primary/10
`;