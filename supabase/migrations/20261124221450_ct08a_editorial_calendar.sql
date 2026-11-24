-- CT-08a STAGED ONLY. CLI #45499068434.
-- Read-only calendar: no publication, schedule mutation, or cron installation.
begin;
create index ct08a_assignment_due on public.staff_story_assignments(due_at,id) where status='active' and due_at is not null;
create index ct08a_active_schedule_due on newsroom_private.reviewed_publication_schedules(due_at,id) where state in ('pending','blocked');

create function newsroom_private.calendar_identity_allowed()
returns boolean language sql stable security invoker set search_path=''
as $fn$
 select coalesce(public.staff_invite_verified_identity((select auth.uid())),false)
 and newsroom_private.has_staff_permission('newsroom.access')
$fn$;
revoke all on function newsroom_private.calendar_identity_allowed() from public,anon,authenticated,service_role;

create function newsroom_private.calendar_story_scope(p_story uuid)
returns boolean language sql stable security invoker set search_path=''
as $fn$
 select (newsroom_private.has_staff_permission('story.view_all',p_story) or newsroom_private.has_staff_permission('story.view_assigned',p_story))
 and (newsroom_private.has_staff_permission('calendar.view_team',p_story) or newsroom_private.has_staff_permission('calendar.view_assigned',p_story))
$fn$;
revoke all on function newsroom_private.calendar_story_scope(uuid) from public,anon,authenticated,service_role;

-- Existence-only discovery; no arbitrary identity, no scan limited to first N assignments.
create function newsroom_private.can_read_editorial_calendar()
returns boolean language sql stable security definer set search_path=''
as $fn$
 select newsroom_private.calendar_identity_allowed() and (
  newsroom_private.has_staff_permission('calendar.view_team')
  or exists(select 1 from public.staff_story_assignments a
   join public.staff_memberships m on m.id=a.membership_id
   where m.auth_user_id=(select auth.uid()) and a.status='active'
   and newsroom_private.calendar_story_scope(a.story_id)))
$fn$;
revoke all on function newsroom_private.can_read_editorial_calendar() from public,anon,authenticated,service_role;
grant execute on function newsroom_private.can_read_editorial_calendar() to authenticated;
create function public.staff_can_read_editorial_calendar()
returns boolean language sql stable security invoker set search_path=''
as $fn$ select newsroom_private.can_read_editorial_calendar() $fn$;
revoke all on function public.staff_can_read_editorial_calendar() from public,anon,authenticated,service_role;
grant execute on function public.staff_can_read_editorial_calendar() to authenticated;

create function newsroom_private.read_editorial_calendar(p_start timestamptz,p_end timestamptz,p_mode text,p_filter text,p_page integer)
returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC'
as $fn$
declare result jsonb;
begin
 if not newsroom_private.can_read_editorial_calendar() then raise exception 'Calendar unavailable' using errcode='42501';end if;
 if p_start is null or p_end is null or not isfinite(p_start) or not isfinite(p_end)
 or p_end<=p_start or p_end-p_start>interval '93 days'
 or p_mode is null or p_mode not in ('range','attention')
 or p_filter is null or p_filter not in ('all','assignments','publications')
 or p_page is null or p_page not between 0 and 100 then raise exception 'Invalid calendar filter' using errcode='22023';end if;
 with candidates as materialized (
  select a.id,a.story_id,s.headline,a.due_at,'assignment'::text kind,a.assignment_type::text assignment_type,
   (m.auth_user_id=(select auth.uid())) mine,'active'::text state,null::text source,
   null::text fingerprint,
   case when newsroom_private.has_staff_permission('calendar.view_team',s.id) then p.name else null end assignee
  from public.staff_story_assignments a join public.stories s on s.id=a.story_id
  join public.staff_memberships m on m.id=a.membership_id left join public.profiles p on p.id=m.auth_user_id
  where p_filter in ('all','assignments') and a.status='active' and a.due_at is not null and isfinite(a.due_at)
   and s.status<>'archived' and newsroom_private.calendar_story_scope(s.id)
   and (newsroom_private.has_staff_permission('calendar.view_team',s.id)
     or (m.auth_user_id=(select auth.uid()) and newsroom_private.has_staff_permission('calendar.view_assigned',s.id)))
   and (case when p_mode='attention' then a.due_at<now() else a.due_at>=p_start and a.due_at<p_end end)
  union all
  select q.id,q.story_id,s.headline,q.due_at,'publication',null,false,q.state,q.kind,q.fingerprint,null
  from newsroom_private.reviewed_publication_schedules q join public.stories s on s.id=q.story_id
  where p_filter in ('all','publications') and q.state in ('pending','blocked')
   and newsroom_private.calendar_story_scope(s.id)
   and (q.kind='draft' or newsroom_private.has_staff_permission('revision.view',s.id))
   and (newsroom_private.has_staff_permission('calendar.view_team',s.id)
    or newsroom_private.review_access(s.id,q.kind,'submit') or newsroom_private.review_access(s.id,q.kind,'decide')
    or newsroom_private.schedule_manager_allowed(s.id,q.kind))
   and (case when p_mode='attention' then q.state='blocked' or q.due_at<=now() else q.due_at>=p_start and q.due_at<p_end end)
  union all
  select s.id,s.id,s.headline,s.scheduled_at,'legacy',null,false,'unverified','draft',null,null
  from public.stories s
  where p_filter in ('all','publications') and s.status='scheduled'
   and newsroom_private.calendar_story_scope(s.id)
   and newsroom_private.has_staff_permission('calendar.view_team',s.id)
   and (case when p_mode='attention' then true else s.scheduled_at>=p_start and s.scheduled_at<p_end end)
   and (s.scheduled_at is null or isfinite(s.scheduled_at))
 ), limited as materialized (
  select * from candidates order by due_at nulls first,kind,id limit 51 offset p_page*50
 ), numbered as (
  select *,row_number() over(order by due_at nulls first,kind,id) rn from limited
 ), projected as (
  select n.*,case when n.kind='publication' and n.rn<=50 then newsroom_private.review_snapshot(n.story_id,n.source) else null end snap from numbered n
 )
 select jsonb_build_object('asOf',now(),'items',coalesce(jsonb_agg(jsonb_build_object(
  'id',id,'storyId',story_id,'headline',headline,'dueAt',due_at,'kind',kind,'state',state,
  'assignmentType',assignment_type,'mine',mine,'assignee',assignee,'source',source,
  'snapshotCurrent',case when kind='publication' then coalesce(snap->>'status'='in_review' and snap->>'fingerprint'=fingerprint,false) else null end,
  'canCancel',case when kind='publication' then coalesce(newsroom_private.schedule_manager_allowed(story_id,source),false) else false end
 ) order by due_at nulls first,kind,id) filter(where rn<=50),'[]'::jsonb),'hasMore',count(*)>50 and p_page<100)
 into result from projected;
 return result;
end;
$fn$;
revoke all on function newsroom_private.read_editorial_calendar(timestamptz,timestamptz,text,text,integer) from public,anon,authenticated,service_role;
grant execute on function newsroom_private.read_editorial_calendar(timestamptz,timestamptz,text,text,integer) to authenticated;
create function public.staff_read_editorial_calendar(p_start timestamptz,p_end timestamptz,p_mode text,p_filter text,p_page integer)
returns jsonb language sql stable security invoker set search_path=''
as $fn$ select newsroom_private.read_editorial_calendar(p_start,p_end,p_mode,p_filter,p_page) $fn$;
revoke all on function public.staff_read_editorial_calendar(timestamptz,timestamptz,text,text,integer) from public,anon,authenticated,service_role;
grant execute on function public.staff_read_editorial_calendar(timestamptz,timestamptz,text,text,integer) to authenticated;
commit;
