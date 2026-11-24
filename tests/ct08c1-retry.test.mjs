import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('scheduler retries only explicit temporary lock SQLSTATEs with bounded backoff and unchanged authority',()=>{
 const sql=file('supabase/migrations/20261124230953_ct08c1_scheduler_reliability.sql');
 for(const s of ["current_user<>'postgres'","session_user<>'postgres'","(select auth.uid()) is not null","pg_try_advisory_xact_lock(202611,2302)","for update skip locked","next_attempt_at<=clock_timestamp()","retryable:=code in ('40P01','55P03')","item.retry_count<3","when 0 then 1 when 1 then 2 else 4","apply_validated_publication(item.story_id,item.kind,item.request_id,item.fingerprint,item.authorized_by,item.id)","state='blocked'","set lock_timeout='3s'"])assert.ok(sql.includes(s),s);
 assert.doesNotMatch(sql,/grant execute|cron\.schedule\(|create function public\.|retryable:=code in \([^)]*40001/i);
 assert.match(sql,/revoke all on function newsroom_private\.run_due_reviewed_publications\(integer\) from public,anon,authenticated,service_role/);
});
