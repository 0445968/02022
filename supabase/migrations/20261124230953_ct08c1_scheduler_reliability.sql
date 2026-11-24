-- CT-08c.1 STAGED ONLY. CLI filename from #45507486162.
-- Bounded transient retries; no job, new grant, or change to publication authority.
begin;
alter table newsroom_private.reviewed_publication_schedules
 add column retry_count integer not null default 0 check(retry_count between 0 and 4),
 add column next_attempt_at timestamptz check(next_attempt_at is null or isfinite(next_attempt_at)),
 add column last_retry_code text check(last_retry_code is null or last_retry_code in ('40P01','55P03')),
 add constraint ct08c1_retry_metadata check(
  (retry_count=0 and last_retry_code is null and next_attempt_at is null)
  or (retry_count>0 and last_retry_code is not null));
create or replace function newsroom_private.run_due_reviewed_publications(p_limit integer default 5)
returns jsonb language plpgsql security invoker set search_path='' set lock_timeout='3s'
as $fn$
declare item newsroom_private.reviewed_publication_schedules%rowtype;
 done integer:=0; blocked integer:=0; retried integer:=0; code text; retryable boolean;
begin
 if current_user<>'postgres' or session_user<>'postgres' or (select auth.uid()) is not null then
  raise exception 'Scheduler unavailable' using errcode='42501';end if;
 if p_limit is null or p_limit not between 1 and 10 then raise exception 'Invalid batch size' using errcode='22023';end if;
 if not pg_try_advisory_xact_lock(202611,2302) then
  return jsonb_build_object('published',0,'blocked',0,'retried',0,'busy',true);end if;
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
 return jsonb_build_object('published',done,'blocked',blocked,'retried',retried,'busy',false);
end;
$fn$;
revoke all on function newsroom_private.run_due_reviewed_publications(integer) from public,anon,authenticated,service_role;
commit;
