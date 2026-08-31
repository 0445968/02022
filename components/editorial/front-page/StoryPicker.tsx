'use client';

import {
  Search,
  X,
} from 'lucide-react';

import {
  useMemo,
  useState,
} from 'react';

import type {
  FrontPageStoryOption,
} from '@/lib/services/front-page';

import type {
  Locale,
} from '@/types';

interface StoryPickerProps {
  open: boolean;
  locale: Locale;

  stories: FrontPageStoryOption[];

  selectedStoryId?: string | null;

  title?: string;

  onSelect: (
    story: FrontPageStoryOption
  ) => void;

  onClose: () => void;
}

export function StoryPicker({
  open,
  locale,
  stories,
  selectedStoryId = null,
  title,
  onSelect,
  onClose,
}: StoryPickerProps) {
  const [
    search,
    setSearch,
  ] = useState('');

  const filteredStories =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return stories;
      }

      return stories.filter(
        (story) => {
          const category =
            story.primaryCategory
              ? locale === 'es'
                ? story
                    .primaryCategory
                    .nameEs
                : story
                    .primaryCategory
                    .nameEn
              : '';

          return (
            story.headline
              .toLowerCase()
              .includes(query) ||
            story.slug
              .toLowerCase()
              .includes(query) ||
            category
              .toLowerCase()
              .includes(query)
          );
        }
      );
    }, [
      locale,
      search,
      stories,
    ]);

  if (!open) {
    return null;
  }

  function handleSelect(
    story: FrontPageStoryOption
  ) {
    onSelect(story);
    setSearch('');
    onClose();
  }

  return (
    <div
      className="
        fixed
        inset-0
        z-[80]
        flex
        items-center
        justify-center
        bg-black/45
        px-4
        py-6
      "
      role="dialog"
      aria-modal="true"
      aria-label={
        title ??
        (locale === 'es'
          ? 'Seleccionar historia'
          : 'Select story')
      }
      onMouseDown={(
        event
      ) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        className="
          flex
          max-h-[82vh]
          w-full
          max-w-3xl
          flex-col
          overflow-hidden
          rounded-xl
          border
          border-border
          bg-white
          shadow-2xl
        "
      >
        {/* Header */}
        <div
          className="
            flex
            items-center
            justify-between
            gap-4
            border-b
            border-border
            px-5
            py-4
          "
        >
          <div>
            <p
              className="
                text-[11px]
                font-semibold
                uppercase
                tracking-[0.16em]
                text-muted-foreground
              "
            >
              {locale === 'es'
                ? 'Portada'
                : 'Front Page'}
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
              {title ??
                (locale === 'es'
                  ? 'Seleccionar historia'
                  : 'Select Story')}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              inline-flex
              h-9
              w-9
              items-center
              justify-center
              rounded-lg
              text-muted-foreground
              transition-colors
              hover:bg-surface-muted
              hover:text-deep
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

        {/* Search */}
        <div
          className="
            border-b
            border-border
            px-5
            py-4
          "
        >
          <div
            className="
              flex
              h-11
              items-center
              gap-3
              rounded-lg
              border
              border-border
              bg-white
              px-3
              transition-colors
              focus-within:border-primary
              focus-within:ring-2
              focus-within:ring-primary/10
            "
          >
            <Search
              className="
                h-4
                w-4
                shrink-0
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
                setSearch(
                  event.target
                    .value
                )
              }
              placeholder={
                locale === 'es'
                  ? 'Buscar por titular, categoría o slug...'
                  : 'Search headline, category, or slug...'
              }
              autoFocus
              className="
                h-full
                min-w-0
                flex-1
                bg-transparent
                text-sm
                text-foreground
                placeholder:text-muted-foreground
                focus:outline-none
              "
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch('')
                }
                className="
                  inline-flex
                  h-7
                  w-7
                  items-center
                  justify-center
                  rounded-md
                  text-muted-foreground
                  hover:bg-surface-muted
                  hover:text-deep
                "
                aria-label={
                  locale ===
                  'es'
                    ? 'Limpiar búsqueda'
                    : 'Clear search'
                }
              >
                <X
                  className="h-3.5 w-3.5"
                  aria-hidden
                />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
          "
        >
          {filteredStories.length >
          0 ? (
            <div>
              {filteredStories.map(
                (story) => {
                  const selected =
                    story.id ===
                    selectedStoryId;

                  const category =
                    story.primaryCategory
                      ? locale ===
                        'es'
                        ? story
                            .primaryCategory
                            .nameEs
                        : story
                            .primaryCategory
                            .nameEn
                      : locale ===
                          'es'
                        ? 'Sin categoría'
                        : 'Uncategorized';

                  return (
                    <button
                      key={
                        story.id
                      }
                      type="button"
                      onClick={() =>
                        handleSelect(
                          story
                        )
                      }
                      className={`
                        flex
                        w-full
                        items-start
                        gap-4
                        border-b
                        border-border
                        px-5
                        py-4
                        text-left
                        transition-colors
                        last:border-b-0
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-inset
                        focus-visible:ring-ring

                        ${
                          selected
                            ? 'bg-primary/5'
                            : 'hover:bg-surface-muted/60'
                        }
                      `}
                    >
                      {/* Image */}
                      <div
                        className="
                          h-20
                          w-28
                          shrink-0
                          overflow-hidden
                          rounded-lg
                          bg-surface-muted
                        "
                      >
                        {story.featuredImage ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={
                              story
                                .featuredImage
                                .url
                            }
                            alt={
                              story
                                .featuredImage
                                .altText
                            }
                            className="
                              h-full
                              w-full
                              object-cover
                            "
                          />
                        ) : (
                          <div
                            className="
                              flex
                              h-full
                              items-center
                              justify-center
                              px-2
                              text-center
                              text-[10px]
                              font-medium
                              uppercase
                              tracking-wide
                              text-muted-foreground
                            "
                          >
                            {locale ===
                            'es'
                              ? 'Sin imagen'
                              : 'No image'}
                          </div>
                        )}
                      </div>

                      {/* Copy */}
                      <div
                        className="
                          min-w-0
                          flex-1
                        "
                      >
                        <div
                          className="
                            flex
                            flex-wrap
                            items-center
                            gap-x-2
                            gap-y-1
                          "
                        >
                          <span
                            className="
                              text-[10px]
                              font-semibold
                              uppercase
                              tracking-[0.14em]
                              text-primary
                            "
                          >
                            {
                              category
                            }
                          </span>

                          <span
                            className="
                              text-[10px]
                              font-semibold
                              uppercase
                              tracking-[0.12em]
                              text-muted-foreground
                            "
                          >
                            {story.language.toUpperCase()}
                          </span>

                          {selected && (
                            <span
                              className="
                                rounded-full
                                bg-primary
                                px-2
                                py-0.5
                                text-[9px]
                                font-bold
                                uppercase
                                tracking-wide
                                text-white
                              "
                            >
                              {locale ===
                              'es'
                                ? 'Seleccionada'
                                : 'Selected'}
                            </span>
                          )}
                        </div>

                        <h3
                          className="
                            mt-1
                            line-clamp-2
                            font-headline
                            text-base
                            font-bold
                            leading-5
                            text-deep
                          "
                        >
                          {
                            story.headline
                          }
                        </h3>

                        {story.publishedAt && (
                          <p
                            className="
                              mt-2
                              text-xs
                              text-muted-foreground
                            "
                          >
                            {new Intl.DateTimeFormat(
                              locale ===
                              'es'
                                ? 'es-CO'
                                : 'en-US',
                              {
                                month:
                                  'short',
                                day: 'numeric',
                                year: 'numeric',
                              }
                            ).format(
                              new Date(
                                story.publishedAt
                              )
                            )}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          ) : (
            <div
              className="
                flex
                min-h-[260px]
                items-center
                justify-center
                px-6
                text-center
              "
            >
              <div>
                <p
                  className="
                    font-headline
                    text-lg
                    font-bold
                    text-deep
                  "
                >
                  {locale === 'es'
                    ? 'No encontramos historias'
                    : 'No stories found'}
                </p>

                <p
                  className="
                    mt-1
                    max-w-sm
                    text-sm
                    leading-6
                    text-muted-foreground
                  "
                >
                  {locale === 'es'
                    ? 'Prueba con otro titular, categoría o término de búsqueda.'
                    : 'Try another headline, category, or search term.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="
            flex
            items-center
            justify-between
            gap-4
            border-t
            border-border
            bg-surface-muted/30
            px-5
            py-3
          "
        >
          <p
            className="
              text-xs
              text-muted-foreground
            "
          >
            {filteredStories.length}{' '}
            {locale === 'es'
              ? filteredStories.length ===
                1
                ? 'historia'
                : 'historias'
              : filteredStories.length ===
                  1
                ? 'story'
                : 'stories'}
          </p>

          <button
            type="button"
            onClick={onClose}
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
              text-deep
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
        </div>
      </div>
    </div>
  );
}