import { getDataClient } from '@/lib/db/supabase-data-access';

import type {
  HomepageSlotType,
} from '@/lib/db/database.types';

export interface FrontPageStoryOption {
  id: string;
  slug: string;
  headline: string;
  language: 'en' | 'es';
  publishedAt: string | null;

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

export interface HomepagePlacement {
  id: string;
  slot: HomepageSlotType;
  position: number;

  categoryId: string | null;

  startsAt: string | null;
  endsAt: string | null;

  active: boolean;

  createdBy: string | null;
  updatedBy: string | null;

  createdAt: string;
  updatedAt: string;

  story: FrontPageStoryOption;
}

export interface BreakingNewsItem {
  id: string;
  headline: string;

  storyId: string | null;
  externalUrl: string | null;

  active: boolean;
  position: number;

  startsAt: string | null;
  endsAt: string | null;

  createdBy: string | null;
  updatedBy: string | null;

  createdAt: string;
  updatedAt: string;

  story: {
    id: string;
    slug: string;
    headline: string;
    language: 'en' | 'es';
  } | null;
}

export interface FrontPageData {
  slots: HomepagePlacement[];
  breakingNews: BreakingNewsItem[];
}

export interface SetHomepagePlacementInput {
  slot: HomepageSlotType;
  storyId: string;

  position?: number;

  categoryId?: string | null;

  startsAt?: string | null;
  endsAt?: string | null;

  active?: boolean;

  userId?: string | null;
}

export interface UpdateHomepagePlacementInput {
  slot?: HomepageSlotType;
  storyId?: string;

  position?: number;

  categoryId?: string | null;

  startsAt?: string | null;
  endsAt?: string | null;

  active?: boolean;

  userId?: string | null;
}

export interface CreateBreakingNewsInput {
  headline: string;

  storyId?: string | null;
  externalUrl?: string | null;

  active?: boolean;
  position?: number;

  startsAt?: string | null;
  endsAt?: string | null;

  userId?: string | null;
}

export interface UpdateBreakingNewsInput {
  headline?: string;

  storyId?: string | null;
  externalUrl?: string | null;

  active?: boolean;
  position?: number;

  startsAt?: string | null;
  endsAt?: string | null;

  userId?: string | null;
}

type RawStory = {
  id: string;
  slug: string;
  headline: string;
  language: 'en' | 'es';
  published_at: string | null;

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

type RawHomepagePlacement = {
  id: string;
  slot: HomepageSlotType;
  position: number;

  category_id: string | null;

  starts_at: string | null;
  ends_at: string | null;

  active: boolean;

  created_by: string | null;
  updated_by: string | null;

  created_at: string;
  updated_at: string;

  story:
    | RawStory
    | RawStory[]
    | null;
};

type RawBreakingNews = {
  id: string;
  headline: string;

  story_id: string | null;
  external_url: string | null;

  active: boolean;
  position: number;

  starts_at: string | null;
  ends_at: string | null;

  created_by: string | null;
  updated_by: string | null;

  created_at: string;
  updated_at: string;

  story:
    | {
        id: string;
        slug: string;
        headline: string;
        language: 'en' | 'es';
      }
    | {
        id: string;
        slug: string;
        headline: string;
        language: 'en' | 'es';
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

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function mapStory(
  raw: RawStory
): FrontPageStoryOption {
  const category =
    firstRelation(
      raw.primary_category
    );

  const image =
    firstRelation(
      raw.featured_image
    );

  return {
    id: raw.id,
    slug: raw.slug,
    headline: raw.headline,
    language: raw.language,
    publishedAt:
      raw.published_at,

    primaryCategory: category
      ? {
          id: category.id,
          slug: category.slug,
          nameEn:
            category.name_en,
          nameEs:
            category.name_es,
        }
      : null,

    featuredImage: image
      ? {
          id: image.id,
          url: image.url,
          altText:
            image.alt_text,
        }
      : null,
  };
}

function mapHomepagePlacement(
  raw: RawHomepagePlacement
): HomepagePlacement | null {
  const story =
    firstRelation(raw.story);

  if (!story) {
    return null;
  }

  return {
    id: raw.id,
    slot: raw.slot,
    position: raw.position,

    categoryId:
      raw.category_id,

    startsAt:
      raw.starts_at,

    endsAt:
      raw.ends_at,

    active: raw.active,

    createdBy:
      raw.created_by,

    updatedBy:
      raw.updated_by,

    createdAt:
      raw.created_at,

    updatedAt:
      raw.updated_at,

    story:
      mapStory(story),
  };
}

function mapBreakingNews(
  raw: RawBreakingNews
): BreakingNewsItem {
  const story =
    firstRelation(raw.story);

  return {
    id: raw.id,
    headline:
      raw.headline,

    storyId:
      raw.story_id,

    externalUrl:
      raw.external_url,

    active:
      raw.active,

    position:
      raw.position,

    startsAt:
      raw.starts_at,

    endsAt:
      raw.ends_at,

    createdBy:
      raw.created_by,

    updatedBy:
      raw.updated_by,

    createdAt:
      raw.created_at,

    updatedAt:
      raw.updated_at,

    story: story
      ? {
          id: story.id,
          slug: story.slug,
          headline:
            story.headline,
          language:
            story.language,
        }
      : null,
  };
}

/**
 * Returns every homepage placement visible to the current
 * database role.
 *
 * During DEV_AUTH_BYPASS this includes inactive and future
 * placements because the temporary RLS policy allows them.
 *
 * In production, editors can see all placements while anonymous
 * visitors only see currently active/public placements.
 */
export async function getHomepageSlots(): Promise<
  HomepagePlacement[]
> {
  const supabase =
    await getDataClient();

  const {
    data,
    error,
  } = await supabase
    .from('homepage_slots')
    .select(`
      id,
      slot,
      position,
      category_id,
      starts_at,
      ends_at,
      active,
      created_by,
      updated_by,
      created_at,
      updated_at,
      story:stories!homepage_slots_story_id_fkey (
        id,
        slug,
        headline,
        language,
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
      )
    `)
    .order(
      'slot',
      {
        ascending: true,
      }
    )
    .order(
      'position',
      {
        ascending: true,
      }
    );

    if (error) {
        console.error(
          'Failed to load homepage slots:',
          {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          }
        );
      
        throw new Error(
          `Unable to load homepage placements: ${error.message}`
        );
      }

  return (
    (data ?? []) as unknown as
      RawHomepagePlacement[]
  )
    .map(
      mapHomepagePlacement
    )
    .filter(
      (
        item
      ): item is HomepagePlacement =>
        item !== null
    );
}

/**
 * Returns placements for one specific homepage slot.
 */
export async function getHomepageSlot(
  slot: HomepageSlotType
): Promise<
  HomepagePlacement[]
> {
  const all =
    await getHomepageSlots();

  return all.filter(
    (placement) =>
      placement.slot ===
      slot
  );
}

/**
 * Loads active/current homepage placements for public rendering.
 *
 * We filter in application code as well as relying on RLS.
 * This makes development-bypass rendering behave like production
 * even while anonymous CRUD is temporarily enabled.
 */
export async function getPublicHomepageSlots(): Promise<
  HomepagePlacement[]
> {
  const slots =
    await getHomepageSlots();

  const now =
    Date.now();

  return slots.filter(
    (placement) => {
      if (
        !placement.active
      ) {
        return false;
      }

      if (
        placement.startsAt
      ) {
        const start =
          new Date(
            placement.startsAt
          ).getTime();

        if (
          Number.isFinite(start) &&
          start > now
        ) {
          return false;
        }
      }

      if (
        placement.endsAt
      ) {
        const end =
          new Date(
            placement.endsAt
          ).getTime();

        if (
          Number.isFinite(end) &&
          end <= now
        ) {
          return false;
        }
      }

      return true;
    }
  );
}

/**
 * Creates a new homepage placement.
 */
export async function setHomepageSlot(
  input: SetHomepagePlacementInput
): Promise<
  HomepagePlacement
> {
  const supabase =
    await getDataClient();

  const {
    data,
    error,
  } = await supabase
    .from('homepage_slots')
    .insert({
      slot:
        input.slot,

      story_id:
        input.storyId,

      position:
        input.position ?? 0,

      category_id:
        input.categoryId ??
        null,

      starts_at:
        input.startsAt ??
        null,

      ends_at:
        input.endsAt ??
        null,

      active:
        input.active ?? true,

      created_by:
        input.userId ??
        null,

      updated_by:
        input.userId ??
        null,
    })
    .select(`
      id,
      slot,
      position,
      category_id,
      starts_at,
      ends_at,
      active,
      created_by,
      updated_by,
      created_at,
      updated_at,
      story:stories!homepage_slots_story_id_fkey (
        id,
        slug,
        headline,
        language,
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
      )
    `)
    .single();

  if (
    error ||
    !data
  ) {
    console.error(
      'Failed to create homepage placement:',
      error
    );

    throw new Error(
      error?.message ??
        'Unable to create homepage placement.'
    );
  }

  const mapped =
    mapHomepagePlacement(
      data as unknown as RawHomepagePlacement
    );

  if (!mapped) {
    throw new Error(
      'Homepage placement was created without a valid story.'
    );
  }

  return mapped;
}

/**
 * Updates an existing homepage placement.
 */
export async function updateHomepagePlacement(
  id: string,
  input: UpdateHomepagePlacementInput
): Promise<
  HomepagePlacement
> {
  const supabase =
    await getDataClient();

  const update: Record<
    string,
    unknown
  > = {};

  if (
    input.slot !==
    undefined
  ) {
    update.slot =
      input.slot;
  }

  if (
    input.storyId !==
    undefined
  ) {
    update.story_id =
      input.storyId;
  }

  if (
    input.position !==
    undefined
  ) {
    update.position =
      input.position;
  }

  if (
    input.categoryId !==
    undefined
  ) {
    update.category_id =
      input.categoryId;
  }

  if (
    input.startsAt !==
    undefined
  ) {
    update.starts_at =
      input.startsAt;
  }

  if (
    input.endsAt !==
    undefined
  ) {
    update.ends_at =
      input.endsAt;
  }

  if (
    input.active !==
    undefined
  ) {
    update.active =
      input.active;
  }

  if (
    input.userId !==
    undefined
  ) {
    update.updated_by =
      input.userId;
  }

  const {
    data,
    error,
  } = await supabase
    .from('homepage_slots')
    .update(update)
    .eq('id', id)
    .select(`
      id,
      slot,
      position,
      category_id,
      starts_at,
      ends_at,
      active,
      created_by,
      updated_by,
      created_at,
      updated_at,
      story:stories!homepage_slots_story_id_fkey (
        id,
        slug,
        headline,
        language,
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
      )
    `)
    .single();

  if (
    error ||
    !data
  ) {
    console.error(
      'Failed to update homepage placement:',
      error
    );

    throw new Error(
      error?.message ??
        'Unable to update homepage placement.'
    );
  }

  const mapped =
    mapHomepagePlacement(
      data as unknown as RawHomepagePlacement
    );

  if (!mapped) {
    throw new Error(
      'Homepage placement is missing its story.'
    );
  }

  return mapped;
}

/**
 * Removes one homepage placement.
 */
export async function removeHomepagePlacement(
  id: string
): Promise<void> {
  const supabase =
    await getDataClient();

  const {
    error,
  } = await supabase
    .from('homepage_slots')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(
      'Failed to remove homepage placement:',
      error
    );

    throw new Error(
      error.message ||
        'Unable to remove homepage placement.'
    );
  }
}

/**
 * Replaces a single-position homepage slot.
 *
 * Ideal for:
 * - lead
 * - top_left
 * - top_right
 * - latest_feature
 * - video_feature
 *
 * Existing active placements for that slot/position are removed first.
 */
export async function replaceHomepageSlot(
  input: SetHomepagePlacementInput
): Promise<
  HomepagePlacement
> {
  const supabase =
    await getDataClient();

  const position =
    input.position ?? 0;

  const {
    error: deleteError,
  } = await supabase
    .from('homepage_slots')
    .delete()
    .eq(
      'slot',
      input.slot
    )
    .eq(
      'position',
      position
    );

  if (
    deleteError
  ) {
    console.error(
      'Failed to clear homepage slot:',
      deleteError
    );

    throw new Error(
      deleteError.message ||
        'Unable to clear homepage slot.'
    );
  }

  return setHomepageSlot({
    ...input,
    position,
  });
}

/**
 * Updates ordering for multiple existing placements.
 */
export async function reorderHomepagePlacements(
  placements: Array<{
    id: string;
    position: number;
  }>,
  userId?: string | null
): Promise<void> {
  const supabase =
    await getDataClient();

  for (
    const placement of
    placements
  ) {
    const {
      error,
    } = await supabase
      .from('homepage_slots')
      .update({
        position:
          placement.position,

        updated_by:
          userId ?? null,
      })
      .eq(
        'id',
        placement.id
      );

    if (error) {
      console.error(
        'Failed to reorder homepage placement:',
        error
      );

      throw new Error(
        error.message ||
          'Unable to reorder homepage placements.'
      );
    }
  }
}

/**
 * Stories available to the front-page editor.
 *
 * Only published stories should normally be placed on the public homepage.
 */
export async function getFrontPageStoryOptions(
  search?: string,
  limit = 100
): Promise<
  FrontPageStoryOption[]
> {
  const supabase =
    await getDataClient();

  let query =
    supabase
      .from('stories')
      .select(`
        id,
        slug,
        headline,
        language,
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
      .not(
        'published_at',
        'is',
        null
      )
      .lte(
        'published_at',
        new Date().toISOString()
      )
      .order(
        'published_at',
        {
          ascending:
            false,
        }
      )
      .limit(limit);

  const trimmedSearch =
    search?.trim();

  if (
    trimmedSearch
  ) {
    query =
      query.ilike(
        'headline',
        `%${trimmedSearch}%`
      );
  }

  const {
    data,
    error,
  } =
    await query;

  if (error) {
    console.error(
      'Failed to load front-page story options:',
      error
    );

    throw new Error(
      'Unable to load available stories.'
    );
  }

  return (
    (data ?? []) as unknown as
      RawStory[]
  ).map(mapStory);
}

/**
 * Loads every breaking-news alert visible to the current role.
 */
export async function getBreakingNews(): Promise<
  BreakingNewsItem[]
> {
  const supabase =
    await getDataClient();

  const {
    data,
    error,
  } = await supabase
    .from('breaking_news')
    .select(`
      id,
      headline,
      story_id,
      external_url,
      active,
      position,
      starts_at,
      ends_at,
      created_by,
      updated_by,
      created_at,
      updated_at,
      story:stories!breaking_news_story_id_fkey (
        id,
        slug,
        headline,
        language
      )
    `)
    .order(
      'position',
      {
        ascending: true,
      }
    )
    .order(
      'created_at',
      {
        ascending: false,
      }
    );

  if (error) {
    console.error(
      'Failed to load breaking news:',
      error
    );

    throw new Error(
      'Unable to load breaking news.'
    );
  }

  return (
    (data ?? []) as unknown as
      RawBreakingNews[]
  ).map(
    mapBreakingNews
  );
}

/**
 * Public breaking-news list.
 *
 * This explicitly applies schedule/active checks so development bypass
 * behaves like production on the public site.
 */
export async function getPublicBreakingNews(): Promise<
  BreakingNewsItem[]
> {
  const items =
    await getBreakingNews();

  const now =
    Date.now();

  return items.filter(
    (item) => {
      if (!item.active) {
        return false;
      }

      if (
        item.startsAt
      ) {
        const start =
          new Date(
            item.startsAt
          ).getTime();

        if (
          Number.isFinite(start) &&
          start > now
        ) {
          return false;
        }
      }

      if (
        item.endsAt
      ) {
        const end =
          new Date(
            item.endsAt
          ).getTime();

        if (
          Number.isFinite(end) &&
          end <= now
        ) {
          return false;
        }
      }

      return true;
    }
  );
}

/**
 * Creates a breaking-news alert.
 */
export async function createBreakingNews(
  input: CreateBreakingNewsInput
): Promise<
  BreakingNewsItem
> {
  const headline =
    input.headline.trim();

  if (!headline) {
    throw new Error(
      'Breaking-news headline is required.'
    );
  }

  const supabase =
    await getDataClient();

  const {
    data,
    error,
  } = await supabase
    .from('breaking_news')
    .insert({
      headline,

      story_id:
        input.storyId ??
        null,

      external_url:
        input.externalUrl?.trim() ||
        null,

      active:
        input.active ?? true,

      position:
        input.position ?? 0,

      starts_at:
        input.startsAt ??
        null,

      ends_at:
        input.endsAt ??
        null,

      created_by:
        input.userId ??
        null,

      updated_by:
        input.userId ??
        null,
    })
    .select(`
      id,
      headline,
      story_id,
      external_url,
      active,
      position,
      starts_at,
      ends_at,
      created_by,
      updated_by,
      created_at,
      updated_at,
      story:stories!breaking_news_story_id_fkey (
        id,
        slug,
        headline,
        language
      )
    `)
    .single();

  if (
    error ||
    !data
  ) {
    console.error(
      'Failed to create breaking news:',
      error
    );

    throw new Error(
      error?.message ??
        'Unable to create breaking-news alert.'
    );
  }

  return mapBreakingNews(
    data as unknown as RawBreakingNews
  );
}

/**
 * Updates a breaking-news alert.
 */
export async function updateBreakingNews(
  id: string,
  input: UpdateBreakingNewsInput
): Promise<
  BreakingNewsItem
> {
  const supabase =
    await getDataClient();

  const update: Record<
    string,
    unknown
  > = {};

  if (
    input.headline !==
    undefined
  ) {
    const headline =
      input.headline.trim();

    if (!headline) {
      throw new Error(
        'Breaking-news headline cannot be empty.'
      );
    }

    update.headline =
      headline;
  }

  if (
    input.storyId !==
    undefined
  ) {
    update.story_id =
      input.storyId;
  }

  if (
    input.externalUrl !==
    undefined
  ) {
    update.external_url =
      input.externalUrl?.trim() ||
      null;
  }

  if (
    input.active !==
    undefined
  ) {
    update.active =
      input.active;
  }

  if (
    input.position !==
    undefined
  ) {
    update.position =
      input.position;
  }

  if (
    input.startsAt !==
    undefined
  ) {
    update.starts_at =
      input.startsAt;
  }

  if (
    input.endsAt !==
    undefined
  ) {
    update.ends_at =
      input.endsAt;
  }

  if (
    input.userId !==
    undefined
  ) {
    update.updated_by =
      input.userId;
  }

  const {
    data,
    error,
  } = await supabase
    .from('breaking_news')
    .update(update)
    .eq('id', id)
    .select(`
      id,
      headline,
      story_id,
      external_url,
      active,
      position,
      starts_at,
      ends_at,
      created_by,
      updated_by,
      created_at,
      updated_at,
      story:stories!breaking_news_story_id_fkey (
        id,
        slug,
        headline,
        language
      )
    `)
    .single();

  if (
    error ||
    !data
  ) {
    console.error(
      'Failed to update breaking news:',
      error
    );

    throw new Error(
      error?.message ??
        'Unable to update breaking-news alert.'
    );
  }

  return mapBreakingNews(
    data as unknown as RawBreakingNews
  );
}

/**
 * Removes a breaking-news alert.
 */
export async function deleteBreakingNews(
  id: string
): Promise<void> {
  const supabase =
    await getDataClient();

  const {
    error,
  } = await supabase
    .from('breaking_news')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(
      'Failed to delete breaking news:',
      error
    );

    throw new Error(
      error.message ||
        'Unable to delete breaking-news alert.'
    );
  }
}

/**
 * Convenience loader for the public homepage.
 */
export async function getFrontPage(): Promise<
  FrontPageData
> {
  const [
    slots,
    breakingNews,
  ] =
    await Promise.all([
      getPublicHomepageSlots(),
      getPublicBreakingNews(),
    ]);

  return {
    slots,
    breakingNews,
  };
}