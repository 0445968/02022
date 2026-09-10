import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Layers3,
  Newspaper,
  Search,
  Video,
} from 'lucide-react';

import Link from 'next/link';

import {
  notFound,
} from 'next/navigation';

import {
  SearchHighlight,
} from '@/components/search/SearchHighlight';

import {
  isLocale,
  localizedPath,
} from '@/lib/i18n/config';

import {
  searchPublishedStoriesPage,
} from '@/lib/services/search';

import type {
  Locale,
} from '@/types';

interface PageProps {
  params: {
    locale: string;
  };

  searchParams: {
    q?: string;
    type?: string;
    page?: string;
  };
}

type SearchType =
  | 'all'
  | 'news'
  | 'video'
  | 'podcasts'
  | 'vault';

interface SearchFilter {
  id: SearchType;
  labelEn: string;
  labelEs: string;
  available: boolean;
  icon: typeof Search;
}

const SEARCH_FILTERS: SearchFilter[] = [
  {
    id: 'all',
    labelEn: 'All',
    labelEs: 'Todo',
    available: true,
    icon: Layers3,
  },
  {
    id: 'news',
    labelEn: 'News',
    labelEs: 'Noticias',
    available: true,
    icon: Newspaper,
  },
  {
    id: 'video',
    labelEn: 'Video',
    labelEs: 'Video',
    available: false,
    icon: Video,
  },
  {
    id: 'podcasts',
    labelEn: 'Podcasts',
    labelEs: 'Podcasts',
    available: false,
    icon: Headphones,
  },
  {
    id: 'vault',
    labelEn: 'Vault',
    labelEs: 'Archivo',
    available: false,
    icon: Archive,
  },
];

function normalizeSearchType(
  value:
    | string
    | undefined
): SearchType {
  switch (value) {
    case 'news':
    case 'video':
    case 'podcasts':
    case 'vault':
      return value;

    default:
      return 'all';
  }
}

function normalizePage(
  value:
    | string
    | undefined
) {
  const parsed =
    Number.parseInt(
      value ?? '1',
      10
    );

  if (
    !Number.isFinite(parsed) ||
    parsed < 1
  ) {
    return 1;
  }

  return parsed;
}

function buildSearchHref(
  locale: Locale,
  query: string,
  type: SearchType,
  page = 1
) {
  const params =
    new URLSearchParams();

  if (query) {
    params.set(
      'q',
      query
    );
  }

  if (
    type !== 'all'
  ) {
    params.set(
      'type',
      type
    );
  }

  if (
    page > 1
  ) {
    params.set(
      'page',
      String(page)
    );
  }

  const search =
    params.toString();

  return localizedPath(
    locale,
    `/search${search
      ? `?${search}`
      : ''
    }`
  );
}

function getPaginationPages(
  currentPage: number,
  totalPages: number
) {
  if (
    totalPages <= 7
  ) {
    return Array.from(
      {
        length:
          totalPages,
      },
      (
        _,
        index
      ) =>
        index + 1
    );
  }

  const pages =
    new Set<number>();

  pages.add(1);
  pages.add(totalPages);

  for (
    let page =
      currentPage - 2;
    page <=
    currentPage + 2;
    page += 1
  ) {
    if (
      page > 1 &&
      page < totalPages
    ) {
      pages.add(page);
    }
  }

  return Array.from(
    pages
  ).sort(
    (a, b) =>
      a - b
  );
}

export default async function SearchPage({
  params,
  searchParams,
}: PageProps) {
  if (
    !isLocale(
      params.locale
    )
  ) {
    notFound();
  }

  const locale =
    params.locale as Locale;

  const query =
    searchParams.q
      ?.trim() ?? '';

  const activeType =
    normalizeSearchType(
      searchParams.type
    );

  const requestedPage =
    normalizePage(
      searchParams.page
    );

  const activeFilter =
    SEARCH_FILTERS.find(
      (filter) =>
        filter.id ===
        activeType
    ) ??
    SEARCH_FILTERS[0];

  const isAvailableType =
    activeFilter.available;

  const shouldSearchStories =
    Boolean(query) &&
    (
      activeType ===
      'all' ||
      activeType ===
      'news'
    );

  const searchResult =
    shouldSearchStories
      ? await searchPublishedStoriesPage(
        query,
        {
          page:
            requestedPage,

          pageSize:
            20,
        }
      )
      : {
        results: [],
        page: 1,
        pageSize: 20,
        totalResults: 0,
        totalPages: 0,
        hasPreviousPage:
          false,
        hasNextPage:
          false,
      };

  const {
    results,
    page,
    totalResults,
    totalPages,
    hasPreviousPage,
    hasNextPage,
  } = searchResult;

  const ActiveFilterIcon =
    activeFilter.icon;

  const paginationPages =
    getPaginationPages(
      page,
      totalPages
    );

  return (
    <div
      className="
        min-h-[70vh]
        bg-white
      "
    >
      {/* ==================================================
          SEARCH HEADER
      ================================================== */}
      <section
        className="
          border-b
          border-border
          bg-surface-muted
        "
      >
        <div
          className="
            container-wide
            py-10
            sm:py-12
            lg:py-14
          "
        >
          <div
            className="
              mx-auto
              max-w-[1180px]
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
                ? 'Búsqueda'
                : 'Search'}
            </p>

            <h1
              className="
                mt-2
                font-headline
                text-3xl
                font-bold
                tracking-tight
                text-deep
                sm:text-4xl
                lg:text-5xl
              "
            >
              {locale === 'es'
                ? 'Buscar en West Island Times'
                : 'Search West Island Times'}
            </h1>

            <form
              action={localizedPath(
                locale,
                '/search'
              )}
              method="get"
              className="
                mt-7
                max-w-3xl
              "
            >
              {activeType !==
                'all' && (
                  <input
                    type="hidden"
                    name="type"
                    value={
                      activeType
                    }
                  />
                )}

              <div
                className="
                  flex
                  items-center
                  gap-3
                  rounded-xl
                  border
                  border-border
                  bg-white
                  px-4
                  shadow-sm
                  transition
                  focus-within:border-primary
                  focus-within:ring-2
                  focus-within:ring-primary/10
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
                  type="search"
                  name="q"
                  defaultValue={
                    query
                  }
                  placeholder={
                    locale === 'es'
                      ? 'Buscar historias, temas y lugares'
                      : 'Search stories, topics and places'
                  }
                  className="
                    h-14
                    min-w-0
                    flex-1
                    bg-transparent
                    text-base
                    text-foreground
                    outline-none
                    placeholder:text-muted-foreground
                  "
                />

                <button
                  type="submit"
                  className="
                    rounded-lg
                    bg-deep
                    px-4
                    py-2
                    text-sm
                    font-semibold
                    text-white
                    transition-colors
                    hover:bg-deep/90
                  "
                >
                  {locale === 'es'
                    ? 'Buscar'
                    : 'Search'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* ==================================================
          FILTER BAR
      ================================================== */}
      <section
        className="
          border-b
          border-border
          bg-white
        "
      >
        <div className="container-wide">
          <div
            className="
              mx-auto
              flex
              max-w-[1180px]
              items-center
              gap-1
              overflow-x-auto
              py-3
              [scrollbar-width:none]
              [&::-webkit-scrollbar]:hidden
            "
          >
            {SEARCH_FILTERS.map(
              (filter) => {
                const Icon =
                  filter.icon;

                const active =
                  activeType ===
                  filter.id;

                if (
                  !filter.available
                ) {
                  return (
                    <button
                      key={
                        filter.id
                      }
                      type="button"
                      disabled
                      className="
                        inline-flex
                        h-9
                        shrink-0
                        cursor-not-allowed
                        items-center
                        gap-2
                        rounded-lg
                        px-3
                        text-sm
                        font-semibold
                        text-muted-foreground/55
                      "
                    >
                      <Icon
                        className="
                          h-4
                          w-4
                        "
                        aria-hidden
                      />

                      <span>
                        {locale ===
                          'es'
                          ? filter.labelEs
                          : filter.labelEn}
                      </span>

                      <span
                        className="
                          rounded-full
                          bg-surface-subtle
                          px-1.5
                          py-0.5
                          text-[9px]
                          font-bold
                          uppercase
                          tracking-wide
                          text-muted-foreground
                        "
                      >
                        {locale ===
                          'es'
                          ? 'Pronto'
                          : 'Soon'}
                      </span>
                    </button>
                  );
                }

                return (
                  <Link
                    key={
                      filter.id
                    }
                    href={buildSearchHref(
                      locale,
                      query,
                      filter.id,
                      1
                    )}
                    className={`
                      inline-flex
                      h-9
                      shrink-0
                      items-center
                      gap-2
                      rounded-lg
                      px-3
                      text-sm
                      font-semibold
                      transition-colors
                      ${active
                        ? 'bg-deep text-white'
                        : 'text-foreground hover:bg-surface-muted'
                      }
                    `}
                  >
                    <Icon
                      className="
                        h-4
                        w-4
                      "
                      aria-hidden
                    />

                    <span>
                      {locale ===
                        'es'
                        ? filter.labelEs
                        : filter.labelEn}
                    </span>
                  </Link>
                );
              }
            )}
          </div>
        </div>
      </section>

      {/* ==================================================
          RESULTS
      ================================================== */}
      <section
        className="
          container-wide
          py-8
          sm:py-10
        "
      >
        <div
          className="
            mx-auto
            max-w-[1180px]
          "
        >
          {!query ? (
            <div
              className="
                py-14
                text-center
              "
            >
              <Search
                className="
                  mx-auto
                  h-8
                  w-8
                  text-muted-foreground
                "
                aria-hidden
              />

              <h2
                className="
                  mt-4
                  font-headline
                  text-2xl
                  font-bold
                  text-deep
                "
              >
                {locale === 'es'
                  ? '¿Qué estás buscando?'
                  : 'What are you looking for?'}
              </h2>

              <p
                className="
                  mx-auto
                  mt-2
                  max-w-md
                  text-sm
                  leading-6
                  text-muted-foreground
                "
              >
                {locale === 'es'
                  ? 'Busca noticias, lugares, temas y cobertura de todo el archipiélago.'
                  : 'Search news, places, topics, and coverage from across the archipelago.'}
              </p>
            </div>
          ) : !isAvailableType ? (
            <div
              className="
                py-16
                text-center
              "
            >
              <div
                className="
                  mx-auto
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-full
                  bg-surface-muted
                "
              >
                <ActiveFilterIcon
                  className="
                    h-5
                    w-5
                    text-muted-foreground
                  "
                  aria-hidden
                />
              </div>

              <h2
                className="
                  mt-4
                  font-headline
                  text-2xl
                  font-bold
                  text-deep
                "
              >
                {locale === 'es'
                  ? `${activeFilter.labelEs} estará disponible pronto`
                  : `${activeFilter.labelEn} search is coming soon`}
              </h2>

              <p
                className="
                  mx-auto
                  mt-2
                  max-w-lg
                  text-sm
                  leading-6
                  text-muted-foreground
                "
              >
                {locale === 'es'
                  ? 'Esta categoría se conectará al índice de búsqueda cuando ese tipo de contenido sea implementado.'
                  : 'This category will connect to the search index when that content type is implemented.'}
              </p>

              <Link
                href={buildSearchHref(
                  locale,
                  query,
                  'all',
                  1
                )}
                className="
                  mt-6
                  inline-flex
                  rounded-lg
                  bg-deep
                  px-4
                  py-2.5
                  text-sm
                  font-semibold
                  text-white
                  transition-colors
                  hover:bg-deep/90
                "
              >
                {locale === 'es'
                  ? 'Ver todos los resultados'
                  : 'View all results'}
              </Link>
            </div>
          ) : (
            <>
              {/* ==================================================
                  RESULTS HEADER
              ================================================== */}
              <div
                className="
                  mb-6
                  flex
                  items-end
                  justify-between
                  gap-4
                  border-b
                  border-border
                  pb-4
                "
              >
                <div>
                  <p
                    className="
                      text-sm
                      text-muted-foreground
                    "
                  >
                    {locale === 'es'
                      ? `${totalResults} resultados`
                      : `${totalResults} results`}
                  </p>

                  <h2
                    className="
                      mt-1
                      font-headline
                      text-2xl
                      font-bold
                      text-deep
                    "
                  >
                    “{query}”
                  </h2>

                  {totalPages >
                    1 && (
                      <p
                        className="
                        mt-1
                        text-xs
                        text-muted-foreground
                      "
                      >
                        {locale === 'es'
                          ? `Página ${page} de ${totalPages}`
                          : `Page ${page} of ${totalPages}`}
                      </p>
                    )}
                </div>

                {activeType ===
                  'news' && (
                    <span
                      className="
                      hidden
                      rounded-full
                      bg-surface-muted
                      px-3
                      py-1.5
                      text-xs
                      font-semibold
                      text-muted-foreground
                      sm:inline-flex
                    "
                    >
                      {locale === 'es'
                        ? 'Noticias'
                        : 'News'}
                    </span>
                  )}
              </div>

              {/* ==================================================
                  NO RESULTS
              ================================================== */}
              {results.length ===
                0 ? (
                <div
                  className="
                    py-16
                    text-center
                  "
                >
                  <h2
                    className="
                      font-headline
                      text-2xl
                      font-bold
                      text-deep
                    "
                  >
                    {locale === 'es'
                      ? 'No encontramos resultados'
                      : 'No results found'}
                  </h2>

                  <p
                    className="
                      mx-auto
                      mt-2
                      max-w-lg
                      text-sm
                      leading-6
                      text-muted-foreground
                    "
                  >
                    {locale === 'es'
                      ? 'Intenta usar palabras más generales o una búsqueda diferente.'
                      : 'Try using broader terms or a different search.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* ==================================================
                      STORY RESULTS
                  ================================================== */}
                  <div
                    className="
                      divide-y
                      divide-border
                    "
                  >
                    {results.map(
                      (story) => {
                        const storyCategory =
                          story.category
                            ? locale === 'es'
                              ? story.category.nameEs
                              : story.category.nameEn
                            : null;

                        const preview =
                          story.summary ??
                          story.subheadline;

                        return (
                          <article
                            key={
                              story.id
                            }
                            className="
                              grid
                              gap-5
                              py-6
                              sm:grid-cols-[minmax(0,1fr)_180px]
                              sm:items-start
                              lg:grid-cols-[minmax(0,1fr)_220px]
                            "
                          >
                            <div
                              className="
                                min-w-0
                              "
                            >
                              {storyCategory &&
                                story.category && (
                                  <Link
                                    href={localizedPath(
                                      locale,
                                      `/category/${story.category.slug}`
                                    )}
                                    className="
                                      text-[11px]
                                      font-bold
                                      uppercase
                                      tracking-[0.12em]
                                      text-primary
                                      hover:underline
                                    "
                                  >
                                    <SearchHighlight
                                      text={
                                        storyCategory
                                      }
                                      query={
                                        query
                                      }
                                      highlightClassName="
                                        bg-highlight/35
                                        text-inherit
                                      "
                                    />
                                  </Link>
                                )}

                              <h3
                                className="
                                  mt-2
                                  max-w-3xl
                                  font-headline
                                  text-xl
                                  font-bold
                                  leading-tight
                                  text-deep
                                  sm:text-2xl
                                "
                              >
                                <Link
                                  href={localizedPath(
                                    locale,
                                    `/article/${story.slug}`
                                  )}
                                  className="
                                    transition-colors
                                    hover:text-primary
                                  "
                                >
                                  <SearchHighlight
                                    text={
                                      story.headline
                                    }
                                    query={
                                      query
                                    }
                                    highlightClassName="
                                      bg-highlight/55
                                      text-inherit
                                    "
                                  />
                                </Link>
                              </h3>

                              {preview && (
                                <p
                                  className="
                                    mt-2
                                    max-w-2xl
                                    text-sm
                                    leading-6
                                    text-muted-foreground
                                  "
                                >
                                  <SearchHighlight
                                    text={
                                      preview
                                    }
                                    query={
                                      query
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
                                    mt-3
                                    text-xs
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
                                        'long',
                                      day:
                                        'numeric',
                                      year:
                                        'numeric',
                                    }
                                  )}
                                </p>
                              )}
                            </div>

                            {story.image && (
                              <Link
                                href={localizedPath(
                                  locale,
                                  `/article/${story.slug}`
                                )}
                                className="
                                  order-first
                                  block
                                  overflow-hidden
                                  rounded-xl
                                  bg-surface-subtle
                                  sm:order-none
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
                                    aspect-[16/10]
                                    h-full
                                    w-full
                                    object-cover
                                    transition-transform
                                    duration-300
                                    hover:scale-[1.02]
                                  "
                                />
                              </Link>
                            )}
                          </article>
                        );
                      }
                    )}
                  </div>

                  {/* ==================================================
                      PAGINATION
                  ================================================== */}
                  {totalPages >
                    1 && (
                      <nav
                        className="
                        mt-10
                        flex
                        flex-wrap
                        items-center
                        justify-center
                        gap-2
                        border-t
                        border-border
                        pt-8
                      "
                        aria-label={
                          locale === 'es'
                            ? 'Paginación de búsqueda'
                            : 'Search pagination'
                        }
                      >
                        {/* Previous */}
                        {hasPreviousPage ? (
                          <Link
                            href={buildSearchHref(
                              locale,
                              query,
                              activeType,
                              page - 1
                            )}
                            className="
                            inline-flex
                            h-10
                            items-center
                            gap-1.5
                            rounded-lg
                            border
                            border-border
                            bg-white
                            px-3
                            text-sm
                            font-semibold
                            text-foreground
                            transition-colors
                            hover:border-primary
                            hover:text-primary
                          "
                          >
                            <ChevronLeft
                              className="
                              h-4
                              w-4
                            "
                              aria-hidden
                            />

                            <span
                              className="
                              hidden
                              sm:inline
                            "
                            >
                              {locale === 'es'
                                ? 'Anterior'
                                : 'Previous'}
                            </span>
                          </Link>
                        ) : (
                          <span
                            className="
                            inline-flex
                            h-10
                            cursor-not-allowed
                            items-center
                            gap-1.5
                            rounded-lg
                            border
                            border-border
                            bg-surface-muted
                            px-3
                            text-sm
                            font-semibold
                            text-muted-foreground/50
                          "
                          >
                            <ChevronLeft
                              className="
                              h-4
                              w-4
                            "
                              aria-hidden
                            />

                            <span
                              className="
                              hidden
                              sm:inline
                            "
                            >
                              {locale === 'es'
                                ? 'Anterior'
                                : 'Previous'}
                            </span>
                          </span>
                        )}

                        {/* Page numbers */}
                        {paginationPages.map(
                          (
                            paginationPage,
                            index
                          ) => {
                            const previousPage =
                              paginationPages[
                              index - 1
                              ];

                            const showGap =
                              previousPage &&
                              paginationPage -
                              previousPage >
                              1;

                            const isActive =
                              paginationPage ===
                              page;

                            return (
                              <div
                                key={
                                  paginationPage
                                }
                                className="
                                flex
                                items-center
                                gap-2
                              "
                              >
                                {showGap && (
                                  <span
                                    className="
                                    px-1
                                    text-sm
                                    text-muted-foreground
                                  "
                                  >
                                    …
                                  </span>
                                )}

                                {isActive ? (
                                  <span
                                    className="
                                    inline-flex
                                    h-10
                                    min-w-10
                                    items-center
                                    justify-center
                                    rounded-lg
                                    bg-deep
                                    px-3
                                    text-sm
                                    font-semibold
                                    text-white
                                  "
                                    aria-current="page"
                                  >
                                    {
                                      paginationPage
                                    }
                                  </span>
                                ) : (
                                  <Link
                                    href={buildSearchHref(
                                      locale,
                                      query,
                                      activeType,
                                      paginationPage
                                    )}
                                    className="
                                    inline-flex
                                    h-10
                                    min-w-10
                                    items-center
                                    justify-center
                                    rounded-lg
                                    border
                                    border-border
                                    bg-white
                                    px-3
                                    text-sm
                                    font-semibold
                                    text-foreground
                                    transition-colors
                                    hover:border-primary
                                    hover:text-primary
                                  "
                                  >
                                    {
                                      paginationPage
                                    }
                                  </Link>
                                )}
                              </div>
                            );
                          }
                        )}

                        {/* Next */}
                        {hasNextPage ? (
                          <Link
                            href={buildSearchHref(
                              locale,
                              query,
                              activeType,
                              page + 1
                            )}
                            className="
                            inline-flex
                            h-10
                            items-center
                            gap-1.5
                            rounded-lg
                            border
                            border-border
                            bg-white
                            px-3
                            text-sm
                            font-semibold
                            text-foreground
                            transition-colors
                            hover:border-primary
                            hover:text-primary
                          "
                          >
                            <span
                              className="
                              hidden
                              sm:inline
                            "
                            >
                              {locale === 'es'
                                ? 'Siguiente'
                                : 'Next'}
                            </span>

                            <ChevronRight
                              className="
                              h-4
                              w-4
                            "
                              aria-hidden
                            />
                          </Link>
                        ) : (
                          <span
                            className="
                            inline-flex
                            h-10
                            cursor-not-allowed
                            items-center
                            gap-1.5
                            rounded-lg
                            border
                            border-border
                            bg-surface-muted
                            px-3
                            text-sm
                            font-semibold
                            text-muted-foreground/50
                          "
                          >
                            <span
                              className="
                              hidden
                              sm:inline
                            "
                            >
                              {locale === 'es'
                                ? 'Siguiente'
                                : 'Next'}
                            </span>

                            <ChevronRight
                              className="
                              h-4
                              w-4
                            "
                              aria-hidden
                            />
                          </span>
                        )}
                      </nav>
                    )}
                </>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}