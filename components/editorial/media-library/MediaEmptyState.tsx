'use client';

import {
  Archive,
  Clock3,
  Heart,
  Images,
  RotateCcw,
  SearchX,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react';

import type {
  MediaLibrarySection,
} from './MediaLibrary';

/* ========================================================= */
/* TYPES */
/* ========================================================= */

interface MediaEmptyStateProps {
  section: MediaLibrarySection;

  hasSearchOrFilters: boolean;

  onClearFilters: () => void;

  onUpload: () => void;
}

/* ========================================================= */
/* CONTENT */
/* ========================================================= */

function getContent(
  section: MediaLibrarySection,
  hasSearchOrFilters: boolean
) {
  if (
    hasSearchOrFilters
  ) {
    return {
      icon:
        SearchX,

      title:
        'No matching media',

      description:
        'No assets match the current search or filters. Try clearing some filters or changing your search.',
    };
  }

  switch (
    section
  ) {
    case 'recent':
      return {
        icon:
          Clock3,

        title:
          'No recent media',

        description:
          'Recently added assets will appear here.',
      };

    case 'mine':
      return {
        icon:
          UserRound,

        title:
          'No uploads yet',

        description:
          'Media you upload will appear here for quick access.',
      };

    case 'favorites':
      return {
        icon:
          Heart,

        title:
          'No favorites yet',

        description:
          'Favorite important or frequently used assets to keep them easy to find.',
      };

    case 'unused':
      return {
        icon:
          RotateCcw,

        title:
          'No unused media',

        description:
          'Assets that are not currently used in stories, pages, or other content will appear here.',
      };

    case 'archived':
      return {
        icon:
          Archive,

        title:
          'Archive is empty',

        description:
          'Archived media will appear here instead of the main library.',
      };

    case 'trash':
      return {
        icon:
          Trash2,

        title:
          'Trash is empty',

        description:
          'Media moved to trash will remain here until restored or permanently deleted.',
      };

    case 'library':
    default:
      return {
        icon:
          Images,

        title:
          'Your Media Library is empty',

        description:
          'Upload newsroom images, video, audio, documents, graphics, and archive material to get started.',
      };
  }
}

/* ========================================================= */
/* COMPONENT */
/* ========================================================= */

export function MediaEmptyState({
  section,
  hasSearchOrFilters,
  onClearFilters,
  onUpload,
}: MediaEmptyStateProps) {
  const {
    icon: Icon,
    title,
    description,
  } = getContent(
    section,
    hasSearchOrFilters
  );

  return (
    <div
      className="
        mt-6
        flex
        min-h-[420px]
        flex-col
        items-center
        justify-center
        rounded-xl
        border
        border-dashed
        border-border
        bg-surface-muted/40
        px-6
        text-center
      "
    >
      <div
        className="
          flex
          h-12
          w-12
          items-center
          justify-center
          rounded-xl
          bg-white
          text-muted-foreground
          shadow-sm
        "
      >
        <Icon
          className="
            h-6
            w-6
          "
          aria-hidden
        />
      </div>

      <h2
        className="
          mt-4
          font-headline
          text-xl
          font-bold
          text-deep
        "
      >
        {title}
      </h2>

      <p
        className="
          mt-2
          max-w-md
          text-sm
          leading-6
          text-muted-foreground
        "
      >
        {description}
      </p>

      <div
        className="
          mt-5
          flex
          flex-wrap
          items-center
          justify-center
          gap-2
        "
      >
        {hasSearchOrFilters ? (
          <button
            type="button"
            onClick={
              onClearFilters
            }
            className="
              inline-flex
              h-10
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
              transition
              hover:bg-surface-muted
            "
          >
            Clear search and filters
          </button>
        ) : (
          section ===
            'library' && (
            <button
              type="button"
              onClick={
                onUpload
              }
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
          )
        )}
      </div>
    </div>
  );
}