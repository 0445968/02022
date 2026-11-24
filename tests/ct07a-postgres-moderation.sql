\set ON_ERROR_STOP on
\i tests/ct02k-postgres-reader-rls.sql
alter table auth.users add column email text,add column email_confirmed_at timestamptz,
 add column is_anonymous boolean not null default false,add column deleted_at timestamptz,add column banned_until timestamptz;
update auth.users set email=id::text||'@example.invalid',email_confirmed_at=now();
create function public.staff_invite_verified_identity(p_user uuid)
returns boolean language sql stable security invoker set search_path=''
as $fn$
  select exists(select 1 from auth.users u where u.id=p_user
    and u.email is not null and u.email_confirmed_at is not null
    and u.email_confirmed_at<=pg_catalog.statement_timestamp()
    and u.is_anonymous=false and u.deleted_at is null
    and (u.banned_until is null or u.banned_until<=pg_catalog.statement_timestamp()))
$fn$;
revoke all on function public.staff_invite_verified_identity(uuid) from public,anon,authenticated;
create view public.reader_public_profiles as select id,'Reader'::text display_name from public.profiles;
insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
select id,'newsroom.access','all' from public.staff_role_presets where role_key='editor' on conflict do nothing;
\i supabase/migrations/20261124195029_ct07a_comment_moderation.sql
do $fn$ begin
 if has_table_privilege('authenticated','newsroom_private.comment_moderation_events','INSERT')
 or has_table_privilege('authenticated','public.comments','DELETE')
 or has_function_privilege('anon','public.staff_change_comment_moderation(uuid,integer,text,text,uuid)','EXECUTE') then raise exception 'Moderation privilege leak';end if;
end; $fn$;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$
declare v jsonb; n integer; cid uuid:='41000000-0000-0000-0000-000000000002';
begin
 v:=public.staff_read_comment_queue('all',null,'',0);
 if jsonb_array_length(v->'items')<>3 then raise exception 'Queue leaked unpublished story or lost public comments: %',v;end if;
 if jsonb_array_length(public.staff_read_comment_queue('reported',null,'',0)->'items')<>1 then raise exception 'Reported filter wrong';end if;
 if jsonb_array_length(public.staff_read_comment_queue('pending',null,'Another pending',0)->'items')<>1 then raise exception 'Queue search wrong';end if;
 update public.comments set status='published' where id=cid;
 get diagnostics n=row_count;
 if n<>0 then raise exception 'Direct moderator write bypassed audit';end if;
 begin
  perform public.staff_read_comment_detail('41000000-0000-0000-0000-000000000004');
  raise exception 'Unpublished comment exposed';exception when insufficient_privilege then null;end;
end;
$fn$;
rollback;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $fn$
declare cid uuid:='41000000-0000-0000-0000-000000000002'; n integer;
begin
 begin perform public.staff_read_comment_queue('all',null,'',0);raise exception 'Reader moderation queue';exception when insufficient_privilege then null;end;
 begin perform public.staff_change_comment_moderation(cid,1,'approve','Attempt self approval',gen_random_uuid());raise exception 'Reader moderated own comment';exception when insufficient_privilege then null;end;
 update public.comments set body='Edited since moderator loaded',status='pending' where id=cid;
 get diagnostics n=row_count;
 if n<>1 or (select moderation_revision from public.comments where id=cid)<>2 then raise exception 'Reader edit or revision failed';end if;
end;
$fn$;
commit;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$
declare cid uuid:='41000000-0000-0000-0000-000000000002'; v jsonb;
begin
 begin perform public.staff_change_comment_moderation(cid,1,'approve','Attempt stale moderation',gen_random_uuid());raise exception 'Stale reader edit approved';exception when serialization_failure then null;end;
 v:=public.staff_change_comment_moderation(cid,2,'approve','Comment meets community guidelines','84000000-0000-0000-0000-000000000001');
 if v->'comment'->>'status'<>'published' or v->'comment'->>'body'<>'Edited since moderator loaded' or v->'history'->0->>'byMe'<>'true' then raise exception 'Approval/audit wrong';end if;
 begin perform public.staff_change_comment_moderation(cid,3,'hide','Attempt replay command ID','84000000-0000-0000-0000-000000000001');raise exception 'Command replay accepted';exception when serialization_failure then null;end;
end;
$fn$;
commit;
begin;
set local role anon;
do $fn$ begin if not exists(select 1 from public.comments where id='41000000-0000-0000-0000-000000000002') then raise exception 'Approved comment not public';end if;end; $fn$;
rollback;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$
declare cid uuid:='41000000-0000-0000-0000-000000000002'; v jsonb;
begin
 v:=public.staff_change_comment_moderation(cid,3,'hide','Temporarily hide for moderation','84000000-0000-0000-0000-000000000002');
 if v->'comment'->>'status'<>'hidden' or v->'comment'->>'body'<>'Edited since moderator loaded' then raise exception 'Hide destructive';end if;
end;
$fn$;
commit;
begin;
set local role anon;
do $fn$ begin if exists(select 1 from public.comments where id='41000000-0000-0000-0000-000000000002') then raise exception 'Hidden comment public';end if;end; $fn$;
rollback;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$
declare cid uuid:='41000000-0000-0000-0000-000000000002'; v jsonb;
begin
 v:=public.staff_change_comment_moderation(cid,4,'restore','Return hidden comment for fresh review','84000000-0000-0000-0000-000000000003');
 if v->'comment'->>'status'<>'pending' then raise exception 'Restore bypassed fresh review';end if;
 v:=public.staff_change_comment_moderation(cid,5,'remove','Confirmed violation of community policy','84000000-0000-0000-0000-000000000004');
 if v->'comment'->>'status'<>'deleted' or v->'comment'->>'body'<>'[deleted]' or jsonb_array_length(v->'history')<>4 then raise exception 'Removal or audit wrong';end if;
 begin perform public.staff_change_comment_moderation(cid,6,'restore','Attempt to restore redacted text',gen_random_uuid());raise exception 'Deleted comment revived';exception when serialization_failure then null;end;
end;
$fn$;
commit;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $fn$ begin
 if not exists(select 1 from public.comments where id='41000000-0000-0000-0000-000000000002' and status='deleted' and body='[deleted]') then raise exception 'Reader lost deletion history';end if;
end; $fn$;
rollback;
begin;
insert into public.staff_capability_overrides(membership_id,capability_key,effect,scope,reason,granted_by)
values('10000000-0000-0000-0000-000000000002','comment.moderate','deny','all','Explicit deny moderation test','00000000-0000-0000-0000-000000000001');
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$ begin
 if (public.staff_read_comment_detail('41000000-0000-0000-0000-000000000003')->'comment'->>'canModerate')::boolean then raise exception 'Denied moderator still has controls';end if;
 begin perform public.staff_change_comment_moderation('41000000-0000-0000-0000-000000000003',1,'approve','Denied moderator tries action',gen_random_uuid());raise exception 'Deny bypassed';exception when insufficient_privilege then null;end;
end; $fn$;
rollback;
select 'CT-07a audited comment decisions, scoped visibility, reader edit CAS, redaction and deny precedence passed' as result;
