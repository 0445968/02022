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
        className={cn(
          buttonStyles,
          'border-slate-300 bg-white text-slate-900 hover:border-primary hover:text-primary',
          className
        )}
      >
        <Bookmark
          aria-hidden="true"
          className="h-4 w-4"
        />

        {labels.signIn}
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

      /*
       * Refresh Server Components so account totals
       * and saved-story lists can reflect the change.
       */
      router.refresh();
    } catch (requestError) {
      console.error(
        'Unable to update story bookmark:',
        requestError
      );

      setError(labels.error);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1.5">
      <button
        type="button"
        aria-pressed={bookmarked}
        aria-label={
          bookmarked
            ? labels.remove
            : labels.save
        }
        disabled={pending}
        onClick={handleToggle}
        className={cn(
          buttonStyles,
          bookmarked
            ? 'border-primary bg-primary text-white hover:bg-deep'
            : 'border-slate-300 bg-white text-slate-900 hover:border-primary hover:text-primary',
          className
        )}
      >
        {pending ? (
          <LoaderCircle
            aria-hidden="true"
            className="h-4 w-4 animate-spin"
          />
        ) : (
          <Bookmark
            aria-hidden="true"
            className="h-4 w-4"
            fill={
              bookmarked
                ? 'currentColor'
                : 'none'
            }
          />
        )}

        {pending
          ? labels.updating
          : bookmarked
            ? labels.saved
            : labels.save}
      </button>

      {error ? (
        <p
          role="status"
          className="text-xs font-medium text-breaking"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}