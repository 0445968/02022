'use client';

import {
  useRef,
  useState,
} from 'react';

import Link from 'next/link';

import {
  LoaderCircle,
  MessageSquare,
  Reply,
} from 'lucide-react';

import type {
  PublicComment,
  PublicCommentThread,
} from '@/lib/services/comments';

import type {
  Locale,
} from '@/types';

const MAX_COMMENT_LENGTH =
  5000;

export interface StoryCommentLabels {
  heading: string;
  intro: string;
  signInPrompt: string;
  signInAction: string;
  placeholder: string;
  submit: string;
  submitting: string;
  pendingNotice: string;
  reply: string;
  replyingTo: string;
  cancelReply: string;
  emptyTitle: string;
  emptyDescription: string;
  anonymous: string;
  edited: string;
  charactersRemaining: string;
  loadMore: string;
  loadError: string;
  submitError: string;
}

interface StoryCommentsProps {
  storyId: string;
  locale: Locale;
  initialThread: PublicCommentThread;
  isAuthenticated: boolean;
  signInHref: string;
  labels: StoryCommentLabels;
}

interface ReplyTarget {
  id: string;
  name: string;
}

function replaceToken(
  template: string,
  token: string,
  value: string
): string {
  return template.replace(
    `{${token}}`,
    value
  );
}

function formatCommentDate(
  value: string,
  locale: Locale
): string {
  return new Intl.DateTimeFormat(
    locale === 'es'
      ? 'es-CO'
      : 'en-US',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone:
        'America/Bogota',
    }
  ).format(
    new Date(value)
  );
}

function CommentEntry({
  comment,
  locale,
  isAuthenticated,
  signInHref,
  labels,
  depth,
  onReply,
}: {
  comment: PublicComment;
  locale: Locale;
  isAuthenticated: boolean;
  signInHref: string;
  labels: StoryCommentLabels;
  depth: number;
  onReply: (
    target: ReplyTarget
  ) => void;
}) {
  const authorName =
    comment.author
      ?.displayName ||
    labels.anonymous;

  const initial =
    authorName
      .charAt(0)
      .toUpperCase();

  const wasEdited =
    comment.updatedAt !==
    comment.createdAt;

  return (
    <div
      className={
        depth > 0
          ? 'ml-5 border-l border-border pl-4 sm:ml-10 sm:pl-5'
          : ''
      }
    >
      <article className="border-b border-border py-5 last:border-b-0">
        <header className="flex items-start gap-3">
          {comment.author
            ?.avatarUrl ? (
            <img
              src={
                comment.author
                  .avatarUrl
              }
              alt=""
              className="h-9 w-9 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-deep text-xs font-bold text-white"
            >
              {initial}
            </span>
          )}

          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">
              {authorName}
            </p>

            <p className="mt-0.5 text-xs text-muted-foreground">
              <time
                dateTime={
                  comment.createdAt
                }
              >
                {formatCommentDate(
                  comment.createdAt,
                  locale
                )}
              </time>

              {wasEdited ? (
                <>
                  {' · '}
                  {labels.edited}
                </>
              ) : null}
            </p>
          </div>
        </header>

        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
          {comment.body}
        </p>

        <div className="mt-3">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() =>
                onReply({
                  id:
                    comment.id,

                  name:
                    authorName,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Reply
                aria-hidden="true"
                className="h-3.5 w-3.5"
              />

              {labels.reply}
            </button>
          ) : (
            <Link
              href={
                signInHref
              }
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Reply
                aria-hidden="true"
                className="h-3.5 w-3.5"
              />

              {labels.reply}
            </Link>
          )}
        </div>
      </article>

      {comment.replies.map(
        (reply) => (
          <CommentEntry
            key={
              reply.id
            }
            comment={
              reply
            }
            locale={
              locale
            }
            isAuthenticated={
              isAuthenticated
            }
            signInHref={
              signInHref
            }
            labels={
              labels
            }
            depth={
              depth + 1
            }
            onReply={
              onReply
            }
          />
        )
      )}
    </div>
  );
}

export function StoryComments({
  storyId,
  locale,
  initialThread,
  isAuthenticated,
  signInHref,
  labels,
}: StoryCommentsProps) {
  const textareaRef =
    useRef<HTMLTextAreaElement | null>(
      null
    );

  const [
    thread,
    setThread,
  ] = useState(
    initialThread
  );

  const [
    body,
    setBody,
  ] = useState('');

  const [
    replyTarget,
    setReplyTarget,
  ] = useState<ReplyTarget | null>(
    null
  );

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    loadingMore,
    setLoadingMore,
  ] = useState(false);

  const [
    loadedMaximum,
    setLoadedMaximum,
  ] = useState(false);

  const [
    submitError,
    setSubmitError,
  ] = useState<string | null>(
    null
  );

  const [
    loadError,
    setLoadError,
  ] = useState<string | null>(
    null
  );

  const [
    submitted,
    setSubmitted,
  ] = useState(false);

  const remainingCharacters =
    MAX_COMMENT_LENGTH -
    body.length;

  function beginReply(
    target: ReplyTarget
  ) {
    setReplyTarget(
      target
    );

    setSubmitted(false);
    setSubmitError(null);

    requestAnimationFrame(
      () => {
        textareaRef.current
          ?.focus();
      }
    );
  }

  function cancelReply() {
    setReplyTarget(null);
  }

  async function submitComment(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const normalizedBody =
      body.trim();

    if (
      !normalizedBody ||
      submitting
    ) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitted(false);

    try {
      const response =
        await fetch(
          `/api/stories/${encodeURIComponent(
            storyId
          )}/comments`,
          {
            method:
              'POST',

            headers: {
              Accept:
                'application/json',

              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                body:
                  normalizedBody,

                parentId:
                  replyTarget?.id ??
                  null,
              }),
          }
        );

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
          'Comment request failed'
        );
      }

      setBody('');
      setReplyTarget(null);
      setSubmitted(true);
    } catch (error) {
      console.error(
        'Unable to submit comment:',
        error
      );

      setSubmitError(
        labels.submitError
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function loadMoreComments() {
    if (
      loadingMore ||
      loadedMaximum
    ) {
      return;
    }

    setLoadingMore(true);
    setLoadError(null);

    try {
      const response =
        await fetch(
          `/api/stories/${encodeURIComponent(
            storyId
          )}/comments?limit=500`,
          {
            method:
              'GET',

            headers: {
              Accept:
                'application/json',
            },

            cache:
              'no-store',
          }
        );

      if (!response.ok) {
        throw new Error(
          'Comment request failed'
        );
      }

      const nextThread =
        (await response.json()) as
          PublicCommentThread;

      setThread(
        nextThread
      );

      /*
       * The initial implementation intentionally caps
       * a public thread at 500 records. Cursor-based
       * pagination can replace this when required.
       */
      setLoadedMaximum(
        true
      );
    } catch (error) {
      console.error(
        'Unable to load additional comments:',
        error
      );

      setLoadError(
        labels.loadError
      );
    } finally {
      setLoadingMore(false);
    }
  }

  const canLoadMore =
    thread.hasMore &&
    !loadedMaximum;

  return (
    <section
      id="comments"
      aria-labelledby="comments-heading"
      className="border-t border-border bg-white"
    >
      <div className="container-wide py-8 lg:py-10">
        <div className="mx-auto max-w-2xl">
          <header className="border-b border-border pb-5">
            <div className="flex items-center gap-3">
              <MessageSquare
                aria-hidden="true"
                className="h-5 w-5 text-primary"
              />

              <h2
                id="comments-heading"
                className="font-headline text-2xl font-bold text-deep"
              >
                {labels.heading}

                {thread.total >
                0 ? (
                  <span className="ml-2 text-lg font-normal text-muted-foreground">
                    {thread.total}
                  </span>
                ) : null}
              </h2>
            </div>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {labels.intro}
            </p>
          </header>

          {isAuthenticated ? (
            <form
              onSubmit={
                submitComment
              }
              className="border-b border-border py-5"
            >
              {replyTarget ? (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface-muted px-3 py-2">
                  <p className="text-xs font-semibold text-foreground">
                    {replaceToken(
                      labels.replyingTo,
                      'name',
                      replyTarget.name
                    )}
                  </p>

                  <button
                    type="button"
                    onClick={
                      cancelReply
                    }
                    className="rounded-md px-2 py-1 text-xs font-bold text-primary hover:bg-white"
                  >
                    {
                      labels.cancelReply
                    }
                  </button>
                </div>
              ) : null}

              <label
                htmlFor={`story-comment-${storyId}`}
                className="sr-only"
              >
                {
                  labels.placeholder
                }
              </label>

              <textarea
                ref={
                  textareaRef
                }
                id={`story-comment-${storyId}`}
                value={
                  body
                }
                onChange={(
                  event
                ) =>
                  setBody(
                    event.target
                      .value
                  )
                }
                rows={4}
                maxLength={
                  MAX_COMMENT_LENGTH
                }
                placeholder={
                  labels.placeholder
                }
                disabled={
                  submitting
                }
                className="w-full resize-y rounded-md border border-border bg-white px-3 py-3 text-sm leading-6 text-foreground placeholder:text-muted-foreground focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
              />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {replaceToken(
                    labels.charactersRemaining,
                    'count',
                    String(
                      remainingCharacters
                    )
                  )}
                </p>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !body.trim()
                  }
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-deep px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <LoaderCircle
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin"
                    />
                  ) : null}

                  {submitting
                    ? labels.submitting
                    : labels.submit}
                </button>
              </div>

              {submitted ? (
                <p
                  role="status"
                  className="mt-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-deep"
                >
                  {
                    labels.pendingNotice
                  }
                </p>
              ) : null}

              {submitError ? (
                <p
                  role="alert"
                  className="mt-3 text-sm font-medium text-breaking"
                >
                  {submitError}
                </p>
              ) : null}
            </form>
          ) : (
            <div className="border-b border-border py-5">
              <p className="text-sm text-muted-foreground">
                {
                  labels.signInPrompt
                }
              </p>

              <Link
                href={
                  signInHref
                }
                className="mt-3 inline-flex min-h-10 items-center justify-center rounded-md bg-deep px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {
                  labels.signInAction
                }
              </Link>
            </div>
          )}

          {thread.comments.length ===
          0 ? (
            <div className="py-12 text-center">
              <h3 className="font-headline text-xl font-bold text-deep">
                {
                  labels.emptyTitle
                }
              </h3>

              <p className="mt-2 text-sm text-muted-foreground">
                {
                  labels.emptyDescription
                }
              </p>
            </div>
          ) : (
            <div>
              {thread.comments.map(
                (comment) => (
                  <CommentEntry
                    key={
                      comment.id
                    }
                    comment={
                      comment
                    }
                    locale={
                      locale
                    }
                    isAuthenticated={
                      isAuthenticated
                    }
                    signInHref={
                      signInHref
                    }
                    labels={
                      labels
                    }
                    depth={0}
                    onReply={
                      beginReply
                    }
                  />
                )
              )}
            </div>
          )}

          {canLoadMore ? (
            <div className="border-t border-border pt-5 text-center">
              <button
                type="button"
                onClick={
                  loadMoreComments
                }
                disabled={
                  loadingMore
                }
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-white px-5 py-2 text-sm font-bold text-deep transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingMore ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                ) : null}

                {
                  labels.loadMore
                }
              </button>
            </div>
          ) : null}

          {loadError ? (
            <p
              role="alert"
              className="mt-4 text-center text-sm font-medium text-breaking"
            >
              {loadError}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}