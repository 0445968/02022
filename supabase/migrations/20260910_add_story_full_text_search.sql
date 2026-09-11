/* =========================================================
   WEST ISLAND TIMES
   STORY FULL-TEXT SEARCH
   ========================================================= */

/*
 * Add a generated tsvector column containing the searchable
 * story fields.
 *
 * We give headline and short title the strongest weight,
 * followed by subheadline and summary.
 */

alter table public.stories
add column if not exists search_vector tsvector
generated always as (
  setweight(
    to_tsvector(
      'simple',
      coalesce(headline, '')
    ),
    'A'
  )
  ||
  setweight(
    to_tsvector(
      'simple',
      coalesce(short_title, '')
    ),
    'A'
  )
  ||
  setweight(
    to_tsvector(
      'simple',
      coalesce(subheadline, '')
    ),
    'B'
  )
  ||
  setweight(
    to_tsvector(
      'simple',
      coalesce(summary, '')
    ),
    'C'
  )
) stored;


/* =========================================================
   SEARCH INDEX
   ========================================================= */

create index if not exists stories_search_vector_idx
on public.stories
using gin(search_vector);


/* =========================================================
   SEARCH FUNCTION
   ========================================================= */

create or replace function public.search_published_stories(
  p_query text,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  slug text,
  headline text,
  short_title text,
  subheadline text,
  summary text,
  published_at timestamptz,
  primary_category_id uuid,
  featured_image_id uuid,
  relevance real,
  total_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with search_query as (
    select
      websearch_to_tsquery(
        'simple',
        trim(p_query)
      ) as query
  ),

  matched_stories as (
    select
      s.id,
      s.slug,
      s.headline,
      s.short_title,
      s.subheadline,
      s.summary,
      s.published_at,
      s.primary_category_id,
      s.featured_image_id,

      ts_rank_cd(
        s.search_vector,
        search_query.query,
        32
      ) as relevance

    from public.stories s
    cross join search_query

    where
      trim(p_query) <> ''

      and s.status = 'published'

      and s.published_at is not null

      and s.published_at <= now()

      and s.search_vector
        @@ search_query.query
  ),

  counted_stories as (
    select
      matched_stories.*,

      count(*) over ()
        as total_count

    from matched_stories
  )

  select
    counted_stories.id,
    counted_stories.slug,
    counted_stories.headline,
    counted_stories.short_title,
    counted_stories.subheadline,
    counted_stories.summary,
    counted_stories.published_at,
    counted_stories.primary_category_id,
    counted_stories.featured_image_id,
    counted_stories.relevance,
    counted_stories.total_count

  from counted_stories

  order by
    counted_stories.relevance desc,
    counted_stories.published_at desc

  limit greatest(
    least(
      p_limit,
      100
    ),
    1
  )

  offset greatest(
    p_offset,
    0
  );
$$;


/* =========================================================
   PERMISSIONS
   ========================================================= */

grant execute
on function public.search_published_stories(
  text,
  integer,
  integer
)
to anon;

grant execute
on function public.search_published_stories(
  text,
  integer,
  integer
)
to authenticated;


/* =========================================================
   DOCUMENTATION
   ========================================================= */

comment on column public.stories.search_vector is
'Generated PostgreSQL full-text search vector for published story discovery.';

comment on function public.search_published_stories(
  text,
  integer,
  integer
) is
'Searches published stories using PostgreSQL full-text search and returns ranked paginated results with the total match count.';