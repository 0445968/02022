-- CT16 staged ownership hardening + homepage section visibility.
begin;
-- Prevent authenticated users rewriting story/revision creator provenance.
-- Trusted legacy service inserts without a JWT remain subject to existing grants.
create function newsroom_private.guard_editorial_creator()
returns trigger language plpgsql security invoker set search_path='' as $fn$
begin
 if tg_op='UPDATE' and new.created_by is distinct from old.created_by then
  raise exception 'Creator provenance is immutable' using errcode='42501';
 end if;
 if tg_op='INSERT' and auth.uid() is not null and new.created_by is distinct from auth.uid() then
  raise exception 'Creator must match authenticated actor' using errcode='42501';
 end if;
 return new;
end;$fn$;
revoke all on function newsroom_private.guard_editorial_creator() from public,anon,authenticated,service_role;
create trigger ct16_story_creator_guard before insert or update on public.stories for each row execute function newsroom_private.guard_editorial_creator();
create trigger ct16_revision_creator_guard before insert or update on public.story_revisions for each row execute function newsroom_private.guard_editorial_creator();
create or replace function public.staff_guard_capability_override()
returns trigger language plpgsql security invoker set search_path = ''
as $fn$
declare
  v_member uuid;
  v_cap public.staff_capability_key;
  v_is_owner boolean;
begin
  perform pg_catalog.pg_advisory_xact_lock(202611,2302);

  if tg_op='DELETE' then
    v_member:=old.membership_id;
    v_cap:=old.capability_key;
  else
    v_member:=new.membership_id;
    v_cap:=new.capability_key;
  end if;
  if v_cap::text like 'team.%'
    or v_cap in (
      'settings.security_admin'::public.staff_capability_key,
      'reader.personal'::public.staff_capability_key,
      'newsroom.access'::public.staff_capability_key
    ) then
    raise exception 'Administrative/entry/personal access cannot be overridden'
      using errcode='42501';
  end if;

  select exists(
    select 1 from public.staff_member_roles r
    join public.staff_role_presets p on p.id=r.role_preset_id
    where r.membership_id=v_member and p.role_key='owner'
  ) into v_is_owner;
  if v_is_owner then
    raise exception 'Owner membership cannot receive permission exceptions'
      using errcode='42501';
  end if;

  if tg_op='DELETE' then return old; end if;
  if tg_op='UPDATE' then
    if new.id is distinct from old.id
      or new.membership_id is distinct from old.membership_id
      or new.capability_key is distinct from old.capability_key
      or new.scope is distinct from old.scope
      or new.created_at is distinct from old.created_at then
      raise exception 'Override identity and scope cannot be reassigned'
        using errcode='42501';
    end if;
  end if;

  if v_cap::text in ('story.publish_own_without_review','byline.self_service','media.quota_exempt') and new.scope<>'own' then raise exception 'Editorial exception requires own scope' using errcode='22023';end if;
  if v_cap::text in ('assignment.view_team','assignment.manage') and new.scope<>'all' then raise exception 'Team assignment permission requires all scope' using errcode='22023';end if;
  if v_cap::text in ('assignment.view_assigned','assignment.update_assigned') and new.scope not in ('all','assigned') then raise exception 'Assigned work permission requires assigned or all scope' using errcode='22023';end if;
  if new.effect not in ('allow','deny') or new.scope not in ('all','assigned','own')
    or pg_catalog.length(pg_catalog.btrim(new.reason)) < 12
    or pg_catalog.length(new.reason)>500 or new.granted_by is null then
    raise exception 'Override fields/reason are invalid'
      using errcode='22023';
  end if;
  if new.effect='allow' then
    if new.expires_at is null or new.expires_at<now()+interval '1 hour'
      or new.expires_at>now()+interval '90 days' then
      raise exception 'Allow overrides must expire within 1h to 90d'
        using errcode='22023';
    end if;
  elsif new.expires_at is not null and
    (new.expires_at<=now() or new.expires_at>now()+interval '365 days') then
    raise exception 'Deny exception expiration is invalid'
      using errcode='22023';
  end if;
  return new;
end;
$fn$;
create or replace function newsroom_private.reserve_privileged_upload(p_extension text)
returns text language plpgsql security definer set search_path='' as $fn$
declare actor uuid:=auth.uid();v_path text;v_slot bigint;used bigint;
begin
 if not coalesce(public.staff_invite_verified_identity(actor),false) or not newsroom_private.publication_actor_permission(actor,'newsroom.access') or not newsroom_private.publication_actor_permission(actor,'media.upload') then raise exception 'Private upload unavailable' using errcode='42501';end if;
 if p_extension is null or p_extension not in ('jpg','png','webp','gif','avif') then raise exception 'Invalid image extension' using errcode='22023';end if;
 perform pg_advisory_xact_lock(202611,2302);
 if not coalesce(public.staff_invite_verified_identity(actor),false) or not newsroom_private.publication_actor_permission(actor,'newsroom.access') or not newsroom_private.publication_actor_permission(actor,'media.upload') then raise exception 'Private upload unavailable' using errcode='42501';end if;
 select count(*),coalesce(max(slot),0)+1 into used,v_slot from newsroom_private.private_upload_reservations where auth_user_id=actor;
 if used>=25 and not newsroom_private.editorial_own_privilege(actor,'media.quota_exempt') then raise exception 'Private upload allowance exhausted' using errcode='P0001';end if;
 insert into newsroom_private.private_upload_reservations(auth_user_id,slot,extension) values(actor,v_slot,p_extension) returning storage_path into v_path;
 return v_path;
end;$fn$;
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
    or v_actor is null or new.reviewed_by is distinct from v_actor then
    raise exception 'Byline review denied' using errcode='42501';
  end if;
  select m.auth_user_id,s.byline_requested,s.revision into v_subject,v_requested,v_profile_revision
    from public.staff_memberships m join public.staff_onboarding_profiles s on s.membership_id=m.id
    where m.id=new.membership_id;
  if not public.staff_byline_owner_allowed(v_actor) then
    if v_actor is distinct from (select auth.uid()) or v_actor is distinct from v_subject or new.status<>'approved' then raise exception 'Byline review denied' using errcode='42501';end if;
    if not newsroom_private.editorial_own_privilege(v_actor,'byline.self_service') or not exists(select 1 from public.editorial_profiles e where e.id=new.editorial_profile_id and e.account_id=v_actor) then raise exception 'Byline review denied' using errcode='42501';end if;
  end if;
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
-- Legacy ownership may predate this guard. Explicit rollout must reconcile
-- old creator/author attribution before enabling independent-review exceptions.

-- Draft and published visibility share the existing layout revision and lock.
-- Preserve all story selections when hidden, and default older history to visible.
create function newsroom_private.homepage_default_visibility()
returns jsonb language sql immutable security invoker set search_path='' as $fn$ select '{"breaking_news":true,"latest_news":true,"editors_picks":true,"podcast":true,"featured_content":true,"watch_live":true,"shorts":true,"section_features":true,"across_the_islands":true,"radio":true,"headline_bar":true}'::jsonb $fn$;
create function newsroom_private.valid_homepage_visibility(p jsonb)
returns boolean language sql immutable security invoker set search_path='' as $fn$
 select case when jsonb_typeof(p)='object' then
 (select count(*)=11 and bool_and(key=any(array['breaking_news','latest_news','editors_picks','podcast','featured_content','watch_live','shorts','section_features','across_the_islands','radio','headline_bar']) and jsonb_typeof(value)='boolean') from jsonb_each(p))
 else false end
$fn$;
create table newsroom_private.homepage_visibility(
 singleton boolean primary key check(singleton),
 draft jsonb not null check(newsroom_private.valid_homepage_visibility(draft)),
 published jsonb not null check(newsroom_private.valid_homepage_visibility(published))
);
insert into newsroom_private.homepage_visibility values(true,newsroom_private.homepage_default_visibility(),newsroom_private.homepage_default_visibility());
alter table newsroom_private.homepage_visibility enable row level security;
revoke all on newsroom_private.homepage_visibility from public,anon,authenticated,service_role;
alter table newsroom_private.homepage_versions add column visibility jsonb not null default '{"breaking_news":true,"latest_news":true,"editors_picks":true,"podcast":true,"featured_content":true,"watch_live":true,"shorts":true,"section_features":true,"across_the_islands":true,"radio":true,"headline_bar":true}'::jsonb check(newsroom_private.valid_homepage_visibility(visibility));
-- Rename original mutator; only new internal wrapper may call it.
alter function newsroom_private.change_homepage_versioned(text,integer,jsonb,integer) rename to change_homepage_layout_core;
revoke all on function newsroom_private.change_homepage_layout_core(text,integer,jsonb,integer) from public,anon,authenticated,service_role;
create function newsroom_private.read_homepage_visibility_versioned()
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare layout jsonb; v newsroom_private.homepage_visibility%rowtype;
begin
 layout:=newsroom_private.read_homepage_versioned();
 select * into v from newsroom_private.homepage_visibility where singleton;
 return layout||jsonb_build_object('visibility',v.draft,'publishedVisibility',v.published);
end;$fn$;
create function newsroom_private.change_homepage_visibility_versioned(p_action text,p_expected integer,p_copy jsonb,p_restore integer,p_visibility jsonb)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare state jsonb; v newsroom_private.homepage_visibility%rowtype; chosen jsonb;
begin
 if not newsroom_private.homepage_editor_allowed(p_action='publish') then raise exception 'Layout access denied' using errcode='42501';end if;
 if p_visibility is not null and (p_action not in ('save','publish') or not newsroom_private.valid_homepage_visibility(p_visibility)) then raise exception 'Invalid section visibility' using errcode='22023';end if;
 perform pg_advisory_xact_lock(202611,2302);
 select * into v from newsroom_private.homepage_visibility where singleton for update;
 if p_action='restore' then
  select visibility into chosen from newsroom_private.homepage_versions where revision=p_restore;
 elsif p_action='revert' then chosen:=v.published;
 else chosen:=coalesce(p_visibility,v.draft);end if;
 -- The original core enforces exact revision, editor/publish grants, valid
 -- story selections and version history. Any failure rolls back both states.
 state:=newsroom_private.change_homepage_layout_core(p_action,p_expected,p_copy,p_restore);
 if p_action='publish' then
  -- Baseline visibility remains the initial all-visible default.
  update newsroom_private.homepage_versions set visibility=chosen where revision=(state->>'revision')::integer;
  update newsroom_private.homepage_visibility set draft=chosen,published=chosen where singleton;
 else update newsroom_private.homepage_visibility set draft=chosen where singleton;end if;
 return newsroom_private.read_homepage_visibility_versioned();
end;$fn$;
-- Legacy callers preserve draft visibility and restore/revert it atomically.
create function newsroom_private.change_homepage_versioned(p_action text,p_expected integer,p_copy jsonb,p_restore integer)
returns jsonb language sql security definer set search_path='' as $fn$
 select newsroom_private.change_homepage_visibility_versioned(p_action,p_expected,p_copy,p_restore,null)-array['visibility','publishedVisibility'] $fn$;
create or replace function public.staff_change_homepage_versioned(p_action text,p_expected integer,p_copy jsonb,p_restore integer)
returns jsonb language sql security invoker set search_path='' as $fn$ select newsroom_private.change_homepage_versioned(p_action,p_expected,p_copy,p_restore) $fn$;
create function public.staff_read_homepage_visibility_versioned()
returns jsonb language sql stable security invoker set search_path='' as $fn$ select newsroom_private.read_homepage_visibility_versioned() $fn$;
create function public.staff_change_homepage_visibility_versioned(p_action text,p_expected integer,p_copy jsonb,p_restore integer,p_visibility jsonb)
returns jsonb language sql security invoker set search_path='' as $fn$ select newsroom_private.change_homepage_visibility_versioned(p_action,p_expected,p_copy,p_restore,p_visibility) $fn$;
-- Only the published booleans are public, never draft/history or story metadata.
create function newsroom_private.read_public_homepage_visibility()
returns jsonb language sql stable security definer set search_path='' as $fn$ select published from newsroom_private.homepage_visibility where singleton $fn$;
create function public.read_public_homepage_visibility()
returns jsonb language sql stable security invoker set search_path='' RETURN newsroom_private.read_public_homepage_visibility();
revoke all on function newsroom_private.homepage_default_visibility(),newsroom_private.valid_homepage_visibility(jsonb),newsroom_private.read_homepage_visibility_versioned(),newsroom_private.change_homepage_visibility_versioned(text,integer,jsonb,integer,jsonb),newsroom_private.change_homepage_versioned(text,integer,jsonb,integer),public.staff_read_homepage_visibility_versioned(),public.staff_change_homepage_visibility_versioned(text,integer,jsonb,integer,jsonb),newsroom_private.read_public_homepage_visibility(),public.read_public_homepage_visibility() from public,anon,authenticated,service_role;
grant execute on function newsroom_private.read_homepage_visibility_versioned(),newsroom_private.change_homepage_visibility_versioned(text,integer,jsonb,integer,jsonb),newsroom_private.change_homepage_versioned(text,integer,jsonb,integer),public.staff_read_homepage_visibility_versioned(),public.staff_change_homepage_visibility_versioned(text,integer,jsonb,integer,jsonb) to authenticated;
grant execute on function newsroom_private.read_public_homepage_visibility(),public.read_public_homepage_visibility() to anon,authenticated;

-- CT16 R3b: independent versioned placement approval; poll copy/vote pool unchanged.
create table newsroom_private.poll_placement_state(
 poll_id uuid primary key references newsroom_private.polls(id) on delete restrict,
 revision integer not null check(revision>0),
 draft jsonb not null check(jsonb_typeof(draft)='array' and jsonb_array_length(draft)<=20),
 published jsonb not null check(jsonb_typeof(published)='array' and jsonb_array_length(published)<=20),
 draft_actor uuid not null, published_actor uuid, updated_at timestamptz not null default clock_timestamp()
);
create table newsroom_private.poll_placement_events(
 poll_id uuid not null references newsroom_private.polls(id) on delete restrict,
 revision integer not null, action text not null check(action in ('save','publish','revert')),
 actor uuid not null, reason text not null check(length(btrim(reason)) between 12 and 500),
 draft jsonb not null, published jsonb not null, at timestamptz not null default clock_timestamp(),
 primary key(poll_id,revision)
);
alter table newsroom_private.poll_placement_state enable row level security;
alter table newsroom_private.poll_placement_events enable row level security;
revoke all on newsroom_private.poll_placement_state,newsroom_private.poll_placement_events from public,anon,authenticated,service_role;
create function newsroom_private.poll_placement_target_valid(p_kind text,p_target text)
returns boolean language sql stable security invoker set search_path='' as $fn$
 select case when p_kind in ('homepage','latest','san-andres','old-providence','saint-catalina') then p_target=''
 when p_kind='category' then p_target~'^[a-z0-9][a-z0-9-]{0,119}$' and exists(select 1 from public.categories where slug=p_target and active)
 when p_kind='article' and p_target~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
 exists(select 1 from public.stories where id=p_target::uuid and status='published' and access_level='public' and published_at<=statement_timestamp())
 else false end
$fn$;
create function newsroom_private.validate_poll_placements(p_copy jsonb)
returns void language plpgsql security invoker set search_path='' as $fn$
declare x jsonb; a timestamptz; b timestamptz; k text; target text;
begin
 if p_copy is null or jsonb_typeof(p_copy)<>'array' or jsonb_array_length(p_copy)>20 then raise exception 'Invalid placements' using errcode='22023';end if;
 for x in select value from jsonb_array_elements(p_copy) loop
  if jsonb_typeof(x)<>'object' or (select count(*) from jsonb_object_keys(x))<>4 or not x?&array['kind','target','startsAt','endsAt']
  or jsonb_typeof(x->'kind')<>'string' or jsonb_typeof(x->'target')<>'string' or jsonb_typeof(x->'startsAt') not in ('null','string') or jsonb_typeof(x->'endsAt') not in ('null','string') then raise exception 'Invalid placement' using errcode='22023';end if;
  k:=x->>'kind'; target:=x->>'target';
  if length(target)>120 or not newsroom_private.poll_placement_target_valid(k,target) then raise exception 'Placement target unavailable' using errcode='22023';end if;
  if k='article' and not (newsroom_private.publication_actor_permission(auth.uid(),'story.view_all',target::uuid) or newsroom_private.publication_actor_permission(auth.uid(),'story.view_assigned',target::uuid)) then raise exception 'Article access denied' using errcode='42501';end if;
  if (x->>'startsAt' is not null and x->>'startsAt' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$') or (x->>'endsAt' is not null and x->>'endsAt' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$') then raise exception 'Explicit timestamp required' using errcode='22023';end if;
  begin a:=(x->>'startsAt')::timestamptz;b:=(x->>'endsAt')::timestamptz;
  exception when invalid_datetime_format or datetime_field_overflow then raise exception 'Invalid window' using errcode='22023';end;
  if (a is not null and not isfinite(a)) or (b is not null and not isfinite(b)) or (a is not null and b is not null and b<=a) then raise exception 'Invalid window' using errcode='22023';end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(p_copy) x group by x->>'kind',x->>'target' having count(*)>1) then raise exception 'Duplicate placement' using errcode='22023';end if;
end;$fn$;
create function newsroom_private.read_poll_placements(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC' as $fn$
declare s newsroom_private.poll_placement_state%rowtype; p newsroom_private.polls%rowtype; h jsonb; d jsonb; live jsonb;
begin
 if not newsroom_private.poll_staff_allowed('poll.view_manage') then raise exception 'Poll access denied' using errcode='42501';end if;
 select * into p from newsroom_private.polls where id=p_id;
 if not found then raise exception 'Poll unavailable' using errcode='42501';end if;
 select * into s from newsroom_private.poll_placement_state where poll_id=p_id;
 -- Article targets are public at selection time, but hide target ids if current caller no longer has editorial read access.
 select coalesce(jsonb_agg(x order by ord),'[]'::jsonb) into d from jsonb_array_elements(coalesce(s.draft,'[]'::jsonb)) with ordinality a(x,ord)
 where case when x->>'kind'='article' then newsroom_private.publication_actor_permission(auth.uid(),'story.view_all',(x->>'target')::uuid) or newsroom_private.publication_actor_permission(auth.uid(),'story.view_assigned',(x->>'target')::uuid) else true end;
 select coalesce(jsonb_agg(x order by ord),'[]'::jsonb) into live from jsonb_array_elements(coalesce(s.published,'[]'::jsonb)) with ordinality a(x,ord)
 where case when x->>'kind'='article' then newsroom_private.publication_actor_permission(auth.uid(),'story.view_all',(x->>'target')::uuid) or newsroom_private.publication_actor_permission(auth.uid(),'story.view_assigned',(x->>'target')::uuid) else true end;
 select coalesce(jsonb_agg(jsonb_build_object('revision',revision,'action',action,'at',at,'reason',reason) order by revision desc),'[]'::jsonb) into h from (select revision,action,at,reason from newsroom_private.poll_placement_events where poll_id=p_id order by revision desc limit 20) v;
 return jsonb_build_object('pollId',p_id,'revision',coalesce(s.revision,0),'draft',d,'published',live,'hasRestrictedTargets',d<>coalesce(s.draft,'[]'::jsonb) or live<>coalesce(s.published,'[]'::jsonb),'canEdit',newsroom_private.poll_staff_allowed('poll.edit'),'canPublish',newsroom_private.poll_staff_allowed('poll.publish'),'history',h);
end;$fn$;
create function newsroom_private.change_poll_placements(p_id uuid,p_expected integer,p_action text,p_copy jsonb,p_reason text)
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $fn$
declare s newsroom_private.poll_placement_state%rowtype; p newsroom_private.polls%rowtype; d jsonb; live jsonb; actor uuid:=auth.uid(); next_rev integer;
begin
 if p_id is null or p_expected is null or p_expected<0 or p_expected>=2147483647 or p_action is null or p_action not in ('save','publish','revert') or p_reason is null or length(btrim(p_reason)) not between 12 and 500 or p_reason~'[[:cntrl:]]' or ((p_action='save')<>(p_copy is not null)) then raise exception 'Invalid placement command' using errcode='22023';end if;
 perform pg_advisory_xact_lock(202611,2302);
 if not newsroom_private.poll_staff_allowed('poll.edit') or (p_action='publish' and not newsroom_private.poll_staff_allowed('poll.publish')) then raise exception 'Placement access denied' using errcode='42501';end if;
 select * into p from newsroom_private.polls where id=p_id for update;
 if not found then raise exception 'Poll unavailable' using errcode='42501';end if;
 select * into s from newsroom_private.poll_placement_state where poll_id=p_id for update;
 if coalesce(s.revision,0)<>p_expected then raise exception 'Placement changed' using errcode='40001';end if;
 if (newsroom_private.read_poll_placements(p_id)->>'hasRestrictedTargets')::boolean then raise exception 'Restricted targets require authorized editor' using errcode='42501';end if;
 live:=coalesce(s.published,'[]'::jsonb);
 if p_action='save' then d:=p_copy;
 elsif p_action='revert' then d:=live;
 else
  if p.status<>'published' or p.reviewer is null or not coalesce(public.staff_invite_verified_identity(p.reviewer),false) or not newsroom_private.publication_actor_permission(p.reviewer,'newsroom.access') or not newsroom_private.publication_actor_permission(p.reviewer,'poll.publish') then raise exception 'Current published reviewed poll required' using errcode='42501';end if;
  d:=coalesce(s.draft,'[]'::jsonb); live:=d;
 end if;
 if p_action<>'revert' then perform newsroom_private.validate_poll_placements(d);end if;
 next_rev:=p_expected+1;
 insert into newsroom_private.poll_placement_state(poll_id,revision,draft,published,draft_actor,published_actor) values(p_id,next_rev,d,live,actor,case when p_action='publish' then actor else s.published_actor end)
 on conflict(poll_id) do update set revision=excluded.revision,draft=excluded.draft,published=excluded.published,draft_actor=excluded.draft_actor,published_actor=excluded.published_actor,updated_at=clock_timestamp();
 insert into newsroom_private.poll_placement_events(poll_id,revision,action,actor,reason,draft,published) values(p_id,next_rev,p_action,actor,btrim(p_reason),d,live);
 return newsroom_private.read_poll_placements(p_id);
end;$fn$;
create function newsroom_private.lookup_poll_placement_targets(p_kind text,p_query text,p_page integer)
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare result jsonb;
begin
 if not newsroom_private.poll_staff_allowed('poll.edit') then raise exception 'Placement lookup denied' using errcode='42501';end if;
 if p_kind is null or p_kind not in ('article','category') or p_query is null or length(p_query)>160 or p_query~'[[:cntrl:]]' or p_page is null or p_page not between 0 and 100 then raise exception 'Invalid lookup' using errcode='22023';end if;
 with candidates as (
  select id::text target,headline label from public.stories where p_kind='article' and status='published' and access_level='public' and published_at<=statement_timestamp()
   and (strpos(lower(headline),lower(btrim(p_query)))>0 or strpos(lower(slug),lower(btrim(p_query)))>0 or btrim(p_query)='')
   and (newsroom_private.publication_actor_permission(auth.uid(),'story.view_all',id) or newsroom_private.publication_actor_permission(auth.uid(),'story.view_assigned',id))
  union all select slug,slug from public.categories where p_kind='category' and active and (btrim(p_query)='' or strpos(lower(slug),lower(btrim(p_query)))>0)
 ), numbered as(select *,row_number() over(order by label,target) rn from candidates order by label,target limit 26 offset p_page*25)
 select jsonb_build_object('items',coalesce(jsonb_agg(jsonb_build_object('target',target,'label',label) order by rn) filter(where rn<=p_page*25+25),'[]'::jsonb),'hasMore',count(*)>25 and p_page<100) into result from numbered;
 return result;
end;$fn$;
create function newsroom_private.public_placed_polls(p_language text,p_kind text,p_target text)
returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC' as $fn$
declare actor uuid:=auth.uid(); verified boolean; result jsonb;
begin
 if p_language is null or p_language not in ('en','es') or p_kind is null or p_target is null or length(p_target)>120 then raise exception 'Invalid placement' using errcode='22023';end if;
 if not coalesce((select public_enabled from newsroom_private.poll_settings where singleton),false) or not newsroom_private.poll_placement_target_valid(p_kind,p_target) then return jsonb_build_object('enabled',false,'items','[]'::jsonb,'hasMore',false,'verified',false);end if;
 verified:=coalesce(public.staff_invite_verified_identity(actor),false);
 with rows as materialized(select p.* from newsroom_private.polls p join newsroom_private.poll_placement_state s on s.poll_id=p.id
 where p.language=p_language and p.status='published' and p.opens_at<=statement_timestamp()
 and exists(select 1 from jsonb_array_elements(s.published) x where x->>'kind'=p_kind and x->>'target'=p_target
 and ((x->>'startsAt') is null or (x->>'startsAt')::timestamptz<=statement_timestamp())
 and ((x->>'endsAt') is null or (x->>'endsAt')::timestamptz>statement_timestamp()))
 order by p.opens_at desc,p.id limit 21),
 numbered as(select r.*,row_number() over(order by opens_at desc,id) rn from rows r)
 select jsonb_build_object('enabled',true,'verified',verified,'hasMore',count(*)>20,'items',coalesce(jsonb_agg(jsonb_build_object('id',p.id,'question',p.question,'options',p.options,'closesAt',p.closes_at,
 'open',p.closed_at is null and p.closes_at>statement_timestamp(),
 'ownChoice',case when verified then (select v.choice from newsroom_private.poll_votes v where v.poll_id=p.id and v.voter_id=actor) else null end,
 'counts',case when p.results_released and (p.closed_at is not null or p.closes_at<=statement_timestamp()) and (select count(*) from newsroom_private.poll_votes v where v.poll_id=p.id)>=5 then newsroom_private.poll_counts(p.id,cardinality(p.options)) else null end) order by p.rn) filter(where p.rn<=20),'[]'::jsonb)) into result from numbered p;
 return result;
end;$fn$;
create function public.staff_read_poll_placements(p_id uuid) returns jsonb language sql stable security invoker set search_path='' RETURN newsroom_private.read_poll_placements(p_id);
create function public.staff_change_poll_placements(p_id uuid,p_expected integer,p_action text,p_copy jsonb,p_reason text) returns jsonb language sql security invoker set search_path='' RETURN newsroom_private.change_poll_placements(p_id,p_expected,p_action,p_copy,p_reason);
create function public.staff_lookup_poll_placement_targets(p_kind text,p_query text,p_page integer) returns jsonb language sql stable security invoker set search_path='' RETURN newsroom_private.lookup_poll_placement_targets(p_kind,p_query,p_page);
create function public.public_placed_polls(p_language text,p_kind text,p_target text) returns jsonb language sql stable security invoker set search_path='' RETURN newsroom_private.public_placed_polls(p_language,p_kind,p_target);
revoke all on function newsroom_private.poll_placement_target_valid(text,text),newsroom_private.validate_poll_placements(jsonb),newsroom_private.read_poll_placements(uuid),newsroom_private.change_poll_placements(uuid,integer,text,jsonb,text),newsroom_private.lookup_poll_placement_targets(text,text,integer),newsroom_private.public_placed_polls(text,text,text),public.staff_read_poll_placements(uuid),public.staff_change_poll_placements(uuid,integer,text,jsonb,text),public.staff_lookup_poll_placement_targets(text,text,integer),public.public_placed_polls(text,text,text) from public,anon,authenticated,service_role;
grant execute on function newsroom_private.read_poll_placements(uuid),newsroom_private.change_poll_placements(uuid,integer,text,jsonb,text),newsroom_private.lookup_poll_placement_targets(text,text,integer),public.staff_read_poll_placements(uuid),public.staff_change_poll_placements(uuid,integer,text,jsonb,text),public.staff_lookup_poll_placement_targets(text,text,integer) to authenticated;
grant execute on function newsroom_private.public_placed_polls(text,text,text),public.public_placed_polls(text,text,text) to anon,authenticated;

commit;
