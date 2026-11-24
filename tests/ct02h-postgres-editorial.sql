-- CT-02h: disposable PostgreSQL 17 full direct policy and route RPC matrix.
-- NEVER point this fixture to hosted Supabase.
\set ON_ERROR_STOP on
\i tests/ct02e-postgres-rls.sql

create type public.homepage_slot_type as enum ('lead','secondary','highlight');
create table public.homepage_slots (
  id uuid primary key default gen_random_uuid(),
  slot public.homepage_slot_type not null,
  story_id uuid references public.stories(id),
  position integer not null default 0,
  category_id uuid,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid,
  updated_by uuid
);
create table public.homepage_layout_drafts (
  id text primary key,
  selections jsonb not null,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
create table public.breaking_news (
  id uuid primary key default gen_random_uuid(),
  headline text,
  story_id uuid references public.stories(id),
  active boolean not null default true,
  position integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid,
  updated_by uuid
);
create table public.editorial_profiles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references auth.users(id),
  byline_name text not null,
  byline_status text not null default 'active'
);
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null
);
create table public.story_categories (
  story_id uuid not null references public.stories(id),
  category_id uuid not null,
  is_primary boolean not null default false,
  primary key(story_id,category_id)
);
create table public.story_tags (
  story_id uuid not null references public.stories(id),
  tag_id uuid not null,
  primary key(story_id,tag_id)
);
alter table public.homepage_slots enable row level security;
alter table public.homepage_layout_drafts enable row level security;
alter table public.breaking_news enable row level security;
alter table public.editorial_profiles enable row level security;
alter table public.tags enable row level security;
alter table public.story_categories enable row level security;
alter table public.story_tags enable row level security;
grant select,insert,update,delete on
  public.homepage_slots,public.homepage_layout_drafts,public.breaking_news,
  public.editorial_profiles,public.tags,public.story_categories,public.story_tags
  to authenticated;
grant select on
  public.homepage_slots,public.breaking_news,public.editorial_profiles,
  public.tags,public.story_categories,public.story_tags to anon;

-- Restore live policy names and legacy profile-flag authorization behavior.
create policy homepage_layout_drafts_insert_editor on public.homepage_layout_drafts for insert to authenticated with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_editor));
create policy homepage_layout_drafts_select_editor on public.homepage_layout_drafts for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_editor));
create policy homepage_layout_drafts_update_editor on public.homepage_layout_drafts for update to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_editor)) with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_editor));

create policy homepage_slots_select_public on public.homepage_slots for select
 to anon,authenticated using (
   active and (starts_at is null or starts_at<=now()) and
   (ends_at is null or ends_at>now()) and
   exists(select 1 from public.stories s where s.id=story_id
     and s.status='published' and s.published_at is not null and s.published_at<=now())
 );
create policy homepage_slots_select_editor on public.homepage_slots for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_editor));
create policy homepage_slots_insert_editor on public.homepage_slots for insert to authenticated with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_editor));
create policy homepage_slots_update_editor on public.homepage_slots for update to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_editor)) with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_editor));
create policy homepage_slots_delete_editor on public.homepage_slots for delete to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_editor));

create policy breaking_news_select_public on public.breaking_news for select
 to anon,authenticated using (
   active and (starts_at is null or starts_at<=now()) and
   (ends_at is null or ends_at>now())
 );
create policy breaking_news_select_editor on public.breaking_news for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_editor));
create policy breaking_news_insert_editor on public.breaking_news for insert to authenticated with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_editor));
create policy breaking_news_update_editor on public.breaking_news for update to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_editor)) with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_editor));
create policy breaking_news_delete_editor on public.breaking_news for delete to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_editor));

create policy editorial_profiles_select_visible on public.editorial_profiles for select to anon,authenticated using (byline_status in ('active','former'));
create policy editorial_profiles_select_own on public.editorial_profiles for select to authenticated using (account_id=auth.uid());
create policy editorial_profiles_select_editor on public.editorial_profiles for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_editor));
create policy editorial_profiles_insert_editor on public.editorial_profiles for insert to authenticated with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_editor));
create policy editorial_profiles_delete_editor on public.editorial_profiles for delete to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_editor));
create policy editorial_profiles_update_editor on public.editorial_profiles for update to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_editor)) with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_editor));
create policy "Editors can update editorial profiles" on public.editorial_profiles for update to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_editor)) with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_editor));

create policy tags_select_public on public.tags for select to anon,authenticated using (true);
create policy tags_insert_staff on public.tags for insert to authenticated with check (exists(select 1 from public.profiles p where p.id=auth.uid() and (p.is_editor or p.is_author)));
create policy tags_update_staff on public.tags for update to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and (p.is_editor or p.is_author)));
create policy story_categories_select_public on public.story_categories for select to anon,authenticated using (true);
create policy story_categories_insert_staff on public.story_categories for insert to authenticated with check (exists(select 1 from public.profiles p where p.id=auth.uid() and (p.is_editor or p.is_author)));
create policy story_categories_delete_staff on public.story_categories for delete to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and (p.is_editor or p.is_author)));
create policy story_tags_select_public on public.story_tags for select to anon,authenticated using (true);
create policy story_tags_insert_staff on public.story_tags for insert to authenticated with check (exists(select 1 from public.profiles p where p.id=auth.uid() and (p.is_editor or p.is_author)));
create policy story_tags_delete_staff on public.story_tags for delete to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and (p.is_editor or p.is_author)));

\i tests/fixtures/ct02h-original-homepage-publisher.sql
\i supabase/migrations/20261124012440_ct02h_editorial_direct_policies.sql

-- DUMMY principal grants in disposable test only, none in proposed migrations.
insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
select p.id, c.capability::public.staff_capability_key, 'all'
from public.staff_role_presets p
cross join (values('homepage.view_editor'),('homepage.edit'),
  ('homepage.publish'),('byline.manage'),('byline.view')) c(capability)
where p.role_key='owner';
-- A normal editor can prepare the homepage, not publish live changes.
insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
select p.id, c.capability::public.staff_capability_key, 'all'
from public.staff_role_presets p
cross join (values('homepage.view_editor'),('homepage.edit'),('byline.view')) c(capability)
where p.role_key='editor';

insert into public.tags(id,name) values
 ('40000000-0000-0000-0000-000000000001','Public tag');
insert into public.editorial_profiles(id,account_id,byline_name,byline_status) values
 ('50000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000004','Public writer','active'),
 ('50000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000004','Hidden writer','hidden');
insert into public.homepage_slots(slot,story_id,position,active,created_by,updated_by) values
 ('lead','20000000-0000-0000-0000-000000000001',0,true,
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001');
insert into public.breaking_news(headline,active,created_by,updated_by) values
 ('Current alert',true,
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001');

-- The named old profile policies must be gone. Keep reader-facing public ones.
do $$
begin
 if exists(select 1 from pg_policies
   where schemaname='public' and policyname in (
    'homepage_slots_insert_editor','homepage_slots_delete_editor',
    'homepage_layout_drafts_update_editor','breaking_news_insert_editor',
    'editorial_profiles_update_editor','Editors can update editorial profiles',
    'tags_insert_staff','story_tags_insert_staff','story_categories_delete_staff'
   )) then raise exception 'Legacy editorial direct write policy survived'; end if;
 if not exists(select 1 from pg_policies
   where schemaname='public' and tablename='homepage_slots'
    and policyname='homepage_slots_select_public')
   then raise exception 'Public homepage visibility policy was deleted'; end if;
 if not exists(select 1 from pg_policies
   where schemaname='public' and tablename='breaking_news'
    and policyname='breaking_news_select_public')
   then raise exception 'Public breaking-news visibility policy was deleted'; end if;
end $$;

-- Public viewer retains active headline/slot, public byline/tag; no drafts.
begin;
set local role anon;
do $$
begin
 if (select count(*) from public.homepage_slots)<>1 then
   raise exception 'Public homepage slot hidden'; end if;
 if (select count(*) from public.breaking_news)<>1 then
   raise exception 'Public breaking alert hidden'; end if;
 if (select count(*) from public.editorial_profiles)<>1 then
   raise exception 'Public byline visibility changed'; end if;
 if (select count(*) from public.tags)<>1 then
   raise exception 'Public tag visibility changed'; end if;
 if has_table_privilege('anon','public.homepage_layout_drafts','SELECT') then
   raise exception 'Anonymous can list homepage drafts'; end if;
end $$;
rollback;

-- Former editor has legacy is_editor=true but current member is revoked.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
do $$
declare n int;
begin
 if (select count(*) from public.homepage_slots)<>1 then
   raise exception 'Revoked user lost normal public homepage read'; end if;
 if (select count(*) from public.editorial_profiles)<>2 then
   raise exception 'Own byline reading should remain account-scoped'; end if;
 insert into public.homepage_layout_drafts(id,selections,updated_by)
 values ('current','[]'::jsonb,'00000000-0000-0000-0000-000000000004')
 on conflict do nothing;
 get diagnostics n=row_count;
 if n<>0 then raise exception 'Legacy revoked editor wrote draft'; end if;
end $$;
rollback;
