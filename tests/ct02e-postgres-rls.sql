-- CT-02e isolated PostgreSQL 17 integration checks. NEVER PRODUCTION.
\set ON_ERROR_STOP on

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid stable language sql as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
create type public.story_status as enum ('draft','in_review','scheduled','published','archived');

create table public.profiles (
 id uuid primary key references auth.users(id),
 is_author boolean default false, is_editor boolean default false
);
create table public.stories (
 id uuid primary key,
 headline text not null,
 slug text not null,
 status public.story_status not null default 'draft',
 created_by uuid,
 author_id uuid,
 editor_id uuid,
 published_at timestamptz,
 originally_published_at timestamptz,
 scheduled_at timestamptz,
 access_level text default 'public'
);
create table public.story_revisions (
 id uuid primary key,
 story_id uuid not null unique references public.stories(id),
 created_by uuid,
 headline text,
 slug text,
 status public.story_status default 'draft',
 author_id uuid,
 editor_id uuid,
 originally_published_at timestamptz,
 scheduled_at timestamptz,
 access_level text default 'public'
);
alter table public.stories enable row level security;
alter table public.story_revisions enable row level security;
grant select on public.stories to anon;
grant select,insert,update,delete on public.stories,public.story_revisions to authenticated;

-- Replica of the named RESTORED policies, with the same legacy bypass bug.
create policy stories_select_public on public.stories for select
 to anon,authenticated using (status='published' and published_at <= now());
create policy stories_select_editor on public.stories for select to authenticated
 using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_editor));
create policy stories_select_own_author on public.stories for select to authenticated
 using (author_id=auth.uid());
create policy stories_insert_staff on public.stories for insert to authenticated
 with check (exists(select 1 from public.profiles p where p.id=auth.uid() and (p.is_author or p.is_editor)));
create policy stories_update_editor on public.stories for update to authenticated
 using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_editor))
 with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_editor));
create policy stories_update_own_author on public.stories for update to authenticated
 using (author_id=auth.uid()) with check (author_id=auth.uid());
create policy stories_delete_editor on public.stories for delete to authenticated
 using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_editor));

create policy "Editorial staff can read story revisions"
 on public.story_revisions for select to public using (
   exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_editor));
create policy "Editorial staff can create story revisions"
 on public.story_revisions for insert to public with check (
   exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_editor));
create policy "Editorial staff can update story revisions"
 on public.story_revisions for update to public
 using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_editor))
 with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_editor));
create policy "Editorial staff can delete story revisions"
 on public.story_revisions for delete to public using (
   exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_editor));

\i supabase/migrations/20261123222804_ct02b_staff_access.sql
\i supabase/migrations/20261123230955_ct02c_owner_guard_and_audit.sql
\i supabase/migrations/20261123235430_ct02e_story_revision_rls.sql

-- Deliberate offline QA fixture. These inserts are NOT part of migrations.
insert into auth.users(id) values
 ('00000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000002'),
 ('00000000-0000-0000-0000-000000000003'),
 ('00000000-0000-0000-0000-000000000004'),
 ('00000000-0000-0000-0000-000000000005');
insert into public.profiles(id,is_author,is_editor) values
 ('00000000-0000-0000-0000-000000000001',true,true),
 ('00000000-0000-0000-0000-000000000002',true,true),
 ('00000000-0000-0000-0000-000000000003',true,false),
 ('00000000-0000-0000-0000-000000000004',true,true),
 ('00000000-0000-0000-0000-000000000005',false,false);
insert into public.staff_memberships(id,auth_user_id,status,activated_at,member_type) values
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','active',now(),'employee'),
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','active',now(),'employee'),
 ('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000003','active',now(),'freelancer'),
 ('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000004','revoked',now(),'employee');
insert into public.staff_member_roles(membership_id,role_preset_id)
select '10000000-0000-0000-0000-000000000001',id
from public.staff_role_presets where role_key='owner';
insert into public.staff_member_roles(membership_id,role_preset_id)
select '10000000-0000-0000-0000-000000000002',id
from public.staff_role_presets where role_key='editor';
insert into public.staff_member_roles(membership_id,role_preset_id)
select '10000000-0000-0000-0000-000000000003',id
from public.staff_role_presets where role_key='freelancer';
insert into public.staff_member_roles(membership_id,role_preset_id)
select '10000000-0000-0000-0000-000000000004',id
from public.staff_role_presets where role_key='editor';

insert into public.staff_role_capabilities (role_preset_id,capability_key,scope)
select p.id,x.capability_key::public.staff_capability_key,x.scope
from public.staff_role_presets p
cross join (values
 ('story.view_all','all'),
 ('story.edit_all','all'),
 ('story.publish','all'),
 ('story.assign','all'),
 ('story.schedule','all'),
 ('story.archive_delete','all'),
 ('revision.view','all'),
 ('revision.discard','all'),
 ('story.create','all')
) as x(capability_key,scope) where p.role_key in ('owner','editor');

insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
select p.id,x.capability_key::public.staff_capability_key,x.scope
from public.staff_role_presets p
cross join (values
 ('story.view_assigned','assigned'),
 ('story.edit_assigned','assigned'),
 ('revision.edit_assigned','assigned'),
 ('revision.view','assigned'),
 ('story.submit_review','assigned')
) as x(capability_key,scope) where p.role_key='freelancer';

insert into public.stories(id,headline,slug,status,created_by,author_id,published_at)
values
 ('20000000-0000-0000-0000-000000000001','Public story','public-story','published',
  '00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000004',now()-interval '2 days'),
 ('20000000-0000-0000-0000-000000000002','Assigned draft','assigned-draft','draft',
  '00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000003',null),
 ('20000000-0000-0000-0000-000000000003','Private draft','private-draft','draft',
  '00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000004',null);
insert into public.staff_story_assignments(story_id,membership_id,assignment_type)
values ('20000000-0000-0000-0000-000000000002',
 '10000000-0000-0000-0000-000000000003','author');
insert into public.story_revisions(id,story_id,headline,slug,status,created_by,author_id)
values ('30000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000003','Private revision',
        'private-revision','draft','00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000004');

-- Anonymous can still see published stories, but not drafts/revisions.
begin;
set local role anon;
do $$
begin
 if (select count(*) from public.stories) <> 1 then
    raise exception 'Published public-story read regressed';
 end if;
end $$;
rollback;

-- An ordinary reader gets published stories only, regardless of Auth metadata.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000005';
do $$
begin
 if (select count(*) from public.stories) <> 1 then
   raise exception 'Reader saw private story';
 end if;
 if (select count(*) from public.story_revisions) <> 0 then
   raise exception 'Reader saw unpublished revision';
 end if;
end $$;
rollback;

-- Active freelancer sees only published + assigned draft, cannot see other draft.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
do $$
declare v_count integer;
begin
 if (select count(*) from public.stories) <> 2 then
   raise exception 'Freelancer assigned story RLS failed';
 end if;
 if (select count(*) from public.story_revisions) <> 0 then
   raise exception 'Freelancer saw unassigned unpublished revision';
 end if;

 update public.stories set headline='Author-edit test'
 where id='20000000-0000-0000-0000-000000000002';
 get diagnostics v_count = row_count;
 if v_count <> 1 then raise exception 'Assigned writer cannot edit assigned draft'; end if;

 begin
   update public.stories set author_id='00000000-0000-0000-0000-000000000002'
     where id='20000000-0000-0000-0000-000000000002';
   raise exception 'Freelancer reassigned story';
 exception when insufficient_privilege then null;
 end;
 begin
   update public.stories set status='published'
     where id='20000000-0000-0000-0000-000000000002';
   raise exception 'Freelancer published story';
 exception when insufficient_privilege then null;
 end;
 begin
   update public.stories set access_level='private'
     where id='20000000-0000-0000-0000-000000000002';
   raise exception 'Freelancer modified access tier';
 exception when insufficient_privilege then null;
 end;

 update public.stories set headline='Should not change'
   where id='20000000-0000-0000-0000-000000000003';
 get diagnostics v_count = row_count;
 if v_count <> 0 then raise exception 'Freelancer edited an unassigned story'; end if;

 insert into public.story_revisions
   (id,story_id,headline,slug,status,created_by,author_id)
 values
   ('30000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002','Assigned revision',
    'assigned-draft','draft','00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000003');

 if (select count(*) from public.story_revisions) <> 1 then
   raise exception 'Freelancer could not see their own assigned revision';
 end if;

 delete from public.story_revisions
 where story_id='20000000-0000-0000-0000-000000000002';
 get diagnostics v_count = row_count;
 if v_count <> 0 then
   raise exception 'Freelancer discarded revision without approval';
 end if;
end $$;
rollback;

-- Legacy editor flag and old author link never override revoked staff status.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000004';
do $$
declare v_count integer;
begin
 if (select count(*) from public.stories) <> 1 then
   raise exception 'Revoked legacy editor can read unpublished story';
 end if;
 if (select count(*) from public.story_revisions) <> 0 then
   raise exception 'Revoked legacy editor can read revisions';
 end if;
 update public.stories set headline='Revoked edit attack'
 where id='20000000-0000-0000-0000-000000000003';
 get diagnostics v_count = row_count;
 if v_count <> 0 then
   raise exception 'Revoked legacy editor can still update private story';
 end if;
end $$;
rollback;

-- Active editor can see drafts, but explicit deny must override their role.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
do $$
begin
 if (select count(*) from public.stories) <> 3 then
   raise exception 'Active editor lacks view of all stories';
 end if;
 if (select count(*) from public.story_revisions) <> 1 then
   raise exception 'Active editor cannot read draft revision';
 end if;
end $$;
rollback;

-- Populate a deny override as trusted DBA on disposable test only.
insert into public.staff_capability_overrides
(membership_id,capability_key,effect,scope,reason,granted_by)
values ('10000000-0000-0000-0000-000000000002',
        'story.edit_all','deny','all','QA revocation simulation',
        '00000000-0000-0000-0000-000000000001');

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
do $$
declare v_count integer;
begin
 if (select count(*) from public.stories) <> 3 then
   raise exception 'Editor view scope was incorrectly revoked by edit deny';
 end if;
 update public.stories set headline='Explicit deny attack'
 where id='20000000-0000-0000-0000-000000000003';
 get diagnostics v_count = row_count;
 if v_count <> 0 then
   raise exception 'Explicit deny failed to remove edit';
 end if;
end $$;
rollback;

-- Check migration does not touch old publishing RPC, media or versions yet.
do $$
begin
 if (select count(*) from pg_policies
     where schemaname='public' and tablename='stories'
       and policyname in ('stories_select_editor','stories_update_editor',
       'stories_update_own_author','stories_select_own_author')) <> 0 then
    raise exception 'Legacy direct story policies survived migration';
 end if;
 if (select count(*) from pg_policies
     where schemaname='public' and tablename='story_revisions'
       and policyname like 'Editorial staff can%') <> 0 then
    raise exception 'Legacy revision policies survived migration';
 end if;
end $$;

select 'CT-02e isolated story + revision RLS integration passed' as result;
