'use client';

import Link from 'next/link';
import {
  useRouter,
} from 'next/navigation';
import {
  useState,
} from 'react';

import {
  Bookmark,
  LoaderCircle,
} from 'lucide-react';

import {
  cn,
} from '@/lib/utils';

export interface StoryBookmarkButtonLabels {
  save: string;
  saved: string;
  remove: string;
  signIn: string;
  updating: string;
  error: string;
}

interface StoryBookmarkButtonProps {
  storyId: string;
  initialBookmarked: boolean;
  isAuthenticated: boolean;
  signInHref: string;
  labels: StoryBookmarkButtonLabels;
  className?: string;

  /*
   * Used for compact controls such as the
   * sticky article action rail.
   */
  iconOnly?: boolean;
}

const buttonStyles =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

export function StoryBookmarkButton({
  storyId,
  initialBookmarked,
  isAuthenticated,
  signInHref,
  labels,
  className,
  iconOnly = false,
}: StoryBookmarkButtonProps) {
  const router =
    useRouter();

  const [
    bookmarked,
    setBookmarked,
  ] = useState(
    initialBookmarked
  );

  const [
    pending,
    setPending,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  if (!isAuthenticated) {
    return (
      <Link
        href={signInHref}
        aria-label={labels.signIn}
        title={
          iconOnly
            ? labels.signIn
            : undefined
        }
        className={cn(
          buttonStyles,
          'border-slate-300 bg-white text-slate-900 hover:border-[hsl(var(--color-article-accent))] hover:text-[hsl(var(--color-article-accent))]',
          iconOnly &&
            'h-11 min-h-11 w-11 rounded-full p-0',
          className
        )}
      >
        <Bookmark
          aria-hidden="true"
          className="h-4 w-4 shrink-0"
        />

        {!iconOnly && (
          <span>
            {labels.signIn}
          </span>
        )}
      </Link>
    );
  }

  async function handleToggle() {
    if (pending) {
      return;
    }

    setPending(true);
    setError(null);

    const nextBookmarked =
      !bookmarked;

    try {
      const response =
        await fetch(
          `/api/bookmarks/stories/${encodeURIComponent(
            storyId
          )}`,
          {
            method:
              nextBookmarked
                ? 'POST'
                : 'DELETE',

            headers: {
              Accept:
                'application/json',
            },
          }
        );

      const payload =
        (await response
          .json()
          .catch(() => null)) as
          | {
              bookmarked?: boolean;
              error?: string;
            }
          | null;

      if (
        response.status ===
        401
      ) {
        window.location.assign(
          signInHref
        );

        return;
      }

      if (!response.ok) {
        throw new Error(
          payload?.error ??
            labels.error
        );
      }

      setBookmarked(
        payload?.bookmarked ??
          nextBookmarked
      );

      router.refresh();
    } catch (requestError) {
      console.error(
        'Unable to update story bookmark:',
        requestError
      );

      setError(
        labels.error
      );
    } finally {
      setPending(false);
    }
  }

  const currentLabel =
    pending
      ? labels.updating
      : bookmarked
        ? labels.saved
        : labels.save;

  return (
    <div
      className={cn(
        'inline-flex flex-col gap-1.5',
        iconOnly
          ? 'items-center'
          : 'items-start'
      )}
    >
      <button
        type="button"
        aria-pressed={bookmarked}
        aria-label={
          bookmarked
            ? labels.remove
            : labels.save
        }
        title={
          iconOnly
            ? bookmarked
              ? labels.remove
              : labels.save
            : undefined
        }
        disabled={pending}
        onClick={
          handleToggle
        }
        className={cn(
          buttonStyles,

          bookmarked
            ? 'border-[hsl(var(--color-article-accent))] bg-[hsl(var(--color-article-accent))] text-white hover:opacity-90'
            : 'border-slate-300 bg-white text-slate-900 hover:border-[hsl(var(--color-article-accent))] hover:text-[hsl(var(--color-article-accent))]',

          iconOnly &&
            'h-11 min-h-11 w-11 rounded-full p-0',

          className
        )}
      >
        {pending ? (
          <LoaderCircle
            aria-hidden="true"
            className="h-4 w-4 shrink-0 animate-spin"
          />
        ) : (
          <Bookmark
            aria-hidden="true"
            className="h-4 w-4 shrink-0"
            fill={
              bookmarked
                ? 'currentColor'
                : 'none'
            }
          />
        )}

        {!iconOnly && (
          <span>
            {currentLabel}
          </span>
        )}
      </button>

      {error ? (
        <p
          role="status"
          className="
            max-w-32
            text-center
            text-xs
            font-medium
            text-breaking
          "
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}