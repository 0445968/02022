-- CT-02f: disposable PostgreSQL 17 Auth/RLS/RPC integration fixture.
-- NEVER connect this workflow to the hosted Supabase project.
\set ON_ERROR_STOP on

-- Reuse the verified prior role, legacy-policy, story and authorization
-- fixtures. The CT-02e fixture ends with editor2 explicitly denied edit_all;
-- CT-02f tests that deny separately before any positive publication.
\i tests/ct02e-postgres-rls.sql

-- Expand the deliberately small CT-02e fixture to match the live columns
-- referenced by the restored publisher function.
alter table public.stories
  add column short_title text,
  add column subheadline text,
  add column summary text,
  add column body jsonb not null default '{}'::jsonb,
  add column language text not null default 'en',
  add column primary_category_id uuid,
  add column island text,
  add column featured_image_id uuid,
  add column image_caption text,
  add column image_credit text,
  add column seo_title text,
  add column seo_description text,
  add column updated_by uuid;

alter table public.story_revisions
  add column short_title text,
  add column subheadline text,
  add column summary text,
  add column body jsonb not null default '{}'::jsonb,
  add column language text not null default 'en',
  add column primary_category_id uuid,
  add column category_ids uuid[] not null default '{}'::uuid[],
  add column tag_ids uuid[] not null default '{}'::uuid[],
  add column island text,
  add column featured_image_id uuid,
  add column image_caption text,
  add column image_credit text,
  add column seo_title text,
  add column seo_description text;

create table public.story_versions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id),
  headline text not null default '',
  short_title text,
  subheadline text,
  summary text,
  body jsonb not null default '{}'::jsonb,
  author_id uuid,
  editor_id uuid,
  language text not null default 'en',
  primary_category_id uuid,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
create table public.story_categories(
  story_id uuid not null references public.stories(id),
  category_id uuid not null,
  is_primary boolean not null default false,
  primary key (story_id,category_id)
);
create table public.story_tags(
  story_id uuid not null references public.stories(id),
  tag_id uuid not null,
  primary key (story_id,tag_id)
);

alter table public.story_versions enable row level security;
grant select,insert on public.story_versions to authenticated;

-- Test the migration against the ORIGINAL names and access model.
create policy versions_insert_staff on public.story_versions
  for insert to authenticated with check (
    exists(select 1 from public.profiles p where p.id=auth.uid()
       and (p.is_author or p.is_editor))
  );
create policy versions_select_editor on public.story_versions
  for select to authenticated using (
    exists(select 1 from public.profiles p where p.id=auth.uid()
       and p.is_editor)
  );
create policy versions_select_own_author on public.story_versions
  for select to authenticated using (
    exists(select 1 from public.stories s where s.id=story_versions.story_id
       and s.author_id=auth.uid())
  );

-- The real legacy function is a byte-for-byte fixture extracted read-only
-- from the restored Supabase database, not a handwritten replacement.
\i tests/fixtures/ct02f-original-publisher.sql
\i supabase/migrations/20261124001339_ct02f_publisher_versions.sql

do $$
begin
  if has_function_privilege('anon',
       'public.publish_story_revision(uuid,uuid)','EXECUTE') then
    raise exception 'Anonymous publisher RPC EXECUTE privilege leaked';
  end if;
  if not has_function_privilege('authenticated',
       'public.publish_story_revision(uuid,uuid)','EXECUTE') then
    raise exception 'Existing editor publish RPC access was removed';
  end if;
  if (select count(*) from pg_policies
      where schemaname='public' and tablename='story_versions'
        and policyname in (
          'versions_insert_staff','versions_select_editor',
          'versions_select_own_author')) <> 0 then
    raise exception 'Old author/editor history RLS still permits direct access';
  end if;
end $$;

-- Existing published story is authored by user 4, a REVOKED legacy
-- editor/author, while user 2 is an active editorial publisher.
update public.stories set
  short_title='Old short title',
  subheadline='Prior published subheadline',
  summary='Published summary',
  body='{"content":[{"text":"Prior published body"}]}'::jsonb,
  language='en',
  editor_id='00000000-0000-0000-0000-000000000002',
  primary_category_id='40000000-0000-0000-0000-000000000002'
where id='20000000-0000-0000-0000-000000000001';

insert into public.story_categories(story_id,category_id,is_primary)
values ('20000000-0000-0000-0000-000000000001',
        '40000000-0000-0000-0000-000000000002',true);
insert into public.story_tags(story_id,tag_id)
values ('20000000-0000-0000-0000-000000000001',
        '50000000-0000-0000-0000-000000000002');

insert into public.story_revisions(
  id,story_id,headline,short_title,subheadline,summary,body,
  language,status,access_level,author_id,editor_id,created_by,
  slug,primary_category_id,category_ids,tag_ids,originally_published_at
) values (
  '30000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000001',
  'New published headline',
  'New short title',
  'New subheadline',
  'New summary',
  '{"content":[{"text":"New published body"}]}'::jsonb,
  'en','draft','public',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  'new-published-slug',
  '40000000-0000-0000-0000-000000000001',
  array['40000000-0000-0000-0000-000000000001']::uuid[],
  array['50000000-0000-0000-0000-000000000001']::uuid[],
  '2020-01-01T00:00:00Z'
);

create temporary table ct02f_original as
  select id,headline,short_title,published_at,body from public.stories
  where id='20000000-0000-0000-0000-000000000001';

-- Anonymous data access is still limited to public stories, not history.
begin;
set local role anon;
do $$
begin
  if has_table_privilege('anon','public.story_versions','SELECT') then
    raise exception 'Anonymous version-history access leaked';
  end if;
end $$;
rollback;

-- A signed-in reader and a revoked editor must never see the history.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $$
begin
  if (select count(*) from public.story_versions) <> 0 then
    raise exception 'Reader can see version history';
  end if;
end $$;
rollback;

-- A revoked user with legacy is_editor=true, previously the story author,
-- cannot invoke the RPC directly, even when publishing endpoint is bypassed.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
do $$
begin
  begin
    perform public.publish_story_revision(
      '20000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000004');
    raise exception 'Revoked legacy editor published via direct privileged RPC';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- Freelancers and ordinary readers cannot publish existing updates.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $$
begin
  begin
    perform public.publish_story_revision(
      '20000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000003');
    raise exception 'Freelancer published revision via direct RPC';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.publish_story_revision(
      '20000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002');
    raise exception 'Forged p_user_id bypassed authenticated user check';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $$
begin
  begin
    perform public.publish_story_revision(
      '20000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000005');
    raise exception 'Reader published revision via RPC';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- Editor 2 has story.publish but CT-02e fixture did not grant
-- revision.publish; independent permission requirements deny publication.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
begin
  begin
    perform public.publish_story_revision(
      '20000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002');
    raise exception 'Story-publish grant alone bypassed revision-publish grant';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- Grant editor the specific second capability in this DISPOSABLE fixture.
insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
select id,'revision.publish','all'
from public.staff_role_presets where role_key='editor';

-- Existing CT-02e test leaves a story.edit_all explicit deny for editor2.
-- A publishing grant must not override a separate edit denial.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
begin
  begin
    perform public.publish_story_revision(
      '20000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002');
    raise exception 'Editor with explicit edit deny published directly';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- Remove only this isolated fixture's edit denial; restored production
-- role grants remain untouched.
delete from public.staff_capability_overrides
where membership_id='10000000-0000-0000-0000-000000000002'
  and capability_key='story.edit_all';

-- A revision.publish explicit DENY also takes precedence over role grants.
insert into public.staff_capability_overrides
(membership_id,capability_key,effect,scope,reason,granted_by)
values ('10000000-0000-0000-0000-000000000002',
        'revision.publish','deny','all','Isolated publishing veto',
        '00000000-0000-0000-0000-000000000001');
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
begin
  begin
    perform public.publish_story_revision(
      '20000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002');
    raise exception 'Publisher bypassed explicit revision deny';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

delete from public.staff_capability_overrides
where membership_id='10000000-0000-0000-0000-000000000002'
  and capability_key='revision.publish';

-- A suspended member cannot retain publication via old profile.is_editor.
update public.staff_memberships set status='suspended',suspended_at=now()
where id='10000000-0000-0000-0000-000000000002';
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
begin
  begin
    perform public.publish_story_revision(
      '20000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002');
    raise exception 'Suspended editor published via RPC';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
update public.staff_memberships set status='active',suspended_at=null
where id='10000000-0000-0000-0000-000000000002';

-- Expired role grant also denies publishing.
update public.staff_member_roles
set expires_at=now()-interval '1 day'
where membership_id='10000000-0000-0000-0000-000000000002';
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
begin
  begin
    perform public.publish_story_revision(
      '20000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002');
    raise exception 'Expired editor role published via RPC';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
update public.staff_member_roles set expires_at=null
where membership_id='10000000-0000-0000-0000-000000000002';

-- History SELECT and direct snapshot INSERT for assigned freelancer.
-- This inserts only within a rollback transaction.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $$
declare v_count integer;
begin
  insert into public.story_versions(
    story_id,headline,body,language,author_id,created_by
  ) values (
    '20000000-0000-0000-0000-000000000002',
    'Assigned draft','{}'::jsonb,'en',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000003'
  );
  if (select count(*) from public.story_versions) <> 1 then
    raise exception 'Assigned member cannot view legitimate version snapshot';
  end if;
  begin
    insert into public.story_versions(
      story_id,headline,body,language,author_id,created_by
    ) values (
      '20000000-0000-0000-0000-000000000002',
      'Forgery headline','{}'::jsonb,'en',
      '00000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000003'
    );
    raise exception 'Freelancer forged a historical snapshot';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.story_versions(
      story_id,headline,body,language,author_id,created_by
    ) values (
      '20000000-0000-0000-0000-000000000002',
      'Assigned draft','{}'::jsonb,'en',
      '00000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000001'
    );
    raise exception 'Freelancer forged historical record author';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.story_versions(
      story_id,headline,body,language,created_by
    ) values (
      '20000000-0000-0000-0000-000000000003',
      'Private draft','{}'::jsonb,'en',
      '00000000-0000-0000-0000-000000000003'
    );
    raise exception 'Freelancer inserted history for unassigned story';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- Authorized editor publication preserves ALL existing atomic behavior.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select public.publish_story_revision(
 '20000000-0000-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000002'
);
commit;

do $$
begin
  if not exists (
    select 1 from public.story_versions v
    where v.story_id='20000000-0000-0000-0000-000000000001'
      and v.headline='Public story'
      and v.short_title='Old short title'
      and v.body='{"content":[{"text":"Prior published body"}]}'::jsonb
      and v.created_by='00000000-0000-0000-0000-000000000002'
      and v.author_id='00000000-0000-0000-0000-000000000004'
  ) then raise exception 'Old live story was not preserved verbatim as history'; end if;
  if not exists (
    select 1 from public.stories s
    join ct02f_original b on s.id=b.id
    where s.id='20000000-0000-0000-0000-000000000001'
      and s.headline='New published headline'
      and s.short_title='New short title'
      and s.slug='new-published-slug'
      and s.published_at=b.published_at
      and s.originally_published_at='2020-01-01T00:00:00Z'
      and s.updated_by='00000000-0000-0000-0000-000000000002'
  ) then raise exception 'Atomic publish changed content/timestamps incorrectly'; end if;
  if exists (
    select 1 from public.story_revisions
    where story_id='20000000-0000-0000-0000-000000000001'
  ) then raise exception 'Published revision not deleted'; end if;
  if (select count(*) from public.story_categories
      where story_id='20000000-0000-0000-0000-000000000001') <> 1
     or not exists(
      select 1 from public.story_categories
      where story_id='20000000-0000-0000-0000-000000000001'
      and category_id='40000000-0000-0000-0000-000000000001'
      and is_primary
    ) then raise exception 'Published categories were not replaced'; end if;
  if (select count(*) from public.story_tags
      where story_id='20000000-0000-0000-0000-000000000001') <> 1
     or not exists (
      select 1 from public.story_tags
      where story_id='20000000-0000-0000-0000-000000000001'
      and tag_id='50000000-0000-0000-0000-000000000001'
    ) then raise exception 'Published tags were not replaced'; end if;
end $$;

-- Revoked editor, despite public story authorship, still cannot read history.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
do $$
begin
  if (select count(*) from public.story_versions) <> 0 then
    raise exception 'Revoked legacy editor can read version history';
  end if;
end $$;
rollback;

-- Mid-transaction failure must not publish a partial story update/version.
insert into public.story_revisions(
  id,story_id,headline,slug,status,created_by,author_id,editor_id,
  category_ids,tag_ids
) values (
  '30000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000001',
  'Must remain unpublished','second-attempt','draft',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000002',
  array['40000000-0000-0000-0000-000000000001']::uuid[],
  array['50000000-0000-0000-0000-000000000009']::uuid[]
);
alter table public.story_tags add constraint ct02f_test_bad_tag
  check (tag_id <> '50000000-0000-0000-0000-000000000009');

begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
declare v_before_versions integer;v_before_headline text;
begin
  select count(*) into v_before_versions from public.story_versions;
  select headline into v_before_headline from public.stories
    where id='20000000-0000-0000-0000-000000000001';
  begin
    perform public.publish_story_revision(
      '20000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002');
    raise exception 'Invalid tag unexpectedly published';
  exception when check_violation then null;
  end;
  if (select count(*) from public.story_versions) <> v_before_versions then
    raise exception 'Failed publish left an extra historical version';
  end if;
  if (select headline from public.stories
    where id='20000000-0000-0000-0000-000000000001')
    is distinct from v_before_headline then
    raise exception 'Failed publish changed live story';
  end if;
  if not exists (select 1 from public.story_revisions
    where id='30000000-0000-0000-0000-000000000003') then
    raise exception 'Failed publish discarded pending revision';
  end if;
end $$;
rollback;

select 'CT-02f publisher and version RLS integration passed' as result;
