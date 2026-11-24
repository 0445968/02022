-- Called only in CT08a isolated test, at the exact moment both real queues are current.
alter table public.profiles add column if not exists name text;
update public.profiles set name='Fixture editor' where id='00000000-0000-0000-0000-000000000002';
update public.profiles set name='Fixture writer' where id='00000000-0000-0000-0000-000000000003';
\i supabase/migrations/20261124221450_ct08a_editorial_calendar.sql
insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
select id,'calendar.view_team','all' from public.staff_role_presets where role_key in ('editor','owner') on conflict do nothing;
insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
select id,'calendar.view_assigned','assigned' from public.staff_role_presets where role_key='freelancer' on conflict do nothing;
update public.staff_story_assignments set due_at=now()-interval '2 hours' where story_id='20000000-0000-0000-0000-000000000002' and membership_id='10000000-0000-0000-0000-000000000003';
insert into public.staff_story_assignments(story_id,membership_id,assignment_type,due_at)
values('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','editor',now()+interval '2 hours');
do $fn$ begin
 if has_function_privilege('anon','public.staff_read_editorial_calendar(timestamptz,timestamptz,text,text,integer)','EXECUTE')
 or has_function_privilege('authenticated','newsroom_private.calendar_story_scope(uuid)','EXECUTE')
 or has_table_privilege('authenticated','newsroom_private.reviewed_publication_schedules','SELECT') then raise exception 'Calendar privilege leak';end if;
end; $fn$;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$ declare p jsonb;begin
 if not public.staff_can_read_editorial_calendar() then raise exception 'Team calendar denied';end if;
 p:=public.staff_read_editorial_calendar(now()-interval '2 days',now()+interval '2 days','range','all',0);
 if jsonb_array_length(p->'items')<>5 then raise exception 'Team calendar count wrong: %',p;end if;
 if (select count(*) from jsonb_array_elements(p->'items') x where x->>'kind'='publication' and (x->>'snapshotCurrent')::boolean and (x->>'canCancel')::boolean)<>2 then raise exception 'Current approved schedules missing: %',p;end if;
 if not exists(select 1 from jsonb_array_elements(p->'items') x where x->>'kind'='legacy' and x->>'state'='unverified' and not (x->>'canCancel')::boolean) then raise exception 'Legacy reconciliation missing';end if;
 if not exists(select 1 from jsonb_array_elements(p->'items') x where x->>'kind'='assignment' and x->>'assignee'='Fixture writer') then raise exception 'Team assignee missing';end if;
 p:=public.staff_read_editorial_calendar(now(),now()+interval '1 day','attention','all',0);
 if jsonb_array_length(p->'items')<>2 then raise exception 'Attention should include old assignment and legacy: %',p;end if;
 begin perform public.staff_read_editorial_calendar(now(),now()+interval '94 days','range','all',0);raise exception 'Oversized range accepted';exception when invalid_parameter_value then null;end;
end; $fn$;
rollback;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $fn$ declare p jsonb;begin
 if not public.staff_can_read_editorial_calendar() then raise exception 'Assigned discovery failed';end if;
 p:=public.staff_read_editorial_calendar(now()-interval '2 days',now()+interval '2 days','range','all',0);
 if not exists(select 1 from jsonb_array_elements(p->'items') x where x->>'kind'='assignment' and (x->>'mine')::boolean and x->'assignee'='null'::jsonb) then raise exception 'Own deadline missing';end if;
 if exists(select 1 from jsonb_array_elements(p->'items') x where x->>'kind'='assignment' and not (x->>'mine')::boolean or x->>'kind'='legacy') then raise exception 'Other assignee/legacy leaked: %',p;end if;
end; $fn$;
rollback;
begin;
insert into public.staff_capability_overrides(membership_id,capability_key,effect,scope,reason,granted_by)
values('10000000-0000-0000-0000-000000000002','revision.view','deny','all','Explicit deny revision calendar test','00000000-0000-0000-0000-000000000001');
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$ declare p jsonb;begin
 p:=public.staff_read_editorial_calendar(now()-interval '2 days',now()+interval '2 days','range','publications',0);
 if exists(select 1 from jsonb_array_elements(p->'items') x where x->>'source'='revision') then raise exception 'Denied revision metadata leaked';end if;
end; $fn$;
rollback;
begin;
update public.stories set headline='Stale queued source test' where id='20000000-0000-0000-0000-000000000002';
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$ declare p jsonb;begin
 p:=public.staff_read_editorial_calendar(now(),now()+interval '1 day','attention','publications',0);
 if not exists(select 1 from jsonb_array_elements(p->'items') x where x->>'kind'='publication' and x->>'source'='draft' and not (x->>'snapshotCurrent')::boolean and (x->>'canCancel')::boolean) then raise exception 'Future stale queue not visible: %',p;end if;
end; $fn$;
rollback;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $fn$ begin
 if public.staff_can_read_editorial_calendar() then raise exception 'Reader calendar discovery';end if;
 begin perform public.staff_read_editorial_calendar(now(),now()+interval '1 day','range','all',0);raise exception 'Reader calendar read';exception when insufficient_privilege then null;end;
end; $fn$;
rollback;

\if :{?ct08b2b_projection}
\i tests/ct08b2b-projection-active-fixture.sql
\endif

\if :{?ct08b2c_conflicts}
\i tests/ct08b2c-conflicts-active-fixture.sql
\endif
