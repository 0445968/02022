-- CT16 R2c and R2b final search. Staged, inactive until explicit DB rollout.
alter type public.staff_capability_key add value 'story.publish_own_without_review';
alter type public.staff_capability_key add value 'byline.self_service';
alter type public.staff_capability_key add value 'media.quota_exempt';
begin;
create table newsroom_private.editorial_privilege_settings(id boolean primary key check(id),enabled boolean not null default false);
alter table newsroom_private.editorial_privilege_settings enable row level security;
revoke all on newsroom_private.editorial_privilege_settings from public,anon,authenticated,service_role;
insert into newsroom_private.editorial_privilege_settings(id,enabled) values(true,false);
-- The Owner fallback is restricted to a verified, active indefinite Owner.
-- Other staff require a time-limited individual override, own scope only.
create function newsroom_private.editorial_own_privilege(p_actor uuid,p_cap text)
returns boolean language sql stable security invoker set search_path='' as $fn$
 select p_cap in ('story.publish_own_without_review','byline.self_service','media.quota_exempt')
 and exists(select 1 from newsroom_private.editorial_privilege_settings where id and enabled)
 and coalesce(public.staff_invite_verified_identity(p_actor),false)
 and newsroom_private.publication_actor_permission(p_actor,'newsroom.access')
 and exists(select 1 from public.staff_memberships m where m.auth_user_id=p_actor and m.status='active'
 and (m.expires_at is null or m.expires_at>now())
 and not exists(select 1 from public.staff_capability_overrides o where o.membership_id=m.id and o.capability_key::text=p_cap and o.effect='deny' and o.scope in ('own','all') and (o.expires_at is null or o.expires_at>now()))
 and (exists(select 1 from public.staff_member_roles mr join public.staff_role_presets pr on pr.id=mr.role_preset_id where mr.membership_id=m.id and pr.role_key='owner' and mr.expires_at is null and m.expires_at is null and m.member_type='employee')
 or exists(select 1 from public.staff_capability_overrides o where o.membership_id=m.id and o.capability_key::text=p_cap and o.effect='allow' and o.scope='own' and o.expires_at>now())))
$fn$;
revoke all on function newsroom_private.editorial_own_privilege(uuid,text) from public,anon,authenticated,service_role;
create function newsroom_private.may_self_publish(p_story uuid,p_kind text)
returns boolean language sql stable security invoker set search_path='' as $fn$
 select newsroom_private.editorial_own_privilege(auth.uid(),'story.publish_own_without_review')
 and newsroom_private.publication_actor_permission(auth.uid(),'story.publish',p_story)
 and newsroom_private.publication_actor_permission(auth.uid(),'story.edit_all',p_story)
 and newsroom_private.publication_actor_permission(auth.uid(),'story.view_all',p_story)
 and exists(select 1 from public.stories s where s.id=p_story and s.author_id=auth.uid() and s.created_by=auth.uid()
 and ((p_kind='draft' and s.status='draft') or (p_kind='revision' and s.status='published' and newsroom_private.publication_actor_permission(auth.uid(),'revision.view',p_story) and newsroom_private.publication_actor_permission(auth.uid(),'revision.publish',p_story)
 and exists(select 1 from public.story_revisions r where r.story_id=s.id and r.status='draft' and r.author_id=auth.uid() and r.created_by=auth.uid()))))
 and not exists(select 1 from newsroom_private.reviewed_publication_schedules q where q.story_id=p_story and q.state in ('pending','blocked'))
$fn$;
revoke all on function newsroom_private.may_self_publish(uuid,text) from public,anon,authenticated,service_role;
create table newsroom_private.self_publication_events(
 request_id uuid primary key,story_id uuid not null,kind text not null check(kind in ('draft','revision')),fingerprint text not null,actor uuid not null,reason text not null check(length(btrim(reason)) between 12 and 1000),published_at timestamptz not null default clock_timestamp()
);
alter table newsroom_private.self_publication_events enable row level security;
revoke all on newsroom_private.self_publication_events from public,anon,authenticated,service_role;
create function newsroom_private.publish_own_story(p_story uuid,p_kind text,p_request uuid,p_fingerprint text,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare actor uuid:=auth.uid(); snap jsonb; s public.stories%rowtype;r public.story_revisions%rowtype; previous newsroom_private.self_publication_events%rowtype;
begin
 if p_story is null or p_request is null or p_kind is null or p_kind not in ('draft','revision') or p_fingerprint is null or p_fingerprint!~'^[0-9a-f]{64}$' or p_reason is null or length(btrim(p_reason)) not between 12 and 1000 or p_reason~'[[:cntrl:]]' then raise exception 'Invalid self publication' using errcode='22023';end if;
 perform pg_advisory_xact_lock(202611,2302);
 if not newsroom_private.editorial_own_privilege(actor,'story.publish_own_without_review') then raise exception 'Self publication unavailable' using errcode='42501';end if;
 select * into previous from newsroom_private.self_publication_events where request_id=p_request;
 if found then
  if previous.actor is distinct from actor or previous.story_id is distinct from p_story or previous.kind is distinct from p_kind or previous.fingerprint is distinct from p_fingerprint or previous.reason is distinct from btrim(p_reason) or not newsroom_private.publication_actor_permission(actor,'story.publish',p_story) then raise exception 'Request conflict' using errcode='40001';end if;
  return jsonb_build_object('storyId',p_story,'kind',p_kind,'requestId',p_request,'status','published','method','self_publication');
 end if;
 snap:=newsroom_private.lock_review_snapshot(p_story,p_kind);
 if not newsroom_private.may_self_publish(p_story,p_kind) then raise exception 'Self publication unavailable' using errcode='42501';end if;
 if snap is null or snap->>'status'<>'draft' or snap->>'fingerprint' is distinct from p_fingerprint then raise exception 'Saved copy changed; reload' using errcode='40001';end if;
 select * into s from public.stories where id=p_story;
 if p_kind='revision' then
  select * into r from public.story_revisions where story_id=p_story;
  perform newsroom_private.check_publication_media(r.body,r.featured_image_id,r.image_credit);
 else perform newsroom_private.check_publication_media(s.body,s.featured_image_id,s.image_credit);end if;
 insert into newsroom_private.publication_permits values(p_story,pg_current_xact_id(),pg_backend_pid(),actor);
 if p_kind='revision' then perform newsroom_private.apply_reviewed_revision(p_story,actor);
 else
  update public.stories set status='published',published_at=coalesce(s.published_at,now()),scheduled_at=null,updated_by=actor where id=p_story and status='draft' returning * into s;
  if not found then raise exception 'Story changed' using errcode='40001';end if;
  insert into public.story_versions(story_id,headline,short_title,story_type,subheadline,summary,body,author_id,editor_id,language,primary_category_id,created_by)
   values(s.id,s.headline,s.short_title,s.story_type,s.subheadline,s.summary,s.body,s.author_id,s.editor_id,s.language,s.primary_category_id,actor);
 end if;
 insert into newsroom_private.self_publication_events(request_id,story_id,kind,fingerprint,actor,reason) values(p_request,p_story,p_kind,p_fingerprint,actor,btrim(p_reason));
 delete from newsroom_private.publication_permits where story_id=p_story and transaction_id=pg_current_xact_id();
 return jsonb_build_object('storyId',p_story,'kind',p_kind,'requestId',p_request,'status','published','method','self_publication');
end;$fn$;
create function newsroom_private.read_self_publish(p_story uuid,p_kind text)
returns boolean language sql stable security definer set search_path='' as $fn$ select newsroom_private.may_self_publish(p_story,p_kind) $fn$;
create function public.staff_can_self_publish(p_story uuid,p_kind text)
returns boolean language sql stable security invoker set search_path='' as $fn$ select newsroom_private.read_self_publish(p_story,p_kind) $fn$;
create function public.staff_publish_own_story(p_story uuid,p_kind text,p_request uuid,p_fingerprint text,p_reason text)
returns jsonb language sql security invoker set search_path='' as $fn$ select newsroom_private.publish_own_story(p_story,p_kind,p_request,p_fingerprint,p_reason) $fn$;
revoke all on function newsroom_private.publish_own_story(uuid,text,uuid,text,text),newsroom_private.read_self_publish(uuid,text),public.staff_can_self_publish(uuid,text),public.staff_publish_own_story(uuid,text,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function newsroom_private.publish_own_story(uuid,text,uuid,text,text),newsroom_private.read_self_publish(uuid,text),public.staff_can_self_publish(uuid,text),public.staff_publish_own_story(uuid,text,uuid,text,text) to authenticated;

-- Self-service byline is only an association with a pre-existing same-account
-- editorial profile. No change to author_id, account_id, public name or history.
create or replace function public.staff_guard_byline_review()
returns trigger language plpgsql security invoker set search_path=''
as $fn$
declare
  v_actor uuid:=nullif(pg_catalog.current_setting('app.staff_byline_actor',true),'')::uuid;
  v_request uuid:=nullif(pg_catalog.current_setting('app.staff_byline_request',true),'')::uuid;
  v_reason text:=nullif(pg_catalog.current_setting('app.staff_byline_reason',true),'');
  v_subject uuid; v_requested boolean; v_profile_revision integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(202611,2302);
  if tg_op='DELETE' or v_request is null or v_reason is null
    or length(btrim(v_reason))<12 or length(v_reason)>500
    or new.reviewed_by<>v_actor then
    raise exception 'Byline review denied' using errcode='42501';
  end if;
  select m.auth_user_id,s.byline_requested,s.revision into v_subject,v_requested,v_profile_revision
    from public.staff_memberships m join public.staff_onboarding_profiles s on s.membership_id=m.id
    where m.id=new.membership_id;
  if not public.staff_byline_owner_allowed(v_actor) and not (
    v_actor=v_subject and new.status='approved' and newsroom_private.editorial_own_privilege(v_actor,'byline.self_service')
    and exists(select 1 from public.editorial_profiles e where e.id=new.editorial_profile_id and e.account_id=v_actor)
  ) then raise exception 'Byline review denied' using errcode='42501';end if;
  if v_subject is null or new.reviewed_profile_revision<>v_profile_revision then
    raise exception 'Staff request changed' using errcode='40001';
  end if;
  if tg_op='INSERT' then
    if new.revision<>1 or new.status='unlinked' then
      raise exception 'Invalid initial review' using errcode='40001'; end if;
  else
    if new.membership_id<>old.membership_id or new.revision<>old.revision+1
      or (old.status='approved' and new.status<>'unlinked')
      or (new.status='unlinked' and old.status<>'approved') then
      raise exception 'Invalid review transition' using errcode='40001'; end if;
    if old.status<>'approved' and old.reviewed_profile_revision>=new.reviewed_profile_revision then
      raise exception 'No new request revision' using errcode='40001'; end if;
  end if;
  if new.status in ('approved','rejected') and (not v_requested
      or public.staff_onboarding_actor_membership(v_subject) is distinct from new.membership_id) then
    raise exception 'No eligible current request' using errcode='42501';
  end if;
  if new.status='approved' and not public.staff_byline_candidate_allowed(new.membership_id,new.editorial_profile_id) then
    raise exception 'Byline unavailable for this account' using errcode='40001';
  end if;
  insert into public.staff_access_audit(actor_auth_user_id,subject_membership_id,
    action_key,before_state,after_state,reason,request_id)
  values(v_actor,new.membership_id,'staff_byline.'||new.status,
    case when tg_op='UPDATE' then pg_catalog.jsonb_build_object('status',old.status,
      'editorial_profile_id',old.editorial_profile_id,'revision',old.revision) else null end,
    pg_catalog.jsonb_build_object('status',new.status,'editorial_profile_id',new.editorial_profile_id,
      'revision',new.revision,'profile_revision',new.reviewed_profile_revision),v_reason,v_request);
  return new;
end;
$fn$;
create function newsroom_private.self_byline_options()
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare actor uuid:=auth.uid(); member uuid; p public.staff_onboarding_profiles%rowtype; b public.staff_byline_reviews%rowtype; options jsonb;
begin
 if not newsroom_private.editorial_own_privilege(actor,'byline.self_service') then raise exception 'Self byline unavailable' using errcode='42501';end if;
 member:=public.staff_onboarding_actor_membership(actor);
 select * into p from public.staff_onboarding_profiles where membership_id=member;
 if not found or not p.byline_requested then raise exception 'Request byline in profile first' using errcode='42501';end if;
 select * into b from public.staff_byline_reviews where membership_id=member;
 select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'name',e.byline_name) order by e.id),'[]'::jsonb) into options from public.editorial_profiles e where e.account_id=actor and public.staff_byline_candidate_allowed(member,e.id);
 return jsonb_build_object('profileRevision',p.revision,'reviewRevision',coalesce(b.revision,0),'approved',coalesce(b.status='approved',false),'items',options);
end;$fn$;
create function newsroom_private.link_self_byline(p_byline uuid,p_profile integer,p_review integer,p_reason text,p_request uuid)
returns integer language plpgsql security definer set search_path='' as $fn$
declare actor uuid:=auth.uid(); member uuid; p public.staff_onboarding_profiles%rowtype; b public.staff_byline_reviews%rowtype;
begin
 perform pg_advisory_xact_lock(202611,2302);
 if not newsroom_private.editorial_own_privilege(actor,'byline.self_service') then raise exception 'Self byline unavailable' using errcode='42501';end if;
 if p_byline is null or p_profile is null or p_review is null or p_request is null or p_reason is null or length(btrim(p_reason)) not between 12 and 500 or p_reason~'[[:cntrl:]]' then raise exception 'Invalid byline command' using errcode='22023';end if;
 member:=public.staff_onboarding_actor_membership(actor);
 select * into p from public.staff_onboarding_profiles where membership_id=member for update;
 if not found or p.revision<>p_profile or not p.byline_requested then raise exception 'Profile changed' using errcode='40001';end if;
 select * into b from public.staff_byline_reviews where membership_id=member for update;
 if coalesce(b.revision,0)<>p_review or b.status='approved' then raise exception 'Association changed' using errcode='40001';end if;
 if not exists(select 1 from public.editorial_profiles e where e.id=p_byline and e.account_id=actor) or not public.staff_byline_candidate_allowed(member,p_byline) then raise exception 'Byline unavailable' using errcode='42501';end if;
 perform set_config('app.staff_byline_actor',actor::text,true);perform set_config('app.staff_byline_reason',btrim(p_reason),true);perform set_config('app.staff_byline_request',p_request::text,true);
 if b.membership_id is null then insert into public.staff_byline_reviews values(member,p_byline,'approved',p.revision,1,actor,clock_timestamp());
 else update public.staff_byline_reviews set editorial_profile_id=p_byline,status='approved',reviewed_profile_revision=p.revision,revision=p_review+1,reviewed_by=actor,reviewed_at=clock_timestamp() where membership_id=member;end if;
 return p_review+1;
end;$fn$;
create function public.staff_read_self_byline() returns jsonb language sql stable security invoker set search_path='' as $fn$ select newsroom_private.self_byline_options() $fn$;
create function public.staff_link_self_byline(p_byline uuid,p_profile integer,p_review integer,p_reason text,p_request uuid) returns integer language sql security invoker set search_path='' as $fn$ select newsroom_private.link_self_byline(p_byline,p_profile,p_review,p_reason,p_request) $fn$;
revoke all on function newsroom_private.self_byline_options(),newsroom_private.link_self_byline(uuid,integer,integer,text,uuid),public.staff_read_self_byline(),public.staff_link_self_byline(uuid,integer,integer,text,uuid) from public,anon,authenticated,service_role;
grant execute on function newsroom_private.self_byline_options(),newsroom_private.link_self_byline(uuid,integer,integer,text,uuid),public.staff_read_self_byline(),public.staff_link_self_byline(uuid,integer,integer,text,uuid) to authenticated;

-- Retain reservation paths, object/catalog restrictions and 10 MiB maximum.
-- Only the cumulative reservation slot cap changes, not the upload security path.
alter table newsroom_private.private_upload_reservations drop constraint private_upload_reservations_slot_check;
alter table newsroom_private.private_upload_reservations alter column slot type bigint;
alter table newsroom_private.private_upload_reservations add constraint private_upload_reservations_slot_positive check(slot>0);
revoke insert on newsroom_private.private_upload_reservations from authenticated;
revoke insert(auth_user_id,slot,extension) on newsroom_private.private_upload_reservations from authenticated;
create function newsroom_private.reserve_privileged_upload(p_extension text)
returns text language plpgsql security definer set search_path='' as $fn$
declare actor uuid:=auth.uid();v_path text;v_slot bigint;used bigint;
begin
 if not coalesce(public.staff_invite_verified_identity(actor),false) or not newsroom_private.publication_actor_permission(actor,'newsroom.access') or not newsroom_private.publication_actor_permission(actor,'media.upload') then raise exception 'Private upload unavailable' using errcode='42501';end if;
 if p_extension is null or p_extension not in ('jpg','png','webp','gif','avif') then raise exception 'Invalid image extension' using errcode='22023';end if;
 perform pg_advisory_xact_lock(202611,2302);
 select count(*),coalesce(max(slot),0)+1 into used,v_slot from newsroom_private.private_upload_reservations where auth_user_id=actor;
 if used>=25 and not newsroom_private.editorial_own_privilege(actor,'media.quota_exempt') then raise exception 'Private upload allowance exhausted' using errcode='P0001';end if;
 insert into newsroom_private.private_upload_reservations(auth_user_id,slot,extension) values(actor,v_slot,p_extension) returning storage_path into v_path;
 return v_path;
end;$fn$;
create function newsroom_private.read_privileged_upload_quota()
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare actor uuid:=auth.uid();used bigint;exempt boolean;
begin
 if not coalesce(public.staff_invite_verified_identity(actor),false) or not newsroom_private.publication_actor_permission(actor,'newsroom.access') or not newsroom_private.publication_actor_permission(actor,'media.upload') then raise exception 'Private upload unavailable' using errcode='42501';end if;
 select count(*) into used from newsroom_private.private_upload_reservations where auth_user_id=actor;
 exempt:=newsroom_private.editorial_own_privilege(actor,'media.quota_exempt');
 return jsonb_build_object('usedSlots',used,'maxSlots',case when not exempt then 25 end,'remainingSlots',case when not exempt then greatest(25-used,0) end,'maxFileBytes',10485760,'maxReservedBytes',case when not exempt then 262144000 end);
end;$fn$;
create or replace function public.staff_reserve_private_upload(p_extension text) returns text language sql security invoker set search_path='' as $fn$ select newsroom_private.reserve_privileged_upload(p_extension) $fn$;
create or replace function public.staff_private_upload_quota() returns jsonb language sql stable security invoker set search_path='' as $fn$ select newsroom_private.read_privileged_upload_quota() $fn$;
revoke all on function newsroom_private.reserve_privileged_upload(text),newsroom_private.read_privileged_upload_quota() from public,anon,authenticated,service_role;
grant execute on function newsroom_private.reserve_privileged_upload(text),newsroom_private.read_privileged_upload_quota() to authenticated;

create function newsroom_private.search_work_assignments(p_mode text,p_page integer,p_id uuid,p_query text,p_status text,p_priority text)
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare member uuid:=newsroom_private.work_actor(); team boolean; manager boolean; items jsonb; more boolean; history jsonb:='[]'; candidates jsonb:='[]';
begin
 if member is null then raise exception 'Assignments unavailable' using errcode='42501';end if;
 if p_mode is null or p_mode not in ('team','personal') or p_page is null or p_page not between 0 and 100 then raise exception 'Invalid page' using errcode='22023';end if;
 team:=newsroom_private.work_permission(member,'assignment.view_team',false);
 manager:=team and newsroom_private.work_permission(member,'assignment.manage',false);
 if p_query is null or length(p_query)>160 or p_query~'[[:cntrl:]]' or (p_status is not null and p_status not in ('assigned','in_progress','blocked','completed','cancelled')) or (p_priority is not null and p_priority not in ('low','normal','high','urgent')) then raise exception 'Invalid work filters' using errcode='22023';end if;
 if p_mode='team' and not team then raise exception 'Team assignments unavailable' using errcode='42501';end if;
 if p_mode='personal' and not newsroom_private.work_permission(member,'assignment.view_assigned',true) then raise exception 'Personal assignments unavailable' using errcode='42501';end if;
 with visible as materialized (
 select a.*,newsroom_private.work_can_view_story(a.story_id) as story_visible from newsroom_private.work_assignments a
 where (p_id is null or a.id=p_id) and (p_mode='team' or exists(select 1 from newsroom_private.work_assignment_members am where am.assignment_id=a.id and am.membership_id=member))
 and (p_id is not null or ((p_status is null or a.status=p_status) and (p_priority is null or a.priority=p_priority) and (btrim(p_query)='' or strpos(lower(a.title),lower(btrim(p_query)))>0 or strpos(lower(a.activity),lower(btrim(p_query)))>0 or strpos(lower(coalesce(a.coverage,'')),lower(btrim(p_query)))>0 or exists(select 1 from newsroom_private.work_assignment_members am join public.staff_memberships m on m.id=am.membership_id join public.profiles p on p.id=m.auth_user_id where am.assignment_id=a.id and strpos(lower(coalesce(p.name,'')),lower(btrim(p_query)))>0))))
 order by a.updated_at desc,a.id limit 26 offset p_page*25
 ), numbered as (select v.*,row_number() over(order by updated_at desc,id) rn from visible v)
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'title',a.title,'activity',a.activity,'coverage',a.coverage,
  'storyId',case when a.story_visible then a.story_id end,'storyHeadline',case when a.story_visible then (select s.headline from public.stories s where s.id=a.story_id) end,
  'priority',a.priority,'status',a.status,'dueAt',a.due_at,'notes',a.notes,'revision',a.revision,'updatedAt',a.updated_at,
  'assignees',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'name',coalesce(nullif(left(btrim(p.name),120),''),'Staff '||left(m.id::text,8))) order by m.id)
   from newsroom_private.work_assignment_members am join public.staff_memberships m on m.id=am.membership_id left join public.profiles p on p.id=m.auth_user_id where am.assignment_id=a.id),'[]'::jsonb),
  'canEdit',manager and a.story_visible,'canUpdateStatus',manager or (newsroom_private.work_permission(member,'assignment.update_assigned',true)
   and exists(select 1 from newsroom_private.work_assignment_members am where am.assignment_id=a.id and am.membership_id=member))) order by a.rn) filter(where a.rn<=25),'[]'::jsonb),count(*)>25 and p_page<100 into items,more from numbered a;
 if p_id is not null and jsonb_array_length(items)=0 then raise exception 'Assignment unavailable' using errcode='42501';end if;
 if manager then
  select coalesce(jsonb_agg(entry order by mid),'[]'::jsonb) into candidates from (
   select m.id mid,jsonb_build_object('id',m.id,'name',coalesce(nullif(left(btrim(p.name),120),''),'Staff '||left(m.id::text,8))) entry
   from public.staff_memberships m left join public.profiles p on p.id=m.auth_user_id where newsroom_private.work_permission(m.id,'assignment.view_assigned',true) order by m.id limit 100) c;
  if p_id is not null then
   select coalesce(jsonb_agg(entry order by at desc,id desc),'[]'::jsonb) into history from (
    select e.id,e.occurred_at at,jsonb_build_object('id',e.id,'at',e.occurred_at,'action',e.action,'revision',e.revision,'reason',e.reason,
    'actor',coalesce(nullif(left(btrim(p.name),120),''),'Staff')) entry from newsroom_private.work_assignment_events e left join public.profiles p on p.id=e.actor
    where e.assignment_id=p_id order by e.occurred_at desc,e.id desc limit 25) h;
  end if;
 end if;
 return jsonb_build_object('mode',p_mode,'canManage',manager,'canViewTeam',team,'items',items,'hasMore',more,'candidates',candidates,'history',history);
end;
$fn$;
revoke all on function newsroom_private.search_work_assignments(text,integer,uuid,text,text,text) from public,anon,authenticated,service_role;
grant execute on function newsroom_private.search_work_assignments(text,integer,uuid,text,text,text) to authenticated;
create function public.staff_search_work_assignments(p_mode text,p_page integer,p_id uuid,p_query text,p_status text,p_priority text)
returns jsonb language sql stable security invoker set search_path='' as $fn$ select newsroom_private.search_work_assignments(p_mode,p_page,p_id,p_query,p_status,p_priority) $fn$;
revoke all on function public.staff_search_work_assignments(text,integer,uuid,text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.staff_search_work_assignments(text,integer,uuid,text,text,text) to authenticated;
commit;
