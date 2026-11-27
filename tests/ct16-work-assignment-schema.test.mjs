import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {ASSIGNMENT_ACTIVITIES,ASSIGNMENT_COVERAGE,ASSIGNMENT_WORK_STATUSES,ASSIGNMENT_PRIORITIES} from '../lib/permissions/standalone-assignment-contract.ts';
const sql=readFileSync(new URL('../supabase/migrations/20261127173913_ct16_work_assignments.sql',import.meta.url),'utf8');
test('work assignment schema mirrors catalogs and separates work from story access',()=>{
 for(const [column,catalog] of [['activity',ASSIGNMENT_ACTIVITIES],['coverage',ASSIGNMENT_COVERAGE],['status',ASSIGNMENT_WORK_STATUSES],['priority',ASSIGNMENT_PRIORITIES]]){
 const values=sql.match(new RegExp('check\\('+column+' in \\(([^)]+)\\)\\)'))[1];assert.deepEqual([...values.matchAll(/'([^']+)'/g)].map(m=>m[1]),catalog.map(r=>r[0]));}
 for(const s of ['work_permission','staff_invite_verified_identity','pg_advisory_xact_lock(202611,2302)','unique(actor,request_id)','unique(assignment_id,revision)','work_can_view_story','enable row level security','security invoker','42501','40001'])assert.ok(sql.includes(s),s);
 assert.doesNotMatch(sql,/insert into public\.staff_story_assignments|update public\.stories|grant (select|insert|update|delete) on newsroom_private\.work_assignments/i);
});
