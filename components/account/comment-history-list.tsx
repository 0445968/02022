'use client';

import {
  useState,
  type FormEvent,
} from 'react';

import Link from 'next/link';

import {
  ExternalLink,
  LoaderCircle,
  MessageSquare,
  Pencil,
  Trash2,
} from 'lucide-react';

import type {
  CommentStatus,
} from '@/lib/db/database.types';

import {
  localizedPath,
} from '@/lib/i18n/config';

import type {
  AccountCommentItem,
} from '@/lib/services/account-comments';

import {
  cn,
} from '@/lib/utils';

import type {
  Locale,
} from '@/types';

const MAX_COMMENT_LENGTH =
  5000;

export interface CommentHistoryLabels {
  typeComment: string;
  typeReply: string;
  statusLabel: string;
  statusPending: string;
  statusPublished: string;
  statusHidden: string;
  statusDeleted: string;
  storyUnavailable: string;
  replyCountOne: string;
  replyCountMany: string;
  viewThread: string;
  edit: string;
  delete: string;
  save: string;
  cancel: string;
  saving: string;
  deleting: string;
  deleteConfirm: string;
  updatedNotice: string;
  deletedNotice: string;
  updateError: string;
  deleteError: string;
}

interface CommentHistoryListProps {
  initialItems: AccountCommentItem[];
  locale: Locale;
  signInHref: string;
  labels: CommentHistoryLabels;
}

function replaceCount(
  template: string,
  count: number
): string {
  return template.replace(
    '{count}',
    String(count)
  );
}

function formatDate(
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

function statusClassName(
  status: CommentStatus
): string {
  switch (status) {
    case 'published':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';

    case 'pending':
      return 'border-star/20 bg-star/10 text-star';

    case 'hidden':
      return 'border-amber-200 bg-amber-50 text-amber-800';

    case 'deleted':
      return 'border-border bg-surface-muted text-muted-foreground';
  }
}

export function CommentHistoryList({
  initialItems,
  locale,
  signInHref,
  labels,
}: CommentHistoryListProps) {
  const [
    items,
    setItems,
  ] = useState(
    initialItems
  );

  const [
    editingId,
    setEditingId,
  ] = useState<string | null>(
    null
  );

  const [
    draft,
    setDraft,
  ] = useState('');

  const [
    pendingId,
    setPendingId,
  ] = useState<string | null>(
    null
  );

  const [
    notice,
    setNotice,
  ] = useState<{
    commentId: string;
    message: string;
  } | null>(
    null
  );

  const [
    error,
    setError,
  ] = useState<{
    commentId: string;
    message: string;
  } | null>(
    null
  );

  const statusLabels:
    Record<
      CommentStatus,
      string
    > = {
      pending:
        labels.statusPending,

      published:
        labels.statusPublished,

      hidden:
        labels.statusHidden,

      deleted:
        labels.statusDeleted,
    };

  function beginEditing(
    item: AccountCommentItem
  ) {
    setEditingId(
      item.id
    );

    setDraft(
      item.body
    );

    setNotice(null);
    setError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setDraft('');
  }

  async function saveComment(
    event:
      FormEvent<HTMLFormElement>,
    item: AccountCommentItem
  ) {
    event.preventDefault();

    const body =
      draft.trim();

    if (
      !body ||
      body.length >
        MAX_COMMENT_LENGTH ||
      pendingId
    ) {
      return;
    }

    setPendingId(
      item.id
    );

    setError(null);
    setNotice(null);

    try {
      const response =
        await fetch(
          `/api/account/comments/${encodeURIComponent(
            item.id
          )}`,
          {
            method:
              'PATCH',

            headers: {
              Accept:
                'application/json',

              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                body,
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

      const payload =
        (await response
          .json()
          .catch(() => null)) as
          | {
              comment?: {
                body: string;
                status:
                  CommentStatus;
                updatedAt: string;
              };
            }
          | null;

      if (
        !response.ok ||
        !payload?.comment
      ) {
        throw new Error(
          'Unable to update comment'
        );
      }

      setItems(
        (
          currentItems
        ) =>
          currentItems.map(
            (
              currentItem
            ) =>
              currentItem.id ===
              item.id
                ? {
                    ...currentItem,

                    body:
                      payload
                        .comment!
                        .body,

                    status:
                      payload
                        .comment!
                        .status,

                    updatedAt:
                      payload
                        .comment!
                        .updatedAt,
                  }
                : currentItem
          )
      );

      setEditingId(null);
      setDraft('');

      setNotice({
        commentId:
          item.id,

        message:
          labels.updatedNotice,
      });
    } catch (requestError) {
      console.error(
        'Unable to update account comment:',
        requestError
      );

      setError({
        commentId:
          item.id,

        message:
          labels.updateError,
      });
    } finally {
      setPendingId(null);
    }
  }

  async function deleteComment(
    item: AccountCommentItem
  ) {
    if (
      pendingId ||
      !window.confirm(
        labels.deleteConfirm
      )
    ) {
      return;
    }

    setPendingId(
      item.id
    );

    setError(null);
    setNotice(null);

    try {
      const response =
        await fetch(
          `/api/account/comments/${encodeURIComponent(
            item.id
          )}`,
          {
            method:
              'DELETE',

            headers: {
              Accept:
                'application/json',
            },
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
          'Unable to delete comment'
        );
      }

      setItems(
        (
          currentItems
        ) =>
          currentItems.map(
            (
              currentItem
            ) =>
              currentItem.id ===
              item.id
                ? {
                    ...currentItem,

                    body:
                      '',

                    status:
                      'deleted',
                  }
                : currentItem
          )
      );

      if (
        editingId ===
        item.id
      ) {
        cancelEditing();
      }

      setNotice({
        commentId:
          item.id,

        message:
          labels.deletedNotice,
      });
    } catch (requestError) {
      console.error(
        'Unable to delete account comment:',
        requestError
      );

      setError({
        commentId:
          item.id,

        message:
          labels.deleteError,
      });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="divide-y divide-border">
      {items.map(
        (item) => {
          const isEditing =
            editingId ===
            item.id;

          const isPending =
            pendingId ===
            item.id;

          const isDeleted =
            item.status ===
            'deleted';

          const storyHref =
            item.story
              ? `${localizedPath(
                  locale,
                  `/article/${item.story.slug}`
                )}#comments`
              : null;

          const replyLabel =
            item.replyCount ===
            1
              ? labels.replyCountOne
              : replaceCount(
                  labels.replyCountMany,
                  item.replyCount
                );

          return (
            <article
              key={
                item.id
              }
              className="py-6"
            >
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.12em] text-primary">
                      <MessageSquare
                        aria-hidden="true"
                        className="h-3.5 w-3.5"
                      />

                      {item.parentId
                        ? labels.typeReply
                        : labels.typeComment}
                    </span>

                    <span
                      aria-label={`${labels.statusLabel}: ${statusLabels[item.status]}`}
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[11px] font-bold',
                        statusClassName(
                          item.status
                        )
                      )}
                    >
                      {
                        statusLabels[
                          item.status
                        ]
                      }
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-muted-foreground">
                    <time
                      dateTime={
                        item.createdAt
                      }
                    >
                      {formatDate(
                        item.createdAt,
                        locale
                      )}
                    </time>

                    {item.replyCount >
                    0 ? (
                      <>
                        {' · '}
                        {replyLabel}
                      </>
                    ) : null}
                  </p>
                </div>

                {!isDeleted ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        beginEditing(
                          item
                        )
                      }
                      disabled={
                        isPending
                      }
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/5 disabled:opacity-50"
                    >
                      <Pencil
                        aria-hidden="true"
                        className="h-3.5 w-3.5"
                      />

                      {
                        labels.edit
                      }
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteComment(
                          item
                        )
                      }
                      disabled={
                        isPending
                      }
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold text-breaking transition-colors hover:bg-breaking/5 disabled:opacity-50"
                    >
                      {isPending ? (
                        <LoaderCircle
                          aria-hidden="true"
                          className="h-3.5 w-3.5 animate-spin"
                        />
                      ) : (
                        <Trash2
                          aria-hidden="true"
                          className="h-3.5 w-3.5"
                        />
                      )}

                      {isPending
                        ? labels.deleting
                        : labels.delete}
                    </button>
                  </div>
                ) : null}
              </header>

              {isEditing ? (
                <form
                  onSubmit={(
                    event
                  ) =>
                    saveComment(
                      event,
                      item
                    )
                  }
                  className="mt-4"
                >
                  <textarea
                    autoFocus
                    value={
                      draft
                    }
                    onChange={(
                      event
                    ) =>
                      setDraft(
                        event.target
                          .value
                      )
                    }
                    rows={4}
                    maxLength={
                      MAX_COMMENT_LENGTH
                    }
                    disabled={
                      isPending
                    }
                    className="w-full resize-y rounded-md border border-border bg-white px-3 py-3 text-sm leading-6 text-foreground focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
                  />

                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={
                        cancelEditing
                      }
                      disabled={
                        isPending
                      }
                      className="min-h-9 rounded-md border border-border bg-white px-4 py-1.5 text-xs font-bold text-deep hover:border-primary hover:text-primary disabled:opacity-50"
                    >
                      {
                        labels.cancel
                      }
                    </button>

                    <button
                      type="submit"
                      disabled={
                        isPending ||
                        !draft.trim()
                      }
                      className="inline-flex min-h-9 items-center gap-2 rounded-md bg-deep px-4 py-1.5 text-xs font-bold text-white hover:bg-primary disabled:opacity-50"
                    >
                      {isPending ? (
                        <LoaderCircle
                          aria-hidden="true"
                          className="h-3.5 w-3.5 animate-spin"
                        />
                      ) : null}

                      {isPending
                        ? labels.saving
                        : labels.save}
                    </button>
                  </div>
                </form>
              ) : isDeleted ? (
                <p className="mt-4 text-sm italic text-muted-foreground">
                  {
                    labels.statusDeleted
                  }
                </p>
              ) : (
                <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                  {item.body}
                </p>
              )}

              <footer className="mt-4">
                {storyHref &&
                item.story ? (
                  <Link
                    href={
                      storyHref
                    }
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-deep hover:text-primary hover:underline"
                  >
                    <span className="line-clamp-1">
                      {
                        item.story
                          .headline
                      }
                    </span>

                    <ExternalLink
                      aria-hidden="true"
                      className="h-3.5 w-3.5 shrink-0"
                    />
                  </Link>
                ) : (
                  <p className="text-sm font-medium text-muted-foreground">
                    {
                      labels.storyUnavailable
                    }
                  </p>
                )}

                {storyHref ? (
                  <Link
                    href={
                      storyHref
                    }
                    className="mt-2 block text-xs font-bold uppercase tracking-wide text-primary hover:underline"
                  >
                    {
                      labels.viewThread
                    }
                  </Link>
                ) : null}
              </footer>

              {notice?.commentId ===
              item.id ? (
                <p
                  role="status"
                  className="mt-4 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-deep"
                >
                  {
                    notice.message
                  }
                </p>
              ) : null}

              {error?.commentId ===
              item.id ? (
                <p
                  role="alert"
                  className="mt-4 text-sm font-medium text-breaking"
                >
                  {
                    error.message
                  }
                </p>
              ) : null}
            </article>
          );
        }
      )}
    </div>
  );
}