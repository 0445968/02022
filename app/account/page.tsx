import Link from 'next/link';

import {
  redirect,
} from 'next/navigation';

import {
  ArrowRight,
  Bell,
  Bookmark,
  CreditCard,
  Mail,
  MessageSquare,
  Shield,
  User,
} from 'lucide-react';

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
  getSavedStories,
} from '@/lib/services/saved-stories';

async function loadSavedCount(
  userId: string
): Promise<number | null> {
  try {
    const result =
      await getSavedStories(
        userId,
        {
          page: 1,
          perPage: 1,
        }
      );

    return result.total;
  } catch (error) {
    /*
     * A reader-data failure should not prevent the
     * rest of the account dashboard from loading.
     */
    console.error(
      'Unable to load dashboard bookmark count:',
      error
    );

    return null;
  }
}

export default async function AccountPage() {
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
        '/account'
      )}`
    );
  }

  const locale =
    user.profile
      ?.preferredLocale ??
    defaultLocale;

  const dict =
    getDictionary(locale);

  /*
   * The development bypass is an editorial testing
   * identity, not a real authenticated reader session.
   */
  const savedCount =
    isDevAuthBypass()
      ? null
      : await loadSavedCount(
          user.id
        );

  const displayName =
    user.profile
      ?.displayName
      ?.trim() ||
    user.email ||
    dict.account.roleUser;

  const roleLabel =
    user.profile?.isAuthor &&
    user.profile?.isEditor
      ? dict.account
          .roleAuthorEditor
      : user.profile?.isEditor
        ? dict.account
            .roleEditor
        : user.profile
              ?.isAuthor
          ? dict.account
              .roleAuthor
          : dict.account
              .roleUser;

  const initial =
    displayName
      .charAt(0)
      .toUpperCase();

  const sections = [
    {
      href:
        '/account/saved',

      label:
        dict.account.saved,

      icon:
        Bookmark,

      count:
        savedCount,
    },

    {
      href:
        '/account/comments',

      label:
        dict.account.comments,

      icon:
        MessageSquare,

      count:
        null,
    },

    {
      href:
        '/account/notifications',

      label:
        dict.account.notifications,

      icon:
        Bell,

      count:
        null,
    },

    {
      href:
        '/account/newsletters',

      label:
        dict.account.newsletters,

      icon:
        Mail,

      count:
        null,
    },

    {
      href:
        '/account/subscription',

      label:
        dict.account.subscription,

      icon:
        CreditCard,

      count:
        null,
    },

    {
      href:
        '/account/profile',

      label:
        dict.account.profile,

      icon:
        User,

      count:
        null,
    },

    {
      href:
        '/account/security',

      label:
        dict.account.security,

      icon:
        Shield,

      count:
        null,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="border-b border-border pb-6">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
          {
            dict.account
              .overview
          }
        </p>

        <h1 className="font-headline text-3xl font-bold leading-tight text-deep sm:text-4xl">
          {
            dict.account
              .title
          }
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          {
            dict.account
              .signedInAs
          }{' '}

          <span className="font-semibold text-foreground">
            {displayName}
          </span>
        </p>
      </header>

      <div className="grid gap-6 py-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section
          aria-labelledby="account-sections-heading"
        >
          <h2
            id="account-sections-heading"
            className="sr-only"
          >
            {
              dict.account
                .overview
            }
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {sections.map(
              (section) => {
                const Icon =
                  section.icon;

                const hasCount =
                  typeof section.count ===
                  'number';

                return (
                  <Link
                    key={
                      section.href
                    }
                    href={
                      section.href
                    }
                    className="group flex min-h-28 items-start justify-between rounded-lg border border-border bg-white p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <div className="flex items-start gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon
                          aria-hidden="true"
                          className="h-5 w-5"
                        />
                      </span>

                      <div>
                        <h3 className="text-base font-bold text-foreground">
                          {
                            section.label
                          }
                        </h3>

                        <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-primary">
                          {
                            dict.common
                              .view
                          }

                          <ArrowRight
                            aria-hidden="true"
                            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                          />
                        </span>
                      </div>
                    </div>

                    {hasCount ? (
                      <span
                        aria-label={`${section.count} ${section.label}`}
                        className="font-headline text-3xl font-bold leading-none text-deep"
                      >
                        {
                          section.count
                        }
                      </span>
                    ) : null}
                  </Link>
                );
              }
            )}
          </div>
        </section>

        <aside className="self-start rounded-lg border border-border bg-white p-5">
          <div className="flex items-center gap-4 border-b border-border pb-5">
            <div
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-deep text-lg font-bold text-white"
            >
              {initial}
            </div>

            <div className="min-w-0">
              <p className="truncate font-bold text-foreground">
                {displayName}
              </p>

              {user.email ? (
                <p className="truncate text-sm text-muted-foreground">
                  {user.email}
                </p>
              ) : null}
            </div>
          </div>

          <dl className="py-5">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {
                  dict.account
                    .role
                }
              </dt>

              <dd className="mt-1 text-sm font-semibold text-foreground">
                {roleLabel}
              </dd>
            </div>
          </dl>

          <Link
            href="/account/profile"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-deep px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <User
              aria-hidden="true"
              className="h-4 w-4"
            />

            {
              dict.account
                .profile
            }
          </Link>
        </aside>
      </div>
    </div>
  );
}