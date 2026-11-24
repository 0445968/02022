-- CT-02j disposable PostgreSQL 17 state/Storage security suite.
-- NEVER connect to production. CT-02i fixture provides real prior staged SQL
-- and simulated Auth principals with role grants, ownerless legacy public data.
\set ON_ERROR_STOP on
\i tests/ct02i-postgres-private-drafts.sql

-- Existing live media_assets includes rights_status; CT-02g's reduced
-- PostgreSQL fixture omitted this extra nonessential column.
alter table public.media_assets add column rights_status text not null default 'unknown';

\i supabase/migrations/20261124020117_ct02j_media_promotion.sql

-- A verified file fingerprint is recorded at upload time by the new route.
update public.media_private_drafts
set source_sha256=repeat('a',64)
where id='61000000-0000-0000-0000-000000000010';

-- A signed-in reader has no private draft mutation or Storage promotion.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $$
begin
  if (select count(*) from public.media_private_drafts)>0 then
    raise exception 'Reader sees private staging records';
  end if;
  begin
    insert into storage.objects(bucket_id,name,owner_id)
    values('media','approved/61000000-0000-0000-0000-000000000010.jpg',
      '00000000-0000-0000-0000-000000000005');
    raise exception 'Reader can write approved public objects';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- Revoked legacy editor cannot use their old editor flag to insert an
-- approved object or change review state.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
do $$
begin
  begin
    update public.media_private_drafts
      set state='publishing', reviewed_by=auth.uid(),
          reviewed_at=now(), rights_status='owned',
          rights_notes='Review evidence accepted by editor',
          publication_path='approved/61000000-0000-0000-0000-000000000010.jpg',
          publication_started_at=now(), attempt_count=1;
    if found then raise exception 'Revoked legacy editor claimed draft'; end if;
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- Assigned freelancer can upload, but cannot approve/promote their own file.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $$
begin
  begin
    update public.media_private_drafts
      set state='publishing', reviewed_by=auth.uid(),
          reviewed_at=now(), rights_status='owned',
          rights_notes='Freelancer tried self approval',
          publication_path='approved/61000000-0000-0000-0000-000000000010.jpg',
          publication_started_at=now(), attempt_count=1
    where id='61000000-0000-0000-0000-000000000010';
    if found then raise exception 'Freelancer promoted own draft'; end if;
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects(bucket_id,name,owner_id)
    values('media','approved/61000000-0000-0000-0000-000000000010.jpg',
      '00000000-0000-0000-0000-000000000003');
    raise exception 'Freelancer bypassed approved public Storage policy';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- Authorized editor cannot bypass review by writing published directly.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
begin
  begin
    update public.media_private_drafts set
      state='published',reviewed_by=auth.uid(),reviewed_at=now(),
      publicATION_path='approved/61000000-0000-0000-0000-000000000010.jpg',
      published_media_id='60000000-0000-0000-0000-000000000001'
    where id='61000000-0000-0000-0000-000000000010';
    raise exception 'Editor skipped active review and published arbitrary media';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.media_private_drafts set
      state='publishing',reviewed_by=auth.uid(),reviewed_at=now(),
      rights_status='restricted',rights_notes='Not licensed for publishing',
      publication_path='approved/61000000-0000-0000-0000-000000000010.jpg',
      publication_started_at=now(),attempt_count=1
    where id='61000000-0000-0000-0000-000000000010';
    raise exception 'Restricted media rights were accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- Even with media.approve, caller cannot insert into approved/ path UNTIL
-- their live publishing claim exists and exactly matches the destination.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
begin
  begin
    insert into storage.objects(bucket_id,name,owner_id)
    values('media','approved/61000000-0000-0000-0000-000000000010.jpg',
       '00000000-0000-0000-0000-000000000002');
    raise exception 'Approved Storage object created before claim';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- First claim succeeds, and the other independent decision boundaries are
-- enforced by BOTH RLS and an invoker database trigger.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
update public.media_private_drafts
set state='publishing',
    reviewed_by=auth.uid(),reviewed_at=now(),
    rights_status='owned',
    rights_notes='Rights inspected and ownership confirmed',
    publication_path='approved/61000000-0000-0000-0000-000000000010.jpg',
    publication_started_at=now(),attempt_count=1
where id='61000000-0000-0000-0000-000000000010'
  and state='pending';
do $$
declare v_count int;
begin
  select count(*) into v_count from public.media_private_drafts
  where state='publishing' and reviewed_by=auth.uid();
  if v_count<>1 then raise exception 'Owner-approved review claim failed'; end if;
  begin
    insert into storage.objects(bucket_id,name,owner_id)
    values('media','approved/61000000-0000-0000-0000-000000000099.jpg',
      '00000000-0000-0000-0000-000000000002');
    raise exception 'Editor wrote mismatched approved path';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.media_private_drafts
      set state='published',
          published_media_id='60000000-0000-0000-0000-000000000001'
      where id='61000000-0000-0000-0000-000000000010';
    raise exception 'Publishing state completed without matching approved media';
  exception when insufficient_privilege then null;
  end;
end $$;

insert into storage.objects(bucket_id,name,owner_id)
values ('media','approved/61000000-0000-0000-0000-000000000010.jpg',
  '00000000-0000-0000-0000-000000000002');
insert into public.media_assets(
  id,url,storage_path,file_name,mime_type,uploaded_by,status,rights_status
) values (
  '60000000-0000-0000-0000-000000000099',
  'https://example.test/public/approved/61000000-0000-0000-0000-000000000010.jpg',
  'approved/61000000-0000-0000-0000-000000000010.jpg','reviewed.jpg',
  'image/jpeg','00000000-0000-0000-0000-000000000002','draft','owned'
);
update public.media_assets
set status='approved',approved_by=auth.uid(),approved_at=now()
where id='60000000-0000-0000-0000-000000000099';
update public.media_private_drafts
set state='published',
 published_media_id='60000000-0000-0000-0000-000000000099',
 last_error=null
where id='61000000-0000-0000-0000-000000000010'
  and state='publishing';
do $$
begin
  if not exists (select 1 from public.media_private_drafts
    where id='61000000-0000-0000-0000-000000000010' and state='published'
    and published_media_id='60000000-0000-0000-0000-000000000099') then
    raise exception 'Reviewer failed safe metadata publication';
  end if;
  begin
    update public.media_private_drafts
      set state='pending'
      where id='61000000-0000-0000-0000-000000000010';
    raise exception 'Published draft was reset';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- Failed promotion can retry with identical rights and destination key;
-- failure must not rewrite source file or invent a new public location.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
update public.media_private_drafts
set state='publishing',reviewed_by=auth.uid(),reviewed_at=now(),
    rights_status='owned',
    rights_notes='Rights inspected and ownership confirmed',
    publication_path='approved/61000000-0000-0000-0000-000000000010.jpg',
    publication_started_at=now(),attempt_count=1
where id='61000000-0000-0000-0000-000000000010';
update public.media_private_drafts
set state='failed',last_error='Simulated transient Storage copy failure'
where id='61000000-0000-0000-0000-000000000010';
update public.media_private_drafts
set state='publishing',publication_started_at=now(),attempt_count=2
where id='61000000-0000-0000-0000-000000000010';
do $$
begin
  if (select attempt_count from public.media_private_drafts
    where id='61000000-0000-0000-0000-000000000010')<>2 then
    raise exception 'Retry did not increment claim attempt';
  end if;
  begin
    update public.media_private_drafts
      set publication_path='approved/not-the-same-media.jpg',
          publication_started_at=now(),attempt_count=3
      where id='61000000-0000-0000-0000-000000000010';
    raise exception 'Retry changed approved destination';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

select 'CT-02j private review, denial, promotion and retry security passed' as result;
