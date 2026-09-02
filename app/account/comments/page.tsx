import Link from 'next/link';

import {
  redirect,
} from 'next/navigation';

import {
  MessageSquare,
} from 'lucide-react';

import {
  CommentHistoryList,
} from '@/components/account/comment-history-list';

import {
  getCurrentUser,
} from '@/lib/auth/session';

import {
  isDevAuthBypass,
} from '@/lib/db/supabase-data';

import {
  localizedPath,
} from '@/lib/i18n/config';

import {
  getDictionary,
} from '@/lib/i18n/dictionaries';

import {
  getServerLocale,
} from '@/lib/i18n/server-locale';

import {
  getAccountComments,
  type AccountCommentsPage,
} from '@/lib/services/account-comments';

interface CommentsPageProps {
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

export default async function CommentsPage({
  searchParams,
}: CommentsPageProps) {
  const user =
    await getCurrentUser();

  const locale =
    getServerLocale(
      user?.profile
        ?.preferredLocale
    );

  if (!user) {
    const signInPath =
      localizedPath(
        locale,
        '/auth/sign-in'
      );

    redirect(
      `${signInPath}?next=${encodeURIComponent(
        '/account/comments'
      )}`
    );
  }

  const dict =
    getDictionary(locale);

  const requestedPage =
    parsePage(
      searchParams?.page
    );

  /*
   * DEV_AUTH_BYPASS has no authenticated reader
   * session, so it must not receive access to personal
   * comment history through anonymous RLS policies.
   */
  const commentsPage:
    AccountCommentsPage =
    isDevAuthBypass()
      ? {
          items: [],
          total: 0,
          page: 1,
          perPage: 15,
          totalPages: 0,
        }
      : await getAccountComments(
          user.id,
          {
            page:
              requestedPage,

            perPage:
              15,
          }
        );

  if (
    commentsPage.totalPages >
      0 &&
    requestedPage >
      commentsPage.totalPages
  ) {
    redirect(
      `/account/comments?page=${commentsPage.totalPages}`
    );
  }

  const signInHref =
    `${localizedPath(
      locale,
      '/auth/sign-in'
    )}?next=${encodeURIComponent(
      '/account/comments'
    )}`;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="border-b border-border pb-6">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
          {
            dict.account
              .title
          }
        </p>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-headline text-3xl font-bold leading-tight text-deep sm:text-4xl">
              {
                dict.account
                  .comments
              }
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {
                dict.account
                  .commentsDescription
              }
            </p>
          </div>

          {commentsPage.total >
          0 ? (
            <span
              aria-label={`${commentsPage.total} ${dict.account.comments}`}
              className="font-headline text-3xl font-bold leading-none text-deep"
            >
              {
                commentsPage.total
              }
            </span>
          ) : null}
        </div>
      </header>

      {commentsPage.items.length ===
      0 ? (
        <section className="py-16 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MessageSquare
              aria-hidden="true"
              className="h-5 w-5"
            />
          </span>

          <h2 className="mt-5 font-headline text-2xl font-bold text-deep">
            {
              dict.account
                .commentsEmptyTitle
            }
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {
              dict.account
                .commentsEmptyDescription
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
                .commentsBrowseLatest
            }
          </Link>
        </section>
      ) : (
        <CommentHistoryList
          initialItems={
            commentsPage.items
          }
          locale={
            locale
          }
          signInHref={
            signInHref
          }
          labels={{
            typeComment:
              dict.account
                .commentsTypeComment,

            typeReply:
              dict.account
                .commentsTypeReply,

            statusLabel:
              dict.account
                .commentsStatusLabel,

            statusPending:
              dict.account
                .commentsStatusPending,

            statusPublished:
              dict.account
                .commentsStatusPublished,

            statusHidden:
              dict.account
                .commentsStatusHidden,

            statusDeleted:
              dict.account
                .commentsStatusDeleted,

            storyUnavailable:
              dict.account
                .commentsStoryUnavailable,

            replyCountOne:
              dict.account
                .commentsReplyCountOne,

            replyCountMany:
              dict.account
                .commentsReplyCountMany,

            viewThread:
              dict.account
                .commentsViewThread,

            edit:
              dict.account
                .commentsEdit,

            delete:
              dict.account
                .commentsDelete,

            save:
              dict.account
                .commentsSave,

            cancel:
              dict.account
                .commentsCancel,

            saving:
              dict.account
                .commentsSaving,

            deleting:
              dict.account
                .commentsDeleting,

            deleteConfirm:
              dict.account
                .commentsDeleteConfirm,

            updatedNotice:
              dict.account
                .commentsUpdatedNotice,

            deletedNotice:
              dict.account
                .commentsDeletedNotice,

            updateError:
              dict.account
                .commentsUpdateError,

            deleteError:
              dict.account
                .commentsDeleteError,
          }}
        />
      )}

      {commentsPage.totalPages >
      1 ? (
        <nav
          aria-label={
            replacePageTokens(
              dict.account
                .commentsPageStatus,
              commentsPage.page,
              commentsPage.totalPages
            )
          }
          className="flex items-center justify-between border-t border-border py-6"
        >
          {commentsPage.page >
          1 ? (
            <Link
              href={`/account/comments?page=${commentsPage.page - 1}`}
              className="inline-flex min-h-10 items-center rounded-md border border-border bg-white px-4 py-2 text-sm font-bold text-deep transition-colors hover:border-primary hover:text-primary"
            >
              {
                dict.account
                  .commentsPrevious
              }
            </Link>
          ) : (
            <span />
          )}

          <p className="text-xs font-semibold text-muted-foreground">
            {replacePageTokens(
              dict.account
                .commentsPageStatus,
              commentsPage.page,
              commentsPage.totalPages
            )}
          </p>

          {commentsPage.page <
          commentsPage.totalPages ? (
            <Link
              href={`/account/comments?page=${commentsPage.page + 1}`}
              className="inline-flex min-h-10 items-center rounded-md border border-border bg-white px-4 py-2 text-sm font-bold text-deep transition-colors hover:border-primary hover:text-primary"
            >
              {
                dict.account
                  .commentsNext
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