-- CT16 read-only moderation article groups; same story-level authorization as existing queue.
begin;
create function newsroom_private.read_comment_article_groups(p_status text,p_search text,p_page integer,p_story uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare result jsonb;
begin
 if not coalesce(public.staff_invite_verified_identity((select auth.uid())),false)
 or not newsroom_private.has_staff_permission('newsroom.access') then
 raise exception 'Moderation unavailable' using errcode='42501';end if;
 if p_status is null or p_status not in ('all','pending','published','hidden','deleted','reported')
 or p_page is null or p_page not between 0 and 100 or p_search is null or char_length(p_search)>120 then
 raise exception 'Invalid moderation filter' using errcode='22023';end if;
 with candidates as materialized (
  select c.story_id,s.headline,s.slug,s.language,s.access_level,s.published_at,c.status,c.created_at,
   (p_status='all' or c.status::text=p_status or (p_status='reported' and newsroom_private.comment_scope_allowed(c.story_id,'reports')
       and exists(select 1 from public.comment_reports r where r.comment_id=c.id and r.status='open')))
   and (p_search='' or strpos(lower(c.body),lower(p_search))>0 or strpos(lower(s.headline),lower(p_search))>0
      or strpos(lower(coalesce(p.display_name,'')),lower(p_search))>0) as matches
  from public.comments c join public.stories s on s.id=c.story_id
  left join public.reader_public_profiles p on p.id=c.user_id
  where newsroom_private.comment_scope_allowed(c.story_id,'read') and (p_story is null or c.story_id=p_story)
 ), grouped as (
  select story_id,headline,slug,language,access_level,published_at,max(created_at) as latest,
   count(*) as total,count(*) filter(where status='pending') as pending,
   count(*) filter(where status='published') as published,count(*) filter(where matches) as matched
  from candidates group by story_id,headline,slug,language,access_level,published_at having bool_or(matches)
 ), limited as (
  select *,row_number() over(order by latest desc,story_id) rn from
   (select * from grouped order by latest desc,story_id limit 21 offset p_page*20) g
 )
 select jsonb_build_object('items',coalesce(jsonb_agg(jsonb_build_object(
   'storyId',story_id,'headline',headline,'language',language,'publishedAt',published_at,
   'publicPath',case when access_level='public' then '/'||language::text||'/article/'||slug else null end,
   'total',total,'pending',pending,'published',published,'matched',matched
 ) order by latest desc,story_id) filter(where rn<=20),'[]'::jsonb),'hasMore',count(*)>20 and p_page<100)
 into result from limited;
 return result;
end;
$fn$;
revoke all on function newsroom_private.read_comment_article_groups(text,text,integer,uuid) from public,anon,authenticated,service_role;
grant execute on function newsroom_private.read_comment_article_groups(text,text,integer,uuid) to authenticated;
create function public.staff_read_comment_article_groups(p_status text,p_search text,p_page integer,p_story uuid)
returns jsonb language sql stable security invoker set search_path='' as $fn$
 select newsroom_private.read_comment_article_groups(p_status,p_search,p_page,p_story)
$fn$;
revoke all on function public.staff_read_comment_article_groups(text,text,integer,uuid) from public,anon,authenticated,service_role;
grant execute on function public.staff_read_comment_article_groups(text,text,integer,uuid) to authenticated;
commit;
