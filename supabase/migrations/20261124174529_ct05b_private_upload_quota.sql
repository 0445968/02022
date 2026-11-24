-- CT-05b.4b STAGED ONLY. CLI generated #45452027666.
-- Reservation slots bound unique object keys, even during concurrent upload
-- requests. No writes/triggers on the managed storage schema or files.
begin;
-- Install before the private bucket is activated. Existing nonempty staging
-- data requires a separately reviewed allocation/backfill, not silent adoption.
do $fn$
begin
 if exists(select 1 from storage.objects where bucket_id='media-drafts')
 or exists(select 1 from public.media_private_drafts) then
   raise exception 'Private uploads already exist: reconcile quota before migration';end if;
end;
$fn$;
create table newsroom_private.private_upload_reservations(
 auth_user_id uuid not null references auth.users(id) on delete restrict,
 slot smallint not null check(slot between 1 and 25),
 upload_id uuid not null default gen_random_uuid(),
 extension text not null check(extension in ('jpg','png','webp','gif','avif')),
 storage_path text generated always as ('drafts/'||auth_user_id::text||'/'||upload_id::text||'.'||extension) stored,
 created_at timestamptz not null default now(),
 primary key(auth_user_id,slot),
 unique(storage_path)
);
alter table newsroom_private.private_upload_reservations enable row level security;
revoke all on newsroom_private.private_upload_reservations from public,anon,authenticated,service_role;
grant select on newsroom_private.private_upload_reservations to authenticated;
grant insert(auth_user_id,slot,extension) on newsroom_private.private_upload_reservations to authenticated;
create policy ct05b_quota_own_read on newsroom_private.private_upload_reservations for select to authenticated using(
 auth_user_id=(select auth.uid()) and newsroom_private.has_staff_permission('newsroom.access') and newsroom_private.has_staff_permission('media.upload'));
create policy ct05b_quota_own_insert on newsroom_private.private_upload_reservations for insert to authenticated with check(
 auth_user_id=(select auth.uid()) and newsroom_private.has_staff_permission('newsroom.access') and newsroom_private.has_staff_permission('media.upload'));
-- No update or delete by staff, including their own reservations. No reuse
-- after cleanup, timeout, rejection or promotion: original paths remain
-- reserved until a separately reviewed retention/reclamation operation.
create function public.staff_reserve_private_upload(p_extension text)
returns text language plpgsql security invoker set search_path=''
as $fn$
declare v_path text; v_slot integer;
begin
 if (select auth.uid()) is null or not newsroom_private.has_staff_permission('newsroom.access')
 or not newsroom_private.has_staff_permission('media.upload') then
  raise exception 'Private upload unavailable' using errcode='42501';end if;
 if p_extension is null or p_extension not in ('jpg','png','webp','gif','avif') then
  raise exception 'Invalid image extension' using errcode='22023';end if;
 for v_slot in 1..25 loop
  insert into newsroom_private.private_upload_reservations(auth_user_id,slot,extension)
   values((select auth.uid()),v_slot,p_extension)
   on conflict(auth_user_id,slot) do nothing returning storage_path into v_path;
  if found then return v_path;end if;
 end loop;
 raise exception 'Private upload allowance exhausted' using errcode='P0001';
end;
$fn$;
create function public.staff_private_upload_quota()
returns jsonb language plpgsql stable security invoker set search_path=''
as $fn$
declare used integer;
begin
 if (select auth.uid()) is null or not newsroom_private.has_staff_permission('newsroom.access')
 or not newsroom_private.has_staff_permission('media.upload') then
  raise exception 'Private upload unavailable' using errcode='42501';end if;
 select count(*) into used from newsroom_private.private_upload_reservations where auth_user_id=(select auth.uid());
 return jsonb_build_object('usedSlots',used,'maxSlots',25,'remainingSlots',25-used,'maxFileBytes',10485760,'maxReservedBytes',262144000);
end;
$fn$;
revoke all on function public.staff_reserve_private_upload(text),public.staff_private_upload_quota() from public,anon,authenticated;
grant execute on function public.staff_reserve_private_upload(text),public.staff_private_upload_quota() to authenticated;

-- Restrictive policy applies alongside every existing permissive INSERT
-- policy. Standard JWT upload only: signed upload URL creation, copies,
-- resumable/S3 uploads are not allowed by this path. No UPDATE/upsert on
-- private objects. The bucket's own 10MiB limit bounds bytes per key.
create policy ct05b_private_reserved_upload on storage.objects as restrictive for insert to authenticated with check(
 bucket_id<>'media-drafts' or (
   owner_id=(select auth.uid())::text
   and storage.allow_only_operation('object.upload')
   and exists(select 1 from newsroom_private.private_upload_reservations r
      where r.auth_user_id=(select auth.uid()) and r.storage_path=name)
 ));
create policy ct05b_private_no_object_update on storage.objects as restrictive for update to authenticated using(bucket_id<>'media-drafts') with check(bucket_id<>'media-drafts');
-- Prevent a restricted uploader evading private intake via the legacy
-- PUBLIC bucket. Independent editorial approvers still have the existing
-- promotion/copy path and the existing permissive ownership policies.
create policy ct05b_public_media_review_insert on storage.objects as restrictive for insert to authenticated with check(
 bucket_id<>'media' or (newsroom_private.has_staff_permission('media.approve') and newsroom_private.has_staff_permission('media.edit_all')));
create policy ct05b_public_media_review_update on storage.objects as restrictive for update to authenticated using(
 bucket_id<>'media' or (newsroom_private.has_staff_permission('media.approve') and newsroom_private.has_staff_permission('media.edit_all')))
 with check(bucket_id<>'media' or (newsroom_private.has_staff_permission('media.approve') and newsroom_private.has_staff_permission('media.edit_all')));
-- The catalog must reference the same reservation and owned object; actual
-- byte validation and digest remain the existing upload/promotion checks.
create policy ct05b_private_catalog_reservation on public.media_private_drafts as restrictive for insert to authenticated with check(
 uploaded_by=(select auth.uid()) and exists(select 1 from newsroom_private.private_upload_reservations r
 where r.auth_user_id=(select auth.uid()) and r.storage_path=media_private_drafts.storage_path
 and r.extension=case media_private_drafts.mime_type when 'image/jpeg' then 'jpg' when 'image/png' then 'png'
 when 'image/webp' then 'webp' when 'image/gif' then 'gif' when 'image/avif' then 'avif' end));
commit;
