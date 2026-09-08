'use client';

import Link from 'next/link';

import {
  useRef,
  useState,
} from 'react';

import {
  Bookmark,
  Check,
  Copy,
  Link2,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Share2,
  X,
} from 'lucide-react';

import {
  FaFacebookF,
  FaLinkedinIn,
  FaRedditAlien,
  FaTelegramPlane,
  FaWhatsapp,
} from 'react-icons/fa';

import {
  FaXTwitter,
} from 'react-icons/fa6';

import type {
  Dictionary,
} from '@/lib/i18n/dictionaries';

import {
  StoryBookmarkButton,
} from '@/components/account/story-bookmark-button';

interface ArticleBookmarkState {
  isAuthenticated: boolean;
  initialBookmarked: boolean;
  signInHref: string;
}

interface ArticleActionsProps {
  storyId: string;
  dict: Dictionary;
  bookmarkState?: ArticleBookmarkState;
  commentCount?: number;
}

export function ArticleActions({
  storyId,
  dict,
  bookmarkState,
  commentCount = 0,
}: ArticleActionsProps) {
  const [
    copied,
    setCopied,
  ] = useState(false);

  const [
    shareOpen,
    setShareOpen,
  ] = useState(false);

  const [
    authOpen,
    setAuthOpen,
  ] = useState(false);

  const shareCloseTimer =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  const authCloseTimer =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  function getShareData() {
    if (
      typeof window ===
      'undefined'
    ) {
      return {
        url: '',
        title: '',
      };
    }

    return {
      url:
        window.location.href,

      title:
        document.title,
    };
  }

  function openShareWindow(
    url: string
  ) {
    window.open(
      url,
      '_blank',
      'noopener,noreferrer,width=720,height=620'
    );
  }

  function shareFacebook() {
    const {
      url,
    } = getShareData();

    openShareWindow(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        url
      )}`
    );
  }

  function shareX() {
    const {
      url,
      title,
    } = getShareData();

    openShareWindow(
      `https://x.com/intent/post?text=${encodeURIComponent(
        title
      )}&url=${encodeURIComponent(
        url
      )}`
    );
  }

  function shareLinkedIn() {
    const {
      url,
    } = getShareData();

    openShareWindow(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        url
      )}`
    );
  }

  function shareWhatsApp() {
    const {
      url,
      title,
    } = getShareData();

    openShareWindow(
      `https://wa.me/?text=${encodeURIComponent(
        `${title} ${url}`
      )}`
    );
  }

  function shareTelegram() {
    const {
      url,
      title,
    } = getShareData();

    openShareWindow(
      `https://t.me/share/url?url=${encodeURIComponent(
        url
      )}&text=${encodeURIComponent(
        title
      )}`
    );
  }

  function shareReddit() {
    const {
      url,
      title,
    } = getShareData();

    openShareWindow(
      `https://www.reddit.com/submit?url=${encodeURIComponent(
        url
      )}&title=${encodeURIComponent(
        title
      )}`
    );
  }

  function shareEmail() {
    const {
      url,
      title,
    } = getShareData();

    window.location.href =
      `mailto:?subject=${encodeURIComponent(
        title
      )}&body=${encodeURIComponent(
        `${title}\n\n${url}`
      )}`;
  }

  async function copyLink() {
    const {
      url,
    } = getShareData();

    try {
      await navigator.clipboard.writeText(
        url
      );

      setCopied(true);

      window.setTimeout(
        () => {
          setCopied(false);
        },
        2000
      );
    } catch (error) {
      console.error(
        'Unable to copy article link:',
        error
      );
    }
  }

  async function shareMore() {
    const {
      url,
      title,
    } = getShareData();

    if (
      typeof navigator !==
        'undefined' &&
      navigator.share
    ) {
      try {
        await navigator.share({
          title,
          url,
        });

        return;
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name ===
            'AbortError'
        ) {
          return;
        }
      }
    }

    await copyLink();
  }

  function scrollToComments() {
    document
      .getElementById(
        'comments'
      )
      ?.scrollIntoView({
        behavior:
          'smooth',

        block:
          'start',
      });
  }

  function openSharePopup() {
    if (
      shareCloseTimer.current
    ) {
      clearTimeout(
        shareCloseTimer.current
      );
    }

    setAuthOpen(false);
    setShareOpen(true);
  }

  function scheduleShareClose() {
    shareCloseTimer.current =
      setTimeout(
        () => {
          setShareOpen(false);
        },
        180
      );
  }

  function openAuthPopup() {
    if (
      authCloseTimer.current
    ) {
      clearTimeout(
        authCloseTimer.current
      );
    }

    setShareOpen(false);
    setAuthOpen(true);
  }

  function scheduleAuthClose() {
    authCloseTimer.current =
      setTimeout(
        () => {
          setAuthOpen(false);
        },
        180
      );
  }

  const signInHref =
    bookmarkState
      ?.signInHref ??
    '#';

  const signUpHref =
    signInHref.replace(
      '/sign-in',
      '/sign-up'
    );

  return (
    <>
      {/* ======================================================
          DESKTOP LEFT RAIL
      ====================================================== */}

<aside
  className="
    hidden
    h-full
    w-fit
    max-w-full
    self-stretch
    lg:block
  "
>
        <div
          className="
            sticky
            top-32
            flex
            flex-col
            items-center
            gap-2.5
            rounded-2xl
            border
            border-border
            bg-white
            p-2
            shadow-sm
          "
        >
          {/* ==================================================
              SHARE
          ================================================== */}

          <div
            className="relative"
            onMouseEnter={
              openSharePopup
            }
            onMouseLeave={
              scheduleShareClose
            }
          >
            <button
              type="button"
              onClick={() =>
                setShareOpen(
                  (open) =>
                    !open
                )
              }
              className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-xl
                text-muted-foreground
                transition-colors
                hover:bg-surface-muted
                hover:text-[hsl(var(--color-article-accent))]
              "
              aria-label="Share article"
              title="Share"
            >
              <Share2
                className="h-5 w-5"
                aria-hidden
              />
            </button>

            {shareOpen && (
              <div
                className="
                  absolute
                  left-[calc(100%+12px)]
                  top-0
                  z-50
                  w-[320px]
                  rounded-2xl
                  border
                  border-border
                  bg-white
                  p-4
                  shadow-2xl
                "
                onMouseEnter={
                  openSharePopup
                }
                onMouseLeave={
                  scheduleShareClose
                }
              >
                <div
                  className="
                    mb-4
                    flex
                    items-center
                    justify-between
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
                      Share article
                    </p>

                    <p
                      className="
                        mt-0.5
                        font-interface
                        text-xs
                        text-muted-foreground
                      "
                    >
                      Choose where to
                      share this story.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setShareOpen(
                        false
                      )
                    }
                    className="
                      flex
                      h-8
                      w-8
                      items-center
                      justify-center
                      rounded-full
                      text-muted-foreground
                      hover:bg-surface-muted
                    "
                    aria-label="Close"
                  >
                    <X
                      className="h-4 w-4"
                      aria-hidden
                    />
                  </button>
                </div>

                {/* Social grid */}
                <div
                  className="
                    grid
                    grid-cols-4
                    gap-3
                  "
                >
                  <SocialButton
                    label="Facebook"
                    onClick={
                      shareFacebook
                    }
                    icon={
                      <FacebookLogo />
                    }
                  />

                  <SocialButton
                    label="X"
                    onClick={
                      shareX
                    }
                    icon={
                      <XLogo />
                    }
                  />

                  <SocialButton
                    label="WhatsApp"
                    onClick={
                      shareWhatsApp
                    }
                    icon={
                      <WhatsAppLogo />
                    }
                  />

                  <SocialButton
                    label="LinkedIn"
                    onClick={
                      shareLinkedIn
                    }
                    icon={
                      <LinkedInLogo />
                    }
                  />

                  <SocialButton
                    label="Telegram"
                    onClick={
                      shareTelegram
                    }
                    icon={
                      <TelegramLogo />
                    }
                  />

                  <SocialButton
                    label="Reddit"
                    onClick={
                      shareReddit
                    }
                    icon={
                      <RedditLogo />
                    }
                  />

                  <SocialButton
                    label="Email"
                    onClick={
                      shareEmail
                    }
                    icon={
                      <div
                        className="
                          flex
                          h-10
                          w-10
                          items-center
                          justify-center
                          rounded-lg
                          bg-[#EA4335]
                          text-white
                        "
                      >
                        <Mail
                          className="h-5 w-5"
                          aria-hidden
                        />
                      </div>
                    }
                  />

                  <SocialButton
                    label={
                      copied
                        ? 'Copied'
                        : 'Copy'
                    }
                    onClick={
                      copyLink
                    }
                    icon={
                      <div
                        className="
                          flex
                          h-10
                          w-10
                          items-center
                          justify-center
                          rounded-lg
                          bg-deep
                          text-white
                        "
                      >
                        {copied ? (
                          <Check
                            className="h-5 w-5"
                            aria-hidden
                          />
                        ) : (
                          <Link2
                            className="h-5 w-5"
                            aria-hidden
                          />
                        )}
                      </div>
                    }
                  />
                </div>

                <div className="my-4 h-px bg-border" />

                <button
                  type="button"
                  onClick={
                    shareMore
                  }
                  className="
                    flex
                    w-full
                    items-center
                    justify-between
                    rounded-lg
                    px-3
                    py-2.5
                    font-interface
                    text-sm
                    font-medium
                    text-deep
                    transition-colors
                    hover:bg-surface-muted
                  "
                >
                  More sharing options

                  <MoreHorizontal
                    className="
                      h-5
                      w-5
                      text-[hsl(var(--color-article-accent))]
                    "
                    aria-hidden
                  />
                </button>
              </div>
            )}
          </div>

          {/* Quick copy */}
          <button
            type="button"
            onClick={
              copyLink
            }
            className="
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-xl
              text-muted-foreground
              transition-colors
              hover:bg-surface-muted
              hover:text-deep
            "
            aria-label="Copy link"
            title="Copy link"
          >
            {copied ? (
              <Check
                className="
                  h-5
                  w-5
                  text-[hsl(var(--color-article-accent))]
                "
                aria-hidden
              />
            ) : (
              <Link2
                className="h-5 w-5"
                aria-hidden
              />
            )}
          </button>

          <div
            className="
              h-px
              w-6
              bg-border
            "
          />

          {/* ==================================================
              BOOKMARK
          ================================================== */}

          {bookmarkState
            ?.isAuthenticated ? (
            <StoryBookmarkButton
              storyId={
                storyId
              }
              initialBookmarked={
                bookmarkState.initialBookmarked
              }
              isAuthenticated
              signInHref={
                bookmarkState.signInHref
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
              iconOnly
              className="
                h-11
                min-h-11
                w-11
                rounded-xl
                border-0
                bg-transparent
                p-0
                shadow-none
              "
            />
          ) : (
            <div
              className="relative"
              onMouseEnter={
                openAuthPopup
              }
              onMouseLeave={
                scheduleAuthClose
              }
            >
              <button
                type="button"
                onClick={() =>
                  setAuthOpen(
                    (open) =>
                      !open
                  )
                }
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  text-muted-foreground
                  transition-colors
                  hover:bg-amber-50
                  hover:text-[hsl(var(--color-article-accent))]
                "
                aria-label="Save article"
                title="Save article"
              >
                <Bookmark
                  className="h-5 w-5"
                  aria-hidden
                />
              </button>

              {authOpen && (
                <div
                  className="
                    absolute
                    left-[calc(100%+12px)]
                    top-0
                    z-50
                    w-[280px]
                    rounded-2xl
                    border
                    border-border
                    bg-white
                    p-5
                    shadow-xl
                  "
                  onMouseEnter={
                    openAuthPopup
                  }
                  onMouseLeave={
                    scheduleAuthClose
                  }
                >
                  <p
                    className="
                      font-headline
                      text-lg
                      font-bold
                      text-deep
                    "
                  >
                    Save this article
                  </p>

                  <p
                    className="
                      mt-2
                      font-body
                      text-sm
                      leading-5
                      text-muted-foreground
                    "
                  >
                    Sign in or create an
                    account to save stories
                    and return to them later.
                  </p>

                  <div className="mt-5 space-y-2">
                    <Link
                      href={
                        signInHref
                      }
                      className="
                        flex
                        h-10
                        items-center
                        justify-center
                        rounded-lg
                        bg-[hsl(var(--color-article-accent))]
                        font-interface
                        text-sm
                        font-semibold
                        text-white
                      "
                    >
                      Sign in
                    </Link>

                    <Link
                      href={
                        signUpHref
                      }
                      className="
                        flex
                        h-10
                        items-center
                        justify-center
                        rounded-lg
                        border
                        border-border
                        font-interface
                        text-sm
                        font-semibold
                        text-deep
                        hover:bg-surface-muted
                      "
                    >
                      Create account
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================================================
              COMMENTS
          ================================================== */}

          <button
            type="button"
            onClick={
              scrollToComments
            }
            className="
              relative
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-xl
              bg-slate-100
              text-slate-700
              transition-colors
              hover:bg-[hsl(var(--color-article-accent))]
              hover:text-white
            "
            aria-label={`${commentCount} comments`}
            title={`${commentCount} comments`}
          >
            <MessageCircle
              className="
                h-5
                w-5
                fill-current
              "
              aria-hidden
            />

            {commentCount > 0 && (
              <span
                className="
                  absolute
                  -right-1.5
                  -top-1.5
                  flex
                  min-h-5
                  min-w-5
                  items-center
                  justify-center
                  rounded-full
                  bg-[hsl(var(--color-article-accent))]
                  px-1
                  font-interface
                  text-[0.6rem]
                  font-bold
                  text-white
                  ring-2
                  ring-white
                "
              >
                {commentCount >
                99
                  ? '99+'
                  : commentCount}
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* ======================================================
          MOBILE
      ====================================================== */}

      <div
        className="
          flex
          w-full
          items-center
          justify-center
          gap-3
          border-b
          border-border
          pb-6
          lg:hidden
        "
      >
        <button
          type="button"
          onClick={() =>
            setShareOpen(
              true
            )
          }
          className="
            inline-flex
            h-10
            w-10
            items-center
            justify-center
            rounded-full
            border
            border-border
            bg-white
            text-muted-foreground
          "
          aria-label="Share"
        >
          <Share2
            className="h-4 w-4"
            aria-hidden
          />
        </button>

        <button
          type="button"
          onClick={
            copyLink
          }
          className="
            inline-flex
            h-10
            w-10
            items-center
            justify-center
            rounded-full
            border
            border-border
            bg-white
            text-muted-foreground
          "
          aria-label="Copy link"
        >
          {copied ? (
            <Check
              className="h-4 w-4"
              aria-hidden
            />
          ) : (
            <Link2
              className="h-4 w-4"
              aria-hidden
            />
          )}
        </button>

        {bookmarkState
          ?.isAuthenticated ? (
          <StoryBookmarkButton
            storyId={
              storyId
            }
            initialBookmarked={
              bookmarkState.initialBookmarked
            }
            isAuthenticated
            signInHref={
              bookmarkState.signInHref
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
            iconOnly
            className="
              h-10
              min-h-10
              w-10
              rounded-full
              p-0
            "
          />
        ) : (
          <Link
            href={
              signInHref
            }
            className="
              inline-flex
              h-10
              w-10
              items-center
              justify-center
              rounded-full
              border
              border-border
              bg-white
              text-muted-foreground
            "
            aria-label="Save article"
          >
            <Bookmark
              className="h-4 w-4"
              aria-hidden
            />
          </Link>
        )}

        <button
          type="button"
          onClick={
            scrollToComments
          }
          className="
            relative
            inline-flex
            h-10
            w-10
            items-center
            justify-center
            rounded-full
            bg-slate-100
            text-slate-700
          "
          aria-label={`${commentCount} comments`}
        >
          <MessageCircle
            className="h-4 w-4"
            aria-hidden
          />

          {commentCount > 0 && (
            <span
              className="
                absolute
                -right-1
                -top-1
                flex
                min-h-5
                min-w-5
                items-center
                justify-center
                rounded-full
                bg-[hsl(var(--color-article-accent))]
                px-1
                text-[0.6rem]
                font-bold
                text-white
              "
            >
              {commentCount >
              99
                ? '99+'
                : commentCount}
            </span>
          )}
        </button>
      </div>
    </>
  );
}

/* =========================================================
   SOCIAL BUTTON
========================================================= */

interface SocialButtonProps {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}

function SocialButton({
  label,
  onClick,
  icon,
}: SocialButtonProps) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className="
        group
        flex
        min-w-0
        flex-col
        items-center
        gap-2
        rounded-xl
        p-2
        transition-colors
        hover:bg-surface-muted
      "
    >
      {icon}

      <span
        className="
          max-w-full
          truncate
          font-interface
          text-[0.62rem]
          font-medium
          text-muted-foreground
          group-hover:text-deep
        "
      >
        {label}
      </span>
    </button>
  );
}

/* =========================================================
   BRAND LOGOS
========================================================= */

function FacebookLogo() {
  return (
    <div
      className="
        flex
        h-10
        w-10
        items-center
        justify-center
        rounded-lg
        bg-[#1877F2]
        text-white
      "
    >
      <FaFacebookF className="h-5 w-5" />
    </div>
  );
}

function XLogo() {
  return (
    <div
      className="
        flex
        h-10
        w-10
        items-center
        justify-center
        rounded-lg
        bg-black
        text-white
      "
    >
      <FaXTwitter className="h-5 w-5" />
    </div>
  );
}

function WhatsAppLogo() {
  return (
    <div
      className="
        flex
        h-10
        w-10
        items-center
        justify-center
        rounded-lg
        bg-[#25D366]
        text-white
      "
    >
      <FaWhatsapp className="h-5 w-5" />
    </div>
  );
}

function LinkedInLogo() {
  return (
    <div
      className="
        flex
        h-10
        w-10
        items-center
        justify-center
        rounded-lg
        bg-[#0A66C2]
        text-white
      "
    >
      <FaLinkedinIn className="h-5 w-5" />
    </div>
  );
}

function TelegramLogo() {
  return (
    <div
      className="
        flex
        h-10
        w-10
        items-center
        justify-center
        rounded-lg
        bg-[#229ED9]
        text-white
      "
    >
      <FaTelegramPlane className="h-5 w-5" />
    </div>
  );
}

function RedditLogo() {
  return (
    <div
      className="
        flex
        h-10
        w-10
        items-center
        justify-center
        rounded-lg
        bg-[#FF4500]
        text-white
      "
    >
      <FaRedditAlien className="h-5 w-5" />
    </div>
  );
}