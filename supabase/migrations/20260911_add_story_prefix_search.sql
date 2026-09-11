/* =========================================================
   WEST ISLAND TIMES
   LIVE PREFIX SEARCH
   ========================================================= */

/*
 * This search function is intended specifically for
 * autocomplete / live search.
 *
 * Unlike websearch_to_tsquery(), it converts every typed
 * word into a PostgreSQL prefix query.
 *
 * Example:
 *
 *   gov
 *
 * becomes:
 *
 *   gov:*
 *
 * allowing it to match:
 *
 *   government
 *   governor
 *   governing
 */

create or replace function public.search_published_story_suggestions(
  p_query text,
  p_limit integer default 6
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
  relevance real
)
language sql
stable
security invoker
set search_path = public
as $$
  with cleaned_query as (
    select
      trim(
        regexp_replace(
          lower(coalesce(p_query, '')),
          '[^[:alnum:]áéíóúüñàèìòùâêîôûäëïöüç]+',
          ' ',
          'g'
        )
      ) as value
  ),

  prefix_query_text as (
    select
      string_agg(
        token || ':*',
        ' & '
      ) as value
    from cleaned_query,
    lateral regexp_split_to_table(
      cleaned_query.value,
      '\s+'
    ) as token
    where token <> ''
  ),

  search_query as (
    select
      case
        when prefix_query_text.value is null
          then null
        else
          to_tsquery(
            'simple',
            prefix_query_text.value
          )
      end as query
    from prefix_query_text
  )

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
    search_query.query is not null

    and s.status = 'published'

    and s.published_at is not null

    and s.published_at <= now()

    and s.search_vector
      @@ search_query.query

  order by
    relevance desc,
    s.published_at desc

  limit greatest(
    least(
      p_limit,
      20
    ),
    1
  );
$$;


/* =========================================================
   PERMISSIONS
   ========================================================= */

grant execute
on function public.search_published_story_suggestions(
  text,
  integer
)
to anon;

grant execute
on function public.search_published_story_suggestions(
  text,
  integer
)
to authenticated;


comment on function public.search_published_story_suggestions(
  text,
  integer
) is
'Prefix-based published story search for live autocomplete and search suggestions.';