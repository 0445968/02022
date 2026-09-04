import { getDataClient } from '@/lib/db/supabase-data-access';

import type {
  Database,
  HomepageSlotType,
  Json,
} from '@/lib/db/database.types';

export interface FrontPageStoryOption {
  id: string;
  slug: string;
  headline: string;
  shortTitle: string | null;
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

export interface HomepageLayoutSelection {
  slot: HomepageSlotType;
  position: number;
  categoryId: string | null;
  storyId: string;
}

export interface HomepageLayoutDraft {
  selections: HomepageLayoutSelection[];
  updatedAt: string | null;
}

const HOMEPAGE_SLOTS: HomepageSlotType[] = [
  'lead',
  'top_left',
  'top_right',
  'secondary',
  'lead_support',
  'more_coverage',
  'highlight',
  'world',
  'latest_news',
  'editors_pick',
  'latest_feature',
  'section_feature',
  'video_feature',
  'island_feature',
  'headline_bar',
];

type HomepageSelectionScope =
  | 'front-page'
  | 'headline-bar';

function getHomepageSelectionScope(
  slot: HomepageSlotType
): HomepageSelectionScope {
  if (slot === 'headline_bar') {
    return 'headline-bar';
  }

  return 'front-page';
}

export function homepagePlacementsToSelections(
  placements: HomepagePlacement[]
): HomepageLayoutSelection[] {
  return placements
    .filter((placement) => placement.active)
    .map((placement) => ({
      slot: placement.slot,
      position: placement.position,
      categoryId: placement.categoryId,
      storyId: placement.story.id,
    }));
}

export function normalizeHomepageLayoutSelections(
  value: unknown
): HomepageLayoutSelection[] {
  if (!Array.isArray(value)) {
    throw new Error('Homepage selections must be an array.');
  }

  const storyIdsByScope =
  new Map<
    HomepageSelectionScope,
    Set<string>
  >();

const positions =
  new Set<string>();

  return value.map((item) => {
    if (!item || typeof item !== 'object') {
      throw new Error('Invalid homepage selection.');
    }

    const candidate = item as Record<string, unknown>;
    const slot = candidate.slot;
    const storyId =
      typeof candidate.storyId === 'string'
        ? candidate.storyId.trim()
        : '';
    const position = candidate.position ?? 0;
    const categoryId =
      typeof candidate.categoryId === 'string'
        ? candidate.categoryId.trim() || null
        : null;

    if (
      typeof slot !== 'string' ||
      !HOMEPAGE_SLOTS.includes(slot as HomepageSlotType)
    ) {
      throw new Error('Invalid homepage slot.');
    }

    if (!storyId) {
      throw new Error('Every homepage selection requires a story.');
    }

    if (!Number.isInteger(position) || Number(position) < 0) {
      throw new Error('Invalid homepage position.');
    }

    const scope =
  getHomepageSelectionScope(
    slot as HomepageSlotType
  );

const scopeStoryIds =
  storyIdsByScope.get(scope) ??
  new Set<string>();

if (
  scopeStoryIds.has(
    storyId
  )
) {
  throw new Error(
    scope === 'headline-bar'
      ? 'A story cannot appear more than once in the headline bar.'
      : 'A story cannot appear more than once on the front page.'
  );
}

    const positionKey = `${slot}:${Number(position)}`;
    if (positions.has(positionKey)) {
      throw new Error('A homepage position cannot contain more than one story.');
    }

    scopeStoryIds.add(
      storyId
    );
    
    storyIdsByScope.set(
      scope,
      scopeStoryIds
    );
    
    positions.add(
      positionKey
    );

    return {
      slot: slot as HomepageSlotType,
      position: Number(position),
      categoryId,
      storyId,
    };
  });
}

export async function getHomepageLayoutDraft(): Promise<HomepageLayoutDraft | null> {
  const supabase = await getDataClient();
  const { data, error } = await supabase
    .from('homepage_layout_drafts')
    .select('selections, updated_at')
    .eq('id', 'current')
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load the homepage layout draft: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    selections: normalizeHomepageLayoutSelections(data.selections),
    updatedAt: data.updated_at,
  };
}

export async function saveHomepageLayoutDraft(
  selections: HomepageLayoutSelection[],
  userId: string | null
): Promise<HomepageLayoutDraft> {
  const normalized = normalizeHomepageLayoutSelections(selections);
  const updatedAt = new Date().toISOString();
  const supabase = await getDataClient();
  const { error } = await supabase.from('homepage_layout_drafts').upsert(
    {
      id: 'current',
      selections: normalized as unknown as Json,
      updated_by: userId,
      updated_at: updatedAt,
    },
    { onConflict: 'id' }
  );

  if (error) {
    throw new Error(`Unable to save the homepage layout draft: ${error.message}`);
  }

  return { selections: normalized, updatedAt };
}

export async function publishHomepageLayout(
  selections: HomepageLayoutSelection[],
  userId: string | null
): Promise<void> {
  const normalized = normalizeHomepageLayoutSelections(selections);
  const supabase = await getDataClient();
  const { error } = await supabase.rpc('publish_homepage_layout', {
    p_selections: normalized as unknown as Json,
    p_user_id: userId,
  });

  if (error) {
    throw new Error(`Unable to publish the homepage layout: ${error.message}`);
  }
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
  short_title: string | null;
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

    shortTitle:
      raw.short_title ?? null,

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

async function assertStoryHasNoOtherActivePlacement(
  storyId: string,
  targetSlot: HomepageSlotType,
  targetPosition: number
): Promise<void> {
  const supabase =
    await getDataClient();

  const { data, error } =
    await supabase
      .from('homepage_slots')
      .select('id, slot, position')
      .eq('story_id', storyId)
      .eq('active', true);

  if (error) {
    throw new Error(
      `Unable to validate homepage placement: ${error.message}`
    );
  }

  const conflictingPlacement =
    (data ?? []).find((row) => {
      const placement = row as {
        slot: HomepageSlotType;
        position: number;
      };

      return !(
        placement.slot === targetSlot &&
        placement.position === targetPosition
      );
    });

  if (conflictingPlacement) {
    throw new Error(
      'This story is already assigned elsewhere on the homepage. Remove its existing placement before assigning it again.'
    );
  }
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
        short_title,
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

  await assertStoryHasNoOtherActivePlacement(
    input.storyId,
    input.slot,
    input.position ?? 0
  );

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
        short_title,
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

  const update: Database['public']['Tables']['homepage_slots']['Update'] = {};

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
        short_title,
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

  await assertStoryHasNoOtherActivePlacement(
    input.storyId,
    input.slot,
    position
  );

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
        short_title,
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
 * Returns recent published stories assigned to a category either as their
 * primary category or through the additional story-category relation.
 */
export async function getPublishedStoriesByCategory(
  categorySlug: string,
  limit = 12
): Promise<FrontPageStoryOption[]> {
  const supabase =
    await getDataClient();

  const {
    data: category,
    error: categoryError,
  } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', categorySlug)
    .eq('active', true)
    .maybeSingle();

  if (categoryError) {
    throw new Error(
      `Unable to load the ${categorySlug} category: ${categoryError.message}`
    );
  }

  if (!category) {
    return [];
  }

  const categoryId =
    (category as { id: string }).id;

  const {
    data: relatedRows,
    error: relatedError,
  } = await supabase
    .from('story_categories')
    .select('story_id')
    .eq('category_id', categoryId);

  if (relatedError) {
    throw new Error(
      `Unable to load ${categorySlug} story relationships: ${relatedError.message}`
    );
  }

  const relatedStoryIds =
    (relatedRows ?? []).map(
      (row) =>
        (row as { story_id: string }).story_id
    );

  let query = supabase
    .from('stories')
    .select(`
      id,
      slug,
      headline,
      short_title,
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
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(limit);

  query = relatedStoryIds.length > 0
    ? query.or(
        `primary_category_id.eq.${categoryId},id.in.(${relatedStoryIds.join(',')})`
      )
    : query.eq('primary_category_id', categoryId);

  const { data, error } =
    await query;

  if (error) {
    throw new Error(
      `Unable to load ${categorySlug} stories: ${error.message}`
    );
  }

  return (
    (data ?? []) as unknown as RawStory[]
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

  const update: Database['public']['Tables']['breaking_news']['Update'] = {};

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
