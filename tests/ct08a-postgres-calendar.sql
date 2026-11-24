\set ON_ERROR_STOP on
\set ct08a_calendar 1
\i tests/ct06c2-postgres-reviewed-schedule.sql
-- Published/cancelled queues are not shown as active publication targets.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$ declare p jsonb;begin
 p:=public.staff_read_editorial_calendar(now()-interval '2 days',now()+interval '2 days','range','publications',0);
 if jsonb_array_length(p->'items')<>1 or p->'items'->0->>'kind'<>'legacy' then raise exception 'Finished queues or legacy status incorrect: %',p;end if;
end; $fn$;
rollback;
select 'CT-08a current scoped deadlines, legacy schedules, active/finished queues and attention verified' as result;
