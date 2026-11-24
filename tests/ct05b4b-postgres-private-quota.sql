\set ON_ERROR_STOP on
\i tests/ct02j-postgres-promotion.sql
-- Test-only reset of isolated Storage fixtures. Hosted rollout must be empty.
delete from public.media_private_drafts;
delete from storage.objects where bucket_id='media-drafts';
-- Mirror documented current Storage operation helper in this plain PG fixture.
create function storage.allow_only_operation(expected_operation text)
returns boolean language sql stable as $fn$
 select coalesce(current_setting('test.storage_operation',true)=expected_operation,false)
$fn$;
insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
select id,'newsroom.access','all' from public.staff_role_presets where role_key in ('freelancer','editor')
on conflict do nothing;
\i supabase/migrations/20261124174529_ct05b_private_upload_quota.sql
do $fn$
begin
 if has_function_privilege('anon','public.staff_reserve_private_upload(text)','EXECUTE')
 or has_table_privilege('authenticated','newsroom_private.private_upload_reservations','DELETE')
 or has_table_privilege('authenticated','newsroom_private.private_upload_reservations','UPDATE') then
  raise exception 'Unsafe quota grants';end if;
end;
$fn$;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
set local test.storage_operation='object.upload';
do $fn$
declare p text; q jsonb; n integer;
begin
 q:=public.staff_private_upload_quota();
 if (q->>'remainingSlots')::int<>25 then raise exception 'Initial quota wrong';end if;
 begin
  insert into storage.objects(bucket_id,name,owner_id) values('media-drafts','drafts/'||auth.uid()::text||'/unreserved.jpg',auth.uid()::text);
  raise exception 'Unreserved upload succeeded';
 exception when insufficient_privilege then null;end;
 p:=public.staff_reserve_private_upload('jpg');
 insert into storage.objects(bucket_id,name,owner_id) values('media-drafts',p,auth.uid()::text);
 insert into public.media_private_drafts(uploaded_by,storage_path,file_name,mime_type,file_size_bytes)
 values(auth.uid(),p,'test.jpg','image/jpeg',2048);
 begin
  update storage.objects set name=name||'2' where bucket_id='media-drafts' and name=p;
  get diagnostics n=row_count;
  if n<>0 then raise exception 'Private object renamed';end if;
 exception when insufficient_privilege then null;end;
 p:=public.staff_reserve_private_upload('png');
 perform set_config('test.storage_operation','object.sign_upload_url',true);
 begin
  insert into storage.objects(bucket_id,name,owner_id) values('media-drafts',p,auth.uid()::text);
  raise exception 'Signed upload reservation bypass';
 exception when insufficient_privilege then null;end;
 perform set_config('test.storage_operation','object.upload',true);
 insert into storage.objects(bucket_id,name,owner_id) values('media-drafts',p,auth.uid()::text);
 delete from storage.objects where bucket_id='media-drafts' and name=p;
 get diagnostics n=row_count;if n<>1 then raise exception 'Orphan cleanup failed';end if;
 q:=public.staff_private_upload_quota();
 if (q->>'usedSlots')::int<>2 then raise exception 'Cleanup incorrectly reclaimed slot';end if;
 begin
  insert into storage.objects(bucket_id,name,owner_id) values('media','uploads/quota-bypass.jpg',auth.uid()::text);
  raise exception 'Restricted user bypassed private quota into public storage';
 exception when insufficient_privilege then null;end;
 for i in 3..25 loop perform public.staff_reserve_private_upload('jpg');end loop;
 q:=public.staff_private_upload_quota();
 if (q->>'remainingSlots')::int<>0 or (q->>'maxReservedBytes')::bigint<>262144000 then raise exception 'Exhausted quota incorrect';end if;
 begin
  perform public.staff_reserve_private_upload('jpg');
  raise exception 'Exceeded allowance' using errcode='XX000';
 exception when raise_exception then null;end;
 begin
  insert into newsroom_private.private_upload_reservations(auth_user_id,slot,extension) values(auth.uid(),26,'jpg');
  raise exception '26th slot accepted';exception when check_violation then null;end;
 begin
  insert into newsroom_private.private_upload_reservations(auth_user_id,slot,extension) values('00000000-0000-0000-0000-000000000002',1,'jpg');
  raise exception 'Other account slot accepted';exception when insufficient_privilege then null;end;
end;
$fn$;
commit;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
set local test.storage_operation='object.upload';
do $fn$
declare p text;
begin
 if (public.staff_private_upload_quota()->>'usedSlots')::int<>0 then raise exception 'Other account quota leaked';end if;
 p:=public.staff_reserve_private_upload('jpg');
 insert into storage.objects(bucket_id,name,owner_id) values('media-drafts',p,auth.uid()::text);
 insert into storage.objects(bucket_id,name,owner_id) values('media','uploads/reviewer-allowed.jpg',auth.uid()::text);
end;
$fn$;
rollback;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $fn$
begin
 begin perform public.staff_private_upload_quota();
 raise exception 'Reader quota exposed';exception when insufficient_privilege then null;end;
 begin perform public.staff_reserve_private_upload('jpg');
 raise exception 'Reader obtained reservation';exception when insufficient_privilege then null;end;
end;
$fn$;
rollback;
select 'CT-05b.4b private upload quota, bypass prevention, retained reservations and reviewer compatibility passed' as result;
