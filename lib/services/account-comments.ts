import 'server-only';

import type {
  CommentStatus,
  Database,
  StoryLanguage,
  StoryStatus,
} from '@/lib/db/database.types';

import {
  getDataClient,
} from '@/lib/db/supabase-data-access';

const MAX_COMMENT_LENGTH =
  5000;

const DELETED_COMMENT_BODY =
  '[deleted]';

type CommentRow =
  Database['public']['Tables']['comments']['Row'];

interface RawAccountStory {
  id: string;
  slug: string;
  headline: string;
  language: StoryLanguage;
  status: StoryStatus;
}

export interface AccountCommentStory {
  id: string;
  slug: string;
  headline: string;
  language: StoryLanguage;
  status: StoryStatus;
}

export interface AccountCommentItem {
  id: string;
  storyId: string;
  parentId: string | null;
  body: string;
  status: CommentStatus;
  createdAt: string;
  updatedAt: string;
  replyCount: number;
  story: AccountCommentStory | null;
}

export interface AccountCommentsPage {
  items: AccountCommentItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
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

async function loadStories(
  storyIds: string[]
): Promise<
  Map<
    string,
    AccountCommentStory
  >
> {
  const uniqueStoryIds = [
    ...new Set(
      storyIds
    ),
  ];

  if (
    uniqueStoryIds.length ===
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
    .from('stories')
    .select(
      `
        id,
        slug,
        headline,
        language,
        status
      `
    )
    .in(
      'id',
      uniqueStoryIds
    );

  if (error) {
    console.error(
      'Unable to load stories for account comments:',
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
      ) as RawAccountStory[]
    ).map(
      (story) => [
        story.id,

        {
          id:
            story.id,

          slug:
            story.slug,

          headline:
            story.headline,

          language:
            story.language,

          status:
            story.status,
        },
      ]
    )
  );
}

async function loadReplyCounts(
  commentIds: string[]
): Promise<
  Map<
    string,
    number
  >
> {
  if (
    commentIds.length ===
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
    .from('comments')
    .select('parent_id')
    .in(
      'parent_id',
      commentIds
    )
    .eq(
      'status',
      'published'
    );

  if (error) {
    console.error(
      'Unable to load account comment reply counts:',
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

  const counts =
    new Map<
      string,
      number
    >();

  for (
    const row of
      data ?? []
  ) {
    if (
      !row.parent_id
    ) {
      continue;
    }

    counts.set(
      row.parent_id,
      (
        counts.get(
          row.parent_id
        ) ?? 0
      ) + 1
    );
  }

  return counts;
}

export async function getAccountComments(
  userId: string,
  options?: {
    page?: number;
    perPage?: number;
  }
): Promise<AccountCommentsPage> {
  const resolvedUserId =
    requireIdentifier(
      userId,
      'User ID'
    );

  const page =
    Math.max(
      1,
      options?.page ?? 1
    );

  const perPage =
    Math.min(
      50,
      Math.max(
        1,
        options?.perPage ?? 15
      )
    );

  const offset =
    (
      page - 1
    ) *
    perPage;

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
      'user_id',
      resolvedUserId
    )
    .order(
      'created_at',
      {
        ascending:
          false,
      }
    )
    .range(
      offset,
      offset +
        perPage -
        1
    );

  if (error) {
    console.error(
      'Unable to load account comments:',
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
      `Unable to load account comments: ${error.message}`
    );
  }

  const rows =
    (
      data ??
      []
    ) as CommentRow[];

  const [
    stories,
    replyCounts,
  ] = await Promise.all([
    loadStories(
      rows.map(
        (row) =>
          row.story_id
      )
    ),

    loadReplyCounts(
      rows.map(
        (row) =>
          row.id
      )
    ),
  ]);

  const items =
    rows.map(
      (
        row
      ): AccountCommentItem => ({
        id:
          row.id,

        storyId:
          row.story_id,

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

        replyCount:
          replyCounts.get(
            row.id
          ) ?? 0,

        story:
          stories.get(
            row.story_id
          ) ?? null,
      })
    );

  const total =
    count ?? 0;

  return {
    items,
    total,
    page,
    perPage,
    totalPages:
      Math.ceil(
        total /
          perPage
      ),
  };
}

export async function updateOwnComment(
  input: {
    commentId: string;
    userId: string;
    body: string;
  }
): Promise<AccountCommentItem> {
  const commentId =
    requireIdentifier(
      input.commentId,
      'Comment ID'
    );

  const userId =
    requireIdentifier(
      input.userId,
      'User ID'
    );

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
    .update({
      body,

      /*
       * Edited public comments return to moderation
       * rather than changing live immediately.
       */
      status:
        'pending',
    })
    .eq(
      'id',
      commentId
    )
    .eq(
      'user_id',
      userId
    )
    .neq(
      'status',
      'deleted'
    )
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
    .maybeSingle();

  if (error) {
    console.error(
      'Unable to update reader comment:',
      error
    );

    throw new Error(
      `Unable to update comment: ${error.message}`
    );
  }

  if (!data) {
    throw new Error(
      'Comment not found or cannot be edited.'
    );
  }

  const row =
    data as CommentRow;

  return {
    ...mapAccountCommentWithoutRelations(
      row
    ),

    replyCount: 0,
    story: null,
  };
}

export async function deleteOwnComment(
  input: {
    commentId: string;
    userId: string;
  }
): Promise<void> {
  const commentId =
    requireIdentifier(
      input.commentId,
      'Comment ID'
    );

  const userId =
    requireIdentifier(
      input.userId,
      'User ID'
    );

  const supabase =
    await getDataClient();

  const {
    data,
    error,
  } = await supabase
    .from('comments')
    .update({
      /*
       * Remove the reader's stored text while preserving
       * the row for moderation history and reply links.
       */
      body:
        DELETED_COMMENT_BODY,

      status:
        'deleted',
    })
    .eq(
      'id',
      commentId
    )
    .eq(
      'user_id',
      userId
    )
    .neq(
      'status',
      'deleted'
    )
    .select('id')
    .maybeSingle();

  if (error) {
    console.error(
      'Unable to delete reader comment:',
      error
    );

    throw new Error(
      `Unable to delete comment: ${error.message}`
    );
  }

  if (!data) {
    throw new Error(
      'Comment not found or already deleted.'
    );
  }
}

function mapAccountCommentWithoutRelations(
  row: CommentRow
): Omit<
  AccountCommentItem,
  'replyCount' | 'story'
> {
  return {
    id:
      row.id,

    storyId:
      row.story_id,

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