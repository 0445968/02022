import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const {currentPublicWindow,isPublicStory,safeExternalAlertUrl,usableHeadshot}=await import(url(compile(file('lib/permissions/public-editorial-contract.ts'))));
const base=url(compile(file('lib/permissions/assigned-draft-contract.ts')));
const {parseAuthorProfileUpdate}=await import(url(compile(file('lib/permissions/author-profile-contract.ts')).replace("'./assigned-draft-contract'","'"+base+"'")));
test('public time boundaries and safe link checks fail closed',()=>{
 const now=Date.parse('2026-11-24T12:00:00Z'),at='2026-11-24T12:00:00Z';
 assert.equal(currentPublicWindow(true,at,null,now),true);
 assert.equal(currentPublicWindow(true,null,at,now),false);
 assert.equal(currentPublicWindow(true,'invalid',null,now),false);
 assert.equal(currentPublicWindow(false,null,null,now),false);
 assert.equal(isPublicStory('draft',at,now),false);assert.equal(isPublicStory('published',at,now),true);
 assert.equal(isPublicStory('published','2026-11-25T00:00:00Z',now),false);
 assert.equal(safeExternalAlertUrl('javascript:alert(1)'),false);
 assert.equal(safeExternalAlertUrl('https://user:pass@example.com'),false);
 const image={status:'approved',mimeType:'image/jpeg',rightsStatus:'licensed',licenseExpiresAt:null,embargoUntil:null,isSuperseded:false,trashedAt:null};
 assert.equal(usableHeadshot(image,now),true);
 for(const patch of [{rightsStatus:'unknown'},{status:'trashed'},{licenseExpiresAt:at},{embargoUntil:'2026-11-25T00:00:00Z'},{mimeType:'video/mp4'},{isSuperseded:true}])assert.equal(usableHeadshot({...image,...patch},now),false);
});
test('author changes require exact version and allowed fields',()=>{
 const input={bylineName:'Example',editorialTitle:'',bio:'Bio',bylineStatus:'active',headshotMediaId:null,expectedUpdatedAt:'2026-11-24T12:00:00Z'};
 assert.equal(parseAuthorProfileUpdate(input).editorialTitle,null);
 for(const patch of [{accountId:'other'},{isEditor:true},{headshotMediaId:'fake'},{bylineStatus:'owner'},{expectedUpdatedAt:null},{bylineName:' '}])assert.throws(()=>parseAuthorProfileUpdate({...input,...patch}));
 const route=file('app/api/editorial-profiles/[id]/route.ts');
 assert.match(route,/await mayManageByline\(user\)/);assert.match(route,/\.eq\('updated_at',existing\.updated_at\)/);assert.match(route,/usableHeadshot/);
});
test('public shell uses public projection and Page Editor top actions reach confirmation, unsafe permanent delete blocked',()=>{
 assert.match(file('components/layout/public-shell.tsx'),/getPublicHomepageSlots\(\)/);
 const front=file('lib/services/front-page.ts');for(const s of ['currentPublicWindow(row.active','isPublicStory(story.status','media_public_assets','safeExternalAlertUrl(row.external_url)','created_by:null,updated_by:null'])assert.ok(front.includes(s),s);
 const client=file('components/editorial/page-editor/PageEditorClient.tsx');assert.match(client,/controller.current\?\.publish\(\)/);assert.match(client,/controller.current\?\.revert\(\)/);assert.match(client,/ref=\{controller\}/);
 const controller=file('components/editorial/page-editor/front-page/FrontPageController.tsx');assert.match(controller,/await autosaveTail.current/);assert.match(controller,/setConfirmAction\('publish'\)/);
 const media=file('app/api/media/[id]/route.ts');assert.doesNotMatch(media,/await deleteMediaAsset\(/);assert.match(media,/Permanent deletion is temporarily unavailable/);
});
