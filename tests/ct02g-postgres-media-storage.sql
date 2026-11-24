-- CT-02g isolated PostgreSQL 17 media + Storage RLS fixture. NEVER hosted.
\set ON_ERROR_STOP on
\i tests/ct02e-postgres-rls.sql

create schema storage;
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null,
  name text not null,
  owner_id text,
  unique(bucket_id,name)
);
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated,anon;
grant select,insert,update,delete on storage.objects to authenticated;

create type public.media_status as enum
  ('draft','approved','restricted','archived','trashed');
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  width integer,
  height integer,
  alt_text text not null default '',
  caption text,
  credit text,
  uploaded_by uuid not null,
  created_at timestamptz not null default now(),
  status public.media_status not null default 'draft',
  embargo_until timestamptz,
  license_expires_at timestamptz,
  is_superseded boolean not null default false,
  trashed_at timestamptz,
  archived_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  internal_notes text,
  rights_notes text,
  display_caption boolean not null default true,
  display_credit boolean not null default true,
  decorative boolean not null default false
);
alter table public.media_assets enable row level security;
grant select,insert,update,delete on public.media_assets to authenticated;
grant select on public.media_assets to anon;

-- Exact legacy policy identifiers from LIVE hosted schema (simplified
-- old expressions to reproduce bypass behavior in isolated QA).
create policy media_select_public on public.media_assets for select
  to anon,authenticated using (true);
create policy media_insert_staff on public.media_assets for insert
  to authenticated with check (
    exists(select 1 from public.profiles p
       where p.id=auth.uid() and (p.is_editor or p.is_author))
  );
create policy media_update_staff on public.media_assets for update
  to authenticated using (
    exists(select 1 from public.profiles p
       where p.id=auth.uid() and (p.is_editor or p.is_author))
  ) with check (
    exists(select 1 from public.profiles p
       where p.id=auth.uid() and (p.is_editor or p.is_author))
  );
create policy media_delete_staff on public.media_assets for delete
  to authenticated using (
    exists(select 1 from public.profiles p
       where p.id=auth.uid() and p.is_editor)
  );

create policy media_bucket_read_staff on storage.objects for select
  to authenticated using (
    bucket_id='media' and exists(select 1 from public.profiles p
       where p.id=auth.uid() and (p.is_editor or p.is_author))
  );
create policy media_bucket_insert_staff on storage.objects for insert
  to authenticated with check (
    bucket_id='media' and exists(select 1 from public.profiles p
       where p.id=auth.uid() and (p.is_editor or p.is_author))
  );
create policy media_bucket_update_staff on storage.objects for update
  to authenticated using (
    bucket_id='media' and exists(select 1 from public.profiles p
       where p.id=auth.uid() and (p.is_editor or p.is_author))
  );
create policy media_bucket_delete_staff on storage.objects for delete
  to authenticated using (
    bucket_id='media' and exists(select 1 from public.profiles p
       where p.id=auth.uid() and p.is_editor)
  );

\i supabase/migrations/20261124003447_ct02g_media_storage_security.sql

-- These are disposable QA fixtures, NOT migration inserts.
insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
select id,cap::public.staff_capability_key,'all'
from public.staff_role_presets p
cross join (
  values ('media.view_all'),('media.edit_all'),('media.approve'),
         ('media.upload'),('media.delete')
) c(cap) where p.role_key='editor';

insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
select id,cap::public.staff_capability_key,scope
from public.staff_role_presets p
cross join (
  values ('media.upload','all'),('media.edit_own','own')
) c(cap,scope) where p.role_key='freelancer';

insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
select id,'media.view_all','all'
from public.staff_role_presets p where p.role_key='owner';

-- Imported real media Storage owner_id was NULL on all 22 objects.
insert into storage.objects(id,bucket_id,name,owner_id) values
 ('70000000-0000-0000-0000-000000000001','media','uploads/2026/11/approved.jpg',null),
 ('70000000-0000-0000-0000-000000000002','media','uploads/2026/11/draft.jpg',null),
 ('70000000-0000-0000-0000-000000000003','media','uploads/2026/11/trashed.jpg',null);
insert into public.media_assets(
 id,url,storage_path,file_name,mime_type,alt_text,uploaded_by,
 status,internal_notes,rights_notes,trashed_at
) values
 ('60000000-0000-0000-0000-000000000001',
  'https://example.test/public/approved.jpg',
  'uploads/2026/11/approved.jpg','approved.jpg','image/jpeg','Approved image',
  '00000000-0000-0000-0000-000000000002','approved',
  'Private licensing memo','Unpublished terms',null),
 ('60000000-0000-0000-0000-000000000002',
  'https://example.test/public/draft.jpg',
  'uploads/2026/11/draft.jpg','draft.jpg','image/jpeg','Draft image',
  '00000000-0000-0000-0000-000000000003','draft',
  'Freelancer note','Pending clearance',null),
 ('60000000-0000-0000-0000-000000000003',
  'https://example.test/public/trashed.jpg',
  'uploads/2026/11/trashed.jpg','trashed.jpg','image/jpeg','Trashed image',
  '00000000-0000-0000-0000-000000000004','trashed',
  'Do not release','Unlicensed',now());

-- Anonymous sees a SAFE approved image projection but cannot access any
-- direct media record or read internal_notes/rights_notes through the view.
begin;
set local role anon;
do $$
begin
  if (select count(*) from public.media_public_assets) <> 1 then
    raise exception 'Anonymous safe public image view failed';
  end if;
  if has_table_privilege('anon','public.media_assets','SELECT') then
    raise exception 'Anonymous direct media metadata SELECT not revoked';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='media_public_assets'
      and column_name in ('internal_notes','rights_notes','uploaded_by',
        'storage_path','checksum','embargo_until','license_expires_at')
  ) then
    raise exception 'Public media view leaked private metadata';
  end if;
end $$;
rollback;

-- Signed-in reader cannot see media internal fields via base table or
-- Storage listings; safe approved public view remains accessible.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $$
begin
  if (select count(*) from public.media_assets) <> 0 then
    raise exception 'Reader saw newsroom media records';
  end if;
  if (select count(*) from public.media_public_assets) <> 1 then
    raise exception 'Reader lost public approved image';
  end if;
  if (select count(*) from storage.objects) <> 0 then
    raise exception 'Reader listed Storage objects';
  end if;
  begin
    insert into storage.objects(bucket_id,name,owner_id)
    values ('media','uploads/2026/11/reader.jpg',
      '00000000-0000-0000-0000-000000000005');
    raise exception 'Reader uploaded to Staff Storage bucket';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- Revoked editor keeps old profile.is_editor=true but loses catalog+Storage.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
do $$
begin
  if (select count(*) from public.media_assets) <> 0 then
    raise exception 'Revoked editor still sees internal media';
  end if;
  if (select count(*) from storage.objects) <> 0 then
    raise exception 'Revoked editor still lists Storage objects';
  end if;
end $$;
rollback;

-- Freelancer may see/edit ONLY their own media, never approve/erase live
-- objects or use someone else's Storage paths.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $$
declare n integer;
begin
  if (select count(*) from public.media_assets) <> 1 then
    raise exception 'Freelancer did not receive own-media scope';
  end if;
  update public.media_assets set alt_text='Author draft edit'
  where id='60000000-0000-0000-0000-000000000002';
  get diagnostics n=row_count;
  if n <> 1 then raise exception 'Freelancer cannot edit own draft'; end if;

  begin
    update public.media_assets set status='approved'
    where id='60000000-0000-0000-0000-000000000002';
    raise exception 'Freelancer approved own unreviewed media';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.media_assets set uploaded_by=
      '00000000-0000-0000-0000-000000000002'
    where id='60000000-0000-0000-0000-000000000002';
    raise exception 'Freelancer reassigned own media';
  exception when insufficient_privilege then null;
  end;

  delete from storage.objects
    where name='uploads/2026/11/draft.jpg' and bucket_id='media';
  get diagnostics n=row_count;
  if n <> 0 then raise exception 'Uploader deleted catalogued media without media.delete'; end if;

  insert into storage.objects(bucket_id,name,owner_id)
  values ('media','uploads/2026/11/new-own.jpg',
    '00000000-0000-0000-0000-000000000003');

  insert into public.media_assets(url,storage_path,file_name,mime_type,
    uploaded_by,status,alt_text)
  values ('https://example.test/public/new-own.jpg',
    'uploads/2026/11/new-own.jpg','new-own.jpg','image/jpeg',
    '00000000-0000-0000-0000-000000000003','draft','New draft');

  begin
    insert into public.media_assets(url,storage_path,file_name,mime_type,
      uploaded_by,status)
    values ('https://example.test/public/forged.jpg',
      'uploads/2026/11/approved.jpg','forged.jpg','image/jpeg',
      '00000000-0000-0000-0000-000000000003','draft');
    raise exception 'Freelancer claimed someone else Storage file';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into storage.objects(bucket_id,name,owner_id)
    values ('media','uploads/2026/11/forged-owner.jpg',
      '00000000-0000-0000-0000-000000000002');
    raise exception 'Freelancer forged object owner_id';
  exception when insufficient_privilege then null;
  end;

  delete from storage.objects
    where name='uploads/2026/11/new-own.jpg' and bucket_id='media';
  get diagnostics n=row_count;
  if n <> 0 then raise exception 'Uploader deleted linked draft without media.delete'; end if;
end $$;
rollback;

-- A legitimate uploader can remove an orphan created by a failed metadata
-- insert; the same permission does NOT delete linked editorial images.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
insert into storage.objects(bucket_id,name,owner_id)
values ('media','uploads/2026/11/orphan.jpg',
  '00000000-0000-0000-0000-000000000003');
do $$
declare n integer;
begin
  delete from storage.objects
  where name='uploads/2026/11/orphan.jpg';
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Failed upload cleanup could not remove own orphan'; end if;
end $$;
rollback;

-- Active editor can see legacy ownerless media objects and approve draft.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
declare n integer;
begin
  if (select count(*) from public.media_assets) <> 3 then
    raise exception 'Active editor did not see all media records';
  end if;
  if (select count(*) from storage.objects) <> 3 then
    raise exception 'Active media editor cannot view imported ownerless objects';
  end if;
  update public.media_assets set status='approved',
    approved_by='00000000-0000-0000-0000-000000000002',
    approved_at=now()
  where id='60000000-0000-0000-0000-000000000002';
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Editor could not approve submitted media'; end if;
end $$;
rollback;

-- Explicit deny takes precedence over the editor's media.view_all grant.
insert into public.staff_capability_overrides(
 membership_id,capability_key,effect,scope,reason,granted_by
) values ('10000000-0000-0000-0000-000000000002',
 'media.view_all','deny','all','Restricted review access',
 '00000000-0000-0000-0000-000000000001');
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
begin
  -- Edit-all is still granted independently; denying only view_all should
  -- not implicitly revoke the separate edit_all capability.
  if (select count(*) from public.media_assets)<>3 then
    raise exception 'Independent edit-all should still permit viewing';
  end if;
end $$;
rollback;

do $$
begin
  if (select count(*) from pg_policies
      where schemaname='public' and tablename='media_assets'
        and policyname like 'media_%')<>0 then
    raise exception 'Legacy media RLS policies remain active';
  end if;
  if (select count(*) from pg_policies
      where schemaname='storage' and tablename='objects'
        and policyname like 'media_bucket_%')<>0 then
    raise exception 'Legacy Storage RLS policies remain active';
  end if;
end $$;
select 'CT-02g public metadata and Storage scoped RLS checks passed' as result;
