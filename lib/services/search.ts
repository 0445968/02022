import {
  getDataClient,
} from '@/lib/db/supabase-data-access';

export interface SearchResult {
  id: string;
  slug: string;
  headline: string;

  shortTitle:
  | string
  | null;

  subheadline:
  | string
  | null;

  summary:
  | string
  | null;

  publishedAt:
  | string
  | null;

  relevanceScore: number;

  category:
  | {
    id: string;
    slug: string;
    nameEn: string;
    nameEs: string;
    active: boolean;
    sortOrder: number;
  }
  | null;

  image:
  | {
    url: string;
    altText: string;
  }
  | null;
}

export interface SearchPageResult {
  results: SearchResult[];

  page: number;

  pageSize: number;

  totalResults: number;

  totalPages: number;

  hasPreviousPage: boolean;

  hasNextPage: boolean;
}

interface SearchRpcRow {
  id: string;
  slug: string;
  headline: string;

  short_title:
  | string
  | null;

  subheadline:
  | string
  | null;

  summary:
  | string
  | null;

  published_at:
  | string
  | null;

  primary_category_id:
  | string
  | null;

  featured_image_id:
  | string
  | null;

  relevance:
  | number
  | null;

  total_count:
  | number
  | string
  | null;
}

interface SearchOptions {
  limit?: number;
}

interface SearchPageOptions {
  page?: number;
  pageSize?: number;
}

interface RpcSearchClient {
  rpc: (
    functionName: string,
    params: {
      p_query: string;
      p_limit: number;
      p_offset: number;
    }
  ) => Promise<{
    data:
    | SearchRpcRow[]
    | null;

    error:
    | {
      code?: string;
      message?: string;
      details?: string;
      hint?: string;
    }
    | null;
  }>;
}

/* =========================================================
   SEARCH TERM
========================================================= */

export function cleanSearchTerm(
  value: string
) {
  return value
    .replace(
      /[%_,()]/g,
      ''
    )
    .trim()
    .slice(
      0,
      120
    );
}

/* =========================================================
   SEARCH RPC
========================================================= */

async function runStorySearch(
  query: string,
  limit: number,
  offset: number
): Promise<SearchRpcRow[]> {
  const cleanedQuery =
    cleanSearchTerm(
      query
    );

  if (
    cleanedQuery.length <
    2
  ) {
    return [];
  }

  const safeLimit =
    Math.max(
      1,
      Math.min(
        Math.floor(
          limit
        ),
        100
      )
    );

  const safeOffset =
    Math.max(
      0,
      Math.floor(
        offset
      )
    );

  const supabase =
    await getDataClient();

  /*
   * The cast prevents a TypeScript error if your generated
   * Supabase Database types have not yet been regenerated
   * after adding search_published_stories().
   *
   * Once your generated DB types include the RPC, this cast
   * can be removed.
   */
  const rpcClient =
    supabase as unknown as RpcSearchClient;

  const {
    data,
    error,
  } = await rpcClient.rpc(
    'search_published_stories',
    {
      p_query:
        cleanedQuery,

      p_limit:
        safeLimit,

      p_offset:
        safeOffset,
    }
  );

  if (error) {
    console.error(
      'Unable to search published stories:',
      {
        query:
          cleanedQuery,

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

    return [];
  }

  return data ?? [];
}

/* =========================================================
   RESULT ENRICHMENT
========================================================= */

async function enrichSearchResults(
  rows: SearchRpcRow[]
): Promise<SearchResult[]> {
  if (
    rows.length === 0
  ) {
    return [];
  }

  const supabase =
    await getDataClient();

  const categoryIds =
    Array.from(
      new Set(
        rows
          .map(
            (row) =>
              row.primary_category_id
          )
          .filter(
            (
              id
            ): id is string =>
              Boolean(id)
          )
      )
    );

  const imageIds =
    Array.from(
      new Set(
        rows
          .map(
            (row) =>
              row.featured_image_id
          )
          .filter(
            (
              id
            ): id is string =>
              Boolean(id)
          )
      )
    );

  const categoryMap =
    new Map<
      string,
      SearchResult['category']
    >();

  const imageMap =
    new Map<
      string,
      {
        url: string;
        altText: string;
      }
    >();

  /* =======================================================
     CATEGORIES
  ======================================================= */

  if (
    categoryIds.length >
    0
  ) {
    const {
      data:
      categories,
      error:
      categoryError,
    } = await supabase
      .from(
        'categories'
      )
      .select(
        `
          id,
          slug,
          name_en,
          name_es,
          active,
          sort_order
        `
      )
      .in(
        'id',
        categoryIds
      );

    if (
      categoryError
    ) {
      console.error(
        'Unable to load search result categories:',
        {
          code:
            categoryError.code,

          message:
            categoryError.message,

          details:
            categoryError.details,

          hint:
            categoryError.hint,
        }
      );
    } else {
      for (
        const category of
        categories ?? []
      ) {
        categoryMap.set(
          category.id,
          {
            id:
              category.id,

            slug:
              category.slug,

            nameEn:
              category.name_en,

            nameEs:
              category.name_es,

            active:
              category.active,

            sortOrder:
              category.sort_order,
          }
        );
      }
    }
  }

  /* =======================================================
     FEATURED IMAGES
  ======================================================= */

  if (
    imageIds.length >
    0
  ) {
    const {
      data:
      images,
      error:
      imageError,
    } = await supabase
      .from(
        'media_assets'
      )
      .select(
        `
          id,
          url,
          alt_text
        `
      )
      .in(
        'id',
        imageIds
      );

    if (
      imageError
    ) {
      console.error(
        'Unable to load search result images:',
        {
          code:
            imageError.code,

          message:
            imageError.message,

          details:
            imageError.details,

          hint:
            imageError.hint,
        }
      );
    } else {
      for (
        const image of
        images ?? []
      ) {
        imageMap.set(
          image.id,
          {
            url:
              image.url,

            altText:
              image.alt_text ??
              '',
          }
        );
      }
    }
  }

  /* =======================================================
     FINAL RESULT SHAPE
  ======================================================= */

  return rows.map(
    (row) => ({
      id:
        row.id,

      slug:
        row.slug,

      headline:
        row.headline,

      shortTitle:
        row.short_title,

      subheadline:
        row.subheadline,

      summary:
        row.summary,

      publishedAt:
        row.published_at,

      relevanceScore:
        Number(
          row.relevance ??
          0
        ),

      category:
        row.primary_category_id
          ? categoryMap.get(
            row.primary_category_id
          ) ?? null
          : null,

      image:
        row.featured_image_id
          ? imageMap.get(
            row.featured_image_id
          ) ?? null
          : null,
    })
  );
}

/* =========================================================
   COMPACT SEARCH
========================================================= */

/*
 * Used by the header search mega menu.
 *
 * PostgreSQL now performs:
 *
 * - matching
 * - relevance ranking
 * - publication filtering
 * - ordering
 */

export async function searchPublishedStories(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const cleanedQuery =
    cleanSearchTerm(
      query
    );

  if (
    cleanedQuery.length <
    2
  ) {
    return [];
  }

  const limit =
    Math.max(
      1,
      Math.min(
        options.limit ??
        50,
        100
      )
    );

  const rows =
    await runStorySearch(
      cleanedQuery,
      limit,
      0
    );

  return enrichSearchResults(
    rows
  );
}

/* =========================================================
   PAGINATED SEARCH
========================================================= */

/*
 * Used by /search.
 *
 * The database now returns the real total number of matching
 * published stories rather than counting only a temporary
 * application-side candidate pool.
 */

export async function searchPublishedStoriesPage(
  query: string,
  options: SearchPageOptions = {}
): Promise<SearchPageResult> {
  const cleanedQuery =
    cleanSearchTerm(
      query
    );

  const pageSize =
    Math.max(
      1,
      Math.min(
        Math.floor(
          options.pageSize ??
          20
        ),
        100
      )
    );

  const requestedPage =
    Math.max(
      1,
      Math.floor(
        options.page ??
        1
      )
    );

  if (
    cleanedQuery.length <
    2
  ) {
    return {
      results: [],

      page: 1,

      pageSize,

      totalResults: 0,

      totalPages: 0,

      hasPreviousPage:
        false,

      hasNextPage:
        false,
    };
  }

  /*
   * First request the user's requested page.
   */
  const requestedOffset =
    (requestedPage - 1) *
    pageSize;

  let rows =
    await runStorySearch(
      cleanedQuery,
      pageSize,
      requestedOffset
    );

  /*
   * Because total_count is returned alongside every row,
   * we can determine the real number of matches.
   *
   * If the requested page is outside the available range,
   * the query returns no rows. In that case we make a tiny
   * one-row request to discover the real total count.
   */
  let totalResults =
    rows.length > 0
      ? Number(
        rows[0]
          .total_count ??
        0
      )
      : 0;

  if (
    rows.length === 0 &&
    requestedPage > 1
  ) {
    const countProbe =
      await runStorySearch(
        cleanedQuery,
        1,
        0
      );

    totalResults =
      countProbe.length > 0
        ? Number(
          countProbe[0]
            .total_count ??
          0
        )
        : 0;
  }

  const totalPages =
    totalResults > 0
      ? Math.ceil(
        totalResults /
        pageSize
      )
      : 0;

  /*
   * Clamp manually entered URLs such as:
   *
   * ?page=9999
   *
   * to the final real page.
   */
  const page =
    totalPages > 0
      ? Math.min(
        requestedPage,
        totalPages
      )
      : 1;

  /*
   * If clamping changed the page, fetch that final page now.
   */
  if (
    totalPages > 0 &&
    page !==
    requestedPage
  ) {
    const correctedOffset =
      (page - 1) *
      pageSize;

    rows =
      await runStorySearch(
        cleanedQuery,
        pageSize,
        correctedOffset
      );
  }

  const results =
    await enrichSearchResults(
      rows
    );

  return {
    results,

    page,

    pageSize,

    totalResults,

    totalPages,

    hasPreviousPage:
      page > 1,

    hasNextPage:
      totalPages > 0 &&
      page <
      totalPages,
  };
}