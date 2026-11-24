\i supabase/migrations/20261124231511_ct08c_scheduler_controls.sql
do $fn$ declare r jsonb;begin
 if has_function_privilege('authenticated','newsroom_private.set_scheduler_enabled(boolean,text)','EXECUTE')
 or has_function_privilege('service_role','newsroom_private.run_due_reviewed_publications(integer)','EXECUTE')
 or has_table_privilege('authenticated','newsroom_private.scheduler_run_history','SELECT')
 or has_table_privilege('authenticated','newsroom_private.scheduler_control','UPDATE')
 or has_function_privilege('anon','public.staff_read_scheduler_health()','EXECUTE') then raise exception 'Scheduler control privilege leak';end if;
 r:=newsroom_private.run_due_reviewed_publications(5);
 if not (r->>'paused')::boolean or (r->>'published')::int<>0 then raise exception 'Default pause failed: %',r;end if;
 if exists(select 1 from newsroom_private.scheduler_run_history) then raise exception 'Paused run logged as heartbeat';end if;
end; $fn$;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$ declare h jsonb;begin
 h:=public.staff_read_scheduler_health();
 if h->>'state'<>'paused' or h->'lastRunAt'<>'null'::jsonb then raise exception 'Pause health wrong: %',h;end if;
end; $fn$;
rollback;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $fn$ begin
 begin perform public.staff_read_scheduler_health();raise exception 'Reader health leaked';exception when insufficient_privilege then null;end;
end; $fn$;
rollback;
begin;
update newsroom_private.reviewed_publication_schedules set due_at=now()-interval '1 second' where state='pending';
do $fn$ declare r jsonb;begin
 r:=newsroom_private.run_due_reviewed_publications(5);
 if not (r->>'paused')::boolean or exists(select 1 from newsroom_private.publication_events) then raise exception 'Paused due queue executed';end if;
 r:=newsroom_private.set_scheduler_enabled(true,'Isolated fixture enable');
 if not (r->>'changed')::boolean then raise exception 'Enable did not change';end if;
 r:=newsroom_private.set_scheduler_enabled(true,'Isolated fixture same state');
 if (r->>'changed')::boolean or (select count(*) from newsroom_private.scheduler_control_history)<>1 then raise exception 'Duplicate control change';end if;
end; $fn$;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$ begin
 if public.staff_read_scheduler_health()->>'state'<>'awaiting_first_run' then raise exception 'Expected first-run waiting';end if;
end; $fn$;
reset role;
set local request.jwt.claim.sub='';
-- A whole-invocation failure after real publication effects must rollback all of them.
create function public.ct08c_fail_run_history() returns trigger language plpgsql as $fn$ begin
 raise exception 'Injected run-wide failure' using errcode='57014';
end; $fn$;
create trigger ct08c_fail_run_history before insert on newsroom_private.scheduler_run_history
 for each row execute function public.ct08c_fail_run_history();
do $fn$ begin
 begin perform newsroom_private.run_due_reviewed_publications(5);
  raise exception 'Expected whole run failure';exception when query_canceled then null;end;
 if exists(select 1 from newsroom_private.publication_events)
 or exists(select 1 from newsroom_private.publication_permits)
 or exists(select 1 from newsroom_private.scheduler_run_history)
 or (select count(*) from newsroom_private.reviewed_publication_schedules where state='pending')<>2 then raise exception 'Whole-run effects survived rollback';end if;
end; $fn$;
drop trigger ct08c_fail_run_history on newsroom_private.scheduler_run_history;
do $fn$ declare r jsonb;begin
 r:=newsroom_private.run_due_reviewed_publications(1);
 if (r->>'published')::int<>1 or (r->>'paused')::boolean then raise exception 'Bounded run failed: %',r;end if;
 r:=newsroom_private.run_due_reviewed_publications(1);
 if (r->>'published')::int<>1 then raise exception 'Second bounded run failed: %',r;end if;
 r:=newsroom_private.run_due_reviewed_publications(1);
 if (r->>'published')::int<>0 or (select count(*) from newsroom_private.publication_events)<>2
 or (select count(*) from newsroom_private.scheduler_run_history)<>3 then raise exception 'Replay or heartbeat wrong: %',r;end if;
end; $fn$;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$ declare h jsonb;begin
 h:=public.staff_read_scheduler_health();
 if h->>'state'<>'recent_run' or h->>'lastRunAt' is null or (select count(*) from jsonb_object_keys(h))<>3 then raise exception 'Recent heartbeat wrong: %',h;end if;
end; $fn$;
reset role;
set local request.jwt.claim.sub='';
-- Simulate an older committed heartbeat within the current activation epoch.
update newsroom_private.scheduler_control set changed_at=now()-interval '1 hour';
update newsroom_private.scheduler_run_history set started_at=now()-interval '10 minutes',finished_at=now()-interval '9 minutes';
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$ begin
 if public.staff_read_scheduler_health()->>'state'<>'heartbeat_stale' then raise exception 'Stale heartbeat missing';end if;
end; $fn$;
reset role;
set local request.jwt.claim.sub='';
do $fn$ begin
 perform newsroom_private.set_scheduler_enabled(false,'Isolated fixture pause');
 if not (newsroom_private.run_due_reviewed_publications(5)->>'paused')::boolean then raise exception 'Pause failed';end if;
end; $fn$;
rollback;
-- Enable only the isolated fixture so all pre-existing due execution tests run.
select newsroom_private.set_scheduler_enabled(true,'Isolated regression fixture only');
