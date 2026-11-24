-- CT-06a STAGED ONLY. CLI generated #45454235364.
-- Assignment grants affect resource scope, NOT roles or public attribution.
-- Existing audit hook requires postgres for delegated editorial mutations.
-- Private definer entry points derive auth.uid() and authorize every call;
-- public RPCs are invoker wrappers, no authenticated table write grant.
begin;
alter table public.staff_story_assignments add column revision integer not null default 1 check(revision>0);
create function newsroom_private.bump_assignment_revision()
returns trigger language plpgsql security invoker set search_path=''
as $fn$
begin
 if row(new.id,new.story_id,new.membership_id,new.assignment_type,new.created_by,new.created_at)
  is distinct from row(old.id,old.story_id,old.membership_id,old.assignment_type,old.created_by,old.created_at) then
  raise exception 'Assignment identity is immutable' using errcode='42501';end if;
 new.revision:=old.revision+1;
 new.updated_at:=clock_timestamp();
 return new;
end;
$fn$;
revoke all on function newsroom_private.bump_assignment_revision() from public,anon,authenticated;
create trigger ct06a_assignment_revision before update on public.staff_story_assignments
for each row execute function newsroom_private.bump_assignment_revision();

-- Prospective target permission evaluation: assignment already exists or
-- will exist in this transaction. No own-scope inference or role-name grants.
create function newsroom_private.assignment_target_capability(p_member uuid,p_cap public.staff_capability_key,p_assigned boolean)
returns boolean language sql stable security invoker set search_path=''
as $fn$
 select exists(select 1 from public.staff_memberships m where m.id=p_member and m.status='active'
 and (m.expires_at is null or m.expires_at>now())
 and not exists(select 1 from public.staff_capability_overrides o where o.membership_id=m.id
  and o.capability_key=p_cap and o.effect='deny' and (o.expires_at is null or o.expires_at>now())
  and (o.scope='all' or (p_assigned and o.scope='assigned')))
 and (exists(select 1 from public.staff_member_roles r join public.staff_role_capabilities g on g.role_preset_id=r.role_preset_id
  where r.membership_id=m.id and (r.expires_at is null or r.expires_at>now())
  and g.capability_key=p_cap and (g.scope='all' or (p_assigned and g.scope='assigned')))
 or exists(select 1 from public.staff_capability_overrides o where o.membership_id=m.id
  and o.capability_key=p_cap and o.effect='allow' and (o.expires_at is null or o.expires_at>now())
  and (o.scope='all' or (p_assigned and o.scope='assigned')))))
$fn$;
revoke all on function newsroom_private.assignment_target_capability(uuid,public.staff_capability_key,boolean) from public,anon,authenticated;

create function newsroom_private.assignment_eligible_types(p_member uuid)
returns text[] language sql stable security invoker set search_path=''
as $fn$
 select case when exists(select 1 from public.staff_memberships m join public.profiles p on p.id=m.auth_user_id
  where m.id=p_member and m.status='active' and (m.expires_at is null or m.expires_at>now())
  and public.staff_invite_verified_identity(m.auth_user_id))
 and newsroom_private.assignment_target_capability(p_member,'newsroom.access',false)
 and (newsroom_private.assignment_target_capability(p_member,'story.view_all',true)
  or newsroom_private.assignment_target_capability(p_member,'story.view_assigned',true))
 then array_remove(array[
  case when newsroom_private.assignment_target_capability(p_member,'story.edit_all',true)
    or newsroom_private.assignment_target_capability(p_member,'story.edit_assigned',true) then 'author' end,
  case when newsroom_private.assignment_target_capability(p_member,'story.edit_all',true)
    or newsroom_private.assignment_target_capability(p_member,'story.edit_assigned',true) then 'editor' end,
  case when newsroom_private.assignment_target_capability(p_member,'story.review',true) then 'reviewer' end,
  case when newsroom_private.assignment_target_capability(p_member,'story.edit_all',true)
    or newsroom_private.assignment_target_capability(p_member,'story.edit_assigned',true) then 'copy' end,
  case when newsroom_private.assignment_target_capability(p_member,'media.upload',false)
    or newsroom_private.assignment_target_capability(p_member,'revision.edit_assigned',true) then 'visual' end
 ]::text[],null) else '{}'::text[] end
$fn$;
revoke all on function newsroom_private.assignment_eligible_types(uuid) from public,anon,authenticated;

create function newsroom_private.assignment_manager_allowed(p_story uuid)
returns boolean language sql stable security invoker set search_path=''
as $fn$
 select public.staff_invite_verified_identity((select auth.uid()))
 and newsroom_private.has_staff_permission('newsroom.access')
 and newsroom_private.has_staff_permission('story.view_all',p_story)
 and newsroom_private.has_staff_permission('story.assign',p_story)
 and exists(select 1 from public.stories where id=p_story)
$fn$;
revoke all on function newsroom_private.assignment_manager_allowed(uuid) from public,anon,authenticated;

-- Only a minimal story-specific staff picker; does not grant team directory
-- or permission/audit administration access. Names are internal profile names.
create function newsroom_private.read_story_assignments(p_story uuid,p_page integer,p_candidate_page integer)
returns jsonb language plpgsql stable security definer set search_path=''
as $fn$
declare s public.stories%rowtype; rows jsonb; candidates jsonb; history jsonb; more_rows boolean; more_candidates boolean;
begin
 if not newsroom_private.assignment_manager_allowed(p_story) then
   raise exception 'Assignment management unavailable' using errcode='42501';end if;
 if p_page is null or p_page not between 0 and 100 or p_candidate_page is null or p_candidate_page not between 0 and 100 then
   raise exception 'Invalid page' using errcode='22023';end if;
 select * into s from public.stories where id=p_story;
  select coalesce(jsonb_agg(entry order by sort_id) filter(where rn<=25),'[]'::jsonb),count(*)>25 and p_page<100 into rows,more_rows
  from (select q.*,row_number() over(order by sort_id) rn from (
   select a.id sort_id,jsonb_build_object('id',a.id,'membershipId',a.membership_id,'name',coalesce(nullif(left(btrim(p.name),120),''),'Staff '||left(a.membership_id::text,8)),
    'type',a.assignment_type,'status',a.status,'dueAt',a.due_at,'revision',a.revision,
    'self',m.auth_user_id=(select auth.uid()),'eligible',a.assignment_type=any(newsroom_private.assignment_eligible_types(m.id))) entry
   from public.staff_story_assignments a join public.staff_memberships m on m.id=a.membership_id
   left join public.profiles p on p.id=m.auth_user_id where a.story_id=p_story order by a.id limit 26 offset p_page*25
  ) q) page;

 select coalesce(jsonb_agg(entry order by sort_id) filter(where rn<=25),'[]'::jsonb),count(*)>25 and p_candidate_page<100
 into candidates,more_candidates from (
  select q.*,row_number() over(order by sort_id) rn from (
   select m.id sort_id,jsonb_build_object('id',m.id,'name',coalesce(nullif(left(btrim(p.name),120),''),'Staff '||left(m.id::text,8)),
    'types',e.types) entry
   from public.staff_memberships m join public.profiles p on p.id=m.auth_user_id
   cross join lateral (select newsroom_private.assignment_eligible_types(m.id) types) e
   where m.auth_user_id<>(select auth.uid()) and cardinality(e.types)>0
   order by m.id limit 26 offset p_candidate_page*25
  ) q
 ) page;
 select coalesce(jsonb_agg(entry order by at desc,sort_id desc),'[]'::jsonb) into history from (
  select a.id sort_id,a.created_at at,jsonb_build_object('id',a.id,'at',a.created_at,
   'actor',coalesce(nullif(left(btrim(p.name),120),''),'Editorial team'),
   'reason',left(a.reason,500),'type',coalesce(a.after_state->>'assignment_type',a.before_state->>'assignment_type'),
   'previousStatus',a.before_state->>'status','status',a.after_state->>'status',
   'previousDueAt',a.before_state->>'due_at','dueAt',a.after_state->>'due_at',
   'member',coalesce(nullif(left(btrim(t.name),120),''),'Staff '||left(a.subject_membership_id::text,8))) entry
  from public.staff_access_audit a left join public.profiles p on p.id=a.actor_auth_user_id
  left join public.staff_memberships m on m.id=a.subject_membership_id left join public.profiles t on t.id=m.auth_user_id
  where a.action_key in ('staff_story_assignments.insert','staff_story_assignments.update','staff_story_assignments.delete')
   and coalesce(a.after_state->>'story_id',a.before_state->>'story_id')=p_story::text
  order by a.created_at desc,a.id desc limit 15
 ) q;
 return jsonb_build_object('storyId',s.id,'headline',s.headline,'storyStatus',s.status,
  'assignments',rows,'hasMoreAssignments',more_rows,'candidates',candidates,'hasMoreCandidates',more_candidates,'history',history);
end;
$fn$;
revoke all on function newsroom_private.read_story_assignments(uuid,integer,integer) from public,anon,authenticated;
grant execute on function newsroom_private.read_story_assignments(uuid,integer,integer) to authenticated;

create function newsroom_private.change_story_assignment(p_story uuid,p_member uuid,p_type text,p_action text,
 p_expected integer,p_due timestamptz,p_reason text,p_request uuid)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare actor uuid:=(select auth.uid()); m public.staff_memberships%rowtype; a public.staff_story_assignments%rowtype; s public.stories%rowtype;
begin
 if current_user<>'postgres' then raise exception 'Assignment service not configured' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(202611,2302);
 if actor is null or not newsroom_private.assignment_manager_allowed(p_story) then
   raise exception 'Assignment management unavailable' using errcode='42501';end if;
 if p_member is null or p_type is null or p_type not in ('author','editor','reviewer','copy','visual')
 or p_action is null or p_action not in ('create','reschedule','complete','revoke','reopen')
 or p_expected is null or p_expected<0 or p_request is null or p_reason is null
 or length(btrim(p_reason)) not between 12 and 500 or p_reason~'[[:cntrl:]]'
 or (p_action in ('complete','revoke') and p_due is not null)
 or (p_due is not null and (not isfinite(p_due) or p_due>now()+interval '2 years')) then
  raise exception 'Invalid assignment command' using errcode='22023';end if;
 select * into s from public.stories where id=p_story for update;
 if not found then raise exception 'Story unavailable' using errcode='P0002';end if;
 select * into m from public.staff_memberships where id=p_member for update;
 if not found or m.auth_user_id=actor then raise exception 'Target unavailable or self-assignment denied' using errcode='42501';end if;
 if p_action in ('create','reopen','reschedule') and
   (s.status='archived' or not (p_type=any(newsroom_private.assignment_eligible_types(p_member)))) then
   raise exception 'Target is not eligible for this assignment' using errcode='42501';end if;
 if p_due is not null and m.expires_at is not null and p_due>m.expires_at then
   raise exception 'Deadline exceeds membership expiry' using errcode='22023';end if;
 if exists(select 1 from public.staff_access_audit where request_id=p_request and action_key in ('staff_story_assignments.insert','staff_story_assignments.update')) then
   raise exception 'Assignment request already used; reload' using errcode='40001';end if;
 select * into a from public.staff_story_assignments where story_id=p_story and membership_id=p_member and assignment_type=p_type for update;
 if p_action='create' then
   if found or p_expected<>0 then raise exception 'Assignment already exists; reload' using errcode='40001';end if;
 else
   if not found or a.revision<>p_expected or (p_action='reopen' and a.status='active') or
     (p_action<>'reopen' and a.status<>'active') then raise exception 'Assignment changed; reload' using errcode='40001';end if;
 end if;
 perform pg_catalog.set_config('app.staff_actor_auth_id',actor::text,true);
 perform pg_catalog.set_config('app.staff_request_id',p_request::text,true);
 perform pg_catalog.set_config('app.staff_reason',btrim(p_reason),true);
 if p_action='create' then
   insert into public.staff_story_assignments(story_id,membership_id,assignment_type,status,due_at,created_by)
    values(p_story,p_member,p_type,'active',p_due,actor) returning * into a;
 else
   update public.staff_story_assignments set status=case p_action when 'complete' then 'completed' when 'revoke' then 'revoked' else 'active' end,
     due_at=case when p_action in ('reschedule','reopen') then p_due else due_at end
    where id=a.id and revision=p_expected returning * into a;
   if not found then raise exception 'Assignment changed; reload' using errcode='40001';end if;
 end if;
 return jsonb_build_object('id',a.id,'revision',a.revision,'status',a.status);
end;
$fn$;
revoke all on function newsroom_private.change_story_assignment(uuid,uuid,text,text,integer,timestamptz,text,uuid) from public,anon,authenticated;
grant execute on function newsroom_private.change_story_assignment(uuid,uuid,text,text,integer,timestamptz,text,uuid) to authenticated;
create function public.staff_read_story_assignments(p_story uuid,p_page integer,p_candidate_page integer)
returns jsonb language sql stable security invoker set search_path=''
as $fn$ select newsroom_private.read_story_assignments(p_story,p_page,p_candidate_page) $fn$;
create function public.staff_change_story_assignment(p_story uuid,p_member uuid,p_type text,p_action text,p_expected integer,p_due timestamptz,p_reason text,p_request uuid)
returns jsonb language sql security invoker set search_path=''
as $fn$ select newsroom_private.change_story_assignment(p_story,p_member,p_type,p_action,p_expected,p_due,p_reason,p_request) $fn$;
revoke all on function public.staff_read_story_assignments(uuid,integer,integer),
 public.staff_change_story_assignment(uuid,uuid,text,text,integer,timestamptz,text,uuid) from public,anon,authenticated;
grant execute on function public.staff_read_story_assignments(uuid,integer,integer),
 public.staff_change_story_assignment(uuid,uuid,text,text,integer,timestamptz,text,uuid) to authenticated;
commit;
