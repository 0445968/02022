import test from 'node:test';
import assert from 'node:assert/strict';
import {ASSIGNMENT_ACTIVITIES,ASSIGNMENT_COVERAGE,ASSIGNMENT_WORK_STATUSES,ASSIGNMENT_PRIORITIES,validateStandaloneAssignmentCommand,assignmentTransitionAllowed} from '../lib/permissions/standalone-assignment-contract.ts';
const a='10000000-0000-0000-0000-000000000001',b='10000000-0000-0000-0000-000000000002',c='10000000-0000-0000-0000-000000000003';
const details={title:'Interview harbor officials',activity:'interview',coverage:'government_civic',storyId:null,assigneeIds:[b,a],priority:'normal',dueAt:null,notes:'Confirm availability.\nPrepare questions.'};
const create={action:'create',assignmentId:null,expectedRevision:0,requestId:c,reason:'Assign reporting work',details};
test('standalone assignment catalogs are distinct, bilingual and complete',()=>{
 assert.equal(ASSIGNMENT_ACTIVITIES.length,16);assert.equal(ASSIGNMENT_COVERAGE.length,17);
 for(const catalog of [ASSIGNMENT_ACTIVITIES,ASSIGNMENT_COVERAGE,ASSIGNMENT_WORK_STATUSES,ASSIGNMENT_PRIORITIES]){
  assert.equal(catalog.length,new Set(catalog.map(r=>r[0])).size);
  for(const [key,en,es] of catalog){assert.match(key,/^[a-z_]+$/);assert.ok(en.trim()&&es.trim());}
 }
});
test('create accepts optional article and multiple members, rejects privilege injection',()=>{
 assert.deepEqual(validateStandaloneAssignmentCommand(create).details.assigneeIds,[a,b]);
 assert.equal(validateStandaloneAssignmentCommand({...create,details:{...details,storyId:c}}).details.storyId,c);
 for(const patch of [{actorId:a},{role:'owner'},{status:'completed'},{expectedRevision:1},{assignmentId:a},{reason:'short'},{action:'delete'}])assert.throws(()=>validateStandaloneAssignmentCommand({...create,...patch}));
 for(const patch of [{assigneeIds:[]},{assigneeIds:[a,a]},{assigneeIds:[a,'bad']},{storyId:'bad'},{activity:'author'},{coverage:'unknown'},{priority:'owner'},{dueAt:'tomorrow'},{notes:'x'.repeat(10001)},{role:'owner'}])assert.throws(()=>validateStandaloneAssignmentCommand({...create,details:{...details,...patch}}));
});
test('edit/status commands require a revision and cannot change hidden fields',()=>{
 const edit={...create,action:'edit',assignmentId:a,expectedRevision:1};assert.equal(validateStandaloneAssignmentCommand(edit).expectedRevision,1);
 const status={action:'status',assignmentId:a,expectedRevision:2,requestId:c,reason:'Reporting work completed',status:'completed'};
 assert.equal(validateStandaloneAssignmentCommand(status).status,'completed');
 for(const patch of [{expectedRevision:0},{assignmentId:null},{status:'published'},{details},{assigneeIds:[b]}])assert.throws(()=>validateStandaloneAssignmentCommand({...status,...patch}));
});
test('assignees cannot cancel or reopen, managers can reopen terminal items',()=>{
 assert.equal(assignmentTransitionAllowed('assigned','in_progress',false),true);
 assert.equal(assignmentTransitionAllowed('in_progress','completed',false),true);
 assert.equal(assignmentTransitionAllowed('in_progress','cancelled',false),false);
 assert.equal(assignmentTransitionAllowed('completed','assigned',false),false);
 assert.equal(assignmentTransitionAllowed('completed','assigned',true),true);
 assert.equal(assignmentTransitionAllowed('completed','in_progress',true),false);
 assert.equal(assignmentTransitionAllowed('assigned','assigned',true),false);
});
