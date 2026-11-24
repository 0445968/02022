import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const js=ts.transpileModule(file('lib/permissions/workspace-policy.ts'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {buildWorkspaceAccess,WORKSPACE_CAPABILITIES}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const options={privateMedia:true,onboarding:true};
const access=(...keys)=>buildWorkspaceAccess(new Set(keys),options);
test('CT05a reader or revoked member gets no navigation even with stray grants',()=>{
 assert.deepEqual(access('story.view_all','team.view').nav,[]);
 assert.equal(access('media.upload').allowed,false);
});
test('CT05a contributor never receives broad editorial navigation',()=>{
 const a=access('newsroom.access','media.upload','story.view_assigned','story.edit_assigned');
 assert.deepEqual(a.nav,['contributor','media','profile']);
 assert.equal(a.landing,'/newsroom/contributor');assert.equal(a.fullMedia,false);
 assert.equal(a.fullEditor,false);assert.equal(a.createStory,false);
});
test('CT05a partial grants do not expose legacy privileged controls',()=>{
 const a=access('newsroom.access','story.view_all','story.create','story.edit_all','homepage.view_editor','byline.view');
 assert.deepEqual(a.nav,['dashboard','stories','profile']);
 assert.equal(a.fullEditor,false);assert.equal(a.fullHomepage,false);
});
test('CT05a full manager sees only implemented modules, missing grant removes related action',()=>{
 const full=access(...WORKSPACE_CAPABILITIES);
 assert.equal(full.fullEditor,true);assert.equal(full.createStory,true);assert.equal(full.fullMedia,true);
 assert.deepEqual(full.nav,['dashboard','stories','newStory','media','authors','pageEditor','team','profile']);
 assert.equal(access(...WORKSPACE_CAPABILITIES.filter(k=>k!=='story.publish')).fullEditor,false);
 assert.equal(access(...WORKSPACE_CAPABILITIES.filter(k=>k!=='media.delete')).fullMedia,false);
});
test('CT05a page guards execute before privileged loaders; assignment list is own-active and resource checked',()=>{
 for(const [path,guard,load] of [
  ['app/newsroom/(shell)/stories/page.tsx',"requireWorkspacePage('viewStories')",'listStories({'],
  ['app/newsroom/(shell)/stories/[id]/edit/page.tsx',"requireWorkspacePage('fullEditor')",'await getStoryForEditing('],
  ['app/newsroom/(shell)/authors/page.tsx',"requireWorkspacePage('manageBylines')",'await getEditorialProfiles()'],
  ['app/newsroom/(shell)/page-editor/page.tsx',"requireWorkspacePage('fullHomepage')",'await Promise.all('],
  ['app/newsroom/(shell)/stories/[id]/preview/page.tsx','await mayViewWorkspaceStory(params.id)','await getStoryForEditing(']
 ]){
  const s=file(path);assert.ok(s.indexOf(guard)>=0&&s.indexOf(guard)<s.indexOf(load),path);
 }
 const s=file('lib/services/newsroom-workspace.ts');
 for(const x of ["auth.getUser()",".eq('auth_user_id',user.id)",".eq('membership_id',member.id).eq('status','active')","'story.view_assigned',{kind:'story',storyId:id}",".select('id,headline,status,language')"])
  assert.ok(s.includes(x),x);
 assert.doesNotMatch(s,/SUPABASE_SERVICE_ROLE_KEY|user_metadata/);
 assert.match(file('app/newsroom/(shell)/page.tsx'),/if\(access&&!access.viewStories\)redirect\('\/newsroom\/contributor'\)/);
});

test('CT05a scoped per-story denies are checked before rich editor and preview',()=>{
 const s=file('lib/services/newsroom-workspace.ts');
 assert.match(s,/resolveStoryStaffPermissionsOnServer\(storyId,\['story.view_all','story.view_assigned'\]\)/);
 assert.match(s,/keys.every\(key=>grants.has\(key\)\)/);
 const e=file('app/newsroom/(shell)/stories/[id]/edit/page.tsx');
 assert.ok(e.indexOf('await mayMountFullStoryEditor(params.id)')<e.indexOf('await getStoryForEditing('));
 assert.match(file('components/editorial/stories-dashboard.tsx'),/\{canCreate&&<><p/);
});
