'use client';

import {
  ArrowRight,
  Loader2,
  Search,
  X,
} from 'lucide-react';

import Link from 'next/link';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  SearchHighlight,
} from '@/components/search/SearchHighlight';

import {
  localizedPath,
} from '@/lib/i18n/config';

import type {
  Locale,
} from '@/types';

interface SearchMegaMenuProps {
  open: boolean;
  locale: Locale;
  onClose: () => void;
}

interface LiveSearchResult {
  id: string;
  slug: string;
  headline: string;

  shortTitle:
  | string
  | null;

  subheadline:
  | string
  | null;

  summary:
  | string
  | null;

  publishedAt:
  | string
  | null;

  category:
  | {
    slug: string;
    nameEn: string;
    nameEs: string;
  }
  | null;

  image:
  | {
    url: string;
    altText: string;
  }
  | null;
}

const TRENDING_EN = [
  'San Andrés',
  'Old Providence',
  'Seaflower',
  'Government',
  'Hurricanes',
  'Tourism',
];

const TRENDING_ES = [
  'San Andrés',
  'Old Providence',
  'Seaflower',
  'Gobierno',
  'Huracanes',
  'Turismo',
];

const BROWSE_LINKS = [
  {
    labelEn: 'Latest News',
    labelEs: 'Últimas noticias',
    href: '/latest',
  },
  {
    labelEn: 'San Andrés',
    labelEs: 'San Andrés',
    href: '/san-andres',
  },
  {
    labelEn: 'Old Providence',
    labelEs: 'Old Providence',
    href: '/old-providence',
  },
  {
    labelEn: 'Politics',
    labelEs: 'Política',
    href: '/category/politics',
  },
  {
    labelEn: 'Environment',
    labelEs: 'Medio ambiente',
    href: '/category/environment',
  },
  {
    labelEn: 'World',
    labelEs: 'Mundo',
    href: '/category/world',
  },
];

export function SearchMegaMenu({
  open,
  locale,
  onClose,
}: SearchMegaMenuProps) {
  const [
    query,
    setQuery,
  ] = useState('');

  const [
    results,
    setResults,
  ] = useState<
    LiveSearchResult[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    searchError,
    setSearchError,
  ] = useState(false);

  const inputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const trending =
    locale === 'es'
      ? TRENDING_ES
      : TRENDING_EN;

  const trimmedQuery =
    query.trim();

  const hasSearch =
    trimmedQuery.length >= 2;

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeout =
      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 50);

    return () => {
      window.clearTimeout(
        timeout
      );
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key === 'Escape'
      ) {
        onClose();
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
  }, [
    open,
    onClose,
  ]);

  useEffect(() => {
    if (
      !open ||
      trimmedQuery.length < 2
    ) {
      setResults([]);
      setLoading(false);
      setSearchError(false);

      return;
    }

    let active =
      true;

    const timeout =
      window.setTimeout(
        async () => {
          setLoading(true);
          setSearchError(false);

          try {
            const response =
              await fetch(
                `/api/search?q=${encodeURIComponent(
                  trimmedQuery
                )}`,
                {
                  cache:
                    'no-store',
                }
              );

            if (
              !response.ok
            ) {
              throw new Error(
                'Search failed'
              );
            }

            const data =
              await response.json();

            if (!active) {
              return;
            }

            setResults(
              Array.isArray(
                data.results
              )
                ? data.results
                : []
            );
          } catch (
          error
          ) {
            console.error(
              'Live search failed:',
              error
            );

            if (!active) {
              return;
            }

            setResults([]);
            setSearchError(
              true
            );
          } finally {
            if (
              active
            ) {
              setLoading(
                false
              );
            }
          }
        },
        250
      );

    return () => {
      active =
        false;

      window.clearTimeout(
        timeout
      );
    };
  }, [
    open,
    trimmedQuery,
  ]);

  if (!open) {
    return null;
  }

  function getSearchHref(
    value: string
  ) {
    const trimmed =
      value.trim();

    const path =
      trimmed
        ? `/search?q=${encodeURIComponent(
          trimmed
        )}`
        : '/search';

    return localizedPath(
      locale,
      path
    );
  }

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    window.location.href =
      getSearchHref(
        query
      );
  }

  return (
    <div
      className="
        absolute
        left-0
        right-0
        top-full
        z-50
        border-t
        border-border
        bg-white
        shadow-[0_18px_40px_rgba(15,23,42,0.14)]
      "
    >
      <div
        className="
          container-wide
          py-6
          sm:py-8
          lg:py-10
        "
      >
        <div
          className="
            mx-auto
            max-w-[1180px]
          "
        >
          {/* Header */}
          <div
            className="
              flex
              items-center
              justify-between
              gap-4
            "
          >
            <div>
              <p
                className="
                  text-[11px]
                  font-semibold
                  uppercase
                  tracking-[0.15em]
                  text-muted-foreground
                "
              >
                {locale === 'es'
                  ? 'Buscar'
                  : 'Search'}
              </p>

              <h2
                className="
                  mt-1
                  font-headline
                  text-2xl
                  font-bold
                  tracking-tight
                  text-foreground
                  sm:text-3xl
                "
              >
                {locale === 'es'
                  ? 'Buscar en West Island Times'
                  : 'Search West Island Times'}
              </h2>
            </div>

            <button
              type="button"
              onClick={
                onClose
              }
              className="
                inline-flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-lg
                text-foreground
                transition-colors
                hover:bg-surface-muted
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
              "
              aria-label={
                locale === 'es'
                  ? 'Cerrar búsqueda'
                  : 'Close search'
              }
            >
              <X
                className="
                  h-5
                  w-5
                "
                aria-hidden
              />
            </button>
          </div>

          {/* Search form */}
          <form
            onSubmit={
              handleSubmit
            }
            className="
              mt-6
            "
          >
            <div
              className="
                flex
                items-center
                gap-3
                border-b-2
                border-foreground
                pb-3
              "
            >
              <Search
                className="
                  h-5
                  w-5
                  shrink-0
                  text-muted-foreground
                "
                aria-hidden
              />

              <input
                ref={
                  inputRef
                }
                type="search"
                value={
                  query
                }
                onChange={(
                  event
                ) =>
                  setQuery(
                    event.target
                      .value
                  )
                }
                placeholder={
                  locale === 'es'
                    ? 'Buscar historias, temas y lugares'
                    : 'Search stories, topics and places'
                }
                className="
                  min-w-0
                  flex-1
                  bg-transparent
                  text-lg
                  text-foreground
                  outline-none
                  placeholder:text-muted-foreground
                  sm:text-xl
                "
              />

              {loading && (
                <Loader2
                  className="
                    h-5
                    w-5
                    shrink-0
                    animate-spin
                    text-muted-foreground
                  "
                  aria-hidden
                />
              )}

              <button
                type="submit"
                className="
                  inline-flex
                  shrink-0
                  items-center
                  gap-2
                  rounded-lg
                  bg-deep
                  px-4
                  py-2.5
                  text-sm
                  font-semibold
                  text-white
                  transition-colors
                  hover:bg-deep/90
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                "
              >
                {locale === 'es'
                  ? 'Buscar'
                  : 'Search'}

                <ArrowRight
                  className="
                    h-4
                    w-4
                  "
                  aria-hidden
                />
              </button>
            </div>
          </form>

          {/* ==================================================
              LIVE RESULTS
          ================================================== */}
          {hasSearch && (
            <div
              className="
                mt-6
                border-b
                border-border
                pb-7
              "
            >
              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-4
                "
              >
                <p
                  className="
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-[0.15em]
                    text-muted-foreground
                  "
                >
                  {locale === 'es'
                    ? 'Resultados'
                    : 'Results'}
                </p>

                {!loading &&
                  results.length >
                  0 && (
                    <Link
                      href={getSearchHref(
                        query
                      )}
                      onClick={
                        onClose
                      }
                      className="
                        inline-flex
                        items-center
                        gap-1.5
                        text-xs
                        font-semibold
                        text-primary
                        hover:underline
                      "
                    >
                      {locale ===
                        'es'
                        ? 'Ver todos'
                        : 'View all'}

                      <ArrowRight
                        className="
                          h-3.5
                          w-3.5
                        "
                        aria-hidden
                      />
                    </Link>
                  )}
              </div>

              {searchError ? (
                <p
                  className="
                    mt-4
                    text-sm
                    text-muted-foreground
                  "
                >
                  {locale === 'es'
                    ? 'No se pudo completar la búsqueda.'
                    : 'Search could not be completed.'}
                </p>
              ) : !loading &&
                results.length ===
                0 ? (
                <p
                  className="
                    mt-4
                    text-sm
                    text-muted-foreground
                  "
                >
                  {locale === 'es'
                    ? `No encontramos resultados para “${trimmedQuery}”.`
                    : `No results found for “${trimmedQuery}”.`}
                </p>
              ) : (
                <div
                  className="
                    mt-4
                    grid
                    gap-3
                    md:grid-cols-2
                  "
                >
                  {results.map(
                    (story) => {
                      const categoryName =
                        story.category
                          ? locale ===
                            'es'
                            ? story
                              .category
                              .nameEs
                            : story
                              .category
                              .nameEn
                          : null;

                      const preview =
                        story.summary ??
                        story.subheadline;

                      return (
                        <Link
                          key={
                            story.id
                          }
                          href={localizedPath(
                            locale,
                            `/article/${story.slug}`
                          )}
                          onClick={
                            onClose
                          }
                          className="
                            group
                            grid
                            grid-cols-[minmax(0,1fr)_88px]
                            gap-4
                            rounded-xl
                            border
                            border-transparent
                            p-3
                            transition-colors
                            hover:border-border
                            hover:bg-surface-muted
                          "
                        >
                          <div
                            className="
                              min-w-0
                            "
                          >
                            {categoryName && (
                              <p
                                className="
                                  text-[10px]
                                  font-bold
                                  uppercase
                                  tracking-[0.12em]
                                  text-primary
                                "
                              >
                                {
                                  categoryName
                                }
                              </p>
                            )}

                            <h3
                              className="
                                mt-1
                                line-clamp-2
                                font-headline
                                text-base
                                font-bold
                                leading-snug
                                text-foreground
                                transition-colors
                                group-hover:text-primary
                              "
                            >
                              <SearchHighlight
                                text={
                                  story.headline
                                }
                                query={
                                  trimmedQuery
                                }
                                highlightClassName="
                                  bg-highlight/55
                                  text-inherit
                                "
                              />
                            </h3>

                            {preview && (
                              <p
                                className="
                                  mt-1.5
                                  line-clamp-2
                                  text-xs
                                  leading-5
                                  text-muted-foreground
                                "
                              >
                                <SearchHighlight
                                  text={
                                    preview
                                  }
                                  query={
                                    trimmedQuery
                                  }
                                  highlightClassName="
                                    bg-highlight/35
                                    text-inherit
                                  "
                                />
                              </p>
                            )}

                            {story.publishedAt && (
                              <p
                                className="
                                  mt-2
                                  text-[11px]
                                  text-muted-foreground
                                "
                              >
                                {new Date(
                                  story.publishedAt
                                ).toLocaleDateString(
                                  locale ===
                                    'es'
                                    ? 'es'
                                    : 'en',
                                  {
                                    month:
                                      'short',
                                    day:
                                      'numeric',
                                    year:
                                      'numeric',
                                  }
                                )}
                              </p>
                            )}
                          </div>

                          {story.image ? (
                            <div
                              className="
                                overflow-hidden
                                rounded-lg
                                bg-surface-subtle
                              "
                            >
                              <img
                                src={
                                  story.image
                                    .url
                                }
                                alt={
                                  story.image
                                    .altText
                                }
                                className="
                                  aspect-[4/3]
                                  h-full
                                  w-full
                                  object-cover
                                "
                              />
                            </div>
                          ) : (
                            <div
                              className="
                                aspect-[4/3]
                                rounded-lg
                                bg-surface-subtle
                              "
                            />
                          )}
                        </Link>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==================================================
              DEFAULT CONTENT
          ================================================== */}
          {!hasSearch && (
            <div
              className="
                mt-8
                grid
                gap-8
                md:grid-cols-2
                lg:gap-14
              "
            >
              {/* Trending */}
              <div>
                <p
                  className="
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-[0.15em]
                    text-muted-foreground
                  "
                >
                  {locale === 'es'
                    ? 'Búsquedas populares'
                    : 'Trending searches'}
                </p>

                <div
                  className="
                    mt-4
                    flex
                    flex-wrap
                    gap-2
                  "
                >
                  {trending.map(
                    (item) => (
                      <Link
                        key={
                          item
                        }
                        href={getSearchHref(
                          item
                        )}
                        onClick={
                          onClose
                        }
                        className="
                          rounded-full
                          border
                          border-border
                          bg-white
                          px-3
                          py-1.5
                          text-sm
                          font-medium
                          text-foreground
                          transition-colors
                          hover:border-primary
                          hover:text-primary
                        "
                      >
                        {item}
                      </Link>
                    )
                  )}
                </div>
              </div>

              {/* Browse */}
              <div>
                <p
                  className="
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-[0.15em]
                    text-muted-foreground
                  "
                >
                  {locale === 'es'
                    ? 'Explorar'
                    : 'Browse'}
                </p>

                <div
                  className="
                    mt-4
                    grid
                    grid-cols-2
                    gap-x-6
                    gap-y-3
                  "
                >
                  {BROWSE_LINKS.map(
                    (item) => (
                      <Link
                        key={
                          item.href
                        }
                        href={localizedPath(
                          locale,
                          item.href
                        )}
                        onClick={
                          onClose
                        }
                        className="
                          text-sm
                          font-semibold
                          text-foreground
                          transition-colors
                          hover:text-primary
                        "
                      >
                        {locale ===
                          'es'
                          ? item.labelEs
                          : item.labelEn}
                      </Link>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* View all */}
          <div
            className="
              mt-8
              flex
              justify-end
              border-t
              border-border
              pt-5
            "
          >
            <Link
              href={getSearchHref(
                query
              )}
              onClick={
                onClose
              }
              className="
                inline-flex
                items-center
                gap-2
                text-sm
                font-semibold
                text-primary
                transition-opacity
                hover:opacity-70
              "
            >
              {locale === 'es'
                ? 'Ver todos los resultados'
                : 'View all search results'}

              <ArrowRight
                className="
                  h-4
                  w-4
                "
                aria-hidden
              />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}