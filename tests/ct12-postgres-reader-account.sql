\set ON_ERROR_STOP on
\i tests/ct11b-postgres-homepage-history.sql
-- Isolated fixture augments the deliberately minimal restored schema; never hosted.
alter table public.profiles add column if not exists name text,add column if not exists display_name text default 'Reader',add column if not exists email text,add column if not exists email_verified timestamptz,add column if not exists image text,add column if not exists editorial_title text,add column if not exists preferred_locale text default 'en',add column if not exists created_at timestamptz default now(),add column if not exists updated_at timestamptz default now();
alter table public.profiles enable row level security;
grant select,update on public.profiles to authenticated;
create policy ct12_fixture_profile_read on public.profiles for select to authenticated using(id=auth.uid());
create policy ct12_fixture_profile_write on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create schema if not exists storage;
create table if not exists storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner_id text);
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated;
grant select,update,delete on storage.objects to authenticated;
create policy ct12_fixture_storage_all on storage.objects for all to authenticated using(true) with check(true);
create table if not exists public.media_assets(id uuid primary key default gen_random_uuid(),url text not null,storage_path text not null,mime_type text not null,alt_text text,caption text,credit text,width int,height int,status text not null,rights_status text,embargo_until timestamptz,license_expires_at timestamptz,is_superseded boolean default false,trashed_at timestamptz,display_caption boolean default true,display_credit boolean default true,decorative boolean default false,uploaded_by uuid,approved_by uuid,approved_at timestamptz,superseded_by uuid);
alter table public.media_assets add column if not exists superseded_by uuid,add column if not exists rights_status text default 'unknown';
create table if not exists public.editorial_profiles(id uuid primary key default gen_random_uuid(),account_id uuid,slug text,byline_name text,editorial_title text,bio text,headshot_media_id uuid,byline_status text,created_at timestamptz default now());
alter table public.editorial_profiles add column if not exists editorial_title text,add column if not exists bio text,add column if not exists headshot_media_id uuid,add column if not exists created_at timestamptz default now();
create table if not exists public.media_usage(id uuid primary key default gen_random_uuid(),media_asset_id uuid);
create table if not exists public.media_private_drafts(id uuid primary key default gen_random_uuid(),published_media_id uuid);
create table if not exists public.story_versions(id uuid primary key default gen_random_uuid(),snapshot jsonb);
create table if not exists public.breaking_news(id uuid primary key default gen_random_uuid(),headline text,story_id uuid,external_url text,active boolean default true,position integer default 0,starts_at timestamptz,ends_at timestamptz);
alter table public.breaking_news add column if not exists external_url text;
alter table public.breaking_news enable row level security;
grant select on public.breaking_news to anon,authenticated;
insert into public.staff_role_capabilities(role_preset_id,capability_key,scope) select p.id,k::public.staff_capability_key,'all' from public.staff_role_presets p cross join unnest(array['team.view_audit','media.delete','media.view_all','story.view_all','newsroom.access']) k where p.role_key='owner' on conflict do nothing;
\i supabase/migrations/20261125012032_ct12_reader_privacy_editorial_guards.sql
do $fn$begin
 if has_column_privilege('authenticated','public.profiles','email_verified','UPDATE') or has_column_privilege('authenticated','public.profiles','is_editor','UPDATE') or has_table_privilege('authenticated','newsroom_private.reader_privacy_requests','SELECT') or has_table_privilege('authenticated','public.media_assets','DELETE') or has_function_privilege('anon','public.reader_export_snapshot()','EXECUTE') then raise exception 'Reader privacy or media privilege leak';end if;
end;$fn$;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $fn$declare p jsonb;id uuid;begin
 p:=public.reader_read_account();
 p:=public.reader_save_account((p->>'updatedAt')::timestamptz,'Private Reader','es','ocean');
 if p->>'displayName'<>'Private Reader' or p->>'locale'<>'es' or p->>'image'<>'/avatars/reader-ocean.svg' then raise exception 'Profile save failed';end if;
 begin perform public.reader_save_account((p->>'updatedAt')::timestamptz,'Name','en','https://evil.example/track');raise exception 'Arbitrary avatar accepted';exception when invalid_parameter_value then null;end;
 p:=public.reader_change_privacy('request','delete',null,'DELETE');id:=(p->'requests'->0->>'id')::uuid;
 p:=public.reader_change_privacy('request','delete',null,'DELETE');if jsonb_array_length(p->'requests')<>1 then raise exception 'Duplicate request';end if;
 if (public.reader_export_snapshot()->'account'->>'displayName')<>'Private Reader' then raise exception 'Own export wrong';end if;
 begin perform public.staff_read_privacy_queue(0);raise exception 'Reader saw privacy queue';exception when insufficient_privilege then null;end;
end;$fn$;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$begin
 if jsonb_array_length(public.reader_read_account()->'requests')<>0 then raise exception 'Other reader saw requests';end if;
 begin perform public.staff_read_privacy_queue(0);raise exception 'Editor saw owner queue';exception when insufficient_privilege then null;end;
end;$fn$;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $fn$declare q jsonb;id uuid;at timestamptz;begin
 q:=public.staff_read_privacy_queue(0)->'items'->0;id:=(q->>'id')::uuid;at:=(q->>'updatedAt')::timestamptz;
 if id is null then raise exception 'Owner queue missing request';end if;
 perform public.staff_review_privacy_request(id,at,'review',null);
 q:=public.staff_read_privacy_queue(0)->'items'->0;
 if q->>'status'<>'reviewing' then raise exception 'Review transition failed';end if;
 perform public.staff_review_privacy_request(id,(q->>'updatedAt')::timestamptz,'decline','retention_required');
 if jsonb_array_length(public.staff_read_privacy_queue(0)->'items')<>0 then raise exception 'Closed request remained';end if;
end;$fn$;
rollback;
select 'CT12 reader ownership, verified privacy queue, restricted profile and media privileges passed' as result;
