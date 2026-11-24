\set ON_ERROR_STOP on
\i tests/ct05b1-postgres-assigned-drafts.sql
-- Hosted story_language enum, generated search index and profile FK constraints.
create type public.story_language as enum ('en','es');
alter table public.stories alter column id set default gen_random_uuid(),
 add column language public.story_language not null default 'en',
 add column search_vector tsvector generated always as (to_tsvector('simple'::regconfig,headline)) stored,
 add constraint writer_fixture_slug_unique unique(slug),
 add constraint writer_fixture_creator_fk foreign key(created_by) references public.profiles(id),
 add constraint writer_fixture_updater_fk foreign key(updated_by) references public.profiles(id);
alter table auth.users add column email text,add column email_confirmed_at timestamptz,
 add column is_anonymous boolean not null default false,add column deleted_at timestamptz,add column banned_until timestamptz;
update auth.users set email=id::text||'@example.invalid',email_confirmed_at=now();
-- Exact verified identity helper from CT-04a (isolated fixture only).
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
-- Test staff writer has reviewed actual grants, no publishing rights.
insert into public.staff_member_roles(membership_id,role_preset_id)
select '10000000-0000-0000-0000-000000000003',id from public.staff_role_presets where role_key='staff_writer';
insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
select id,'story.create','all' from public.staff_role_presets where role_key='staff_writer';
\i supabase/migrations/20261124165545_ct05b_writer_draft_creation.sql
do $$ begin
 if has_function_privilege('anon','public.staff_start_writer_draft(uuid,text,text)','EXECUTE')
 or has_table_privilege('authenticated','newsroom_private.writer_draft_requests','SELECT')
 or has_table_privilege('authenticated','public.staff_story_assignments','INSERT') then
 raise exception 'Excessive grants';end if;
end $$;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $$
declare sid uuid; repeated uuid; token uuid:='60000000-0000-0000-0000-000000000001'; n integer;
begin
 if not public.staff_can_start_writer_draft() then raise exception 'Writer cannot create';end if;
 begin
   insert into public.stories(id,slug,headline,created_by) values(gen_random_uuid(),'direct-bypass','Bad draft',auth.uid());
   raise exception 'Direct restricted insert bypass';
 exception when insufficient_privilege then null;end;
 sid:=public.staff_start_writer_draft(token,'New writer draft','es');
 repeated:=public.staff_start_writer_draft(token,'New writer draft','es');
 if sid is distinct from repeated then raise exception 'Retry created duplicate';end if;
 if not exists(select 1 from public.stories where id=sid and status='draft' and language='es' and author_id is null and editor_id is null
   and created_by=auth.uid() and updated_by=auth.uid() and published_at is null and scheduled_at is null)
 or not exists(select 1 from public.staff_story_assignments where story_id=sid and membership_id='10000000-0000-0000-0000-000000000003'
   and assignment_type='author' and status='active' and created_by=auth.uid()) then raise exception 'Draft or self-assignment missing';end if;
 begin
   perform public.staff_start_writer_draft(token,'Different title','es');
   raise exception 'Changed request reused';exception when serialization_failure then null;end;
 update public.stories set headline='Updated writer copy',updated_by=auth.uid() where id=sid and status='draft';
 get diagnostics n=row_count;if n<>1 then raise exception 'Generated search column blocked save';end if;
 if not exists(select 1 from public.stories where id=sid and search_vector@@to_tsquery('simple','updated')) then
 raise exception 'Search vector not regenerated';end if;
 begin
   update public.stories set status='published',updated_by=auth.uid() where id=sid;raise exception 'Writer published';
 exception when insufficient_privilege then null;end;
end $$;
commit;
do $$ begin
 if (select count(*) from newsroom_private.writer_draft_requests)<>1 or
 (select count(*) from public.staff_access_audit where action_key='staff_story_assignments.insert'
 and request_id='60000000-0000-0000-0000-000000000001' and actor_auth_user_id='00000000-0000-0000-0000-000000000003')<>1 then
 raise exception 'Idempotent request audit missing';end if;
end $$;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $$ begin
 if public.staff_can_start_writer_draft() then raise exception 'Reader creation visible';end if;
 begin perform public.staff_start_writer_draft(gen_random_uuid(),'Reader draft','en');
 raise exception 'Reader created draft';exception when insufficient_privilege then null;end;
end $$;
rollback;
begin;
delete from public.staff_role_capabilities where role_preset_id=(select id from public.staff_role_presets where role_key='staff_writer');
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $$ begin
 if public.staff_can_start_writer_draft() then raise exception 'No create capability visible';end if;
 begin perform public.staff_start_writer_draft(gen_random_uuid(),'Freelancer draft','en');
 raise exception 'Freelancer created draft';exception when insufficient_privilege then null;end;
end $$;
rollback;
begin;
insert into public.staff_capability_overrides(membership_id,capability_key,effect,scope,reason,granted_by)
values('10000000-0000-0000-0000-000000000003','story.edit_assigned','deny','assigned','Test denied writer edit','00000000-0000-0000-0000-000000000001');
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $$ begin
 if public.staff_can_start_writer_draft() then raise exception 'Assigned deny ignored';end if;
 begin perform public.staff_start_writer_draft(gen_random_uuid(),'Denied draft','en');
 raise exception 'Denied writer created draft';exception when insufficient_privilege then null;end;
end $$;
rollback;
select 'CT-05b.3 writer draft atomic creation, assignment, generated index and authorization passed' as result;
