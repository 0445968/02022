\set ON_ERROR_STOP on
\set ct08c1_retry 1
\set ct08c_controls 1
\i tests/ct08b2c-postgres-conflicts.sql
select newsroom_private.set_scheduler_enabled(false,'Isolated regression fixture finished');
do $fn$ begin
 if not (newsroom_private.run_due_reviewed_publications(5)->>'paused')::boolean then raise exception 'Final pause failed';end if;
end; $fn$;
select 'CT08 integrated calendar, queue, retry, control and health verified' as result;
