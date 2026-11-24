-- CT-04a.2 isolated PostgreSQL 17. No hosted project access.
\set ON_ERROR_STOP on
\i tests/ct02c-postgres-admin.sql
-- Mock only the verified Auth fields used in the migration.
alter table auth.users add column email text, add column email_confirmed_at timestamptz,
  add column is_anonymous boolean not null default false, add column deleted_at timestamptz,
  add column banned_until timestamptz;
grant usage on schema auth to service_role;
update auth.users set email='owner@example.test',email_confirmed_at=now()
where id='00000000-0000-0000-0000-000000000001';
update auth.users set email='staff@example.test',email_confirmed_at=now()
where id='00000000-0000-0000-0000-000000000002';
update auth.users set email='existing@example.test',email_confirmed_at=now()
where id='00000000-0000-0000-0000-000000000003';
update auth.users set email='reader@example.test',email_confirmed_at=now()
where id='00000000-0000-0000-0000-000000000004';
insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
  ('40000000-0000-4000-8000-000000000001','invitee@example.test',now(),false),
  ('40000000-0000-4000-8000-000000000002','unverified@example.test',null,false),
  ('40000000-0000-4000-8000-000000000003','anonymous@example.test',now(),true),
  ('40000000-0000-4000-8000-000000000004','race@example.test',now(),false),
  ('40000000-0000-4000-8000-000000000005','stale@example.test',now(),false),
  ('40000000-0000-4000-8000-000000000006','canceled@example.test',now(),false),
  ('40000000-0000-4000-8000-000000000007','banned@example.test',now(),false),
  ('40000000-0000-4000-8000-000000000008','deleted@example.test',now(),false),
  ('40000000-0000-4000-8000-000000000009','owner-lost@example.test',now(),false),
  ('40000000-0000-4000-8000-000000000010','expired@example.test',now(),false);
update auth.users set banned_until=now()+interval '1 day' where email='banned@example.test';
update auth.users set deleted_at=now() where email='deleted@example.test';
-- Isolated bootstrap only: owner grant must predate immutable CT-03c ceiling.
insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
select id,'team.invite','all' from public.staff_role_presets where role_key='owner';
-- Test-only owner permission for later private byline review suite.
insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
select id,'byline.manage','all' from public.staff_role_presets where role_key='owner';
\i supabase/migrations/20261124034804_ct03c_role_grant_editor.sql
\i supabase/migrations/20261124150021_ct04a_staff_invitations.sql

-- No real invitation/permission seeding; all RPCs service-only.
do $$
declare f text;
begin
  if (select count(*) from public.staff_invitations)<>0
    or (select count(*) from public.staff_memberships)<>3 then
    raise exception 'Migration seeded an invitation or membership';
  end if;
  foreach f in array array[
    'public.staff_issue_invitation(uuid,text,text,integer,text,timestamptz,timestamptz,text,uuid,text,uuid)',
    'public.staff_cancel_invitation(uuid,uuid,text,uuid)',
    'public.staff_redeem_invitation(uuid,text,uuid)',
    'public.staff_list_invitations(uuid,integer)'] loop
    if has_function_privilege('anon',f,'EXECUTE')
      or has_function_privilege('authenticated',f,'EXECUTE')
      or not has_function_privilege('service_role',f,'EXECUTE') then
      raise exception 'Unsafe invitation RPC grant %',f;
    end if;
  end loop;
  if has_table_privilege('anon','public.staff_invitations','SELECT')
    or has_table_privilege('authenticated','public.staff_invitations','SELECT')
    or has_table_privilege('service_role','public.staff_invitations','DELETE')
    or has_table_privilege('service_role','auth.users','SELECT')
    or not has_column_privilege('service_role','auth.users','email_confirmed_at','SELECT') then
    raise exception 'Invitation or Auth grants too broad or missing';
  end if;
end $$;

-- Test-only convenience functions, SECURITY INVOKER, in an isolated DB.
create function public.test_invite(p_email text,p_hash text,p_replace uuid default null,
  p_actor uuid default '00000000-0000-0000-0000-000000000001',
  p_role text default 'freelancer',p_rev integer default 1)
returns uuid language sql security invoker as $$
  select public.staff_issue_invitation(p_actor,p_email,p_role,p_rev,'freelancer',
    now()+interval '2 days',now()+interval '90 days',p_hash,p_replace,
    'Approved isolated test invitation',gen_random_uuid())
$$;
create function public.test_redeem(p_user uuid,p_hash text)
returns uuid language sql security invoker as $$
  select public.staff_redeem_invitation(p_user,p_hash,gen_random_uuid())
$$;

begin;
set local role authenticated;
do $$ begin
  begin
    perform public.test_redeem('40000000-0000-4000-8000-000000000001',repeat('a',64));
    raise exception 'Reader called redemption directly';
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.staff_invitations;
    raise exception 'Reader accessed invitation records';
  exception when insufficient_privilege then null; end;
end $$;
rollback;

begin;
set local role service_role;
do $$ begin
  begin
    perform public.test_invite('invitee@example.test',repeat('a',64),null,
      '00000000-0000-0000-0000-000000000004');
    raise exception 'Reader actor issued an invitation';
  exception when insufficient_privilege then null; end;
  begin
    perform public.test_invite('invitee@example.test',repeat('a',64),null,
      '00000000-0000-0000-0000-000000000001','owner',1);
    raise exception 'Owner role could be invited';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.test_invite('invitee@example.test',repeat('a',64));
    raise exception 'Unconfigured preset could be invited';
  exception when serialization_failure then null; end;
  begin
    perform public.test_invite('existing@example.test',repeat('a',64));
    raise exception 'Existing membership could be overwritten';
  exception when insufficient_privilege then null; end;
end $$;
rollback;

-- Configure a test-only role through real CT-03c RPC.
begin;
set local role service_role;
select public.staff_save_preset_grants('00000000-0000-0000-0000-000000000001',
  'freelancer',0,'[{"capability":"newsroom.access","scope":"all"},{"capability":"story.view_assigned","scope":"assigned"}]'::jsonb,
  'Approved limited isolated freelancer grants',gen_random_uuid());
select public.test_invite('invitee@example.test',repeat('a',64));
select public.test_invite('unverified@example.test',repeat('b',64));
select public.test_invite('anonymous@example.test',repeat('c',64));
select public.test_invite('stale@example.test',repeat('d',64));
select public.test_invite('canceled@example.test',repeat('e',64));
select public.test_invite('banned@example.test',repeat('f',64));
select public.test_invite('deleted@example.test',repeat('1',64));
select public.test_invite('owner-lost@example.test',repeat('2',64));
commit;

begin;
set local role service_role;
do $$
declare v_id uuid; v_new uuid;
begin
  if not exists(select 1 from public.staff_list_invitations(
      '00000000-0000-0000-0000-000000000001',0)
      where email_hint='i***@example.test' and status='pending') then
    raise exception 'Masked pending list absent';
  end if;
  begin
    perform public.staff_list_invitations('00000000-0000-0000-0000-000000000004',0);
    raise exception 'Reader actor listed invitations';
  exception when insufficient_privilege then null; end;
  begin
    perform public.test_invite('invitee@example.test',repeat('9',64));
    raise exception 'Duplicate pending invitation accepted';
  exception when unique_violation then null; end;
  select id into v_id from public.staff_invitations where token_hash=repeat('a',64);
  -- No authenticated or service-role direct changes lacking audited RPC context.
  begin
    update public.staff_invitations set expires_at=expires_at+interval '1 hour' where id=v_id;
    raise exception 'Direct invitation update succeeded';
  exception when insufficient_privilege then null; end;
  begin
    perform public.test_invite('unverified@example.test',repeat('9',64),v_id);
    raise exception 'Replacement changed target email';
  exception when serialization_failure then null; end;
  v_new:=public.test_invite('invitee@example.test',repeat('9',64),v_id);
  if v_new=v_id or not exists(select 1 from public.staff_invitations where id=v_id and canceled_at is not null) then
    raise exception 'Replacement did not invalidate old invitation';
  end if;
  select id into v_id from public.staff_invitations where token_hash=repeat('e',64);
  perform public.staff_cancel_invitation('00000000-0000-0000-0000-000000000001',
    v_id,'Canceled isolated test invitation',gen_random_uuid());
end $$;
commit;

-- All failed redeems leave both membership tables and invitation unchanged.
begin;
set local role service_role;
do $$
declare v_case record; v_count integer;
begin
  select count(*) into v_count from public.staff_memberships;
  for v_case in select * from (values
    ('40000000-0000-4000-8000-000000000001'::uuid,repeat('a',64)),
    ('00000000-0000-0000-0000-000000000004'::uuid,repeat('9',64)),
    ('40000000-0000-4000-8000-000000000002'::uuid,repeat('b',64)),
    ('40000000-0000-4000-8000-000000000003'::uuid,repeat('c',64)),
    ('40000000-0000-4000-8000-000000000006'::uuid,repeat('e',64)),
    ('40000000-0000-4000-8000-000000000007'::uuid,repeat('f',64)),
    ('40000000-0000-4000-8000-000000000008'::uuid,repeat('1',64)),
    ('40000000-0000-4000-8000-000000000001'::uuid,repeat('0',64))
  ) t(uid,digest) loop
    begin
      perform public.test_redeem(v_case.uid,v_case.digest);
      raise exception 'Ineligible redemption succeeded';
    exception when insufficient_privilege then null; end;
  end loop;
  if (select count(*) from public.staff_memberships)<>v_count
    or exists(select 1 from public.staff_invitations where redeemed_at is not null) then
    raise exception 'Failed redemption left side effects';
  end if;
end $$;
rollback;

-- Expiry is real database time, not an app-supplied date or mock token check.
begin;
set local role service_role;
select public.staff_issue_invitation(
  '00000000-0000-0000-0000-000000000001','expired@example.test','freelancer',1,'freelancer',
  clock_timestamp()+interval '2 seconds',clock_timestamp()+interval '90 days',
  repeat('3',64),null,'Approved short lived isolated test invitation',gen_random_uuid());
commit;
select pg_sleep(2.1);
begin;
set local role service_role;
do $$ begin
  begin
    perform public.test_redeem('40000000-0000-4000-8000-000000000010',repeat('3',64));
    raise exception 'Expired invite redeemed';
  exception when insufficient_privilege then null; end;
  if not exists(select 1 from public.staff_list_invitations(
      '00000000-0000-0000-0000-000000000001',0)
      where email_hint='e***@example.test' and status='expired') then
    raise exception 'Expired invitation status absent';
  end if;
end $$;
rollback;

-- Fresh DB Auth verification is essential even when a previously verified
-- account had a matching email at issue.
begin;
update auth.users set email='changed@example.test'
where id='40000000-0000-4000-8000-000000000001';
set local role service_role;
do $$ begin
  begin
    perform public.test_redeem('40000000-0000-4000-8000-000000000001',repeat('9',64));
    raise exception 'Invite redeemed after verified email changed';
  exception when insufficient_privilege then null; end;
end $$;
rollback;

-- Even an isolated DBA modifying an allowed grant without revision increment
-- invalidates an outstanding invitation through the actual grant fingerprint.
begin;
insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
select id,'media.upload','all' from public.staff_role_presets where role_key='freelancer';
set local role service_role;
do $$ begin
  begin
    perform public.test_redeem('40000000-0000-4000-8000-000000000001',repeat('9',64));
    raise exception 'Changed grant fingerprint redeemed';
  exception when insufficient_privilege then null; end;
end $$;
rollback;

-- Bound administrative issuance, including replacements, within rolling hour.
begin;
set local role service_role;
do $$
declare v_count integer; n integer;
begin
  select count(*) into v_count from public.staff_invitations
  where issued_by='00000000-0000-0000-0000-000000000001'
    and issued_at>now()-interval '1 hour';
  for n in 1..(30-v_count) loop
    perform public.test_invite('rate-'||n||'@example.test',lpad(to_hex(1000+n),64,'0'));
  end loop;
  begin
    perform public.test_invite('over-limit@example.test',lpad(to_hex(9999),64,'0'));
    raise exception 'Issuance rate limit failed';
  exception when program_limit_exceeded then null; end;
end $$;
rollback;

-- Force a failure after membership/role insert but before final invite update.
-- A deliberately failing BEFORE trigger proves transaction rollback.
create function public.test_fail_redemption() returns trigger language plpgsql as $$
begin
  if new.redeemed_at is not null then raise exception 'Injected redemption failure' using errcode='23514'; end if;
  return new;
end $$;
create trigger z_test_fail before update on public.staff_invitations
for each row execute function public.test_fail_redemption();
begin;
set local role service_role;
do $$ begin
  begin
    perform public.test_redeem('40000000-0000-4000-8000-000000000001',repeat('9',64));
    raise exception 'Injected failure did not abort redemption';
  exception when check_violation then null; end;
  if exists(select 1 from public.staff_memberships where auth_user_id='40000000-0000-4000-8000-000000000001')
    or exists(select 1 from public.staff_invitations where token_hash=repeat('9',64) and redeemed_at is not null) then
    raise exception 'Partial activation after injected failure';
  end if;
end $$;
rollback;
drop trigger z_test_fail on public.staff_invitations;
drop function public.test_fail_redemption();

begin;
set local role service_role;
select public.test_redeem('40000000-0000-4000-8000-000000000001',repeat('9',64));
do $$ begin
  begin
    perform public.test_redeem('40000000-0000-4000-8000-000000000001',repeat('9',64));
    raise exception 'Redeemed token was reused';
  exception when insufficient_privilege then null; end;
end $$;
commit;

do $$
declare v_member uuid; v_request uuid;
begin
  select membership_id into v_member from public.staff_invitations where token_hash=repeat('9',64);
  select request_id into v_request from public.staff_access_audit
    where subject_membership_id=v_member and action_key='staff_invitation.redeemed';
  if not exists(select 1 from public.staff_memberships m
    join public.staff_member_roles r on r.membership_id=m.id
    join public.staff_role_presets p on p.id=r.role_preset_id
    where m.id=v_member and m.status='active' and m.member_type='freelancer'
      and p.role_key='freelancer' and m.expires_at is not null and r.expires_at=m.expires_at)
    or not exists(select 1 from public.staff_access_audit
      where request_id=v_request and action_key='staff_member_roles.insert'
        and actor_auth_user_id='00000000-0000-0000-0000-000000000001')
    or not exists(select 1 from public.staff_access_audit
      where request_id=v_request and action_key='staff_invitation.redeemed'
        and actor_auth_user_id='40000000-0000-4000-8000-000000000001')
    or exists(select 1 from public.staff_access_audit where action_key like 'staff_invitation.%'
      and (after_state::text like '%@example.test%' or after_state ? 'token_hash'
        or after_state ? 'email_normalized')) then
    raise exception 'Activation scope/expiry or redacted attributed audit incorrect';
  end if;
end $$;

-- Preset changes invalidate outstanding invitations, not membership data.
begin;
set local role service_role;
select public.staff_save_preset_grants('00000000-0000-0000-0000-000000000001',
  'freelancer',1,'[{"capability":"newsroom.access","scope":"all"}]'::jsonb,
  'Changed isolated freelancer grant revision',gen_random_uuid());
do $$ begin
  begin
    perform public.test_redeem('40000000-0000-4000-8000-000000000005',repeat('d',64));
    raise exception 'Stale preset invite redeemed';
  exception when insufficient_privilege then null; end;
end $$;
select public.test_invite('race@example.test',repeat('8',64),null,
  '00000000-0000-0000-0000-000000000001','freelancer',2);
commit;

-- Verify active issuing owner requirement, without touching existing fixture.
begin;
update auth.users set banned_until=now()+interval '1 day'
where id='00000000-0000-0000-0000-000000000001';
set local role service_role;
do $$ begin
  begin
    perform public.test_redeem('40000000-0000-4000-8000-000000000004',repeat('8',64));
    raise exception 'Banned issuing owner still authorized invitation';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
select 'CT-04a invitation lifecycle and atomic redemption tests passed' as result;
