import Link from 'next/link';

import {
  redirect,
} from 'next/navigation';

import {
  Bookmark,
} from 'lucide-react';

import {
  StoryBookmarkButton,
} from '@/components/account/story-bookmark-button';

import {
  getCurrentUser,
} from '@/lib/auth/session';

import {
  isDevAuthBypass,
} from '@/lib/db/supabase-data';

import {
  defaultLocale,
  localizedPath,
} from '@/lib/i18n/config';

import {
  getDictionary,
} from '@/lib/i18n/dictionaries';

import {
    getServerLocale,
  } from '@/lib/i18n/server-locale';

import {
  getSavedStories,
  type SavedStoriesPage,
} from '@/lib/services/saved-stories';

interface SavedPageProps {
  searchParams?: {
    page?: string;
  };
}

function parsePage(
  value: string | undefined
): number {
  const parsed =
    Number.parseInt(
      value ?? '1',
      10
    );

  if (
    !Number.isFinite(
      parsed
    ) ||
    parsed < 1
  ) {
    return 1;
  }

  return parsed;
}

function replacePageTokens(
  template: string,
  page: number,
  totalPages: number
): string {
  return template
    .replace(
      '{page}',
      String(page)
    )
    .replace(
      '{totalPages}',
      String(totalPages)
    );
}

export default async function SavedPage({
  searchParams,
}: SavedPageProps) {
  const user =
    await getCurrentUser();

  if (!user) {
    const signInPath =
      localizedPath(
        defaultLocale,
        '/auth/sign-in'
      );

    redirect(
      `${signInPath}?next=${encodeURIComponent(
        '/account/saved'
      )}`
    );
  }

  const locale =
  getServerLocale(
    user.profile
      ?.preferredLocale
  );

  const dict =
    getDictionary(locale);

  const requestedPage =
    parsePage(
      searchParams?.page
    );

  /*
   * DEV_AUTH_BYPASS is an editorial testing identity
   * without a real authenticated Supabase session.
   * Reader data must not receive anonymous RLS access.
   */
  const savedPage: SavedStoriesPage =
    isDevAuthBypass()
      ? {
          items: [],
          total: 0,
          page: 1,
          perPage: 12,
          totalPages: 0,
        }
      : await getSavedStories(
          user.id,
          {
            page:
              requestedPage,

            perPage:
              12,
          }
        );

  if (
    savedPage.totalPages >
      0 &&
    requestedPage >
      savedPage.totalPages
  ) {
    redirect(
      `/account/saved?page=${savedPage.totalPages}`
    );
  }

  const dateLocale =
    locale === 'es'
      ? 'es-CO'
      : 'en-US';

  const signInHref =
    `${localizedPath(
      locale,
      '/auth/sign-in'
    )}?next=${encodeURIComponent(
      '/account/saved'
    )}`;

  const futureTabs = [
    dict.account.savedVideos,
    dict.account.savedPodcasts,
    dict.account.savedVault,
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="border-b border-border pb-6">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
          {dict.account.title}
        </p>

        <h1 className="font-headline text-3xl font-bold leading-tight text-deep sm:text-4xl">
          {dict.account.saved}
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {
            dict.account
              .savedDescription
          }
        </p>
      </header>

      <nav
        aria-label={
          dict.account.saved
        }
        className="flex gap-1 overflow-x-auto border-b border-border pt-5"
      >
        <Link
          href="/account/saved"
          aria-current="page"
          className="shrink-0 border-b-2 border-primary px-4 py-3 text-sm font-bold text-deep"
        >
          {
            dict.account
              .savedArticles
          }
        </Link>

        {futureTabs.map(
          (label) => (
            <span
              key={label}
              aria-disabled="true"
              className="inline-flex shrink-0 cursor-not-allowed items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-semibold text-muted-foreground"
            >
              {label}

              <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                {
                  dict.account
                    .savedComingSoon
                }
              </span>
            </span>
          )
        )}
      </nav>

      {savedPage.items.length ===
      0 ? (
        <section className="py-16 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bookmark
              aria-hidden="true"
              className="h-5 w-5"
            />
          </span>

          <h2 className="mt-5 font-headline text-2xl font-bold text-deep">
            {
              dict.account
                .savedEmptyTitle
            }
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {
              dict.account
                .savedEmptyDescription
            }
          </p>

          <Link
            href={localizedPath(
              locale,
              '/latest'
            )}
            className="mt-6 inline-flex min-h-10 items-center justify-center rounded-md bg-deep px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {
              dict.account
                .savedBrowseLatest
            }
          </Link>
        </section>
      ) : (
        <section
          aria-label={
            dict.account
              .savedArticles
          }
          className="divide-y divide-border"
        >
          {savedPage.items.map(
            ({
              bookmarkId,
              savedAt,
              story,
            }) => {
              const categoryName =
                story.primaryCategory
                  ? locale ===
                    'es'
                    ? story
                        .primaryCategory
                        .nameEs
                    : story
                        .primaryCategory
                        .nameEn
                  : null;

              const articleHref =
                localizedPath(
                  locale,
                  `/article/${story.slug}`
                );

              return (
                <article
                  key={
                    bookmarkId
                  }
                  className="grid gap-4 py-5 sm:grid-cols-[180px_minmax(0,1fr)] lg:grid-cols-[200px_minmax(0,1fr)_auto]"
                >
                  <Link
                    href={
                      articleHref
                    }
                    tabIndex={-1}
                    aria-hidden="true"
                    className="block overflow-hidden rounded-md bg-surface-subtle"
                  >
                    {story.featuredImage ? (
                      <img
                        src={
                          story
                            .featuredImage
                            .url
                        }
                        alt=""
                        className="aspect-[16/10] h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex aspect-[16/10] items-center justify-center text-muted-foreground">
                        <Bookmark
                          aria-hidden="true"
                          className="h-6 w-6"
                        />
                      </span>
                    )}
                  </Link>

                  <div className="min-w-0">
                    {categoryName ? (
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                        {categoryName}
                      </p>
                    ) : null}

                    <h2 className="mt-1 font-headline text-xl font-bold leading-tight text-deep sm:text-2xl">
                      <Link
                        href={
                          articleHref
                        }
                        className="hover:underline focus-visible:outline-none focus-visible:underline"
                      >
                        {
                          story.headline
                        }
                      </Link>
                    </h2>

                    {story.summary ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {
                          story.summary
                        }
                      </p>
                    ) : null}

                    <p className="mt-3 text-xs text-muted-foreground">
                      {
                        dict.account
                          .savedDateLabel
                      }{' '}

                      <time
                        dateTime={
                          savedAt
                        }
                      >
                        {new Intl.DateTimeFormat(
                          dateLocale,
                          {
                            month:
                              'short',
                            day:
                              'numeric',
                            year:
                              'numeric',
                          }
                        ).format(
                          new Date(
                            savedAt
                          )
                        )}
                      </time>
                    </p>
                  </div>

                  <div className="flex items-start sm:col-start-2 lg:col-start-auto">
                    <StoryBookmarkButton
                      storyId={
                        story.id
                      }
                      initialBookmarked
                      isAuthenticated
                      signInHref={
                        signInHref
                      }
                      labels={{
                        save:
                          dict.article
                            .bookmark,

                        saved:
                          dict.article
                            .bookmarkSaved,

                        remove:
                          dict.article
                            .bookmarkRemove,

                        signIn:
                          dict.article
                            .bookmarkSignIn,

                        updating:
                          dict.article
                            .bookmarkUpdating,

                        error:
                          dict.article
                            .bookmarkError,
                      }}
                    />
                  </div>
                </article>
              );
            }
          )}
        </section>
      )}

      {savedPage.totalPages >
      1 ? (
        <nav
          aria-label={
            replacePageTokens(
              dict.account
                .savedPageStatus,
              savedPage.page,
              savedPage.totalPages
            )
          }
          className="flex items-center justify-between border-t border-border py-6"
        >
          {savedPage.page >
          1 ? (
            <Link
              href={`/account/saved?page=${savedPage.page - 1}`}
              className="inline-flex min-h-10 items-center rounded-md border border-border bg-white px-4 py-2 text-sm font-bold text-deep transition-colors hover:border-primary hover:text-primary"
            >
              {
                dict.account
                  .savedPrevious
              }
            </Link>
          ) : (
            <span />
          )}

          <p className="text-xs font-semibold text-muted-foreground">
            {replacePageTokens(
              dict.account
                .savedPageStatus,
              savedPage.page,
              savedPage.totalPages
            )}
          </p>

          {savedPage.page <
          savedPage.totalPages ? (
            <Link
              href={`/account/saved?page=${savedPage.page + 1}`}
              className="inline-flex min-h-10 items-center rounded-md border border-border bg-white px-4 py-2 text-sm font-bold text-deep transition-colors hover:border-primary hover:text-primary"
            >
              {
                dict.account
                  .savedNext
              }
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}