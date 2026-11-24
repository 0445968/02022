\i supabase/migrations/20261124230953_ct08c1_scheduler_reliability.sql
do $fn$ begin
 if has_function_privilege('authenticated','newsroom_private.run_due_reviewed_publications(integer)','EXECUTE')
 or has_function_privilege('service_role','newsroom_private.run_due_reviewed_publications(integer)','EXECUTE')
 or has_function_privilege('anon','newsroom_private.run_due_reviewed_publications(integer)','EXECUTE')
 or has_table_privilege('authenticated','newsroom_private.reviewed_publication_schedules','UPDATE') then raise exception 'Retry authority leaked';end if;
end; $fn$;
-- A test-only trigger injects one SQLSTATE after the real validator, before
-- publication completes. Transaction rollback removes all fixture effects.
begin;
create function public.ct08c1_inject_transient() returns trigger language plpgsql as $fn$
begin
 if new.id='20000000-0000-0000-0000-000000000002' and new.status='published' then
  raise exception 'Injected temporary lock contention' using errcode='55P03';end if;
 return new;
end; $fn$;
create trigger ct08c1_inject_transient before update on public.stories
 for each row execute function public.ct08c1_inject_transient();
update newsroom_private.reviewed_publication_schedules set due_at=now()-interval '1 second' where state='pending';
do $fn$ declare r jsonb; q newsroom_private.reviewed_publication_schedules%rowtype;begin
 r:=newsroom_private.run_due_reviewed_publications(5);
 if (r->>'retried')::int<>1 or (r->>'published')::int<>1 or (r->>'blocked')::int<>0 then raise exception 'Transient failure not isolated: %',r;end if;
 select * into q from newsroom_private.reviewed_publication_schedules where story_id='20000000-0000-0000-0000-000000000002' and state='pending';
 if q.id is null or q.retry_count<>1 or q.last_retry_code<>'55P03' or q.next_attempt_at is null
 or q.next_attempt_at<=clock_timestamp() or q.next_attempt_at>clock_timestamp()+interval '1 minute'
 or q.failure_code is not null or q.ended_at is not null then raise exception 'Backoff metadata invalid';end if;
 if exists(select 1 from newsroom_private.publication_events where story_id=q.story_id)
 or exists(select 1 from newsroom_private.publication_permits)
 or (select status from public.stories where id=q.story_id)='published' then raise exception 'Failed publication effects escaped rollback';end if;
 r:=newsroom_private.run_due_reviewed_publications(5);
 if (r->>'retried')::int<>0 or (r->>'published')::int<>0 or (r->>'blocked')::int<>0 then raise exception 'Backoff ignored: %',r;end if;
end; $fn$;
drop trigger ct08c1_inject_transient on public.stories;
update newsroom_private.reviewed_publication_schedules set next_attempt_at=now()-interval '1 second' where state='pending';
do $fn$ declare r jsonb;begin
 r:=newsroom_private.run_due_reviewed_publications(5);
 if (r->>'published')::int<>1 or (r->>'retried')::int<>0 or (r->>'blocked')::int<>0 then raise exception 'Eligible retry did not recover: %',r;end if;
 if (select count(*) from newsroom_private.publication_events)<>2
 or exists(select 1 from newsroom_private.reviewed_publication_schedules where state='published' and next_attempt_at is not null)
 or not exists(select 1 from newsroom_private.reviewed_publication_schedules where state='published' and retry_count=1 and last_retry_code='55P03') then raise exception 'Retry success history invalid';end if;
 r:=newsroom_private.run_due_reviewed_publications(5);
 if (r->>'published')::int<>0 or (r->>'retried')::int<>0 then raise exception 'Duplicate replay';end if;
end; $fn$;
rollback;
begin;
create function public.ct08c1_inject_transient() returns trigger language plpgsql as $fn$
begin
 if new.id='20000000-0000-0000-0000-000000000002' and new.status='published' then
  raise exception 'Injected temporary deadlock' using errcode='40P01';end if;
 return new;
end; $fn$;
create trigger ct08c1_inject_transient before update on public.stories
 for each row execute function public.ct08c1_inject_transient();
update newsroom_private.reviewed_publication_schedules set due_at=now()-interval '1 second' where state='pending' and kind='draft';
do $fn$ declare r jsonb; q newsroom_private.reviewed_publication_schedules%rowtype; n integer;begin
 for n in 1..4 loop
  r:=newsroom_private.run_due_reviewed_publications(5);
  select * into q from newsroom_private.reviewed_publication_schedules where kind='draft' and state in ('pending','blocked');
  if q.id is null or q.retry_count<>n or q.last_retry_code<>'40P01' or (r->>'published')::int<>0 then raise exception 'Retry count invalid: %',r;end if;
  if n<=3 then
   if q.state<>'pending' or (r->>'retried')::int<>1 or q.next_attempt_at is null
   or q.next_attempt_at<=clock_timestamp() or q.next_attempt_at>clock_timestamp()+make_interval(mins=>case n when 1 then 1 when 2 then 2 else 4 end) then raise exception 'Backoff invalid: %',r;end if;
   update newsroom_private.reviewed_publication_schedules set next_attempt_at=now()-interval '1 second' where id=q.id;
  else
   if q.state<>'blocked' or (r->>'blocked')::int<>1 or (r->>'retried')::int<>0
   or q.next_attempt_at is not null or q.failure_code<>'40P01' then raise exception 'Retry cap failed: %',r;end if;
  end if;
 end loop;
 r:=newsroom_private.run_due_reviewed_publications(5);
 if (r->>'published')::int<>0 or (r->>'retried')::int<>0 or (r->>'blocked')::int<>0 or exists(select 1 from newsroom_private.publication_events) then raise exception 'Blocked schedule retried or published';end if;
end; $fn$;
rollback;
-- Business 40001 (stale approval) must block immediately, not retry.
begin;
update newsroom_private.reviewed_publication_schedules set due_at=now()-interval '1 second' where state='pending' and kind='draft';
update public.stories set headline='CT08c stale approval' where id='20000000-0000-0000-0000-000000000002';
do $fn$ declare r jsonb;begin
 r:=newsroom_private.run_due_reviewed_publications(5);
 if (r->>'blocked')::int<>1 or (r->>'retried')::int<>0 or not exists(
 select 1 from newsroom_private.reviewed_publication_schedules where kind='draft' and state='blocked' and retry_count=0 and failure_code='40001')
 then raise exception 'Stale approval retried: %',r;end if;
end; $fn$;
rollback;
