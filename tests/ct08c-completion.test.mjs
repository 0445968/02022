import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const {schedulingInstants}=await import(url(compile(file('lib/permissions/calendar-view.ts'))));
const base=url(compile(file('lib/permissions/assigned-draft-contract.ts')));
const {parseSchedulerHealth}=await import(url(compile(file('lib/permissions/scheduler-health-contract.ts')).replace("'./assigned-draft-contract'","'"+base+"'")));
test('explicit civil scheduling rejects invalid dates and DST gaps, exposes both repeated occurrences',()=>{
 assert.deepEqual(schedulingInstants('2027-03-14T02:30','America/Chicago'),[]);
 assert.deepEqual(schedulingInstants('2027-11-07T01:30','America/Chicago'),['2027-11-07T06:30:00.000Z','2027-11-07T07:30:00.000Z']);
 assert.deepEqual(schedulingInstants('2027-03-14T03:30','America/Chicago'),['2027-03-14T08:30:00.000Z']);
 assert.deepEqual(schedulingInstants('2027-11-07T01:30','America/Bogota'),['2027-11-07T06:30:00.000Z']);
 assert.deepEqual(schedulingInstants('2027-11-07T01:30','UTC'),['2027-11-07T01:30:00.000Z']);
 assert.deepEqual(schedulingInstants('2027-02-29T12:00','UTC'),[]);
 assert.deepEqual(schedulingInstants('2027-11-07T01:30','invalid'),[]);
});
test('health exposes only bounded operational state and never raw queues',()=>{
 const asOf='2026-11-24T12:00:00Z';
 assert.deepEqual(parseSchedulerHealth({state:'paused',lastRunAt:null,asOf}),{state:'paused',lastRunAt:null,asOf});
 assert.equal(parseSchedulerHealth({state:'recent_run',lastRunAt:asOf,asOf}).state,'recent_run');
 for(const x of [{state:'recent_run',lastRunAt:null,asOf},{state:'paused',lastRunAt:asOf,asOf},{state:'paused',lastRunAt:null,asOf,published:4}])assert.throws(()=>parseSchedulerHealth(x));
});
test('default pause and owner-only execution, run heartbeat and scoped read',()=>{
 const s=file('supabase/migrations/20261124231511_ct08c_scheduler_controls.sql');
 for(const token of ['values(true,false)','pg_advisory_xact_lock(202611,2302)','pg_try_advisory_xact_lock(202611,2302)',"'paused',true",'scheduler_run_history(started_at,finished_at','can_read_editorial_calendar()','current_user<>\'postgres\'','session_user<>\'postgres\'','enable row level security'])assert.ok(s.includes(token),token);
 assert.doesNotMatch(s,/cron\.schedule\(|create extension|grant execute on function newsroom_private\.run_due_reviewed_publications|grant execute on function newsroom_private\.set_scheduler_enabled/i);
 assert.match(file('components/editorial/calendar/SchedulerHealthNotice.tsx'),/does not confirm that an automated job is installed/);
});
