-- CT-02c integration tests on disposable PostgreSQL 17 ONLY; no live credentials.
\set ON_ERROR_STOP on
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid stable language sql as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
create table public.stories(id uuid primary key);

\i supabase/migrations/20261123222804_ct02b_staff_access.sql
\i supabase/migrations/20261123230955_ct02c_owner_guard_and_audit.sql

-- A fresh migration creates no live memberships and assigns no privileges.
do $$
begin
  if (select count(*) from public.staff_memberships) <> 0 or
     (select count(*) from public.staff_role_capabilities) <> 0 or
     (select count(*) from public.staff_access_audit) <> 0 then
    raise exception 'Migration unexpectedly elevated existing users';
  end if;
  if has_function_privilege('authenticated',
    'public.staff_apply_role_change(uuid,uuid,text,text,text,uuid)','EXECUTE')
     or has_function_privilege('anon',
    'public.staff_apply_role_change(uuid,uuid,text,text,text,uuid)','EXECUTE')
     or not has_function_privilege('service_role',
    'public.staff_apply_role_change(uuid,uuid,text,text,text,uuid)','EXECUTE') then
    raise exception 'Privileged RPC EXECUTE grants are not restrictive';
  end if;
end $$;

-- Explicit test fixtures are installed by DBA role only. Production bootstrap
-- is deliberately not implemented, awaiting verified human approval.
insert into auth.users(id) values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000004');
insert into public.staff_memberships(id,auth_user_id,status,activated_at,member_type)
values
  ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','active',now(),'employee'),
  ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','active',now(),'employee'),
  ('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000003','active',now(),'freelancer');
insert into public.staff_member_roles(membership_id,role_preset_id)
select '10000000-0000-0000-0000-000000000001',id
from public.staff_role_presets where role_key='owner';

do $$
begin
  if not exists (select 1 from public.staff_access_audit
                 where action_key='staff_member_roles.insert' and actor_auth_user_id is null) then
    raise exception 'Manual bootstrap insert must still be audited';
  end if;
end $$;

-- Users without EXECUTE cannot invoke the RPC even if the API endpoint is known.
begin;
set local role authenticated;
do $$
begin
  begin
    perform public.staff_apply_role_change(
      '00000000-0000-0000-0000-000000000004',
      '10000000-0000-0000-0000-000000000003',
      'grant_role','editor','Malicious reader role attempt',
      '30000000-0000-0000-0000-000000000001');
    raise exception 'Authenticated reader unexpectedly executed privileged RPC';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- Even the server-side service role cannot perform a change for a nonowner.
begin;
set local role service_role;
do $$
begin
  begin
    perform public.staff_apply_role_change(
      '00000000-0000-0000-0000-000000000004',
      '10000000-0000-0000-0000-000000000003',
      'grant_role','editor','Unapproved test reader elevation',
      '30000000-0000-0000-0000-000000000002');
    raise exception 'DB should reject nonowner actor';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- Self-directed owner mutation is refused, regardless of service-role access.
begin;
set local role service_role;
do $$
begin
  begin
    perform public.staff_apply_role_change(
      '00000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      'revoke_role','owner','Attempt to demote own active role',
      '30000000-0000-0000-0000-000000000003');
    raise exception 'Owner self role mutation should be denied';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- Direct service_role mutations without the trusted function's GUC audit
-- attribution MUST fail closed rather than silently losing audit history.
begin;
set local role service_role;
do $$
begin
  begin
    insert into public.staff_member_roles(membership_id,role_preset_id)
      select '10000000-0000-0000-0000-000000000002',id
      from public.staff_role_presets where role_key='editor';
    raise exception 'Direct role insert lacked an audit actor but succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- Positive path: owner A adds editor to B; the DB audit is atomic and
-- attributes the change to the authenticated actor verified by the server.
begin;
set local role service_role;
select public.staff_apply_role_change(
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'grant_role','editor','Owner approved editor access for testing',
  '30000000-0000-0000-0000-000000000004');
commit;

do $$
begin
  if not exists (
    select 1 from public.staff_member_roles r
    join public.staff_role_presets p on p.id=r.role_preset_id
    where r.membership_id='10000000-0000-0000-0000-000000000002'
      and p.role_key='editor'
  ) then raise exception 'Approved role grant was not committed'; end if;
  if not exists (
    select 1 from public.staff_access_audit
    where action_key='staff_member_roles.insert'
      and actor_auth_user_id='00000000-0000-0000-0000-000000000001'
      and request_id='30000000-0000-0000-0000-000000000004'
      and reason='Owner approved editor access for testing'
  ) then raise exception 'Approved role grant has no attributed audit record'; end if;
end $$;

-- Owner B succeeds A only when explicitly assigned as a SECOND active owner.
begin;
set local role service_role;
select public.staff_apply_role_change(
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'grant_role','owner','Reviewed owner succession for security',
  '30000000-0000-0000-0000-000000000005');
commit;

-- Owner B can temporarily suspend A while preserving one active owner.
begin;
set local role service_role;
select public.staff_apply_role_change(
  '00000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001',
  'suspend',null,'Safely suspend redundant owner A',
  '30000000-0000-0000-0000-000000000006');
commit;

do $$
begin
  if (select status from public.staff_memberships
      where id='10000000-0000-0000-0000-000000000001') <> 'suspended'
  then raise exception 'Redundant owner was not suspended'; end if;
end $$;

-- Last-owner protection applies even to a direct service-role UPDATE.
begin;
set local role service_role;
do $$
begin
  begin
    update public.staff_memberships set status='suspended'
    where id='10000000-0000-0000-0000-000000000002';
    raise exception 'Last remaining owner was suspended';
  exception when check_violation then null;
  end;
end $$;
rollback;

-- Reactivate A using active owner B and then revoke B's owner role.
begin;
set local role service_role;
select public.staff_apply_role_change(
  '00000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001',
  'reactivate',null,'Approved return of first site owner',
  '30000000-0000-0000-0000-000000000007');
commit;

begin;
set local role service_role;
select public.staff_apply_role_change(
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'revoke_role','owner','Approved completion of owner succession',
  '30000000-0000-0000-0000-000000000008');
commit;

-- Now owner A is sole owner; even a direct privileged deletion is rejected.
begin;
set local role service_role;
do $$
begin
  begin
    delete from public.staff_member_roles
    where membership_id='10000000-0000-0000-0000-000000000001'
      and role_preset_id=(
        select id from public.staff_role_presets where role_key='owner');
    raise exception 'Last owner role was deleted';
  exception when check_violation then null;
  end;
end $$;
rollback;

-- No owner role may have a finite expiry (avoids silent lockout).
do $$
begin
  begin
    update public.staff_member_roles
       set expires_at=now() + interval '1 day'
     where membership_id='10000000-0000-0000-0000-000000000001'
       and role_preset_id=(
         select id from public.staff_role_presets where role_key='owner');
    raise exception 'Owner expiry was unexpectedly accepted';
  exception when check_violation then null;
  end;
end $$;

-- Immutable preset identifiers prevent changing 'owner' into another role.
do $$
begin
  begin
    update public.staff_role_presets set role_key='managing_editor'
      where role_key='owner';
    raise exception 'Built-in owner preset identity could be rewritten';
  exception when insufficient_privilege or unique_violation then null;
  end;
end $$;

-- Fresh reader has no memberships and staff tables remain inaccessible.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000004';
do $$
begin
  if (select count(*) from public.staff_memberships) <> 0 or
     (select count(*) from public.staff_member_roles) <> 0 or
     (select count(*) from public.staff_role_capabilities) <> 0 then
    raise exception 'Reader unexpectedly sees staff authorization data';
  end if;
end $$;
rollback;

select 'CT-02c isolated PostgreSQL role mutation and last-owner checks passed' as result;
