-- CT-02b disposable PostgreSQL 17 RLS tests only. NO production Supabase connection.
\set ON_ERROR_STOP on

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid stable language sql as $
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
create table public.stories (id uuid primary key);

\i supabase/migrations/20261123222804_ct02b_staff_access.sql

do $$
begin
  if (select count(*) from public.staff_memberships) <> 0 then
    raise exception 'Staff migration must not auto-enroll restored accounts';
  end if;
  if (select count(*) from public.staff_role_capabilities) <> 0 then
    raise exception 'New role presets must have zero implicit privileges';
  end if;
  if has_table_privilege('anon', 'public.staff_memberships', 'select') then
    raise exception 'Anonymous membership read must be denied';
  end if;
  if has_table_privilege('authenticated','public.staff_memberships','insert') or
     has_table_privilege('authenticated','public.staff_role_capabilities','update') or
     has_table_privilege('authenticated','public.staff_access_audit','select') then
    raise exception 'Authenticated staff manager write or audit access leaked';
  end if;
end $$;

-- Fixtures: one active freelancer, one suspended member and an ordinary reader.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000003');
insert into public.staff_memberships (id,auth_user_id,status,activated_at,member_type)
values
  ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','active',now(),'freelancer'),
  ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','suspended',now(),'employee');
insert into public.staff_member_roles (membership_id,role_preset_id)
select '10000000-0000-0000-0000-000000000001',id
from public.staff_role_presets where role_key='freelancer';
insert into public.staff_member_roles (membership_id,role_preset_id)
select '10000000-0000-0000-0000-000000000002',id
from public.staff_role_presets where role_key='editor';
insert into public.staff_role_capabilities (role_preset_id,capability_key,scope)
select id,'story.view_assigned'::public.staff_capability_key,'assigned'
from public.staff_role_presets where role_key='freelancer';
insert into public.staff_role_capabilities (role_preset_id,capability_key,scope)
select id,'story.publish'::public.staff_capability_key,'all'
from public.staff_role_presets where role_key='editor';
insert into public.stories(id) values
  ('20000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002');
insert into public.staff_story_assignments(story_id,membership_id,assignment_type)
  values ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','author');
insert into public.staff_story_assignments(story_id,membership_id,assignment_type)
  values ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','editor');
insert into public.staff_capability_overrides
 (membership_id,capability_key,effect,scope,reason,granted_by)
values ('10000000-0000-0000-0000-000000000001',
        'story.publish','deny','all','Test negative override',
        '00000000-0000-0000-0000-000000000001');

-- Authenticated active freelancer sees only their own membership, assigned role,
-- active assignment and own override. They cannot see editor privileges.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
do $
begin
  if (select count(*) from public.staff_memberships) <> 1 or
     (select count(*) from public.staff_member_roles) <> 1 or
     (select count(*) from public.staff_role_presets) <> 1 or
     (select count(*) from public.staff_role_capabilities) <> 1 or
     (select count(*) from public.staff_story_assignments) <> 1 or
     (select count(*) from public.staff_capability_overrides) <> 1 then
    raise exception 'Active freelancer RLS visibility violated';
  end if;
end $;
rollback;

-- Authenticated reader cannot list any staff memberships, roles, or assignments.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
do $
begin
  if (select count(*) from public.staff_memberships) <> 0 or
     (select count(*) from public.staff_role_capabilities) <> 0 or
     (select count(*) from public.staff_story_assignments) <> 0 then
    raise exception 'Reader escaped staff RLS isolation';
  end if;
end $;
rollback;

-- Suspended member can see only their own membership status, no grants/assignments.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
do $
begin
  if (select count(*) from public.staff_memberships) <> 1 or
     (select count(*) from public.staff_role_capabilities) <> 0 or
     (select count(*) from public.staff_story_assignments) <> 0 or
     (select count(*) from public.staff_member_roles) <> 0 then
    raise exception 'Suspended user retained staff access';
  end if;
end $;
rollback;

select 'CT-02b PostgreSQL RLS fixture passed' as result;
