import { getDataClient } from '@/lib/db/supabase-data-access';

import {
  getEditorialProfilesByAccountIds,
} from '@/lib/services/editorial-profiles';

import type {
  AccessLevel,
  Database,
  IslandScope,
  StoryLanguage,
  StoryStatus,
} from '@/lib/db/database.types';

import type {
  Category,
  MediaAsset,
  PublicListResult,
  PublicStoryListItem,
  StoryAuthor,
  StoryCategory,
  StoryEditor,
  StoryListItem,
  StoryTag,
  StoryVersion,
  StoryWithRelations,
  Tag,
} from '@/types/editorial';

/**
 * Server-side data-access layer for stories.
 *
 * All functions use the shared server Supabase
 * client. RLS ultimately controls database access.
 */

const STORY_SELECT = `
  id,
  slug,
  headline,
  subheadline,
  summary,
  body,
  language,
  status,
  access_level,
  author_id,
  editor_id,
  primary_category_id,
  island,
  featured_image_id,
  image_caption,
  image_credit,
  seo_title,
seo_description,
originally_published_at,
published_at,
scheduled_at,
created_by,
  updated_by,
  created_at,
  updated_at
` as const;

interface StoryRow {
  id: string;
  slug: string;
  headline: string;
  subheadline: string | null;
  summary: string | null;

  body: Record<
    string,
    unknown
  >;

  language: StoryLanguage;
  status: StoryStatus;
  access_level: AccessLevel;

  author_id: string | null;
  editor_id: string | null;

  primary_category_id:
    | string
    | null;

  island: IslandScope;

  featured_image_id:
    | string
    | null;

  image_caption:
    | string
    | null;

  image_credit:
    | string
    | null;

  seo_title:
    | string
    | null;

  seo_description:
    | string
    | null;

    originally_published_at:
  | string
  | null;

  published_at:
    | string
    | null;

  scheduled_at:
    | string
    | null;

  created_by:
    | string
    | null;

  updated_by:
    | string
    | null;

  created_at: string;
  updated_at: string;
}

// --------------------------------------------------
// Mapping helpers
// --------------------------------------------------

function mapCategoryRow(
  row: Record<
    string,
    unknown
  >
): Category {
  return {
    id:
      row.id as string,

    slug:
      row.slug as string,

    nameEn:
      row.name_en as string,

    nameEs:
      row.name_es as string,

    descriptionEn:
      (row.description_en as
        | string
        | null) ??
      null,

    descriptionEs:
      (row.description_es as
        | string
        | null) ??
      null,

    active:
      Boolean(
        row.active
      ),

    sortOrder:
      row.sort_order as number,
  };
}

function mapTagRow(
  row: Record<
    string,
    unknown
  >
): Tag {
  return {
    id:
      row.id as string,

    slug:
      row.slug as string,

    name:
      row.name as string,
  };
}

function mapMediaRow(
  row: Record<
    string,
    unknown
  >
): MediaAsset {
  return {
    id:
      row.id as string,

    url:
      row.url as string,

    storagePath:
      row.storage_path as string,

    fileName:
      row.file_name as string,

    mimeType:
      row.mime_type as string,

    width:
      (row.width as
        | number
        | null) ??
      null,

    height:
      (row.height as
        | number
        | null) ??
      null,

    fileSize:
      (row.file_size as
        | number
        | null) ??
      null,

    altText:
      (row.alt_text as string) ??
      '',

    caption:
      (row.caption as
        | string
        | null) ??
      null,

    credit:
      (row.credit as
        | string
        | null) ??
      null,

    uploadedBy:
      row.uploaded_by as string,

    createdAt:
      row.created_at as string,

    updatedAt:
      row.updated_at as string,
  };
}

// --------------------------------------------------
// Public story queries
// --------------------------------------------------

/**
 * Fetches a published story by slug.
 *
 * A story must:
 * - have published status
 * - have a publication date
 * - have a publication date at or before now
 */
export async function getPublishedStoryBySlug(
  slug: string
): Promise<
  StoryWithRelations | null
> {
  const supabase =
    await getDataClient();

  const {
    data: story,
    error,
  } = await supabase
    .from('stories')
    .select(
      STORY_SELECT
    )
    .eq(
      'slug',
      slug
    )
    .eq(
      'status',
      'published'
    )
    .lte(
      'published_at',
      new Date().toISOString()
    )
    .maybeSingle();

  if (error) {
    console.error(
      'Unable to fetch published story:',
      {
        slug,
        code:
          error.code,
        message:
          error.message,
        details:
          error.details,
        hint:
          error.hint,
      }
    );

    return null;
  }

  if (!story) {
    return null;
  }

  return resolveStoryRelations(
    story as StoryRow
  );
}

/**
 * Fetches any story by slug for newsroom preview.
 */
export async function getStoryBySlugForPreview(
  slug: string
): Promise<
  StoryWithRelations | null
> {
  const supabase =
    await getDataClient();

  const {
    data: story,
  } = await supabase
    .from('stories')
    .select(
      STORY_SELECT
    )
    .eq(
      'slug',
      slug
    )
    .maybeSingle();

  if (!story) {
    return null;
  }

  return resolveStoryRelations(
    story as StoryRow
  );
}

/**
 * Fetches a story by ID for the newsroom editor.
 */
export async function getStoryForEditing(
  id: string
): Promise<
  StoryWithRelations | null
> {
  const supabase =
    await getDataClient();

  const {
    data: story,
  } = await supabase
    .from('stories')
    .select(
      STORY_SELECT
    )
    .eq(
      'id',
      id
    )
    .maybeSingle();

  if (!story) {
    return null;
  }

  return resolveStoryRelations(
    story as StoryRow
  );
}

/**
 * Resolves all relationships for one story.
 */
async function resolveStoryRelations(
  story: StoryRow
): Promise<StoryWithRelations> {
  const supabase =
    await getDataClient();

// ==================================================
// Editorial identities
// ==================================================
//
// Story author_id and editor_id still reference account
// profile IDs. Resolve their separate editorial bylines
// without changing those relationships yet.
// ==================================================

const staffAccountIds =
  Array.from(
    new Set(
      [
        story.author_id,
        story.editor_id,
      ].filter(
        (
          id
        ): id is string =>
          Boolean(id)
      )
    )
  );

const legacyProfiles =
  new Map<
    string,
    {
      name:
        | string
        | null;

      editorialTitle:
        | string
        | null;
    }
  >();

if (
  staffAccountIds.length >
  0
) {
  const {
    data:
      profileRows,
    error:
      profileError,
  } = await supabase
    .from(
      'profiles'
    )
    .select(
      `
        id,
        name,
        editorial_title
      `
    )
    .in(
      'id',
      staffAccountIds
    );

  if (profileError) {
    console.error(
      'Unable to load legacy story staff profiles:',
      profileError
    );

    throw new Error(
      `Unable to load story staff: ${profileError.message}`
    );
  }

  for (
    const profile of
      profileRows ?? []
  ) {
    legacyProfiles.set(
      profile.id,
      {
        name:
          profile.name,

        editorialTitle:
          profile
            .editorial_title,
      }
    );
  }
}

const editorialProfiles =
  await getEditorialProfilesByAccountIds(
    staffAccountIds
  );

function resolveEditorialIdentity(
  accountId:
    | string
    | null
): StoryAuthor | null {
  if (!accountId) {
    return null;
  }

  const editorialProfile =
    editorialProfiles.get(
      accountId
    );

  const legacyProfile =
    legacyProfiles.get(
      accountId
    );

  return {
    /**
     * Keep returning the account ID until story foreign
     * keys migrate to editorial-profile IDs.
     */
    id:
      accountId,

    name:
      editorialProfile
        ?.bylineName ??
      legacyProfile
        ?.name ??
      null,

    editorialTitle:
      editorialProfile
        ?.editorialTitle ??
      legacyProfile
        ?.editorialTitle ??
      null,
  };
}

const author:
  | StoryAuthor
  | null =
  resolveEditorialIdentity(
    story.author_id
  );

const editor:
  | StoryEditor
  | null =
  resolveEditorialIdentity(
    story.editor_id
  );

  // Story categories
  const {
    data: catRows,
  } = await supabase
    .from(
      'story_categories'
    )
    .select(
      `
        is_primary,
        categories (
          id,
          slug,
          name_en,
          name_es,
          description_en,
          description_es,
          active,
          sort_order
        )
      `
    )
    .eq(
      'story_id',
      story.id
    );

  const categories:
    StoryCategory[] =
    (catRows ?? [])
      .map(
        (row) => {
          const category =
            (
              row as Record<
                string,
                unknown
              >
            )
              .categories as
              | Record<
                  string,
                  unknown
                >
              | null;

          if (
            !category
          ) {
            return null;
          }

          return {
            id:
              category.id as string,

            slug:
              category.slug as string,

            nameEn:
              category.name_en as string,

            nameEs:
              category.name_es as string,

            isPrimary:
              Boolean(
                (
                  row as Record<
                    string,
                    unknown
                  >
                )
                  .is_primary
              ),
          };
        }
      )
      .filter(
        (
          category
        ): category is StoryCategory =>
          category !==
          null
      );

  // Primary category
  let primaryCategory:
    | Category
    | null =
    null;

  if (
    story.primary_category_id
  ) {
    const {
      data:
        primaryCategoryRow,
    } = await supabase
      .from(
        'categories'
      )
      .select('*')
      .eq(
        'id',
        story.primary_category_id
      )
      .maybeSingle();

    if (
      primaryCategoryRow
    ) {
      primaryCategory =
        mapCategoryRow(
          primaryCategoryRow
        );
    }
  }

  // Tags
  const {
    data: tagRows,
  } = await supabase
    .from(
      'story_tags'
    )
    .select(
      `
        tags (
          id,
          slug,
          name
        )
      `
    )
    .eq(
      'story_id',
      story.id
    );

  const tags:
    StoryTag[] =
    (tagRows ?? [])
      .map(
        (row) => {
          const tag =
            (
              row as Record<
                string,
                unknown
              >
            )
              .tags as
              | Record<
                  string,
                  unknown
                >
              | null;

          if (!tag) {
            return null;
          }

          return mapTagRow(
            tag
          );
        }
      )
      .filter(
        (
          tag
        ): tag is StoryTag =>
          tag !== null
      );

  // Featured image
  let featuredImage:
    | MediaAsset
    | null =
    null;

  if (
    story.featured_image_id
  ) {
    const {
      data:
        imageRow,
    } = await supabase
      .from(
        'media_assets'
      )
      .select('*')
      .eq(
        'id',
        story.featured_image_id
      )
      .maybeSingle();

    if (imageRow) {
      featuredImage =
        mapMediaRow(
          imageRow
        );
    }
  }

  return {
    id:
      story.id,

    slug:
      story.slug,

    headline:
      story.headline,

    subheadline:
      story.subheadline,

    summary:
      story.summary,

    body:
      story.body,

    language:
      story.language,

    status:
      story.status,

    accessLevel:
      story.access_level,

    island:
      story.island,

    author,
    editor,

    primaryCategory,
    categories,
    tags,

    featuredImage,

    imageCaption:
      story.image_caption,

    imageCredit:
      story.image_credit,

    seoTitle:
      story.seo_title,

    seoDescription:
      story.seo_description,

    originallyPublishedAt:
      story.originally_published_at,

    publishedAt:
      story.published_at,

    scheduledAt:
      story.scheduled_at,

    createdAt:
      story.created_at,

    updatedAt:
      story.updated_at,
  };
}

// --------------------------------------------------
// Newsroom list queries
// --------------------------------------------------

export interface ListStoriesParams {
  page?: number;
  perPage?: number;

  search?: string;

  status?:
    | StoryStatus
    | 'all';

  language?:
    | StoryLanguage
    | 'all';

  authorId?:
    | string
    | 'all';

  categoryId?:
    | string
    | 'all';

  island?:
    | IslandScope
    | 'all';

  sortBy?:
    | 'updated_desc'
    | 'updated_asc'
    | 'published_desc'
    | 'headline_asc';
}

export interface ListStoriesResult {
  items: StoryListItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

/**
 * Lists newsroom stories with filtering and pagination.
 */
export async function listStories(
  params:
    ListStoriesParams = {}
): Promise<ListStoriesResult> {
  const supabase =
    await getDataClient();

  const page =
    Math.max(
      1,
      params.page ?? 1
    );

  const perPage =
    Math.min(
      50,
      Math.max(
        1,
        params.perPage ??
          20
      )
    );

  const offset =
    (page - 1) *
    perPage;

  let query =
    supabase
      .from('stories')
      .select(
        `
          id,
          slug,
          headline,
          language,
          status,
          access_level,
          island,
          published_at,
          updated_at,
          author:profiles!stories_author_id_fkey(
            id,
            name
          ),
          editor:profiles!stories_editor_id_fkey(
            id,
            name
          ),
          primary_category:categories!stories_primary_category_id_fkey(
            id,
            slug,
            name_en,
            name_es
          )
        `,
        {
          count:
            'exact',
        }
      );

  if (
    params.search
  ) {
    query =
      query.or(
        `headline.ilike.%${params.search}%,summary.ilike.%${params.search}%`
      );
  }

  if (
    params.status &&
    params.status !==
      'all'
  ) {
    query =
      query.eq(
        'status',
        params.status
      );
  }

  if (
    params.language &&
    params.language !==
      'all'
  ) {
    query =
      query.eq(
        'language',
        params.language
      );
  }

  if (
    params.authorId &&
    params.authorId !==
      'all'
  ) {
    query =
      query.eq(
        'author_id',
        params.authorId
      );
  }

  if (
    params.island &&
    params.island !==
      'all'
  ) {
    query =
      query.eq(
        'island',
        params.island
      );
  }

  if (
    params.categoryId &&
    params.categoryId !==
      'all'
  ) {
    query =
      query.eq(
        'primary_category_id',
        params.categoryId
      );
  }

  switch (
    params.sortBy ??
    'updated_desc'
  ) {
    case 'updated_asc':
      query =
        query.order(
          'updated_at',
          {
            ascending:
              true,
          }
        );
      break;

    case 'published_desc':
      query =
        query.order(
          'published_at',
          {
            ascending:
              false,
            nullsFirst:
              false,
          }
        );
      break;

    case 'headline_asc':
      query =
        query.order(
          'headline',
          {
            ascending:
              true,
          }
        );
      break;

    case 'updated_desc':
    default:
      query =
        query.order(
          'updated_at',
          {
            ascending:
              false,
          }
        );
      break;
  }

  query =
    query.range(
      offset,
      offset +
        perPage -
        1
    );

  const {
    data,
    count,
    error,
  } = await query;

  if (error) {
    console.error(
      'Unable to list stories:',
      error
    );

    return {
      items: [],
      total: 0,
      page,
      perPage,
      totalPages: 0,
    };
  }

  const items:
    StoryListItem[] =
    (data ?? []).map(
      (row) => {
        const r =
          row as Record<
            string,
            unknown
          >;

        const author =
          r.author as
            | Record<
                string,
                unknown
              >
            | null;

        const editor =
          r.editor as
            | Record<
                string,
                unknown
              >
            | null;

        const category =
          r.primary_category as
            | Record<
                string,
                unknown
              >
            | null;

        return {
          id:
            r.id as string,

          slug:
            r.slug as string,

          headline:
            r.headline as string,

          language:
            r.language as StoryLanguage,

          status:
            r.status as StoryStatus,

          accessLevel:
            r.access_level as AccessLevel,

          island:
            r.island as IslandScope,

          authorName:
            (author?.name as
              | string
              | null) ??
            null,

          editorName:
            (editor?.name as
              | string
              | null) ??
            null,

          primaryCategoryNameEn:
            (category?.name_en as
              | string
              | null) ??
            null,

          primaryCategoryNameEs:
            (category?.name_es as
              | string
              | null) ??
            null,

          primaryCategorySlug:
            (category?.slug as
              | string
              | null) ??
            null,

          publishedAt:
            (r.published_at as
              | string
              | null) ??
            null,

          updatedAt:
            r.updated_at as string,
        };
      }
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

// --------------------------------------------------
// Public feeds
// --------------------------------------------------

const PUBLIC_STORY_SELECT = `
  id,
  slug,
  headline,
  summary,
  language,
  island,
  published_at,
  primary_category:categories!stories_primary_category_id_fkey(
    id,
    slug,
    name_en,
    name_es
  ),
  featured_image:media_assets!stories_featured_image_id_fkey(
    id,
    url,
    alt_text
  ),
  author:profiles!stories_author_id_fkey(
    id,
    name
  )
` as const;

async function fetchPublicStories(
  filters: Record<
    string,
    unknown
  >,
  page: number,
  perPage: number
): Promise<PublicListResult> {
  const supabase =
    await getDataClient();

  const offset =
    (page - 1) *
    perPage;

  let query =
    supabase
      .from('stories')
      .select(
        PUBLIC_STORY_SELECT,
        {
          count:
            'exact',
        }
      )
      .eq(
        'status',
        'published'
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
          nullsFirst:
            false,
        }
      )
      .range(
        offset,
        offset +
          perPage -
          1
      );

  for (
    const [
      key,
      value,
    ] of Object.entries(
      filters
    )
  ) {
    query =
      query.eq(
        key,
        value as never
      );
  }

  const {
    data,
    count,
    error,
  } = await query;

  if (error) {
    console.error(
      'Unable to fetch public stories:',
      error
    );

    return {
      items: [],
      total: 0,
      page,
      perPage,
      totalPages: 0,
    };
  }

  const items:
    PublicStoryListItem[] =
    (data ?? []).map(
      (row) => {
        const r =
          row as Record<
            string,
            unknown
          >;

        const category =
          r.primary_category as
            | Record<
                string,
                unknown
              >
            | null;

        const image =
          r.featured_image as
            | Record<
                string,
                unknown
              >
            | null;

        const author =
          r.author as
            | Record<
                string,
                unknown
              >
            | null;

        return {
          id:
            r.id as string,

          slug:
            r.slug as string,

          headline:
            r.headline as string,

          summary:
            (r.summary as
              | string
              | null) ??
            null,

          language:
            r.language as StoryLanguage,

          island:
            r.island as IslandScope,

          publishedAt:
            (r.published_at as
              | string
              | null) ??
            null,

          primaryCategorySlug:
            (category?.slug as
              | string
              | null) ??
            null,

          primaryCategoryNameEn:
            (category?.name_en as
              | string
              | null) ??
            null,

          primaryCategoryNameEs:
            (category?.name_es as
              | string
              | null) ??
            null,

          featuredImageUrl:
            (image?.url as
              | string
              | null) ??
            null,

          featuredImageAlt:
            (image?.alt_text as
              | string
              | null) ??
            null,

          authorName:
            (author?.name as
              | string
              | null) ??
            null,
        };
      }
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

export async function getLatestStories(
  page = 1,
  perPage = 12
): Promise<PublicListResult> {
  return fetchPublicStories(
    {},
    page,
    perPage
  );
}

export async function getPublishedStoriesByCategory(
  categorySlug: string,
  page = 1,
  perPage = 12
): Promise<
  PublicListResult & {
    category:
      | Category
      | null;
  }
> {
  const supabase =
    await getDataClient();

  const {
    data: categoryRow,
  } = await supabase
    .from('categories')
    .select('*')
    .eq(
      'slug',
      categorySlug
    )
    .eq(
      'active',
      true
    )
    .maybeSingle();

  const category =
    categoryRow
      ? mapCategoryRow(
          categoryRow
        )
      : null;

  if (!category) {
    return {
      items: [],
      total: 0,
      page,
      perPage,
      totalPages: 0,
      category: null,
    };
  }

  const result =
    await fetchPublicStories(
      {
        primary_category_id:
          category.id,
      },
      page,
      perPage
    );

  return {
    ...result,
    category,
  };
}

export async function getPublishedStoriesByIsland(
  island: IslandScope,
  page = 1,
  perPage = 12
): Promise<PublicListResult> {
  return fetchPublicStories(
    {
      island,
    },
    page,
    perPage
  );
}

export async function getRelatedStories(
  storyId: string,
  categorySlug:
    | string
    | null,
  limit = 3
): Promise<
  PublicStoryListItem[]
> {
  const supabase =
    await getDataClient();

  let query =
    supabase
      .from('stories')
      .select(
        PUBLIC_STORY_SELECT
      )
      .eq(
        'status',
        'published'
      )
      .lte(
        'published_at',
        new Date().toISOString()
      )
      .neq(
        'id',
        storyId
      )
      .order(
        'published_at',
        {
          ascending:
            false,
          nullsFirst:
            false,
        }
      )
      .limit(
        limit
      );

  if (
    categorySlug
  ) {
    const {
      data: category,
    } = await supabase
      .from(
        'categories'
      )
      .select('id')
      .eq(
        'slug',
        categorySlug
      )
      .maybeSingle();

    if (category) {
      query =
        query.eq(
          'primary_category_id',
          (
            category as Record<
              string,
              unknown
            >
          ).id as string
        );
    }
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    console.error(
      'Unable to fetch related stories:',
      error
    );

    return [];
  }

  return (
    data ?? []
  ).map(
    (row) => {
      const r =
        row as Record<
          string,
          unknown
        >;

      const category =
        r.primary_category as
          | Record<
              string,
              unknown
            >
          | null;

      const image =
        r.featured_image as
          | Record<
              string,
              unknown
            >
          | null;

      const author =
        r.author as
          | Record<
              string,
              unknown
            >
          | null;

      return {
        id:
          r.id as string,

        slug:
          r.slug as string,

        headline:
          r.headline as string,

        summary:
          (r.summary as
            | string
            | null) ??
          null,

        language:
          r.language as StoryLanguage,

        island:
          r.island as IslandScope,

        publishedAt:
          (r.published_at as
            | string
            | null) ??
          null,

        primaryCategorySlug:
          (category?.slug as
            | string
            | null) ??
          null,

        primaryCategoryNameEn:
          (category?.name_en as
            | string
            | null) ??
          null,

        primaryCategoryNameEs:
          (category?.name_es as
            | string
            | null) ??
          null,

        featuredImageUrl:
          (image?.url as
            | string
            | null) ??
          null,

        featuredImageAlt:
          (image?.alt_text as
            | string
            | null) ??
          null,

        authorName:
          (author?.name as
            | string
            | null) ??
          null,
      };
    }
  );
}

// --------------------------------------------------
// Create / update
// --------------------------------------------------

export interface CreateStoryInput {
  headline?: string;
  language?: StoryLanguage;
  authorId?: string;
  createdById: string;
}

/**
 * Creates a minimal draft.
 */
export async function createStory(
  input: CreateStoryInput
): Promise<
  {
    id: string;
    slug: string;
  } | null
> {
  const supabase =
    await getDataClient();

  const headline =
    input.headline?.trim() ??
    '';

  const {
    slugify,
    ensureUniqueSlug,
  } = await import(
    '@/lib/utils/slug'
  );

  const {
    data:
      existingStories,
  } = await supabase
    .from('stories')
    .select('slug')
    .limit(1000);

  const existingSlugs =
    (
      existingStories ??
      []
    ).map(
      (row) =>
        (
          row as Record<
            string,
            unknown
          >
        ).slug as string
    );

  const baseSlug =
    slugify(
      headline
    ) ||
    `story-${Date.now()}`;

  const slug =
    ensureUniqueSlug(
      baseSlug,
      existingSlugs
    );

  const {
    data,
    error,
  } = await supabase
    .from('stories')
    .insert({
      slug,

      headline,

      language:
        input.language ??
        'en',

      status:
        'draft',

      access_level:
        'public',

      island:
        'none',

      author_id:
        input.authorId ??
        input.createdById,

      created_by:
        input.createdById,

      updated_by:
        input.createdById,
    })
    .select(
      'id, slug'
    )
    .single();

  if (
    error ||
    !data
  ) {
    console.error(
      'Unable to create story:',
      error
    );

    return null;
  }

  return {
    id:
      (
        data as Record<
          string,
          unknown
        >
      ).id as string,

    slug:
      (
        data as Record<
          string,
          unknown
        >
      ).slug as string,
  };
}

export interface UpdateStoryInput {
  headline?: string;

  subheadline?:
    | string
    | null;

  summary?:
    | string
    | null;

  body?: Record<
    string,
    unknown
  >;

  language?:
    StoryLanguage;

  status?:
    StoryStatus;

  accessLevel?:
    AccessLevel;

  authorId?:
    | string
    | null;

  editorId?:
    | string
    | null;

  primaryCategoryId?:
    | string
    | null;

  island?:
    IslandScope;

  featuredImageId?:
    | string
    | null;

  imageCaption?:
    | string
    | null;

  imageCredit?:
    | string
    | null;

  seoTitle?:
    | string
    | null;

  seoDescription?:
    | string
    | null;

    originallyPublishedAt?:
  | string
  | null;

  scheduledAt?:
    | string
    | null;

  slug?: string;

  updatedBy: string;

  createVersion?:
    boolean;
}

/**
 * Updates a story and optionally creates
 * a version snapshot.
 *
 * Throws when the database update fails.
 */
export async function updateStory(
  storyId: string,
  input: UpdateStoryInput
): Promise<void> {
  const supabase =
    await getDataClient();

  const update: Database['public']['Tables']['stories']['Update'] = {
      updated_by:
        input.updatedBy,
    };

  if (
    input.headline !==
    undefined
  ) {
    update.headline =
      input.headline;
  }

  if (
    input.subheadline !==
    undefined
  ) {
    update.subheadline =
      input.subheadline;
  }

  if (
    input.summary !==
    undefined
  ) {
    update.summary =
      input.summary;
  }

  if (
    input.body !==
    undefined
  ) {
    update.body =
      input.body;
  }

  if (
    input.language !==
    undefined
  ) {
    update.language =
      input.language;
  }

  if (
    input.status !==
    undefined
  ) {
    update.status =
      input.status;
  }

  if (
    input.accessLevel !==
    undefined
  ) {
    update.access_level =
      input.accessLevel;
  }

  if (
    input.authorId !==
    undefined
  ) {
    update.author_id =
      input.authorId;
  }

  if (
    input.editorId !==
    undefined
  ) {
    update.editor_id =
      input.editorId;
  }

  if (
    input.primaryCategoryId !==
    undefined
  ) {
    update.primary_category_id =
      input.primaryCategoryId;
  }

  if (
    input.island !==
    undefined
  ) {
    update.island =
      input.island;
  }

  if (
    input.featuredImageId !==
    undefined
  ) {
    update.featured_image_id =
      input.featuredImageId;
  }

  if (
    input.imageCaption !==
    undefined
  ) {
    update.image_caption =
      input.imageCaption;
  }

  if (
    input.imageCredit !==
    undefined
  ) {
    update.image_credit =
      input.imageCredit;
  }

  if (
    input.seoTitle !==
    undefined
  ) {
    update.seo_title =
      input.seoTitle;
  }

  if (
    input.seoDescription !==
    undefined
  ) {
    update.seo_description =
      input.seoDescription;
  }

  if (
    input.originallyPublishedAt !==
    undefined
  ) {
    update.originally_published_at =
      input.originallyPublishedAt;
  }
  
  if (
    input.scheduledAt !==
    undefined
  ) {
    update.scheduled_at =
      input.scheduledAt;
  }

  if (
    input.slug !==
    undefined
  ) {
    update.slug =
      input.slug;
  }

/**
 * The actual publication timestamp is server-owned.
 *
 * When a story is published for the first time, assign
 * the current server time. If it was published before,
 * preserve its existing publication timestamp.
 */
if (
  input.status ===
  'published'
) {
  const {
    data:
      existingStory,
    error:
      existingStoryError,
  } = await supabase
    .from(
      'stories'
    )
    .select(
      'published_at'
    )
    .eq(
      'id',
      storyId
    )
    .maybeSingle();

  if (
    existingStoryError
  ) {
    console.error(
      'Unable to read existing publication date:',
      existingStoryError
    );

    throw new Error(
      `Story update failed: ${existingStoryError.message}`
    );
  }

  if (!existingStory) {
    throw new Error(
      'Story could not be found.'
    );
  }

  update.published_at =
    existingStory
      .published_at ??
    new Date()
      .toISOString();
}

  const {
    data,
    error,
  } = await supabase
    .from('stories')
    .update(
      update
    )
    .eq(
      'id',
      storyId
    )
    .select('id')
    .maybeSingle();

  if (error) {
    console.error(
      'Supabase story update failed:',
      {
        storyId,

        code:
          error.code,

        message:
          error.message,

        details:
          error.details,

        hint:
          error.hint,

        update,
      }
    );

    throw new Error(
      `Story update failed: ${error.message}`
    );
  }

  if (!data) {
    console.error(
      'Story update matched no rows:',
      {
        storyId,
        update,
      }
    );

    throw new Error(
      'Story update failed: no story was updated.'
    );
  }

  // Create version snapshot when explicitly requested.
  if (
    input.createVersion
  ) {
    const {
      data:
        currentStory,
      error:
        currentStoryError,
    } = await supabase
      .from('stories')
      .select('*')
      .eq(
        'id',
        storyId
      )
      .maybeSingle();

    if (
      currentStoryError
    ) {
      console.error(
        'Unable to create story version:',
        currentStoryError
      );

      throw new Error(
        `Story version failed: ${currentStoryError.message}`
      );
    }

    if (
      currentStory
    ) {
      const story =
        currentStory as Record<
          string,
          unknown
        >;

      const {
        error:
          versionError,
      } = await supabase
        .from(
          'story_versions'
        )
        .insert({
          story_id:
            storyId,

          headline:
            (story.headline as string) ??
            '',

          subheadline:
            (story.subheadline as
              | string
              | null) ??
            null,

          summary:
            (story.summary as
              | string
              | null) ??
            null,

          body:
            (story.body as Record<
              string,
              unknown
            >) ??
            {},

          author_id:
            (story.author_id as
              | string
              | null) ??
            null,

          editor_id:
            (story.editor_id as
              | string
              | null) ??
            null,

          language:
            (story.language as StoryLanguage) ??
            'en',

          primary_category_id:
            (story.primary_category_id as
              | string
              | null) ??
            null,

          created_by:
            input.updatedBy,
        });

      if (
        versionError
      ) {
        console.error(
          'Unable to save story version:',
          versionError
        );

        throw new Error(
          `Story version failed: ${versionError.message}`
        );
      }
    }
  }
}

// --------------------------------------------------
// Category syncing
// --------------------------------------------------

export async function syncStoryCategories(
  storyId: string,
  categoryIds: string[],
  primaryCategoryId:
    | string
    | null
): Promise<void> {
  const supabase =
    await getDataClient();

  const {
    error:
      deleteError,
  } = await supabase
    .from(
      'story_categories'
    )
    .delete()
    .eq(
      'story_id',
      storyId
    );

  if (deleteError) {
    console.error(
      'Unable to clear story categories:',
      deleteError
    );

    throw new Error(
      `Category sync failed: ${deleteError.message}`
    );
  }

  if (
    categoryIds.length >
    0
  ) {
    const rows =
      categoryIds.map(
        (
          categoryId
        ) => ({
          story_id:
            storyId,

          category_id:
            categoryId,

          is_primary:
            categoryId ===
            primaryCategoryId,
        })
      );

    const {
      error:
        insertError,
    } = await supabase
      .from(
        'story_categories'
      )
      .insert(
        rows
      );

    if (
      insertError
    ) {
      console.error(
        'Unable to save story categories:',
        insertError
      );

      throw new Error(
        `Category sync failed: ${insertError.message}`
      );
    }
  }

  const {
    error:
      primaryError,
  } = await supabase
    .from('stories')
    .update({
      primary_category_id:
        primaryCategoryId,
    })
    .eq(
      'id',
      storyId
    );

  if (
    primaryError
  ) {
    console.error(
      'Unable to update primary category:',
      primaryError
    );

    throw new Error(
      `Category sync failed: ${primaryError.message}`
    );
  }
}

// --------------------------------------------------
// Tag syncing
// --------------------------------------------------

export async function syncStoryTags(
  storyId: string,
  tagIds: string[]
): Promise<void> {
  const supabase =
    await getDataClient();

  const {
    error:
      deleteError,
  } = await supabase
    .from(
      'story_tags'
    )
    .delete()
    .eq(
      'story_id',
      storyId
    );

  if (
    deleteError
  ) {
    console.error(
      'Unable to clear story tags:',
      deleteError
    );

    throw new Error(
      `Tag sync failed: ${deleteError.message}`
    );
  }

  if (
    tagIds.length ===
    0
  ) {
    return;
  }

  const rows =
    tagIds.map(
      (tagId) => ({
        story_id:
          storyId,

        tag_id:
          tagId,
      })
    );

  const {
    error:
      insertError,
  } = await supabase
    .from(
      'story_tags'
    )
    .insert(
      rows
    );

  if (
    insertError
  ) {
    console.error(
      'Unable to save story tags:',
      insertError
    );

    throw new Error(
      `Tag sync failed: ${insertError.message}`
    );
  }
}

// --------------------------------------------------
// Version history
// --------------------------------------------------

export async function getStoryVersions(
  storyId: string
): Promise<
  StoryVersion[]
> {
  const supabase =
    await getDataClient();

  const {
    data,
    error,
  } = await supabase
    .from(
      'story_versions'
    )
    .select(
      `
        id,
        story_id,
        headline,
        subheadline,
        summary,
        body,
        language,
        primary_category_id,
        created_by,
        created_at
      `
    )
    .eq(
      'story_id',
      storyId
    )
    .order(
      'created_at',
      {
        ascending:
          false,
      }
    )
    .limit(50);

  if (
    error ||
    !data
  ) {
    if (error) {
      console.error(
        'Unable to load story versions:',
        error
      );
    }

    return [];
  }

  const creatorIds =
    Array.from(
      new Set(
        data.map(
          (row) =>
            (
              row as Record<
                string,
                unknown
              >
            )
              .created_by as string
        )
      )
    );

  const nameMap =
    new Map<
      string,
      string | null
    >();

  if (
    creatorIds.length >
    0
  ) {
    const {
      data:
        creators,
    } = await supabase
      .from('profiles')
      .select(
        'id, name'
      )
      .in(
        'id',
        creatorIds
      );

    for (
      const creator of
        creators ?? []
    ) {
      const item =
        creator as Record<
          string,
          unknown
        >;

      nameMap.set(
        item.id as string,
        (item.name as
          | string
          | null) ??
          null
      );
    }
  }

  return data.map(
    (row) => {
      const item =
        row as Record<
          string,
          unknown
        >;

      return {
        id:
          item.id as string,

        storyId:
          item.story_id as string,

        headline:
          item.headline as string,

        subheadline:
          (item.subheadline as
            | string
            | null) ??
          null,

        summary:
          (item.summary as
            | string
            | null) ??
          null,

        body:
          (item.body as Record<
            string,
            unknown
          >) ??
          {},

        language:
          (item.language as StoryLanguage) ??
          'en',

        primaryCategoryId:
          (item.primary_category_id as
            | string
            | null) ??
          null,

        createdBy:
          item.created_by as string,

        createdByName:
          nameMap.get(
            item.created_by as string
          ) ??
          null,

        createdAt:
          item.created_at as string,
      };
    }
  );
}

/**
 * Restores the saved editorial content from
 * a previous story version.
 */
export async function restoreStoryVersion(
  versionId: string,
  restoredBy: string
): Promise<boolean> {
  const supabase =
    await getDataClient();

  const {
    data: version,
    error:
      versionError,
  } = await supabase
    .from(
      'story_versions'
    )
    .select('*')
    .eq(
      'id',
      versionId
    )
    .maybeSingle();

  if (
    versionError
  ) {
    console.error(
      'Unable to load version for restoration:',
      versionError
    );

    return false;
  }

  if (!version) {
    return false;
  }

  const savedVersion =
    version as Record<
      string,
      unknown
    >;

  const storyId =
    savedVersion
      .story_id as string;

  const restoredContent = {
    headline:
      (savedVersion.headline as string) ??
      '',

    subheadline:
      (savedVersion.subheadline as
        | string
        | null) ??
      null,

    summary:
      (savedVersion.summary as
        | string
        | null) ??
      null,

    body:
      (savedVersion.body as Record<
        string,
        unknown
      >) ??
      {},

    language:
      (savedVersion.language as StoryLanguage) ??
      'en',

    primary_category_id:
      (savedVersion.primary_category_id as
        | string
        | null) ??
      null,

    updated_by:
      restoredBy,
  };

  const {
    error:
      restoreError,
  } = await supabase
    .from('stories')
    .update(
      restoredContent
    )
    .eq(
      'id',
      storyId
    );

  if (
    restoreError
  ) {
    console.error(
      'Unable to restore story version:',
      {
        versionId,
        storyId,

        code:
          restoreError.code,

        message:
          restoreError.message,

        details:
          restoreError.details,

        hint:
          restoreError.hint,
      }
    );

    return false;
  }

  /**
   * Save a snapshot of the restored state so the
   * restoration itself becomes part of history.
   */
  const {
    error:
      snapshotError,
  } = await supabase
    .from(
      'story_versions'
    )
    .insert({
      story_id:
        storyId,

      headline:
        restoredContent.headline,

      subheadline:
        restoredContent.subheadline,

      summary:
        restoredContent.summary,

      body:
        restoredContent.body,

      language:
        restoredContent.language,

      primary_category_id:
        restoredContent.primary_category_id,

      created_by:
        restoredBy,
    });

  if (
    snapshotError
  ) {
    console.error(
      'Story restored but restoration snapshot failed:',
      snapshotError
    );
  }

  return true;
}

// --------------------------------------------------
// Stats
// --------------------------------------------------

export async function getStoryCounts(): Promise<{
  total: number;
  drafts: number;
  published: number;
  inReview: number;
}> {
  const supabase =
    await getDataClient();

  const [
    totalResult,
    draftResult,
    publishedResult,
    reviewResult,
  ] =
    await Promise.all([
      supabase
        .from('stories')
        .select(
          'id',
          {
            count:
              'exact',
            head:
              true,
          }
        ),

      supabase
        .from('stories')
        .select(
          'id',
          {
            count:
              'exact',
            head:
              true,
          }
        )
        .eq(
          'status',
          'draft'
        ),

      supabase
        .from('stories')
        .select(
          'id',
          {
            count:
              'exact',
            head:
              true,
          }
        )
        .eq(
          'status',
          'published'
        ),

      supabase
        .from('stories')
        .select(
          'id',
          {
            count:
              'exact',
            head:
              true,
          }
        )
        .eq(
          'status',
          'in_review'
        ),
    ]);

  return {
    total:
      totalResult.count ??
      0,

    drafts:
      draftResult.count ??
      0,

    published:
      publishedResult.count ??
      0,

    inReview:
      reviewResult.count ??
      0,
  };
}
