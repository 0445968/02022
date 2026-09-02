import 'server-only';

import type {
  AccessLevel,
  StoryLanguage,
} from '@/lib/db/database.types';

import {
  getDataClient,
} from '@/lib/db/supabase-data-access';

export interface SavedStorySummary {
  id: string;
  slug: string;
  headline: string;
  summary: string | null;
  language: StoryLanguage;
  accessLevel: AccessLevel;
  publishedAt: string | null;
  updatedAt: string;

  primaryCategory: {
    id: string;
    slug: string;
    nameEn: string;
    nameEs: string;
  } | null;

  featuredImage: {
    id: string;
    url: string;
    altText: string;
  } | null;
}

export interface SavedStoryItem {
  bookmarkId: string;
  savedAt: string;
  story: SavedStorySummary;
}

export interface SavedStoriesPage {
  items: SavedStoryItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

interface RawCategory {
  id: string;
  slug: string;
  name_en: string;
  name_es: string;
}

interface RawFeaturedImage {
  id: string;
  url: string;
  alt_text: string;
}

interface RawSavedStory {
  id: string;
  slug: string;
  headline: string;
  summary: string | null;
  language: StoryLanguage;
  access_level: AccessLevel;
  published_at: string | null;
  updated_at: string;

  primary_category:
    | RawCategory
    | RawCategory[]
    | null;

  featured_image:
    | RawFeaturedImage
    | RawFeaturedImage[]
    | null;
}

interface RawSavedStoryItem {
  id: string;
  created_at: string;

  story:
    | RawSavedStory
    | RawSavedStory[]
    | null;
}

function firstRelation<T>(
  value:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function mapSavedStoryItem(
  row: RawSavedStoryItem
): SavedStoryItem | null {
  const story =
    firstRelation(
      row.story
    );

  if (!story) {
    return null;
  }

  const primaryCategory =
    firstRelation(
      story.primary_category
    );

  const featuredImage =
    firstRelation(
      story.featured_image
    );

  return {
    bookmarkId:
      row.id,

    savedAt:
      row.created_at,

    story: {
      id:
        story.id,

      slug:
        story.slug,

      headline:
        story.headline,

      summary:
        story.summary,

      language:
        story.language,

      accessLevel:
        story.access_level,

      publishedAt:
        story.published_at,

      updatedAt:
        story.updated_at,

      primaryCategory:
        primaryCategory
          ? {
              id:
                primaryCategory.id,

              slug:
                primaryCategory.slug,

              nameEn:
                primaryCategory.name_en,

              nameEs:
                primaryCategory.name_es,
            }
          : null,

      featuredImage:
        featuredImage
          ? {
              id:
                featuredImage.id,

              url:
                featuredImage.url,

              altText:
                featuredImage.alt_text,
            }
          : null,
    },
  };
}

export async function getSavedStories(
  userId: string,
  options?: {
    page?: number;
    perPage?: number;
  }
): Promise<SavedStoriesPage> {
  const resolvedUserId =
    userId.trim();

  if (!resolvedUserId) {
    throw new Error(
      'User ID is required.'
    );
  }

  const page =
    Math.max(
      1,
      options?.page ?? 1
    );

  const perPage =
    Math.min(
      48,
      Math.max(
        1,
        options?.perPage ?? 12
      )
    );

  const offset =
    (page - 1) *
    perPage;

  const supabase =
    await getDataClient();

  const now =
    new Date().toISOString();

  const {
    data,
    count,
    error,
  } = await supabase
    .from('bookmarks')
    .select(
      `
        id,
        created_at,
        story:stories!inner (
          id,
          slug,
          headline,
          summary,
          language,
          access_level,
          published_at,
          updated_at,
          primary_category:categories!stories_primary_category_id_fkey (
            id,
            slug,
            name_en,
            name_es
          ),
          featured_image:media_assets!stories_featured_image_id_fkey (
            id,
            url,
            alt_text
          )
        )
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
    .eq(
      'story.status',
      'published'
    )
    .lte(
      'story.published_at',
      now
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
      'Unable to load saved stories:',
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
      `Unable to load saved stories: ${error.message}`
    );
  }

  const items =
    (
      (
        data ??
        []
      ) as unknown as RawSavedStoryItem[]
    )
      .map(
        mapSavedStoryItem
      )
      .filter(
        (
          item
        ): item is SavedStoryItem =>
          item !== null
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