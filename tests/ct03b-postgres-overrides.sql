-- CT-03b disposable PostgreSQL 17 owner-only, deny-first override mutation.
-- NEVER point tests at live Supabase.
\set ON_ERROR_STOP on
\i tests/ct02c-postgres-admin.sql
\i supabase/migrations/20261124031658_ct03b_staff_overrides.sql

-- No override is enabled or seeded merely by applying the migration.
do $$
begin
  if exists(select 1 from public.staff_capability_overrides) then
    raise exception 'Unexpected override seeded by migration'; end if;
  if has_function_privilege('authenticated',
      'public.staff_apply_override_change(uuid,uuid,text,text,text,text,timestamptz,text,uuid)',
      'EXECUTE')
    or has_function_privilege('anon',
      'public.staff_apply_override_change(uuid,uuid,text,text,text,text,timestamptz,text,uuid)',
      'EXECUTE')
    or not has_function_privilege('service_role',
      'public.staff_apply_override_change(uuid,uuid,text,text,text,text,timestamptz,text,uuid)',
      'EXECUTE') then
    raise exception 'Override RPC has wrong execution privilege';
  end if;
end $$;

-- Direct authenticated users cannot call privileged mutation or write tables.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
do $$
begin
  begin
    perform public.staff_apply_override_change(
      '00000000-0000-0000-0000-000000000004',
      '10000000-0000-0000-0000-000000000002',
      'set','story.publish','all','allow',now()+interval '1 day',
      'Reader attempts direct staff elevation','30000000-0000-0000-0000-000000000101');
    raise exception 'Reader unexpectedly called override RPC';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.staff_capability_overrides(
      membership_id,capability_key,effect,scope,reason,granted_by,expires_at
    ) values ('10000000-0000-0000-0000-000000000002','story.publish',
      'allow','all','Reader forged privileged grant',
      '00000000-0000-0000-0000-000000000004',now()+interval '1 day');
    raise exception 'Reader unexpectedly inserted direct override';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- Even a service_role caller cannot claim non-owner identity.
begin;
set local role service_role;
do $$
begin
  begin
    perform public.staff_apply_override_change(
      '00000000-0000-0000-0000-000000000002',
      '10000000-0000-0000-0000-000000000003',
      'set','media.approve','all','allow',now()+interval '1 day',
      'Forged reviewer privileges by nonowner',
      '30000000-0000-0000-0000-000000000102');
    raise exception 'Nonowner impersonated privileged mutation';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- An owner cannot self-edit or mutate another owner's overrides.
begin;
set local role service_role;
do $$
begin
  begin
    perform public.staff_apply_override_change(
      '00000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      'set','story.publish','all','deny',null,
      'Owner attempts to remove own publish privileges',
      '30000000-0000-0000-0000-000000000103');
    raise exception 'Owner self override unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- Protected team and security capabilities cannot be inserted, even by owner.
begin;
set local role service_role;
do $$
begin
  begin
    perform public.staff_apply_override_change(
      '00000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000002',
      'set','team.manage_roles','all','allow',now()+interval '1 day',
      'Owner tried to create a hidden admin grant',
      '30000000-0000-0000-0000-000000000104');
    raise exception 'Administrative privilege escalated through override';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.staff_apply_override_change(
      '00000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000002',
      'set','reader.personal','all','allow',now()+interval '1 day',
      'Owner attempted to grant reader identity privilege',
      '30000000-0000-0000-0000-000000000105');
    raise exception 'Reader personal permission used as staff override';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.staff_apply_override_change(
      '00000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000002',
      'set','story.publish','all','allow',null,
      'Owner attempts permanent allow override',
      '30000000-0000-0000-0000-000000000106');
    raise exception 'Permanent allow override accepted';
  exception when invalid_parameter_value then null;
  end;
end $$;
rollback;

-- Positive DENY path: current owner, scoped capability, attributed audit.
begin;
set local role service_role;
select public.staff_apply_override_change(
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'set','story.publish','all','deny',null,
  'Temporary editorial embargo on publishing',
  '30000000-0000-0000-0000-000000000107');
commit;

do $$
begin
  if not exists(
    select 1 from public.staff_capability_overrides
    where membership_id='10000000-0000-0000-0000-000000000002'
      and capability_key='story.publish' and effect='deny'
      and scope='all' and expires_at is null
  ) then
    raise exception 'Owner deny override was not saved';
  end if;
  if not exists(
    select 1 from public.staff_access_audit
    where subject_membership_id='10000000-0000-0000-0000-000000000002'
      and action_key='staff_capability_overrides.insert'
      and actor_auth_user_id='00000000-0000-0000-0000-000000000001'
      and request_id='30000000-0000-0000-0000-000000000107'
      and reason='Temporary editorial embargo on publishing'
  ) then raise exception 'Override was not transactionally audited'; end if;
end $$;

-- Replacing deny with allow requires a finite expiry and audited UPDATE.
begin;
set local role service_role;
select public.staff_apply_override_change(
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'set','story.publish','all','allow',now()+interval '1 day',
  'Reviewed publisher exception valid for one day',
  '30000000-0000-0000-0000-000000000108');
commit;

do $$
begin
  if not exists(select 1 from public.staff_capability_overrides
    where membership_id='10000000-0000-0000-0000-000000000002'
      and capability_key='story.publish' and effect='allow'
      and expires_at>now() and expires_at<now()+interval '2 days'
  ) or not exists(select 1 from public.staff_access_audit
      where action_key='staff_capability_overrides.update'
        and request_id='30000000-0000-0000-0000-000000000108') then
    raise exception 'Audited allow replacement failed'; end if;
end $$;

-- A different scope is a distinct permission row; the same scope cannot be
-- reassigned after INSERT to sidestep uniqueness/audit attribution.
begin;
set local role service_role;
do $$
begin
  perform pg_catalog.set_config('app.staff_actor_auth_id',
    '00000000-0000-0000-0000-000000000001',true);
  perform pg_catalog.set_config('app.staff_reason',
    'Attempted unsafe direct scope replacement',true);
  begin
    update public.staff_capability_overrides set scope='own'
    where membership_id='10000000-0000-0000-0000-000000000002'
      and capability_key='story.publish' and scope='all';
    raise exception 'Scope was reassigned after creation';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.staff_capability_overrides(
      membership_id,capability_key,effect,scope,reason,granted_by,expires_at
    ) values(
      '10000000-0000-0000-0000-000000000002','team.manage_overrides',
      'allow','all','Fake administrator capability for testing',
      '00000000-0000-0000-0000-000000000001',now()+interval '1 day'
    );
    raise exception 'Direct service-role bypass added protected capability';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- Revoke requires an existing exact override and has an audited DELETE.
begin;
set local role service_role;
select public.staff_apply_override_change(
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'remove','story.publish','all',null,null,
  'Removed expiring publisher exception after review',
  '30000000-0000-0000-0000-000000000109');
commit;

do $$
begin
  if exists(select 1 from public.staff_capability_overrides
    where membership_id='10000000-0000-0000-0000-000000000002'
      and capability_key='story.publish')
   or not exists(select 1 from public.staff_access_audit
    where action_key='staff_capability_overrides.delete'
      and request_id='30000000-0000-0000-0000-000000000109') then
    raise exception 'Revocation did not remove and audit override';
  end if;
end $$;

-- Fails closed if an expired/absent override is treated as a successful delete.
begin;
set local role service_role;
do $$
begin
  begin
    perform public.staff_apply_override_change(
      '00000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000002',
      'remove','story.publish','all',null,null,
      'Cannot remove an already absent exception',
      '30000000-0000-0000-0000-000000000110');
    raise exception 'Missing override removal returned success';
  exception when no_data_found then null;
  end;
end $$;
rollback;

select 'CT-03b current-owner, audited override RLS and privilege guards passed' as result;
