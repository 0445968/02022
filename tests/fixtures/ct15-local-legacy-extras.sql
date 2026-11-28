-- Fixture-only missing legacy byline shape, reconstructed from existing
-- database.types.ts and CT02h/CT12 tests. This is not a migration or hosted schema dump.
create table public.editorial_profiles(
 id uuid primary key default gen_random_uuid(),
 account_id uuid references public.profiles(id) on delete set null,
 byline_name text not null,slug text not null unique,editorial_title text,bio text,
 headshot_media_id uuid references public.media_assets(id) on delete set null,
 byline_status text not null default 'active',
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.editorial_profiles enable row level security;
create policy editorial_profiles_select_visible on public.editorial_profiles for select to anon,authenticated using(byline_status in ('active','former'));
create policy editorial_profiles_select_own on public.editorial_profiles for select to authenticated using(account_id=auth.uid());
