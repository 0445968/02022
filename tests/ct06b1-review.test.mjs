import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const base='data:text/javascript;base64,'+Buffer.from(compile(file('lib/permissions/assigned-draft-contract.ts'))).toString('base64');
const code=compile(file('lib/permissions/story-review-contract.ts')).replace("'./assigned-draft-contract'","'"+base+"'");
const {validateReviewCommand,parseReviewState}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const id='20000000-0000-0000-0000-000000000002';
const valid={kind:'draft',action:'request',fingerprint:'a'.repeat(64),requestId:null,note:'Please review submitted draft',commandId:'82000000-0000-0000-0000-000000000001'};
test('CT06b1 strict review command rejects publication, actor and copy injection',()=>{
 assert.deepEqual(validateReviewCommand(valid),valid);
 for(const patch of [{actor:'forged'},{status:'published'},{action:'publish'},{kind:'live'},{fingerprint:'bad'},{note:'short'},{requestId:id},{action:'approve'}])assert.throws(()=>validateReviewCommand({...valid,...patch}));
 assert.equal(validateReviewCommand({...valid,action:'approve',requestId:id}).action,'approve');
});
test('CT06b1 review snapshot and immutable private decision guard',()=>{
 const s=file('supabase/migrations/20261124182027_ct06b_review_lifecycle.sql');
 for(const x of ['story_review_epochs','generation=story_review_epochs.generation+1','ct06b_review_epoch_category','ct06b_review_epoch_tag','sha256(convert_to','story_review_decisions','request_id uuid primary key','review_independent','req.fingerprint is distinct from p_fingerprint','has_current_review_approval','pg_advisory_xact_lock(202611,2302)'])assert.ok(s.includes(x),x);
 assert.match(s,/create function public\.staff_change_review[\s\S]*?security invoker/);
 assert.doesNotMatch(s,/update newsroom_private\.story_review_(requests|decisions)|delete from newsroom_private\.story_review_(requests|decisions)/i);
 assert.match(file('lib/services/story-review.ts'),/auth\.getUser\(\)/);
 assert.match(file('.env.example'),/CT_STORY_REVIEW_ENABLED=false/);
 const state={storyId:id,kind:'draft',revisionId:null,headline:'Draft',status:'in_review',fingerprint:valid.fingerprint,requestId:null,decision:null,current:false,canRequest:true,canDecide:false,history:[]};
 assert.deepEqual(parseReviewState(state,id,'draft'),state);
 assert.throws(()=>parseReviewState({...state,creator:id},id,'draft'));
});
