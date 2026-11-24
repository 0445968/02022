\i supabase/migrations/20261124230401_ct08b2c_calendar_conflicts.sql
do $fn$ begin
 if has_function_privilege('authenticated','newsroom_private.calendar_potential_conflict(uuid,uuid,uuid)','EXECUTE')
 or has_function_privilege('anon','public.staff_read_editorial_calendar(timestamptz,timestamptz,text,text,integer)','EXECUTE') then raise exception 'Conflict helper privilege leak';end if;
end; $fn$;
-- Actual queue due in ~1h; own writer assignment -2h, editor assignment +2h.
-- Test both filter and range separation with one side outside returned rows.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$ declare p jsonb; sid text:='20000000-0000-0000-0000-000000000002';begin
 p:=public.staff_read_editorial_calendar(now(),now()+interval '90 minutes','range','publications',0);
 if not exists(select 1 from jsonb_array_elements(p->'items') x where x->>'storyId'=sid and x->>'kind'='publication' and (x->>'potentialConflict')::boolean) then raise exception 'Off-range assignment conflict missing: %',p;end if;
 p:=public.staff_read_editorial_calendar(now()+interval '90 minutes',now()+interval '3 hours','range','assignments',0);
 if not exists(select 1 from jsonb_array_elements(p->'items') x where x->>'storyId'=sid and x->>'kind'='assignment' and (x->>'potentialConflict')::boolean) then raise exception 'Off-range publication conflict missing: %',p;end if;
 p:=public.staff_read_editorial_calendar(now(),now()+interval '1 day','attention','all',0);
 if (select count(*) from jsonb_array_elements(p->'items') x where x->>'storyId'=sid and (x->>'potentialConflict')::boolean)<>2 then raise exception 'Future conflicts missing in attention: %',p;end if;
 if exists(select 1 from jsonb_array_elements(p->'items') x where x->>'kind'='legacy' and (x->>'potentialConflict')::boolean) then raise exception 'Legacy conflict invented';end if;
end; $fn$;
rollback;
-- Assigned-only actor must never infer the editor's hidden later assignment.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $fn$ declare p jsonb;begin
 p:=public.staff_read_editorial_calendar(now()-interval '1 day',now()+interval '1 day','range','all',0);
 if exists(select 1 from jsonb_array_elements(p->'items') x where x->>'storyId'='20000000-0000-0000-0000-000000000002' and (x->>'potentialConflict')::boolean) then raise exception 'Hidden colleague deadline inferred: %',p;end if;
end; $fn$;
rollback;
-- Stale content makes this a stale queue, not a current schedule conflict.
begin;
update public.stories set headline='Conflict stale snapshot test' where id='20000000-0000-0000-0000-000000000002';
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$ declare p jsonb;begin
 p:=public.staff_read_editorial_calendar(now()-interval '1 day',now()+interval '1 day','range','all',0);
 if exists(select 1 from jsonb_array_elements(p->'items') x where x->>'storyId'='20000000-0000-0000-0000-000000000002' and (x->>'potentialConflict')::boolean) then raise exception 'Stale queue conflict invented';end if;
end; $fn$;
rollback;
begin;
update newsroom_private.reviewed_publication_schedules set state='blocked',ended_at=now(),failure_code='40001' where story_id='20000000-0000-0000-0000-000000000002' and state='pending';
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$ declare p jsonb;begin
 p:=public.staff_read_editorial_calendar(now()-interval '1 day',now()+interval '1 day','range','all',0);
 if exists(select 1 from jsonb_array_elements(p->'items') x where x->>'storyId'='20000000-0000-0000-0000-000000000002' and (x->>'potentialConflict')::boolean) then raise exception 'Blocked queue conflict invented';end if;
end; $fn$;
rollback;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $fn$ begin
 begin perform public.staff_read_editorial_calendar(now(),now()+interval '1 day','attention','all',0);raise exception 'Reader conflict access';exception when insufficient_privilege then null;end;
end; $fn$;
rollback;
