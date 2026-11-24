\set ON_ERROR_STOP on
\i tests/ct05b3-postgres-writer-creation.sql
alter table public.profiles add column name text;
update public.profiles set name=case when id='00000000-0000-0000-0000-000000000003' then 'Assigned writer' else 'Staff member' end;
insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
select id,'newsroom.access','all' from public.staff_role_presets where role_key in ('editor','owner') on conflict do nothing;
\i supabase/migrations/20261124175744_ct06a_assignment_lifecycle.sql
do $fn$
begin
 if has_table_privilege('authenticated','public.staff_story_assignments','INSERT')
 or has_table_privilege('authenticated','public.staff_story_assignments','UPDATE')
 or has_function_privilege('anon','public.staff_read_story_assignments(uuid,integer,integer)','EXECUTE') then raise exception 'Overbroad assignment privileges';end if;
end;
$fn$;
create temporary table ct06a_story_before as select to_jsonb(s) row from public.stories s where id='20000000-0000-0000-0000-000000000003';
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$
declare sid uuid:='20000000-0000-0000-0000-000000000003'; mid uuid:='10000000-0000-0000-0000-000000000003'; result jsonb; r jsonb;
begin
 r:=public.staff_read_story_assignments(sid,0,0);
 if jsonb_array_length(r->'assignments')<>0 or not exists(select 1 from jsonb_array_elements(r->'candidates') c where c->>'id'=mid::text and c->'types'?'author') then raise exception 'Eligible candidate missing';end if;
 if exists(select 1 from jsonb_array_elements(r->'candidates') c where c->>'id' in ('10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000004')) then raise exception 'Self or revoked target leaked';end if;
 begin
  perform public.staff_change_story_assignment(sid,mid,'reviewer','create',0,null,'Assign review without capability',gen_random_uuid());
  raise exception 'Ineligible reviewer accepted';
 exception when insufficient_privilege then null;end;
 begin
  perform public.staff_change_story_assignment(sid,'10000000-0000-0000-0000-000000000002','author','create',0,null,'Self assignment attempt',gen_random_uuid());
  raise exception 'Self assignment allowed';
 exception when insufficient_privilege then null;end;
 result:=public.staff_change_story_assignment(sid,mid,'author','create',0,now()+interval '1 day','Assign reporting to writer','81000000-0000-0000-0000-000000000001');
 if (result->>'revision')::int<>1 or result->>'status'<>'active' then raise exception 'Creation result invalid';end if;
 begin
  perform public.staff_change_story_assignment(sid,mid,'author','create',0,null,'Duplicate assignment attempt',gen_random_uuid());
  raise exception 'Duplicate create succeeded';
 exception when serialization_failure then null;end;
 result:=public.staff_change_story_assignment(sid,mid,'author','reschedule',1,now()+interval '2 days','Extend reporting deadline','81000000-0000-0000-0000-000000000002');
 if (result->>'revision')::int<>2 then raise exception 'Revision did not increment';end if;
 begin
  perform public.staff_change_story_assignment(sid,mid,'author','revoke',1,null,'Stale revocation attempt',gen_random_uuid());
  raise exception 'Stale assignment write succeeded';
 exception when serialization_failure then null;end;
 r:=public.staff_read_story_assignments(sid,0,0);
 if jsonb_array_length(r->'assignments')<>1 or jsonb_array_length(r->'history')<>2 then raise exception 'Assignment or history projection wrong';end if;
end;
$fn$;
commit;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $fn$
begin
 if not exists(select 1 from public.stories where id='20000000-0000-0000-0000-000000000003') or not newsroom_private.has_staff_permission('story.edit_assigned','20000000-0000-0000-0000-000000000003') then raise exception 'Assignment did not activate existing scope';end if;
 begin perform public.staff_read_story_assignments('20000000-0000-0000-0000-000000000003',0,0);
 raise exception 'Contributor saw staff picker';exception when insufficient_privilege then null;end;
end;
$fn$;
rollback;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$
declare sid uuid:='20000000-0000-0000-0000-000000000003'; mid uuid:='10000000-0000-0000-0000-000000000003'; r jsonb;
begin
 r:=public.staff_change_story_assignment(sid,mid,'author','complete',2,null,'Reporting assignment completed','81000000-0000-0000-0000-000000000003');
 if r->>'status'<>'completed' then raise exception 'Completion failed';end if;
 r:=public.staff_change_story_assignment(sid,mid,'author','reopen',3,null,'Reopen for follow up reporting','81000000-0000-0000-0000-000000000004');
 if r->>'status'<>'active' then raise exception 'Reopen failed';end if;
 r:=public.staff_change_story_assignment(sid,mid,'author','revoke',4,null,'Revoke assignment after reassignment','81000000-0000-0000-0000-000000000005');
 if r->>'status'<>'revoked' then raise exception 'Revocation failed';end if;
end;
$fn$;
commit;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $fn$
begin
 if exists(select 1 from public.stories where id='20000000-0000-0000-0000-000000000003') then raise exception 'Revoked assignment retained private story access';end if;
end;
$fn$;
rollback;
do $fn$
begin
 if not exists(select 1 from public.stories s join ct06a_story_before b on to_jsonb(s)=b.row where s.id='20000000-0000-0000-0000-000000000003') then raise exception 'Assignment changed story or byline';end if;
 if (select count(*) from public.staff_access_audit where actor_auth_user_id='00000000-0000-0000-0000-000000000002' and request_id::text like '81000000-%')<>5 then raise exception 'Missing attributed audit';end if;
end;
$fn$;
begin;
insert into public.staff_capability_overrides(membership_id,capability_key,effect,scope,reason,granted_by)
values('10000000-0000-0000-0000-000000000002','story.assign','deny','all','Deny assignment management for test','00000000-0000-0000-0000-000000000001');
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$
begin
 begin perform public.staff_read_story_assignments('20000000-0000-0000-0000-000000000003',0,0);
 raise exception 'Denied manager read assignment list';exception when insufficient_privilege then null;end;
 begin perform public.staff_change_story_assignment('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000003','author','reopen',5,null,'Attempt denied assignment reopen',gen_random_uuid());
 raise exception 'Denied manager reopened assignment';exception when insufficient_privilege then null;end;
end;
$fn$;
rollback;
select 'CT-06a assignment lifecycle, scope, CAS, audit and story preservation passed' as result;
