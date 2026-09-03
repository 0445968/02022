import {
  getDataClient,
} from '@/lib/db/supabase-data-access';

import type {
  IslandScope,
} from '@/lib/db/database.types';

export interface HomeStory {
  id: string;
  slug: string;
  headline: string;

  summary: string | null;

  language:
    | 'en'
    | 'es';

  island: IslandScope;

  publishedAt:
    | string
    | null;

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

type RawHomeStory = {
  id: string;
  slug: string;
  headline: string;

  summary:
    | string
    | null;

  language:
    | 'en'
    | 'es';

  island: IslandScope;

  published_at:
    | string
    | null;

  primary_category:
    | {
        id: string;
        slug: string;
        name_en: string;
        name_es: string;
      }
    | {
        id: string;
        slug: string;
        name_en: string;
        name_es: string;
      }[]
    | null;

  featured_image:
    | {
        id: string;
        url: string;
        alt_text: string;
      }
    | {
        id: string;
        url: string;
        alt_text: string;
      }[]
    | null;
};

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

  if (
    Array.isArray(value)
  ) {
    return (
      value[0] ??
      null
    );
  }

  return value;
}

function mapStory(
  raw: RawHomeStory
): HomeStory {
  const category =
    firstRelation(
      raw.primary_category
    );

  const image =
    firstRelation(
      raw.featured_image
    );

  return {
    id:
      raw.id,

    slug:
      raw.slug,

    headline:
      raw.headline,

    summary:
      raw.summary,

    language:
      raw.language,

    island:
      raw.island,

    publishedAt:
      raw.published_at,

    primaryCategory:
      category
        ? {
            id:
              category.id,

            slug:
              category.slug,

            nameEn:
              category.name_en,

            nameEs:
              category.name_es,
          }
        : null,

    featuredImage:
      image
        ? {
            id:
              image.id,

            url:
              image.url,

            altText:
              image.alt_text,
          }
        : null,
  };
}

/**
 * Returns recent published stories for one island.
 *
 * Archipelago-wide stories are intentionally not mixed into these
 * island feeds. They can be used elsewhere on the homepage.
 */
export async function getPublishedStoriesByIsland(
  island:
    | 'san_andres'
    | 'old_providence'
    | 'saint_catalina',
  limit = 4
): Promise<HomeStory[]> {
  const supabase =
    await getDataClient();

  const now =
    new Date().toISOString();

  const {
    data,
    error,
  } = await supabase
    .from('stories')
    .select(`
      id,
      slug,
      headline,
      summary,
      language,
      island,
      published_at,
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
    `)
    .eq(
      'status',
      'published'
    )
    .eq(
      'island',
      island
    )
    .lte(
      'published_at',
      now
    )
    .order(
      'published_at',
      {
        ascending: false,
      }
    )
    .limit(
      limit
    );

  if (error) {
    console.error(
      `Failed to load stories for ${island}:`,
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
      `Unable to load ${island} stories: ${error.message}`
    );
  }

  return (
    (
      data ??
      []
    ) as unknown as RawHomeStory[]
  ).map(
    mapStory
  );
}

/**
 * Loads the three island feeds together.
 */
export async function getAcrossTheIslands(
  limit = 12
) {
  const [
    sanAndres,
    oldProvidence,
    saintCatalina,
  ] =
    await Promise.all([
      getPublishedStoriesByIsland(
        'san_andres',
        limit
      ),

      getPublishedStoriesByIsland(
        'old_providence',
        limit
      ),

      getPublishedStoriesByIsland(
        'saint_catalina',
        limit
      ),
    ]);

  return {
    sanAndres,
    oldProvidence,
    saintCatalina,
  };
}
