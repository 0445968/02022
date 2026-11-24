import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const base='data:text/javascript;base64,'+Buffer.from(compile(file('lib/permissions/assigned-draft-contract.ts'))).toString('base64');
const code=compile(file('lib/permissions/story-assignment-contract.ts')).replace("'./assigned-draft-contract'","'"+base+"'");
const {validateAssignmentCommand}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const valid={membershipId:'10000000-0000-0000-0000-000000000003',type:'author',action:'create',expectedRevision:0,dueAt:null,reason:'Assign reporting to writer',requestId:'81000000-0000-0000-0000-000000000001'};
test('CT06a exact command rejects actor, role, status and stale revision injection',()=>{
 assert.deepEqual(validateAssignmentCommand(valid),valid);
 for(const p of [{actorId:'forged'},{role:'owner'},{status:'active'},{type:'owner'},{action:'delete'},{expectedRevision:1},{reason:'short'},{dueAt:'tomorrow'}])assert.throws(()=>validateAssignmentCommand({...valid,...p}));
 assert.throws(()=>validateAssignmentCommand({...valid,action:'revoke'}));
 assert.throws(()=>validateAssignmentCommand({...valid,action:'complete',expectedRevision:1,dueAt:'2026-11-25T15:00:00Z'}));
 assert.equal(validateAssignmentCommand({...valid,action:'reopen',expectedRevision:2}).action,'reopen');
});
test('CT06a exact assignment authorization, immutable identity, concurrency and audit',()=>{
 const s=file('supabase/migrations/20261124175744_ct06a_assignment_lifecycle.sql');
 for(const x of ['staff_invite_verified_identity',"has_staff_permission('story.assign',p_story)","has_staff_permission('story.view_all',p_story)",'m.auth_user_id=actor','a.revision<>p_expected','pg_advisory_xact_lock(202611,2302)','app.staff_actor_auth_id','app.staff_reason','assignment_eligible_types','new.revision:=old.revision+1'])assert.ok(s.includes(x),x);
 assert.match(s,/create function public\.staff_change_story_assignment[\s\S]*?security invoker/);
 assert.doesNotMatch(s,/grant (insert|update|delete).*public\.staff_story_assignments|update public\.stories|delete from public\.staff_story_assignments/i);
 assert.match(file('lib/services/story-assignments.ts'),/auth\.getUser\(\)/);
 assert.match(file('.env.example'),/CT_STORY_ASSIGNMENTS_ENABLED=false/);
});
