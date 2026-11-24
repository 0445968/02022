\set ON_ERROR_STOP on
\i tests/ct05b2-postgres-assigned-revisions.sql
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
update public.story_revisions set status='draft' where story_id='20000000-0000-0000-0000-000000000001';
update public.stories set body='{"type":"doc","content":[{"type":"paragraph"}]}' where id='20000000-0000-0000-0000-000000000002';
\i supabase/migrations/20261124170144_ct05b_approved_media_attachments.sql
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $$
declare draft uuid:='20000000-0000-0000-0000-000000000002'; live uuid:='20000000-0000-0000-0000-000000000001'; node jsonb; doc jsonb; response jsonb; v jsonb; n integer;
begin
 response:=public.staff_list_assigned_approved_media(draft,false,0);
 if jsonb_array_length(response->'items')<>1 then raise exception 'Uncleared image leaked or eligible image missing: %',response;end if;
 node:=response->'items'->0;
 if node->'attrs'->>'mediaAssetId'<>'60000000-0000-0000-0000-000000000001' or node->'attrs'->>'credit'<>'Credit' then raise exception 'Wrong canonical image';end if;
 doc:=jsonb_build_object('type','doc','content',jsonb_build_array(node));
 begin
  perform public.staff_list_assigned_approved_media('20000000-0000-0000-0000-000000000003',false,0);
  raise exception 'Unassigned picker';exception when insufficient_privilege then null;end;
 begin
  update public.stories set body=jsonb_set(doc,'{content,0,attrs,src}','"https://example.invalid/forged.jpg"'),updated_by=auth.uid() where id=draft;
  raise exception 'Forged URL saved';exception when invalid_parameter_value then null;end;
 begin
  update public.stories set body=jsonb_set(doc,'{content,0,attrs,credit}','"Forged credit"'),updated_by=auth.uid() where id=draft;
  raise exception 'Forged credit saved';exception when invalid_parameter_value then null;end;
 select jsonb_build_object('updated_at',updated_at) into v from public.stories where id=draft;
 response:=public.staff_save_assigned_draft_with_media(draft,(v->>'updated_at')::timestamptz,'save','Approved draft',null,null,doc);
 if response->'body' is distinct from doc then raise exception 'Approved draft image failed';end if;
 begin
   perform public.staff_save_assigned_draft_with_media(draft,(v->>'updated_at')::timestamptz-interval '1 second','save','Stale draft',null,null,doc);
   raise exception 'Stale draft RPC succeeded';
 exception when serialization_failure then null;end;
 begin
   perform public.staff_save_assigned_draft_with_media(draft,(response->>'updated_at')::timestamptz,'save','Forged URL',null,null,jsonb_set(doc,'{content,0,attrs,src}','"https://example.invalid/forged.jpg"'));
   raise exception 'Forged image via draft RPC';
 exception when invalid_parameter_value then null;end;
 response:=public.staff_list_assigned_approved_media(live,true,0);
 if jsonb_array_length(response->'items')<>1 then raise exception 'Revision picker missing';end if;
 v:=public.staff_read_assigned_revision(live);
 response:=public.staff_save_assigned_revision(live,(v->>'liveUpdatedAt')::timestamptz,(v->>'revisionId')::uuid,(v->>'updatedAt')::timestamptz,'save','Approved revision',null,null,doc);
 if response->'body' is distinct from doc then raise exception 'Approved revision image not saved';end if;
end $$;
commit;
-- No new image insertion without the media permission, even for an
-- otherwise assigned user. Existing canonical images remain readable.
begin;
delete from public.staff_role_capabilities where role_preset_id=(select id from public.staff_role_presets where role_key='freelancer') and capability_key='media.upload';
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $
declare sid uuid:='20000000-0000-0000-0000-000000000002'; b jsonb; stamp timestamptz;
begin
 select body,updated_at into b,stamp from public.stories where id=sid;
 begin perform public.staff_list_assigned_approved_media(sid,false,0);
 raise exception 'Picker available without media upload grant';exception when insufficient_privilege then null;end;
 begin
   perform public.staff_save_assigned_draft_with_media(sid,stamp,'save','Duplicate media',null,null,jsonb_build_object('type','doc','content',jsonb_build_array(b->'content'->0,b->'content'->0)));
   raise exception 'New attachment without media grant';
 exception when invalid_parameter_value then null;end;
end $;
rollback;
-- Rights change after attachment: cannot silently submit tagged invalid image.
update public.media_assets set rights_status='restricted' where id='60000000-0000-0000-0000-000000000001';
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $$
declare sid uuid:='20000000-0000-0000-0000-000000000002'; v jsonb;
begin
 if jsonb_array_length(public.staff_list_assigned_approved_media(sid,false,0)->'items')<>0 then raise exception 'Revoked asset still selectable';end if;
 begin
  update public.stories set status='in_review',updated_by=auth.uid() where id=sid;
  raise exception 'Revoked asset submitted';exception when invalid_parameter_value then null;end;
 update public.stories set body='{"type":"doc","content":[{"type":"paragraph"}]}',updated_by=auth.uid() where id=sid;
end $$;
rollback;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $$ begin
 begin perform public.staff_list_assigned_approved_media('20000000-0000-0000-0000-000000000002',false,0);
 raise exception 'Reader picker';exception when insufficient_privilege then null;end;
end $$;
rollback;
do $$ begin
 if has_function_privilege('anon','public.staff_list_assigned_approved_media(uuid,boolean,integer)','EXECUTE')
 or has_table_privilege('anon','newsroom_private.assigned_approved_media','SELECT') then raise exception 'Anon catalog grant';end if;
 if not exists(select 1 from public.stories s join ct05b2_live b on to_jsonb(s)=b.row where s.id='20000000-0000-0000-0000-000000000001') then raise exception 'Live article changed';end if;
end $$;
select 'CT-05b.4 assigned approved media, rights and live revision isolation passed' as result;
