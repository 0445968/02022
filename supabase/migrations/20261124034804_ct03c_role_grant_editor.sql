-- CT-03c versioned, audited built-in role grant editor. STAGED ONLY.
-- Generated filename via pinned Supabase CLI v3.2.0 Actions #45321966824.
-- Requires staged CT-02b/c staff schema and audit. NO live hosted changes,
-- first owner selection, role seeds, user grants or automatic preset activation.
begin;

alter table public.staff_role_presets
  add column grant_revision integer not null default 0
    check (grant_revision >= 0);

-- The owner template is intentionally immutable, and default newsroom roles
-- cannot be elevated into administrative roles through their presets.
-- This is a CAPABILITY CEILING only, NOT an effective grant or migration seed.
create function public.staff_preset_grant_allowed(
  p_role text,p_cap public.staff_capability_key,p_scope text
)
returns boolean language plpgsql immutable security invoker set search_path=''
as $fn$
declare
  v_allowed text[];
  v_cap text := p_cap::text;
begin
  if p_scope not in ('all','assigned','own')
    or p_role='owner'
    or v_cap in ('settings.security_admin','reader.personal','byline.manage')
    or v_cap like 'team.%' then return false; end if;

  v_allowed := case p_role
    when 'managing_editor' then array[
      'newsroom.access','story.view_all','story.create','story.edit_all',
      'story.submit_review','story.review','story.publish','story.schedule',
      'story.archive_delete','story.assign','revision.view','revision.publish',
      'revision.discard','media.view_all','media.upload','media.edit_all',
      'media.approve','byline.view','homepage.view_editor','homepage.edit',
      'homepage.publish','comment.view_queue','comment.moderate',
      'poll.view_manage','poll.edit','poll.publish',
      'calendar.view_team','calendar.manage'
    ]
    when 'editor' then array[
      'newsroom.access','story.view_all','story.create','story.edit_all',
      'story.submit_review','story.review','story.publish','story.schedule',
      'story.archive_delete','story.assign','revision.view','revision.publish',
      'revision.discard','media.view_all','media.upload','media.edit_all',
      'media.approve','byline.view','homepage.view_editor','calendar.view_team'
    ]
    when 'staff_writer' then array[
      'newsroom.access','story.create','media.upload',
      'story.view_assigned','story.edit_assigned','story.submit_review',
      'revision.view','revision.edit_assigned','media.edit_own'
    ]
    when 'copy_editor' then array[
      'newsroom.access','story.view_assigned','story.edit_assigned',
      'story.review','revision.view','revision.edit_assigned'
    ]
    when 'media_editor' then array[
      'newsroom.access','media.view_all','media.upload','media.edit_all',
      'media.approve','media.delete','story.view_assigned',
      'revision.view','revision.edit_assigned'
    ]
    when 'moderator' then array[
      'newsroom.access','comment.view_queue','comment.moderate',
      'comment.manage_reports'
    ]
    when 'audience_staff' then array[
      'newsroom.access','audience.view','audience.notify',
      'newsletter.manage'
    ]
    when 'freelancer' then array[
      'newsroom.access','media.upload','story.view_assigned',
      'story.edit_assigned','story.submit_review',
      'revision.view','revision.edit_assigned','media.edit_own'
    ]
    else array[]::text[]
  end;

  if not v_cap=any(v_allowed) then return false; end if;
  -- Semantic scopes cannot be widened beyond their resource-specific
  -- contract; 'own' and 'assigned' are not interchangeable.
  if v_cap in (
    'story.view_assigned','story.edit_assigned','revision.edit_assigned',
    'calendar.view_assigned'
  ) then return p_scope='assigned'; end if;
  if v_cap='media.edit_own' then return p_scope='own'; end if;
  if p_role in ('staff_writer','copy_editor','freelancer') and v_cap in (
    'story.submit_review','story.review','revision.view'
  ) then return p_scope='assigned'; end if;
  if p_role='media_editor' and v_cap='revision.view' then
    return p_scope='assigned'; end if;
  -- In this slice all other listed grants must be all-scope;
  -- narrower resource scopes require separate schema-level policy review.
  return p_scope='all';
end;
$fn$;
revoke all on function public.staff_preset_grant_allowed(
  text,public.staff_capability_key,text
) from public,anon,authenticated;
grant execute on function public.staff_preset_grant_allowed(
  text,public.staff_capability_key,text
) to service_role;

-- Direct writes with trusted service credentials are also checked by a
-- BEFORE trigger. CT-02c AFTER trigger independently requires attributed
-- current-owner context and captures old/new JSON in staff_access_audit.
create function public.staff_guard_preset_grant()
returns trigger language plpgsql security invoker set search_path=''
as $fn$
declare
  v_role text;
  v_id uuid;
  v_cap public.staff_capability_key;
  v_scope text;
begin
  perform pg_catalog.pg_advisory_xact_lock(202611,2302);
  if tg_op='DELETE' then
    v_id:=old.role_preset_id;
    v_cap:=old.capability_key;
    v_scope:=old.scope;
  else
    v_id:=new.role_preset_id;
    v_cap:=new.capability_key;
    v_scope:=new.scope;
  end if;
  select role_key into v_role from public.staff_role_presets
  where id=v_id;
  if v_role='owner' then
    raise exception 'Owner template is immutable' using errcode='42501';
  end if;
  if tg_op='DELETE' then return old; end if;
  if tg_op='UPDATE' and (new.role_preset_id is distinct from old.role_preset_id
    or new.capability_key is distinct from old.capability_key) then
    raise exception 'Role grant identity cannot change' using errcode='42501';
  end if;
  if not public.staff_preset_grant_allowed(v_role,v_cap,v_scope) then
    raise exception 'Role capability exceeds reviewed ceiling or scope'
      using errcode='42501';
  end if;
  return new;
end;
$fn$;
create trigger ct03c_preset_grant_guard before
  insert or update or delete on public.staff_role_capabilities
for each row execute function public.staff_guard_preset_grant();
revoke all on function public.staff_guard_preset_grant()
  from public,anon,authenticated;

-- No one can silently rename, rekey or freeze a built-in preset from another
-- privileged service API. Revision is increment-only to record a real edit.
create function public.staff_guard_preset_revision()
returns trigger language plpgsql security invoker set search_path=''
as $fn$
begin
  perform pg_catalog.pg_advisory_xact_lock(202611,2302);
  if new.id is distinct from old.id
    or new.role_key is distinct from old.role_key
    or new.name_en is distinct from old.name_en
    or new.name_es is distinct from old.name_es
    or new.is_builtin is distinct from old.is_builtin
    or new.created_at is distinct from old.created_at
    or new.grant_revision is distinct from old.grant_revision+1 then
    raise exception 'Only a versioned role-grant edit may update a preset'
      using errcode='42501';
  end if;
  if old.role_key='owner' then
    raise exception 'Owner preset may not be edited'
      using errcode='42501';
  end if;
  return new;
end;
$fn$;
create trigger ct03c_preset_revision_guard before update
  on public.staff_role_presets for each row
execute function public.staff_guard_preset_revision();
revoke all on function public.staff_guard_preset_revision()
  from public,anon,authenticated;

-- Save the COMPLETE grant set in one transaction with a compare-and-swap
-- preset revision; stale browser tabs MUST reload rather than clobber edits.
create function public.staff_save_preset_grants(
  p_actor_auth_user_id uuid,p_role_key text,p_expected_revision integer,
  p_grants jsonb,p_reason text,p_request_id uuid
)
returns integer language plpgsql security invoker set search_path=''
as $fn$
declare
  v_id uuid;
  v_revision integer;
  v_entry jsonb;
  v_cap text;
  v_scope text;
  v_seen text[]:=array[]::text[];
  v_requested jsonb:='[]'::jsonb;
  v_existing jsonb;
  v_new_revision integer;
begin
  if p_actor_auth_user_id is null or p_request_id is null
    or p_expected_revision is null or p_expected_revision<0
    or p_role_key is null or p_role_key='owner'
    or p_reason is null or pg_catalog.length(pg_catalog.btrim(p_reason))<12
    or pg_catalog.length(p_reason)>500
    or p_grants is null or pg_catalog.jsonb_typeof(p_grants)<>'array'
    or pg_catalog.jsonb_array_length(p_grants)>47 then
    raise exception 'Invalid role preset update payload' using errcode='22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(202611,2302);
  if not exists (
    select 1 from public.staff_memberships m
    join public.staff_member_roles r on r.membership_id=m.id
    join public.staff_role_presets p on p.id=r.role_preset_id
    where m.auth_user_id=p_actor_auth_user_id
      and m.status='active' and m.expires_at is null
      and m.member_type='employee' and p.role_key='owner'
      and r.expires_at is null
  ) then
    raise exception 'Only a current nonexpiring owner can edit presets'
      using errcode='42501';
  end if;
  select id,grant_revision into v_id,v_revision
  from public.staff_role_presets
  where role_key=p_role_key and is_builtin=true for update;
  if not found then
    raise exception 'Preset not found or not editable' using errcode='P0002';
  end if;
  if v_revision<>p_expected_revision then
    raise exception 'Role preset changed; reload before saving'
      using errcode='40001';
  end if;

  -- JSON is interpreted as a *full replacement*; duplicate capability keys
  -- and unknown fields cannot silently change the permission set.
  for v_entry in select value from pg_catalog.jsonb_array_elements(p_grants)
  loop
    if pg_catalog.jsonb_typeof(v_entry)<>'object'
      or not (v_entry ? 'capability' and v_entry ? 'scope')
      or (select count(*) from pg_catalog.jsonb_object_keys(v_entry))<>2
      or pg_catalog.jsonb_typeof(v_entry->'capability')<>'string'
      or pg_catalog.jsonb_typeof(v_entry->'scope')<>'string' then
      raise exception 'Invalid capability entry' using errcode='22023';
    end if;
    v_cap:=v_entry->>'capability';
    v_scope:=v_entry->>'scope';
    if v_cap=any(v_seen) then
      raise exception 'Duplicate capability in preset' using errcode='22023';
    end if;
    v_seen:=pg_catalog.array_append(v_seen,v_cap);
    if not exists (
      select 1 from pg_catalog.pg_enum e
      join pg_catalog.pg_type t on t.oid=e.enumtypid
      join pg_catalog.pg_namespace n on n.oid=t.typnamespace
      where n.nspname='public' and t.typname='staff_capability_key'
        and e.enumlabel=v_cap
    ) or not public.staff_preset_grant_allowed(
      p_role_key,v_cap::public.staff_capability_key,v_scope) then
      raise exception 'Permission not within reviewed preset ceiling'
        using errcode='42501';
    end if;
    v_requested:=v_requested || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('capability',v_cap,'scope',v_scope)
    );
  end loop;

  select coalesce(pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object('capability',capability_key::text,'scope',scope)
    order by capability_key::text
  ),'[]'::jsonb) into v_existing
  from public.staff_role_capabilities
  where role_preset_id=v_id;

  -- Require a real change: no false audit and no way to roll the revision
  -- without an actually modified grant matrix.
  if v_existing=(
    select coalesce(pg_catalog.jsonb_agg(value order by value->>'capability'),
      '[]'::jsonb)
    from pg_catalog.jsonb_array_elements(v_requested)
  ) then
    raise exception 'No permission change to save' using errcode='22023';
  end if;

  perform pg_catalog.set_config('app.staff_actor_auth_id',
    p_actor_auth_user_id::text,true);
  perform pg_catalog.set_config('app.staff_request_id',p_request_id::text,true);
  perform pg_catalog.set_config('app.staff_reason',p_reason,true);

  delete from public.staff_role_capabilities r
  where r.role_preset_id=v_id and not exists (
    select 1 from pg_catalog.jsonb_array_elements(v_requested) v
    where v->>'capability'=r.capability_key::text
  );
  update public.staff_role_capabilities r set scope=v->>'scope'
  from pg_catalog.jsonb_array_elements(v_requested) v
  where r.role_preset_id=v_id and r.capability_key::text=v->>'capability'
    and r.scope is distinct from v->>'scope';
  insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
  select v_id,(v->>'capability')::public.staff_capability_key,v->>'scope'
  from pg_catalog.jsonb_array_elements(v_requested) v
  where not exists (
    select 1 from public.staff_role_capabilities r
    where r.role_preset_id=v_id
      and r.capability_key::text=v->>'capability'
  );

  update public.staff_role_presets
  set grant_revision=grant_revision+1
  where id=v_id and grant_revision=p_expected_revision
  returning grant_revision into v_new_revision;
  if not found then
    raise exception 'Preset revision changed during edit' using errcode='40001';
  end if;
  return v_new_revision;
end;
$fn$;
revoke all on function public.staff_save_preset_grants(
  uuid,text,integer,jsonb,text,uuid
) from public,anon,authenticated;
grant execute on function public.staff_save_preset_grants(
  uuid,text,integer,jsonb,text,uuid
) to service_role;
commit;
