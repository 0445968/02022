import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const code=ts.transpileModule(file('lib/permissions/staff-profile-contract.ts'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {ownBylineStatus,dashboardStorySummary,DASHBOARD_STORY_LIMIT}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('self byline does not imply public attribution and hides conflicting association name',()=>{
 const review={status:'approved',reviewed_profile_revision:1,editorial_profile_id:'id'};
 assert.deepEqual(ownBylineStatus(true,2,review,true,'Byline'),{status:'approved',name:'Byline'});
 assert.deepEqual(ownBylineStatus(true,2,review,false,'Other name'),{status:'conflict',name:null});
 assert.deepEqual(ownBylineStatus(true,2,{...review,status:'rejected'},false,null),{status:'pending',name:null});
 assert.deepEqual(ownBylineStatus(false,1,null,false,null),{status:'not_requested',name:null});
 assert.throws(()=>ownBylineStatus(true,1,{...review,status:'unknown'},false,null));
});
test('dashboard summaries count only supplied visible sample, no global total',()=>{
 const items=['draft','published','in_review','archived'].map((status,i)=>({id:String(i),headline:'Story',status,updatedAt:'2026-11-24T00:00:00Z'}));
 assert.equal(DASHBOARD_STORY_LIMIT,25);
 assert.deepEqual(dashboardStorySummary(items),{total:4,drafts:1,published:1,inReview:1});
 assert.deepEqual(dashboardStorySummary([]),{total:0,drafts:0,published:0,inReview:0});
});
test('profile and dashboard use own actor/current capabilities, bounded scope, no hidden mutations',()=>{
 const own=file('lib/services/staff-onboarding.ts').split('export async function readOwnByline()')[1];
 for(const token of ['await verifiedActor()','staff_onboarding_actor_membership','p_actor:actor',".eq('membership_id',member)",'staff_byline_candidate_allowed','byline.account_id===actor','current!==member'])assert.ok(own.includes(token),token);
 assert.doesNotMatch(own,/\.update\(|\.insert\(|\.delete\(/);
 const dashboard=file('lib/services/newsroom-dashboard.ts');
 for(const token of ["!access.viewStories","resolveGlobalStaffPermissionsOnServer(['newsroom.access','story.view_all'])","resolveStoryStaffPermissionsOnServer(row.id,['story.view_all'])",".limit(DASHBOARD_STORY_LIMIT+1)","dashboardStorySummary(items)","fresh?.id!==user.id","readReviewInbox(mode,0)"])assert.ok(dashboard.includes(token),token);
 assert.doesNotMatch(dashboard,/SERVICE_ROLE|user_metadata/);
 const page=file('app/newsroom/(shell)/profile/page.tsx');
 assert.match(page,/getWorkspaceAccess\(\)/);assert.match(page,/readOwnByline\(\)/);assert.doesNotMatch(page,/href="\/account\/security"/);
 for(const p of ['app/[locale]/layout.tsx','app/account/layout.tsx','app/newsroom/(shell)/layout.tsx'])assert.match(file(p),/export const dynamic = 'force-dynamic'/);
 assert.match(file('app/newsroom/(shell)/page.tsx'),/not newsroom-wide totals/);
});
