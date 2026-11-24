-- CT-08c completion STAGED ONLY, CLI filename from #45508270824.
-- No extension, job installation, hosted activation or public execution grant.
begin;
create table newsroom_private.scheduler_control(
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false,
 changed_at timestamptz not null default clock_timestamp()
);
insert into newsroom_private.scheduler_control(singleton,enabled) values(true,false);
create table newsroom_private.scheduler_control_history(
 id bigint generated always as identity primary key,
 enabled boolean not null, changed_at timestamptz not null default clock_timestamp(),
 reason text not null check(length(btrim(reason)) between 10 and 500)
);
create table newsroom_private.scheduler_run_history(
 id bigint generated always as identity primary key,
 started_at timestamptz not null,
 finished_at timestamptz not null check(finished_at>=started_at),
 batch_limit integer not null check(batch_limit between 1 and 10),
 published integer not null check(published>=0),
 blocked integer not null check(blocked>=0),
 retried integer not null check(retried>=0),
 check(published+blocked+retried<=batch_limit)
);
create index ct08c_run_finished on newsroom_private.scheduler_run_history(finished_at desc,id desc);
alter table newsroom_private.scheduler_control enable row level security;
alter table newsroom_private.scheduler_control_history enable row level security;
alter table newsroom_private.scheduler_run_history enable row level security;
revoke all on table newsroom_private.scheduler_control,newsroom_private.scheduler_control_history,newsroom_private.scheduler_run_history from public,anon,authenticated,service_role;
-- Operational authority is deliberately a trusted database operator only.
-- The same advisory lock serializes pause/resume with the executor.
create function newsroom_private.set_scheduler_enabled(p_enabled boolean,p_reason text)
returns jsonb language plpgsql security invoker set search_path='' set lock_timeout='3s'
as $fn$
declare changed timestamptz;
begin
 if current_user<>'postgres' or session_user<>'postgres' or (select auth.uid()) is not null then
  raise exception 'Scheduler control unavailable' using errcode='42501';end if;
 if p_enabled is null or p_reason is null or length(btrim(p_reason)) not between 10 and 500 then
  raise exception 'Invalid scheduler control' using errcode='22023';end if;
 perform pg_advisory_xact_lock(202611,2302);
 update newsroom_private.scheduler_control set enabled=p_enabled,changed_at=clock_timestamp()
  where singleton and enabled is distinct from p_enabled returning changed_at into changed;
 if not found then
  select changed_at into changed from newsroom_private.scheduler_control where singleton;
  if not found then raise exception 'Scheduler control missing' using errcode='55000';end if;
  return jsonb_build_object('enabled',p_enabled,'changed',false,'changedAt',changed);
 end if;
 insert into newsroom_private.scheduler_control_history(enabled,changed_at,reason)
 values(p_enabled,changed,btrim(p_reason));
 return jsonb_build_object('enabled',p_enabled,'changed',true,'changedAt',changed);
end;
$fn$;
revoke all on function newsroom_private.set_scheduler_enabled(boolean,text) from public,anon,authenticated,service_role;
create or replace function newsroom_private.run_due_reviewed_publications(p_limit integer default 5)
returns jsonb language plpgsql security invoker set search_path='' set lock_timeout='3s'
as $fn$
declare item newsroom_private.reviewed_publication_schedules%rowtype;
 done integer:=0; blocked integer:=0; retried integer:=0; code text; retryable boolean; started timestamptz;
begin
 if current_user<>'postgres' or session_user<>'postgres' or (select auth.uid()) is not null then
  raise exception 'Scheduler unavailable' using errcode='42501';end if;
 if p_limit is null or p_limit not between 1 and 10 then raise exception 'Invalid batch size' using errcode='22023';end if;
 if not pg_try_advisory_xact_lock(202611,2302) then
  return jsonb_build_object('published',0,'blocked',0,'retried',0,'busy',true,'paused',false);end if;
 if not coalesce((select enabled from newsroom_private.scheduler_control where singleton),false) then
  return jsonb_build_object('published',0,'blocked',0,'retried',0,'busy',false,'paused',true);end if;
 started:=clock_timestamp();
 for item in select * from newsroom_private.reviewed_publication_schedules
 where state='pending' and due_at<=clock_timestamp()
 and (next_attempt_at is null or next_attempt_at<=clock_timestamp())
 order by due_at,id limit p_limit for update skip locked loop
  begin
   perform newsroom_private.apply_validated_publication(item.story_id,item.kind,item.request_id,item.fingerprint,item.authorized_by,item.id);
   update newsroom_private.reviewed_publication_schedules set next_attempt_at=null where id=item.id and state='published';
   done:=done+1;
  exception when others then
   -- All publication effects rolled back in this subtransaction. Never retry
   -- 40001: the shared validator intentionally uses it for stale approval.
   -- Query cancellation/transaction-wide failures still abort the whole run.
   get stacked diagnostics code=returned_sqlstate;
   retryable:=code in ('40P01','55P03');
   if retryable and item.retry_count<3 then
    update newsroom_private.reviewed_publication_schedules
     set retry_count=item.retry_count+1,last_retry_code=code,
         next_attempt_at=clock_timestamp()+make_interval(mins=>case item.retry_count when 0 then 1 when 1 then 2 else 4 end)
     where id=item.id and state='pending';
    retried:=retried+1;
   else
    update newsroom_private.reviewed_publication_schedules
     set state='blocked',ended_at=clock_timestamp(),failure_code=code,next_attempt_at=null,
         retry_count=item.retry_count+case when retryable then 1 else 0 end,
         last_retry_code=case when retryable then code else item.last_retry_code end
     where id=item.id and state='pending';
    blocked:=blocked+1;
   end if;
  end;
 end loop;
 insert into newsroom_private.scheduler_run_history(started_at,finished_at,batch_limit,published,blocked,retried)
 values(started,clock_timestamp(),p_limit,done,blocked,retried);
 return jsonb_build_object('published',done,'blocked',blocked,'retried',retried,'busy',false,'paused',false);
end;
$fn$;

revoke all on function newsroom_private.run_due_reviewed_publications(integer) from public,anon,authenticated,service_role;
-- Only minimal global operational state, never queue counts or staff identity.
-- 'Recent' is a completed committed invocation, not proof of an installed cron job.
create function newsroom_private.read_scheduler_health()
returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC'
as $fn$
declare control newsroom_private.scheduler_control%rowtype; last_run timestamptz; status text;
begin
 if not coalesce(newsroom_private.can_read_editorial_calendar(),false) then
  raise exception 'Scheduler health unavailable' using errcode='42501';end if;
 select * into control from newsroom_private.scheduler_control where singleton;
 if not found then raise exception 'Scheduler control missing' using errcode='55000';end if;
 select finished_at into last_run from newsroom_private.scheduler_run_history
  where finished_at>=control.changed_at order by finished_at desc,id desc limit 1;
 status:=case when not control.enabled then 'paused' when last_run is null then 'awaiting_first_run'
  when last_run<statement_timestamp()-interval '5 minutes' then 'heartbeat_stale' else 'recent_run' end;
 return jsonb_build_object('state',status,'lastRunAt',last_run,'asOf',statement_timestamp());
end;
$fn$;
revoke all on function newsroom_private.read_scheduler_health() from public,anon,authenticated,service_role;
grant execute on function newsroom_private.read_scheduler_health() to authenticated;
create function public.staff_read_scheduler_health()
returns jsonb language sql stable security invoker set search_path=''
as $fn$ select newsroom_private.read_scheduler_health() $fn$;
revoke all on function public.staff_read_scheduler_health() from public,anon,authenticated,service_role;
grant execute on function public.staff_read_scheduler_health() to authenticated;
commit;
