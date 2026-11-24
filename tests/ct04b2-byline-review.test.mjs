import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const js=ts.transpileModule(file('lib/permissions/staff-byline-input.ts'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {validateBylineReview}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const id='50000000-0000-4000-8000-000000000001';
const valid={membershipId:id,profileRevision:1,reviewRevision:0,action:'approve',bylineId:id,reason:'Reviewed correct author identity',confirmed:true};
test('CT04b2 strict private review payload rejects forged actor and fields',()=>{
 assert.deepEqual(validateBylineReview(valid),valid);
 for(const p of [{actorId:id},{role:'owner'},{accountId:id},{action:'unlink'},{action:'publish'},{bylineId:null},{profileRevision:0},{reviewRevision:-1},{confirmed:false}]){
   assert.throws(()=>validateBylineReview({...valid,...p}));
 }
 assert.equal(validateBylineReview({...valid,action:'reject',bylineId:null}).action,'reject');
});
test('CT04b2 independent owner and private association only',()=>{
 const s=file('supabase/migrations/20261124154819_ct04b_staff_byline_review.sql');
 for(const x of ['enable row level security','staff_invite_verified_identity(p_actor)',"g.capability_key='byline.manage'","p.role_key='owner'","o.effect='deny'",'e.account_id is null or e.account_id=m.auth_user_id','pg_advisory_xact_lock(202611,2302)','reviewed_profile_revision','staff_access_audit'])assert.ok(s.includes(x),x);
 assert.doesNotMatch(s,/update public\.editorial_profiles|update public\.stories|insert into public\.staff_member_roles|security definer/i);
});
test('CT04b2 flag and fresh verified owner checks remain server-only',()=>{
 const s=file('lib/services/staff-byline-review.ts');
 for(const x of ["import 'server-only'",'staffOnboardingEnabled()','CT_STAFF_BYLINE_REVIEW_ENABLED','auth.getUser()',"'byline.manage'","'staff_byline_owner_allowed'"])assert.ok(s.includes(x),x);
 assert.match(file('.env.example'),/CT_STAFF_BYLINE_REVIEW_ENABLED=false/);
 assert.match(file('app/api/newsroom/team/bylines/route.ts'),/readInviteRequest\(request\)/);
});
