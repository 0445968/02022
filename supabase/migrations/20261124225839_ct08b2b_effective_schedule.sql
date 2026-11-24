-- CT-08b.2b STAGED ONLY; CLI filename generated in #45505782531.
-- Read-only, bounded projection for a page of stories. No new raw grants.
begin;
create function newsroom_private.read_story_publication_queue(p_story_ids uuid[])
returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC'
as $fn$
declare result jsonb;
begin
 if not coalesce(newsroom_private.can_read_editorial_calendar(),false) then
  raise exception 'Calendar unavailable' using errcode='42501';end if;
 if p_story_ids is null or cardinality(p_story_ids) not between 1 and 50
 or array_ndims(p_story_ids) is distinct from 1
 or exists(select 1 from unnest(p_story_ids) x(id) where x.id is null)
 or (select count(distinct x.id) from unnest(p_story_ids) x(id))<>cardinality(p_story_ids) then
  raise exception 'Invalid story IDs' using errcode='22023';end if;
 with scoped as materialized (
  select s.id,s.status,s.scheduled_at from public.stories s
  where s.id=any(p_story_ids) and newsroom_private.calendar_story_scope(s.id)
 ), visible_queue as materialized (
  select q.story_id,q.kind,q.state,q.due_at,q.fingerprint
  from scoped s join newsroom_private.reviewed_publication_schedules q on q.story_id=s.id
  where q.state in ('pending','blocked')
  and (q.kind='draft' or newsroom_private.has_staff_permission('revision.view',s.id))
  and (newsroom_private.has_staff_permission('calendar.view_team',s.id)
    or newsroom_private.review_access(s.id,q.kind,'submit')
    or newsroom_private.review_access(s.id,q.kind,'decide')
    or newsroom_private.schedule_manager_allowed(s.id,q.kind))
 ), snapshots as materialized (
  select q.*,newsroom_private.review_snapshot(q.story_id,q.kind) snap from visible_queue q
 ), rows as (
  select story_id,kind,state,due_at,
   coalesce(snap->>'status'='in_review' and snap->>'fingerprint'=fingerprint,false) snapshot_current
  from snapshots
  union all
  select s.id,'draft','unverified',s.scheduled_at,null::boolean
  from scoped s where s.status='scheduled'
   and (s.scheduled_at is null or isfinite(s.scheduled_at))
   and newsroom_private.has_staff_permission('calendar.view_team',s.id)
   and not exists(select 1 from visible_queue v where v.story_id=s.id)
 )
 select jsonb_build_object('asOf',now(),'items',coalesce(jsonb_agg(jsonb_build_object(
 'storyId',story_id,'source',kind,'state',state,'dueAt',due_at,'snapshotCurrent',snapshot_current
 ) order by story_id),'[]'::jsonb)) into result from rows;
 return result;
end;
$fn$;
revoke all on function newsroom_private.read_story_publication_queue(uuid[]) from public,anon,authenticated,service_role;
grant execute on function newsroom_private.read_story_publication_queue(uuid[]) to authenticated;
create function public.staff_read_story_publication_queue(p_story_ids uuid[])
returns jsonb language sql stable security invoker set search_path=''
as $fn$ select newsroom_private.read_story_publication_queue(p_story_ids) $fn$;
revoke all on function public.staff_read_story_publication_queue(uuid[]) from public,anon,authenticated,service_role;
grant execute on function public.staff_read_story_publication_queue(uuid[]) to authenticated;
commit;
