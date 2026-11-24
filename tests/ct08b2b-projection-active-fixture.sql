\i supabase/migrations/20261124225839_ct08b2b_effective_schedule.sql
do $fn$ begin
 if has_function_privilege('anon','public.staff_read_story_publication_queue(uuid[])','EXECUTE')
 or has_table_privilege('authenticated','newsroom_private.reviewed_publication_schedules','SELECT') then raise exception 'Projection grants leaked';end if;
end; $fn$;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$ declare p jsonb; ids uuid[]:=array['20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003']::uuid[];begin
 p:=public.staff_read_story_publication_queue(ids);
 if jsonb_array_length(p->'items')<>3 then raise exception 'Expected 3 queue/legacy rows: %',p;end if;
 if (select count(*) from jsonb_array_elements(p->'items') x where x->>'state'='pending' and (x->>'snapshotCurrent')::boolean)<>2 then raise exception 'Current queues missing: %',p;end if;
 if not exists(select 1 from jsonb_array_elements(p->'items') x where x->>'source'='revision' and x->>'storyId'=ids[1]::text) then raise exception 'Revision queue missing';end if;
 if not exists(select 1 from jsonb_array_elements(p->'items') x where x->>'state'='unverified' and x->'snapshotCurrent'='null'::jsonb) then raise exception 'Legacy mislabeled';end if;
 p:=public.staff_read_story_publication_queue(array[ids[2]]);
 if jsonb_array_length(p->'items')<>1 or p->'items'->0->>'storyId'<>ids[2]::text then raise exception 'Unrequested queue returned: %',p;end if;
 begin perform public.staff_read_story_publication_queue(array[ids[2],ids[2]]);raise exception 'Duplicate IDs accepted';exception when invalid_parameter_value then null;end;
 begin perform public.staff_read_story_publication_queue(array[]::uuid[]);raise exception 'Empty IDs accepted';exception when invalid_parameter_value then null;end;
 begin perform public.staff_read_story_publication_queue(array_fill(ids[2],array[51]));raise exception 'Oversized IDs accepted';exception when invalid_parameter_value then null;end;
end; $fn$;
rollback;
begin;
insert into public.staff_capability_overrides(membership_id,capability_key,effect,scope,reason,granted_by)
values('10000000-0000-0000-0000-000000000002','revision.view','deny','all','Explicit deny projection test','00000000-0000-0000-0000-000000000001');
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$ declare p jsonb;begin
 p:=public.staff_read_story_publication_queue(array['20000000-0000-0000-0000-000000000001']::uuid[]);
 if jsonb_array_length(p->'items')<>0 then raise exception 'Denied revision queue leaked';end if;
end; $fn$;
rollback;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $fn$ declare p jsonb;begin
 p:=public.staff_read_story_publication_queue(array['20000000-0000-0000-0000-000000000003']::uuid[]);
 if jsonb_array_length(p->'items')<>0 then raise exception 'Assigned-only legacy schedule leaked';end if;
end; $fn$;
rollback;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $fn$ begin
 begin perform public.staff_read_story_publication_queue(array['20000000-0000-0000-0000-000000000002']::uuid[]);raise exception 'Reader queue access';exception when insufficient_privilege then null;end;
end; $fn$;
rollback;
begin;
update public.stories set headline='Stale story queue projection' where id='20000000-0000-0000-0000-000000000002';
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$ declare p jsonb;begin
 p:=public.staff_read_story_publication_queue(array['20000000-0000-0000-0000-000000000002']::uuid[]);
 if not exists(select 1 from jsonb_array_elements(p->'items') x where x->>'state'='pending' and not (x->>'snapshotCurrent')::boolean) then raise exception 'Stale queue not marked';end if;
end; $fn$;
rollback;
