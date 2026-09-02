import 'server-only';

import type {
  CommentStatus,
  Database,
} from '@/lib/db/database.types';

import {
  getDataClient,
} from '@/lib/db/supabase-data-access';

const MAX_COMMENT_LENGTH =
  5000;

type CommentRow =
  Database['public']['Tables']['comments']['Row'];

type PublicProfileRow =
  Database['public']['Views']['reader_public_profiles']['Row'];

export interface PublicCommentAuthor {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface PublicComment {
  id: string;
  storyId: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: PublicCommentAuthor | null;
  replies: PublicComment[];
}

export interface PublicCommentThread {
  comments: PublicComment[];
  total: number;
  hasMore: boolean;
}

export interface ReaderComment {
  id: string;
  storyId: string;
  userId: string | null;
  parentId: string | null;
  body: string;
  status: CommentStatus;
  createdAt: string;
  updatedAt: string;
}

function requireIdentifier(
  value: string,
  label: string
): string {
  const identifier =
    value.trim();

  if (!identifier) {
    throw new Error(
      `${label} is required.`
    );
  }

  return identifier;
}

function normalizeCommentBody(
  value: string
): string {
  const body =
    value.trim();

  if (!body) {
    throw new Error(
      'Comment cannot be empty.'
    );
  }

  if (
    body.length >
    MAX_COMMENT_LENGTH
  ) {
    throw new Error(
      `Comment cannot exceed ${MAX_COMMENT_LENGTH} characters.`
    );
  }

  return body;
}

function mapReaderComment(
  row: CommentRow
): ReaderComment {
  return {
    id:
      row.id,

    storyId:
      row.story_id,

    userId:
      row.user_id,

    parentId:
      row.parent_id,

    body:
      row.body,

    status:
      row.status,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  };
}

async function getPublicProfiles(
  userIds: string[]
): Promise<
  Map<
    string,
    PublicCommentAuthor
  >
> {
  const uniqueUserIds = [
    ...new Set(
      userIds.filter(
        Boolean
      )
    ),
  ];

  if (
    uniqueUserIds.length ===
    0
  ) {
    return new Map();
  }

  const supabase =
    await getDataClient();

  const {
    data,
    error,
  } = await supabase
    .from(
      'reader_public_profiles'
    )
    .select(
      'id, display_name, avatar_url'
    )
    .in(
      'id',
      uniqueUserIds
    );

  if (error) {
    /*
     * Comments can still render with an anonymous author
     * when public profile information is unavailable.
     */
    console.error(
      'Unable to load public comment profiles:',
      {
        message:
          error.message,

        details:
          error.details,

        hint:
          error.hint,

        code:
          error.code,
      }
    );

    return new Map();
  }

  return new Map(
    (
      (
        data ??
        []
      ) as PublicProfileRow[]
    ).map(
      (profile) => [
        profile.id,

        {
          id:
            profile.id,

          displayName:
            profile.display_name,

          avatarUrl:
            profile.avatar_url,
        },
      ]
    )
  );
}

function buildCommentTree(
  rows: CommentRow[],
  profiles: Map<
    string,
    PublicCommentAuthor
  >
): PublicComment[] {
  const commentsById =
    new Map<
      string,
      PublicComment
    >();

  for (const row of rows) {
    commentsById.set(
      row.id,
      {
        id:
          row.id,

        storyId:
          row.story_id,

        parentId:
          row.parent_id,

        body:
          row.body,

        createdAt:
          row.created_at,

        updatedAt:
          row.updated_at,

        author:
          row.user_id
            ? profiles.get(
                row.user_id
              ) ??
              null
            : null,

        replies: [],
      }
    );
  }

  const roots:
    PublicComment[] = [];

  for (const row of rows) {
    const comment =
      commentsById.get(
        row.id
      );

    if (!comment) {
      continue;
    }

    const parent =
      row.parent_id
        ? commentsById.get(
            row.parent_id
          )
        : null;

    if (parent) {
      parent.replies.push(
        comment
      );
    } else {
      /*
       * If a parent was hidden, deleted, or outside the
       * current result limit, keep the visible reply
       * accessible as a top-level comment.
       */
      roots.push(
        comment
      );
    }
  }

  return roots;
}

export async function getPublicCommentsForStory(
  storyId: string,
  options?: {
    limit?: number;
  }
): Promise<PublicCommentThread> {
  const resolvedStoryId =
    requireIdentifier(
      storyId,
      'Story ID'
    );

  const limit =
    Math.min(
      500,
      Math.max(
        1,
        options?.limit ??
          200
      )
    );

  const supabase =
    await getDataClient();

  const {
    data,
    count,
    error,
  } = await supabase
    .from('comments')
    .select(
      `
        id,
        story_id,
        user_id,
        parent_id,
        body,
        status,
        created_at,
        updated_at
      `,
      {
        count:
          'exact',
      }
    )
    .eq(
      'story_id',
      resolvedStoryId
    )
    .eq(
      'status',
      'published'
    )
    .order(
      'created_at',
      {
        ascending:
          true,
      }
    )
    .range(
      0,
      limit - 1
    );

  if (error) {
    console.error(
      'Unable to load public comments:',
      {
        message:
          error.message,

        details:
          error.details,

        hint:
          error.hint,

        code:
          error.code,
      }
    );

    throw new Error(
      `Unable to load comments: ${error.message}`
    );
  }

  const rows =
    (
      data ??
      []
    ) as CommentRow[];

  const profiles =
    await getPublicProfiles(
      rows.flatMap(
        (row) =>
          row.user_id
            ? [
                row.user_id,
              ]
            : []
      )
    );

  const total =
    count ?? 0;

  return {
    comments:
      buildCommentTree(
        rows,
        profiles
      ),

    total,

    hasMore:
      total >
      rows.length,
  };
}

export async function createComment(
  input: {
    storyId: string;
    userId: string;
    parentId?:
      | string
      | null;
    body: string;
  }
): Promise<ReaderComment> {
  const storyId =
    requireIdentifier(
      input.storyId,
      'Story ID'
    );

  const userId =
    requireIdentifier(
      input.userId,
      'User ID'
    );

  const parentId =
    input.parentId
      ? requireIdentifier(
          input.parentId,
          'Parent comment ID'
        )
      : null;

  const body =
    normalizeCommentBody(
      input.body
    );

  const supabase =
    await getDataClient();

  const {
    data,
    error,
  } = await supabase
    .from('comments')
    .insert({
      story_id:
        storyId,

      user_id:
        userId,

      parent_id:
        parentId,

      body,
    })
    .select(
      `
        id,
        story_id,
        user_id,
        parent_id,
        body,
        status,
        created_at,
        updated_at
      `
    )
    .single();

  if (error) {
    console.error(
      'Unable to create comment:',
      {
        message:
          error.message,

        details:
          error.details,

        hint:
          error.hint,

        code:
          error.code,
      }
    );

    throw new Error(
      `Unable to create comment: ${error.message}`
    );
  }

  return mapReaderComment(
    data as CommentRow
  );
}