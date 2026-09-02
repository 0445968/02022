import 'server-only';

import { getDataClient } from '@/lib/db/supabase-data-access';

export interface StoryBookmark {
  id: string;
  userId: string;
  storyId: string;
  createdAt: string;
}

function requireIdentifier(
  value: string,
  label: string
): string {
  const identifier = value.trim();

  if (!identifier) {
    throw new Error(
      `${label} is required.`
    );
  }

  return identifier;
}

function mapStoryBookmark(
  row: Record<string, unknown>
): StoryBookmark {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    storyId: row.story_id as string,
    createdAt: row.created_at as string,
  };
}

export async function getStoryBookmarks(
  userId: string
): Promise<StoryBookmark[]> {
  const resolvedUserId = requireIdentifier(
    userId,
    'User ID'
  );

  const supabase = await getDataClient();

  const { data, error } = await supabase
    .from('bookmarks')
    .select(
      'id, user_id, story_id, created_at'
    )
    .eq('user_id', resolvedUserId)
    .order('created_at', {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Unable to load bookmarks: ${error.message}`
    );
  }

  return (data ?? []).map((row) =>
    mapStoryBookmark(
      row as Record<string, unknown>
    )
  );
}

export async function getBookmarkedStoryIds(
  userId: string
): Promise<string[]> {
  const bookmarks =
    await getStoryBookmarks(userId);

  return bookmarks.map(
    (bookmark) => bookmark.storyId
  );
}

export async function getStoryBookmarkCount(
  userId: string
): Promise<number> {
  const resolvedUserId = requireIdentifier(
    userId,
    'User ID'
  );

  const supabase = await getDataClient();

  const { count, error } = await supabase
    .from('bookmarks')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq('user_id', resolvedUserId);

  if (error) {
    throw new Error(
      `Unable to count bookmarks: ${error.message}`
    );
  }

  return count ?? 0;
}

export async function isStoryBookmarked(
  userId: string,
  storyId: string
): Promise<boolean> {
  const resolvedUserId = requireIdentifier(
    userId,
    'User ID'
  );

  const resolvedStoryId = requireIdentifier(
    storyId,
    'Story ID'
  );

  const supabase = await getDataClient();

  const { data, error } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', resolvedUserId)
    .eq('story_id', resolvedStoryId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to check bookmark: ${error.message}`
    );
  }

  return Boolean(data);
}

export async function addStoryBookmark(
  userId: string,
  storyId: string
): Promise<void> {
  const resolvedUserId = requireIdentifier(
    userId,
    'User ID'
  );

  const resolvedStoryId = requireIdentifier(
    storyId,
    'Story ID'
  );

  const supabase = await getDataClient();

  const { error } = await supabase
    .from('bookmarks')
    .insert({
      user_id: resolvedUserId,
      story_id: resolvedStoryId,
    });

  /*
   * PostgreSQL error 23505 means this story was
   * already bookmarked. Treat that as success so
   * repeated requests remain safe.
   */
  if (error && error.code !== '23505') {
    throw new Error(
      `Unable to save bookmark: ${error.message}`
    );
  }
}

export async function removeStoryBookmark(
  userId: string,
  storyId: string
): Promise<void> {
  const resolvedUserId = requireIdentifier(
    userId,
    'User ID'
  );

  const resolvedStoryId = requireIdentifier(
    storyId,
    'Story ID'
  );

  const supabase = await getDataClient();

  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('user_id', resolvedUserId)
    .eq('story_id', resolvedStoryId);

  if (error) {
    throw new Error(
      `Unable to remove bookmark: ${error.message}`
    );
  }
}