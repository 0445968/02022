\set ON_ERROR_STOP on
\i tests/ct06b1-postgres-review.sql
\i supabase/migrations/20261124164358_ct05b_assigned_draft_guard.sql
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


alter table public.media_assets add column rights_status text default 'unknown',add column license_name text;
\i supabase/migrations/20261124003447_ct02g_media_storage_security.sql
insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
select id,'media.upload','all' from public.staff_role_presets where role_key='freelancer';
insert into storage.objects(bucket_id,name) values('media','approved/good.jpg'),('media','approved/unknown.jpg'),('media','approved/expired.jpg'),('media','approved/restricted.jpg'),('media','approved/hiddencredit.jpg');
insert into public.media_assets(id,url,storage_path,file_name,mime_type,alt_text,caption,credit,uploaded_by,status,rights_status,license_name,license_expires_at,display_credit)
values
 ('60000000-0000-0000-0000-000000000001','https://test-project.supabase.co/storage/v1/object/public/media/approved/good.jpg','approved/good.jpg','good.jpg','image/jpeg','A cleared image','Caption','Credit','00000000-0000-0000-0000-000000000002','approved','owned',null,null,true),
 ('60000000-0000-0000-0000-000000000002','https://test-project.supabase.co/storage/v1/object/public/media/approved/unknown.jpg','approved/unknown.jpg','unknown.jpg','image/jpeg','Uncleared',null,null,'00000000-0000-0000-0000-000000000002','approved','unknown',null,null,true),
 ('60000000-0000-0000-0000-000000000003','https://test-project.supabase.co/storage/v1/object/public/media/approved/expired.jpg','approved/expired.jpg','expired.jpg','image/jpeg','Expired',null,'Credit','00000000-0000-0000-0000-000000000002','approved','licensed','License',now()-interval '1 day',true),
 ('60000000-0000-0000-0000-000000000004','https://test-project.supabase.co/storage/v1/object/public/media/approved/restricted.jpg','approved/restricted.jpg','restricted.jpg','image/jpeg','Restricted',null,null,'00000000-0000-0000-0000-000000000002','restricted','owned',null,null,true),
 ('60000000-0000-0000-0000-000000000005','https://test-project.supabase.co/storage/v1/object/public/media/approved/hiddencredit.jpg','approved/hiddencredit.jpg','hiddencredit.jpg','image/jpeg','Hidden credit',null,'Required credit','00000000-0000-0000-0000-000000000002','approved','licensed','License',null,false),
 ('60000000-0000-0000-0000-000000000006','https://test-project.supabase.co/storage/v1/object/public/media/approved/missing.jpg','approved/missing.jpg','missing.jpg','image/jpeg','Missing object',null,null,'00000000-0000-0000-0000-000000000002','approved','owned',null,null,true);

\i supabase/migrations/20261124170144_ct05b_approved_media_attachments.sql
\i supabase/migrations/20261124182734_ct06b_atomic_review_request.sql
-- Existing CT06b1 negative decision returned draft to draft. Directly
-- exercise atomic request without a separate status mutation.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $fn$
declare sid uuid:='20000000-0000-0000-0000-000000000002'; v jsonb; pre text;
begin
 v:=public.staff_read_review(sid,'draft');pre:=v->>'fingerprint';
 if v->>'status'<>'draft' or not (v->>'canRequest')::boolean then raise exception 'Draft request control unavailable';end if;
 begin perform public.staff_change_review(sid,'draft','request',repeat('a',64),null,'Attempt outdated saved copy',gen_random_uuid());
 raise exception 'Stale draft submitted';exception when serialization_failure then null;end;
 if not exists(select 1 from public.stories where id=sid and status='draft') then raise exception 'Failed request mutated status';end if;
 v:=public.staff_change_review(sid,'draft','request',pre,null,'Submit current clarified reporting','83000000-0000-0000-0000-000000000001');
 if v->>'status'<>'in_review' or not (v->>'current')::boolean or v->>'fingerprint'=pre or v->>'requestId' is null then raise exception 'Atomic request not bound to submitted snapshot';end if;
end;
$fn$;
commit;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$
declare sid uuid:='20000000-0000-0000-0000-000000000002'; v jsonb;
begin
 v:=public.staff_read_review(sid,'draft');
 v:=public.staff_change_review(sid,'draft','request_changes',v->>'fingerprint',(v->>'requestId')::uuid,'Please add source attribution','83000000-0000-0000-0000-000000000002');
 if v->>'status'<>'draft' or v->>'decision'<>'changes_requested' then raise exception 'Feedback did not reopen draft';end if;
end;
$fn$;
commit;
-- Real canonical media validation must reject revoked tagged images, without
-- transitioning the draft or registering a request.
update public.stories set body=jsonb_build_object('type','doc','content',jsonb_build_array(
 jsonb_build_object('type','image','attrs',jsonb_build_object('src','https://test-project.supabase.co/storage/v1/object/public/media/approved/good.jpg',
 'alt','A cleared image','mediaAssetId','60000000-0000-0000-0000-000000000001','approvedAttachment',true,'credit','Credit','description','Caption'))))
 where id='20000000-0000-0000-0000-000000000002';
update public.media_assets set rights_status='restricted' where id='60000000-0000-0000-0000-000000000001';
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $fn$
declare sid uuid:='20000000-0000-0000-0000-000000000002'; v jsonb;
begin
 v:=public.staff_read_review(sid,'draft');
 begin perform public.staff_change_review(sid,'draft','request',v->>'fingerprint',null,'Attempt revoked media submission',gen_random_uuid());
 raise exception 'Revoked media submitted';exception when invalid_parameter_value then null;end;
 if not exists(select 1 from public.stories where id=sid and status='draft') then raise exception 'Revoked media left status changed';end if;
end;
$fn$;
rollback;
-- Revision submission uses only the working row; live article stays identical.
update public.story_revisions set status='draft' where story_id='20000000-0000-0000-0000-000000000001';
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $fn$
declare sid uuid:='20000000-0000-0000-0000-000000000001'; v jsonb;
begin
 v:=public.staff_read_review(sid,'revision');
 v:=public.staff_change_review(sid,'revision','request',v->>'fingerprint',null,'Submit unpublished revision for review','83000000-0000-0000-0000-000000000003');
 if v->>'status'<>'in_review' or not (v->>'current')::boolean then raise exception 'Atomic revision submission failed';end if;
end;
$fn$;
commit;
do $fn$ begin
 if not exists(select 1 from public.stories s join ct05b2_live b on to_jsonb(s)=b.row where s.id='20000000-0000-0000-0000-000000000001') then raise exception 'Atomic revision request touched live story';end if;
end; $fn$;
select 'CT-06b.2a atomic review submission, rollback, media eligibility and live isolation passed' as result;
