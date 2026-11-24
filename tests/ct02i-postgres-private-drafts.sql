-- CT-02i: PostgreSQL17 private draft read, upload and cleanup matrix.
-- This is a DISPOSABLE fixture. NEVER connect to hosted Supabase.
\set ON_ERROR_STOP on
\i tests/ct02g-postgres-media-storage.sql

create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
insert into storage.buckets(id,name,public) values ('media','media',true);

\i supabase/migrations/20261124013801_ct02i_private_media_drafts.sql

do $$
begin
  if not exists(
    select 1 from storage.buckets where id='media-drafts' and not public
      and file_size_limit=10485760
  ) then raise exception 'Private draft bucket is not actually private'; end if;
  if not exists (
    select 1 from storage.buckets where id='media' and public
  ) then raise exception 'Existing public media bucket unexpectedly changed'; end if;
  if has_table_privilege('anon','public.media_private_drafts','SELECT') then
    raise exception 'Anon can read private draft metadata'; end if;
  if (select count(*) from pg_policies
    where schemaname='storage' and tablename='objects'
    and policyname like 'ct02i_storage_private_%')<>3 then
    raise exception 'Missing private bucket Storage operation policies'; end if;
end $$;

-- Seed fixture records through postgres, not a hosted project's live data.
-- This tests a freelancer-uploaded private draft after active JWT access.
insert into storage.objects (id,bucket_id,name,owner_id)
values (
  '71000000-0000-0000-0000-000000000010','media-drafts',
  'drafts/00000000-0000-0000-0000-000000000003/71000000-0000-0000-0000-000000000010.jpg',
  '00000000-0000-0000-0000-000000000003'
);
insert into public.media_private_drafts(
  id,uploaded_by,bucket_id,storage_path,file_name,mime_type,file_size_bytes
) values (
  '61000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000003',
  'media-drafts',
  'drafts/00000000-0000-0000-0000-000000000003/71000000-0000-0000-0000-000000000010.jpg',
  'test.jpg','image/jpeg',2048
);

-- Anonymous/reader cannot read private draft objects/metadata.
begin;
set local role anon;
do $$
begin
  if has_table_privilege('anon','storage.objects','SELECT') then
    raise exception 'Anon gained direct private bucket object listing'; end if;
end $$;
rollback;

begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $$
begin
  if (select count(*) from public.media_private_drafts)<>0 then
    raise exception 'Reader can read private metadata'; end if;
  if (select count(*) from storage.objects where bucket_id='media-drafts')<>0 then
    raise exception 'Reader can list private objects'; end if;
  begin
    insert into storage.objects(bucket_id,name,owner_id)
    values ('media-drafts',
      'drafts/00000000-0000-0000-0000-000000000005/reader.jpg',
      '00000000-0000-0000-0000-000000000005');
    raise exception 'Reader bypassed media.upload via Storage';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- Revoked user retains legacy is_editor=true but no current membership.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
do $$
begin
  if (select count(*) from public.media_private_drafts)<>0 then
    raise exception 'Revoked legacy editor can read private draft metadata'; end if;
  if (select count(*) from storage.objects where bucket_id='media-drafts')<>0 then
    raise exception 'Revoked legacy editor can list private draft objects'; end if;
end $$;
rollback;

-- An active freelancer can read their own private draft and upload a NEW
-- object only under their verified JWT identity path.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $$
declare n integer;
begin
  if (select count(*) from public.media_private_drafts)<>1 then
    raise exception 'Freelancer cannot access their private draft'; end if;
  insert into storage.objects(bucket_id,name,owner_id)
  values ('media-drafts',
    'drafts/00000000-0000-0000-0000-000000000003/71000000-0000-0000-0000-000000000011.jpg',
    '00000000-0000-0000-0000-000000000003');
  insert into public.media_private_drafts(
    uploaded_by,storage_path,file_name,mime_type,file_size_bytes
  ) values (
    '00000000-0000-0000-0000-000000000003',
    'drafts/00000000-0000-0000-0000-000000000003/71000000-0000-0000-0000-000000000011.jpg',
    'new.jpg','image/jpeg',1024
  );
  if (select count(*) from public.media_private_drafts)<>2 then
    raise exception 'Freelancer cannot list newly created private draft'; end if;
  begin
    insert into storage.objects(bucket_id,name,owner_id)
    values ('media-drafts',
      'drafts/00000000-0000-0000-0000-000000000002/forgery.jpg',
      '00000000-0000-0000-0000-000000000003');
    raise exception 'Uploader spoofed another user path';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects(bucket_id,name,owner_id)
    values ('media-drafts',
      'drafts/00000000-0000-0000-0000-000000000003/forgery.jpg',
      '00000000-0000-0000-0000-000000000002');
    raise exception 'Uploader spoofed owner ID';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.media_private_drafts(
      uploaded_by,storage_path,file_name,mime_type,file_size_bytes
    ) values (
      '00000000-0000-0000-0000-000000000003',
      'drafts/00000000-0000-0000-0000-000000000003/unknown-object.jpg',
      'fake.jpg','image/jpeg',4096
    );
    raise exception 'Forged draft metadata references nonexistent object';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.media_private_drafts(
      uploaded_by,storage_path,file_name,mime_type,file_size_bytes
    ) values (
      '00000000-0000-0000-0000-000000000003',
      'drafts/00000000-0000-0000-0000-000000000003/71000000-0000-0000-0000-000000000011.jpg',
      'fake.jpg','image/jpeg',20971520
    );
    raise exception 'Oversized draft metadata passed validation';
  exception when check_violation then null;
  end;

  delete from storage.objects
  where bucket_id='media-drafts'
    and name='drafts/00000000-0000-0000-0000-000000000003/71000000-0000-0000-0000-000000000010.jpg';
  get diagnostics n=row_count;
  if n<>0 then raise exception 'Owner deleted a linked draft without approval'; end if;

  insert into storage.objects(bucket_id,name,owner_id)
  values ('media-drafts',
   'drafts/00000000-0000-0000-0000-000000000003/orphan.jpg',
   '00000000-0000-0000-0000-000000000003');
  delete from storage.objects where name=
   'drafts/00000000-0000-0000-0000-000000000003/orphan.jpg';
  get diagnostics n=row_count;
  if n<>1 then raise exception 'User cannot clean up own unlinked private upload'; end if;
end $$;
rollback;

-- Active editors can preview a colleague's private drafts through media.view_all.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
begin
  if (select count(*) from public.media_private_drafts)<>1 then
    raise exception 'Editor lost editorial private draft visibility'; end if;
  if (select count(*) from storage.objects where bucket_id='media-drafts')<>1 then
    raise exception 'Editor cannot list private drafts for review'; end if;
end $$;
rollback;

select 'CT-02i private media bucket and draft RLS passed' as result;
