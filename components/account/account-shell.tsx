'use client';

import Link from 'next/link';

import {
  Bell,
  Bookmark,
  CreditCard,
  Home,
  Mail,
  MessageSquare,
  Newspaper,
  Shield,
  User,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';

import {
  usePathname,
} from 'next/navigation';

import type {
  Dictionary,
} from '@/lib/i18n/dictionaries';

import type {
  CurrentUser,
  Locale,
} from '@/types';

interface AccountShellProps {
  children:
    React.ReactNode;

  dict:
    Dictionary;

  locale:
    Locale;

  user:
    CurrentUser;
}

interface AccountNavigationItem {
  href: string;

  label: string;

  icon:
    LucideIcon;
}

export function AccountShell({
  children,
  dict,
  locale,
  user,
}: AccountShellProps) {
  const pathname =
    usePathname();

  const profile =
    user.profile;

  const displayName =
    profile?.displayName ??
    user.email ??
    'Reader';

  const initial =
    displayName
      .trim()
      .charAt(0)
      .toUpperCase() ||
    'W';

  const canOpenNewsroom =
    Boolean(
      profile?.isAuthor ||
      profile?.isEditor
    );

  const roleLabel =
    profile?.isAuthor &&
    profile?.isEditor
      ? dict.account
          .roleAuthorEditor
      : profile?.isAuthor
        ? dict.account
            .roleAuthor
        : profile?.isEditor
          ? dict.account
              .roleEditor
          : dict.account
              .roleUser;

  const navigation:
    AccountNavigationItem[] =
    [
      {
        href:
          '/account',
        label:
          dict.account
            .overview,
        icon:
          Home,
      },
      {
        href:
          '/account/saved',
        label:
          dict.account
            .saved,
        icon:
          Bookmark,
      },
      {
        href:
          '/account/comments',
        label:
          dict.account
            .comments,
        icon:
          MessageSquare,
      },
      {
        href:
          '/account/notifications',
        label:
          dict.account
            .notifications,
        icon:
          Bell,
      },
      {
        href:
          '/account/newsletters',
        label:
          dict.account
            .newsletters,
        icon:
          Mail,
      },
      {
        href:
          '/account/subscription',
        label:
          dict.account
            .subscription,
        icon:
          CreditCard,
      },
      {
        href:
          '/account/profile',
        label:
          dict.account
            .profile,
        icon:
          User,
      },
      {
        href:
          '/account/security',
        label:
          dict.account
            .security,
        icon:
          Shield,
      },
    ];

  function isActive(
    href: string
  ) {
    if (
      href ===
      '/account'
    ) {
      return (
        pathname ===
        '/account'
      );
    }

    return (
      pathname === href ||
      pathname.startsWith(
        `${href}/`
      )
    );
  }

  return (
    <div
      className="
        min-h-screen
        bg-surface-muted
        text-foreground
        lg:flex
      "
    >
      {/* Desktop sidebar */}

      <aside
        className="
          sticky
          top-0
          hidden
          h-screen
          w-72
          shrink-0
          flex-col
          border-r
          border-border
          bg-white
          lg:flex
        "
      >
        <div
          className="
            border-b
            border-border
            px-5
            py-5
          "
        >
          <Link
            href={
              `/${locale}`
            }
            className="
              text-[0.6875rem]
              font-semibold
              uppercase
              tracking-[0.16em]
              text-primary
            "
          >
            West Island Times
          </Link>

          <h1
            className="
              mt-1
              font-headline
              text-xl
              font-semibold
              text-deep
            "
          >
            {
              dict.account
                .title
            }
          </h1>
        </div>

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
              items-center
              gap-3
            "
          >
            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-lg
                bg-deep
                text-sm
                font-bold
                text-white
              "
              aria-hidden
            >
              {initial}
            </div>

            <div className="min-w-0">
              <p
                className="
                  truncate
                  text-sm
                  font-semibold
                  text-deep
                "
              >
                {displayName}
              </p>

              <p
                className="
                  mt-0.5
                  text-xs
                  text-muted-foreground
                "
              >
                {roleLabel}
              </p>
            </div>
          </div>
        </div>

        <nav
          aria-label={
            dict.account
              .menuLabel
          }
          className="
            flex-1
            overflow-y-auto
            px-3
            py-4
          "
        >
          <ul className="space-y-1">
            {navigation.map(
              (
                item
              ) => {
                const active =
                  isActive(
                    item.href
                  );

                const Icon =
                  item.icon;

                return (
                  <li
                    key={
                      item.href
                    }
                  >
                    <Link
                      href={
                        item.href
                      }
                      aria-current={
                        active
                          ? 'page'
                          : undefined
                      }
                      className={`
                        flex
                        min-h-10
                        items-center
                        gap-3
                        rounded-lg
                        px-3
                        py-2
                        text-sm
                        font-medium
                        transition-colors
                        ${
                          active
                            ? 'bg-primary text-white'
                            : 'text-foreground hover:bg-surface-muted hover:text-deep'
                        }
                      `}
                    >
                      <Icon
                        className="h-4 w-4 shrink-0"
                        aria-hidden
                      />

                      <span>
                        {
                          item.label
                        }
                      </span>
                    </Link>
                  </li>
                );
              }
            )}
          </ul>
        </nav>

        <div
          className="
            space-y-1
            border-t
            border-border
            p-3
          "
        >
          {canOpenNewsroom && (
            <Link
              href="/newsroom"
              className="
                flex
                min-h-10
                items-center
                gap-3
                rounded-lg
                px-3
                py-2
                text-sm
                font-semibold
                text-deep
                transition-colors
                hover:bg-star/10
                hover:text-star
              "
            >
              <Newspaper
                className="h-4 w-4"
                aria-hidden
              />

              {
                dict.account
                  .openNewsroom
              }
            </Link>
          )}

          <Link
            href={
              `/${locale}`
            }
            className="
              flex
              min-h-10
              items-center
              gap-3
              rounded-lg
              px-3
              py-2
              text-sm
              font-medium
              text-muted-foreground
              transition-colors
              hover:bg-surface-muted
              hover:text-deep
            "
          >
            <ArrowLeft
              className="h-4 w-4"
              aria-hidden
            />

            {
              dict.account
                .backToSite
            }
          </Link>
        </div>
      </aside>

      {/* Mobile account header */}

      <div className="min-w-0 flex-1">
        <header
          className="
            sticky
            top-0
            z-40
            border-b
            border-border
            bg-white
            lg:hidden
          "
        >
          <div
            className="
              flex
              min-h-16
              items-center
              justify-between
              gap-3
              px-4
            "
          >
            <div className="min-w-0">
              <p
                className="
                  text-[0.625rem]
                  font-semibold
                  uppercase
                  tracking-[0.14em]
                  text-primary
                "
              >
                West Island Times
              </p>

              <p
                className="
                  truncate
                  font-headline
                  text-lg
                  font-semibold
                  text-deep
                "
              >
                {
                  dict.account
                    .title
                }
              </p>
            </div>

            <div
              className="
                flex
                items-center
                gap-1
              "
            >
              {canOpenNewsroom && (
                <Link
                  href="/newsroom"
                  aria-label={
                    dict.account
                      .openNewsroom
                  }
                  className="
                    inline-flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-lg
                    text-deep
                    transition-colors
                    hover:bg-star/10
                    hover:text-star
                  "
                >
                  <Newspaper
                    className="h-4 w-4"
                    aria-hidden
                  />
                </Link>
              )}

              <Link
                href={
                  `/${locale}`
                }
                aria-label={
                  dict.account
                    .backToSite
                }
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
                "
              >
                <ArrowLeft
                  className="h-4 w-4"
                  aria-hidden
                />
              </Link>
            </div>
          </div>

          <nav
            aria-label={
              dict.account
                .menuLabel
            }
            className="
              overflow-x-auto
              border-t
              border-border
              px-3
              py-2
            "
          >
            <ul
              className="
                flex
                min-w-max
                gap-1
              "
            >
              {navigation.map(
                (
                  item
                ) => {
                  const active =
                    isActive(
                      item.href
                    );

                  const Icon =
                    item.icon;

                  return (
                    <li
                      key={
                        item.href
                      }
                    >
                      <Link
                        href={
                          item.href
                        }
                        aria-current={
                          active
                            ? 'page'
                            : undefined
                        }
                        className={`
                          inline-flex
                          h-9
                          items-center
                          gap-2
                          rounded-lg
                          px-3
                          text-xs
                          font-semibold
                          transition-colors
                          ${
                            active
                              ? 'bg-primary text-white'
                              : 'text-muted-foreground hover:bg-surface-muted hover:text-deep'
                          }
                        `}
                      >
                        <Icon
                          className="h-3.5 w-3.5"
                          aria-hidden
                        />

                        {
                          item.label
                        }
                      </Link>
                    </li>
                  );
                }
              )}
            </ul>
          </nav>
        </header>

        <main className="min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}