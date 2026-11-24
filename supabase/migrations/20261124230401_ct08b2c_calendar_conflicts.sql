-- CT-08b.2c STAGED ONLY; CLI filename from #45506583263.
-- Exact, read-only conflict advisory. Counterparts may lie outside range/filter/page.
begin;
create index ct08b2c_story_active_deadline on public.staff_story_assignments(story_id,due_at)
 where status='active' and due_at is not null;
create function newsroom_private.calendar_potential_conflict(p_story uuid,p_assignment uuid,p_schedule uuid)
returns boolean language plpgsql stable security invoker set search_path='' set timezone='UTC'
as $fn$
declare target newsroom_private.reviewed_publication_schedules%rowtype; snap jsonb;
begin
 if p_story is null or (p_assignment is null)=(p_schedule is null)
 or not coalesce(newsroom_private.calendar_identity_allowed(),false)
 or not coalesce(newsroom_private.calendar_story_scope(p_story),false) then return false;end if;
 -- No hidden assignment or queue may contribute to the boolean.
 -- Match only one story and one exact visible row, independently authorize counterpart.
 select q.* into target from newsroom_private.reviewed_publication_schedules q
 join public.stories s on s.id=q.story_id
 where q.story_id=p_story and q.state='pending' and s.status<>'archived'
 and (p_schedule is null or q.id=p_schedule)
 and (q.kind='draft' or newsroom_private.has_staff_permission('revision.view',s.id))
 and (newsroom_private.has_staff_permission('calendar.view_team',s.id)
   or newsroom_private.review_access(s.id,q.kind,'submit')
   or newsroom_private.review_access(s.id,q.kind,'decide')
   or newsroom_private.schedule_manager_allowed(s.id,q.kind))
 and exists(select 1 from public.staff_story_assignments a
  join public.staff_memberships m on m.id=a.membership_id
  where a.story_id=s.id and (p_assignment is null or a.id=p_assignment)
    and a.status='active' and a.due_at is not null and isfinite(a.due_at) and a.due_at>=q.due_at
    and (newsroom_private.has_staff_permission('calendar.view_team',s.id)
      or (m.auth_user_id=(select auth.uid()) and newsroom_private.has_staff_permission('calendar.view_assigned',s.id))));
 if not found then return false;end if;
 snap:=newsroom_private.review_snapshot(target.story_id,target.kind);
 return coalesce(snap->>'status'='in_review' and snap->>'fingerprint'=target.fingerprint,false);
end;
$fn$;
revoke all on function newsroom_private.calendar_potential_conflict(uuid,uuid,uuid) from public,anon,authenticated,service_role;

create or replace function newsroom_private.read_editorial_calendar(p_start timestamptz,p_end timestamptz,p_mode text,p_filter text,p_page integer)
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
   and (case when p_mode='attention' then a.due_at<now() or newsroom_private.calendar_potential_conflict(s.id,a.id,null) else a.due_at>=p_start and a.due_at<p_end end)
  union all
  select q.id,q.story_id,s.headline,q.due_at,'publication',null,false,q.state,q.kind,q.fingerprint,null
  from newsroom_private.reviewed_publication_schedules q join public.stories s on s.id=q.story_id
  join newsroom_private.story_review_requests rq on rq.id=q.request_id
  left join newsroom_private.story_review_epochs ep on ep.story_id=q.story_id
  left join public.story_revisions rv on rv.story_id=q.story_id and q.kind='revision'
  where p_filter in ('all','publications') and q.state in ('pending','blocked')
   and newsroom_private.calendar_story_scope(s.id)
   and (q.kind='draft' or newsroom_private.has_staff_permission('revision.view',s.id))
   and (newsroom_private.has_staff_permission('calendar.view_team',s.id)
    or newsroom_private.review_access(s.id,q.kind,'submit') or newsroom_private.review_access(s.id,q.kind,'decide')
    or newsroom_private.schedule_manager_allowed(s.id,q.kind))
   and (case when p_mode='attention' then q.state='blocked' or q.due_at<=now() or rq.generation is distinct from coalesce(ep.generation,0)
     or newsroom_private.calendar_potential_conflict(s.id,null,q.id)
     or (q.kind='draft' and s.status<>'in_review') or (q.kind='revision' and (s.status<>'published' or rv.status is distinct from 'in_review')) else q.due_at>=p_start and q.due_at<p_end end)
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
  'potentialConflict',case when rn<=50 and kind='assignment' then newsroom_private.calendar_potential_conflict(story_id,id,null)
    when rn<=50 and kind='publication' then newsroom_private.calendar_potential_conflict(story_id,null,id) else false end,
  'canCancel',case when kind='publication' then coalesce(newsroom_private.schedule_manager_allowed(story_id,source),false) else false end
 ) order by due_at nulls first,kind,id) filter(where rn<=50),'[]'::jsonb),'hasMore',count(*)>50 and p_page<100)
 into result from projected;
 return result;
end;
$fn$;

-- Existing public invoker wrapper and existing grants unchanged.
commit;
