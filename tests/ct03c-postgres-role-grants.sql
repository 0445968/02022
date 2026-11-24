-- CT-03c isolated PostgreSQL 17, simulated Auth & owner; never use live.
\set ON_ERROR_STOP on
\i tests/ct02c-postgres-admin.sql
\i supabase/migrations/20261124034804_ct03c_role_grant_editor.sql

-- Migration seeds no capabilities and does not revise any preset.
do $$
begin
  if exists(select 1 from public.staff_role_capabilities) or
     exists(select 1 from public.staff_role_presets where grant_revision<>0) then
    raise exception 'CT-03c unexpectedly seeded live role capabilities';
  end if;
  if has_function_privilege('anon',
   'public.staff_save_preset_grants(uuid,text,integer,jsonb,text,uuid)','EXECUTE')
    or has_function_privilege('authenticated',
   'public.staff_save_preset_grants(uuid,text,integer,jsonb,text,uuid)','EXECUTE')
    or not has_function_privilege('service_role',
   'public.staff_save_preset_grants(uuid,text,integer,jsonb,text,uuid)','EXECUTE') then
    raise exception 'Role preset publisher has unsafe EXECUTE grants';
  end if;
end $$;

-- A reader cannot invoke the privileged function or write table directly.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
do $$
begin
  begin
    perform public.staff_save_preset_grants(
      '00000000-0000-0000-0000-000000000004','freelancer',0,
      '[{"capability":"newsroom.access","scope":"all"}]'::jsonb,
      'Reader attempted unexpected role changes',
      '30000000-0000-0000-0000-000000000201');
    raise exception 'Reader called role editor function directly';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
    select id,'story.publish','all' from public.staff_role_presets where role_key='freelancer';
    raise exception 'Reader inserted role grant directly';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- Even service_role cannot assert a nonowner / revoked editor identity.
begin;
set local role service_role;
do $$
begin
  begin
    perform public.staff_save_preset_grants(
      '00000000-0000-0000-0000-000000000002','freelancer',0,
      '[{"capability":"newsroom.access","scope":"all"}]'::jsonb,
      'Staff writer attempted to elevate capability',
      '30000000-0000-0000-0000-000000000202');
    raise exception 'Nonowner actor published role configuration';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- Even current owner cannot alter Owner template through generic manager.
begin;
set local role service_role;
do $$
begin
  begin
    perform public.staff_save_preset_grants(
      '00000000-0000-0000-0000-000000000001','owner',0,
      '[{"capability":"newsroom.access","scope":"all"}]'::jsonb,
      'Owner template attempted accidental global edit',
      '30000000-0000-0000-0000-000000000203');
    raise exception 'Owner role template was editable';
  exception when invalid_parameter_value then null;
  end;
end $$;
rollback;

-- Freelancers cannot be given story publishing, global story access,
-- security admin, or team role manager through the preset matrix.
begin;
set local role service_role;
do $$
begin
  begin
    perform public.staff_save_preset_grants(
      '00000000-0000-0000-0000-000000000001','freelancer',0,
      '[{"capability":"story.publish","scope":"all"}]'::jsonb,
      'Attempt to elevate freelancer publishing',
      '30000000-0000-0000-0000-000000000204');
    raise exception 'Freelancer publishing approved';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.staff_save_preset_grants(
      '00000000-0000-0000-0000-000000000001','freelancer',0,
      '[{"capability":"story.edit_assigned","scope":"all"}]'::jsonb,
      'Attempt to widen assigned access to global',
      '30000000-0000-0000-0000-000000000205');
    raise exception 'Freelancer acquired global story edit';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.staff_save_preset_grants(
      '00000000-0000-0000-0000-000000000001','editor',0,
      '[{"capability":"team.manage_roles","scope":"all"}]'::jsonb,
      'Attempt to add unsafe team control',
      '30000000-0000-0000-0000-000000000206');
    raise exception 'Role editor granted staff administration';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.staff_save_preset_grants(
      '00000000-0000-0000-0000-000000000001','editor',0,
      '[{"capability":"reader.personal","scope":"all"}]'::jsonb,
      'Attempt to grant personal reader permission',
      '30000000-0000-0000-0000-000000000207');
    raise exception 'Preset granted personal identity';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- Duplicate capabilities or unexpected fields are not accepted.
begin;
set local role service_role;
do $$
begin
  begin
    perform public.staff_save_preset_grants(
      '00000000-0000-0000-0000-000000000001','freelancer',0,
      '[{"capability":"media.upload","scope":"all"},{"capability":"media.upload","scope":"all"}]'::jsonb,
      'Attempt duplicate role permission entries',
      '30000000-0000-0000-0000-000000000208');
    raise exception 'Duplicate capability accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.staff_save_preset_grants(
      '00000000-0000-0000-0000-000000000001','freelancer',0,
      '[{"capability":"media.upload","scope":"all","unexpected":"anything"}]'::jsonb,
      'Attempt unreviewed extra role fields',
      '30000000-0000-0000-0000-000000000209');
    raise exception 'Unexpected JSON keys accepted';
  exception when invalid_parameter_value then null;
  end;
end $$;
rollback;

-- Valid owner-managed freelancer preset first grant (no member assignment).
begin;
set local role service_role;
select public.staff_save_preset_grants(
  '00000000-0000-0000-0000-000000000001','freelancer',0,
  '[{"capability":"newsroom.access","scope":"all"},{"capability":"story.view_assigned","scope":"assigned"},{"capability":"media.upload","scope":"all"}]'::jsonb,
  'Approved carefully limited freelancer baseline',
  '30000000-0000-0000-0000-000000000210');
commit;

do $$
begin
  if (select grant_revision from public.staff_role_presets where role_key='freelancer')<>1
    or (select count(*) from public.staff_role_capabilities r
      join public.staff_role_presets p on p.id=r.role_preset_id
      where p.role_key='freelancer')<>3 then
    raise exception 'First role matrix revision or grant count incorrect';
  end if;
  if not exists(
    select 1 from public.staff_access_audit
    where request_id='30000000-0000-0000-0000-000000000210'
      and actor_auth_user_id='00000000-0000-0000-0000-000000000001'
      and action_key='staff_role_presets.update'
      and reason='Approved carefully limited freelancer baseline'
  ) or not exists(
    select 1 from public.staff_access_audit
    where request_id='30000000-0000-0000-0000-000000000210'
      and action_key='staff_role_capabilities.insert'
  ) then raise exception 'Preset grant changes not transactionally audited'; end if;
end $$;

-- Second tab with outdated rev=0 is blocked; no grant silently lost.
begin;
set local role service_role;
do $$
begin
  begin
    perform public.staff_save_preset_grants(
      '00000000-0000-0000-0000-000000000001','freelancer',0,
      '[{"capability":"media.upload","scope":"all"}]'::jsonb,
      'Outdated browser tab attempted overwrite',
      '30000000-0000-0000-0000-000000000211');
    raise exception 'Stale revision replaced current role matrix';
  exception when serialization_failure then null;
  end;
end $$;
rollback;

-- Exact no-op with revision 1 is rejected, with no false revision/audit.
begin;
set local role service_role;
do $$
begin
  begin
    perform public.staff_save_preset_grants(
      '00000000-0000-0000-0000-000000000001','freelancer',1,
      '[{"capability":"media.upload","scope":"all"},{"capability":"story.view_assigned","scope":"assigned"},{"capability":"newsroom.access","scope":"all"}]'::jsonb,
      'Unchanged role grant set should not save',
      '30000000-0000-0000-0000-000000000212');
    raise exception 'No-op unexpectedly committed a new revision';
  exception when invalid_parameter_value then null;
  end;
end $$;
rollback;

-- Version 1 -> 2 narrows capabilities and audits removals+revision.
begin;
set local role service_role;
select public.staff_save_preset_grants(
  '00000000-0000-0000-0000-000000000001','freelancer',1,
  '[{"capability":"newsroom.access","scope":"all"},{"capability":"story.view_assigned","scope":"assigned"}]'::jsonb,
  'Removed upload access for freelance reviewers',
  '30000000-0000-0000-0000-000000000213');
commit;
do $$
begin
  if (select grant_revision from public.staff_role_presets where role_key='freelancer')<>2
    or exists(
      select 1 from public.staff_role_capabilities r
      join public.staff_role_presets p on p.id=r.role_preset_id
      where p.role_key='freelancer' and r.capability_key='media.upload'
    ) or not exists(
      select 1 from public.staff_access_audit
      where request_id='30000000-0000-0000-0000-000000000213'
        and action_key='staff_role_capabilities.delete'
    ) then raise exception 'Preset change not committed atomically'; end if;
end $$;

-- Direct privileged writing of a protected capability is blocked by trigger
-- even with service_role credentials.
begin;
set local role service_role;
do $$
begin
  perform pg_catalog.set_config('app.staff_actor_auth_id',
    '00000000-0000-0000-0000-000000000001',true);
  perform pg_catalog.set_config('app.staff_request_id',
    '30000000-0000-0000-0000-000000000214',true);
  perform pg_catalog.set_config('app.staff_reason',
    'Bypass through privileged table write',true);
  begin
    insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
    select id,'team.manage_roles','all' from public.staff_role_presets where role_key='freelancer';
    raise exception 'Direct privileged grant exceeded ceiling';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.staff_role_presets set grant_revision=grant_revision+2
    where role_key='freelancer';
    raise exception 'Direct version spoof permitted';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

select 'CT-03c versioned owner preset grant security passed' as result;
