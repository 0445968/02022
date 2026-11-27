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
returns jsonb language sql stable security invoker set search_path='' as $fn$ select newsroom_private.read_public_homepage_visibility() $fn$;
revoke all on function newsroom_private.homepage_default_visibility(),newsroom_private.valid_homepage_visibility(jsonb),newsroom_private.read_homepage_visibility_versioned(),newsroom_private.change_homepage_visibility_versioned(text,integer,jsonb,integer,jsonb),newsroom_private.change_homepage_versioned(text,integer,jsonb,integer),public.staff_read_homepage_visibility_versioned(),public.staff_change_homepage_visibility_versioned(text,integer,jsonb,integer,jsonb),newsroom_private.read_public_homepage_visibility(),public.read_public_homepage_visibility() from public,anon,authenticated,service_role;
grant execute on function newsroom_private.read_homepage_visibility_versioned(),newsroom_private.change_homepage_visibility_versioned(text,integer,jsonb,integer,jsonb),newsroom_private.change_homepage_versioned(text,integer,jsonb,integer),public.staff_read_homepage_visibility_versioned(),public.staff_change_homepage_visibility_versioned(text,integer,jsonb,integer,jsonb) to authenticated;
grant execute on function newsroom_private.read_public_homepage_visibility(),public.read_public_homepage_visibility() to anon,authenticated;
commit;
