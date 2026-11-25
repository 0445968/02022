import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import ts from 'typescript';
const f=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8'),c=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText,u=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const account=await import(u(c(f('lib/permissions/reader-account-contract.ts')).replace("'./assigned-draft-contract'","'"+u(c(f('lib/permissions/assigned-draft-contract.ts')))+"'")));
const content=await import(u(c(f('lib/permissions/public-content-contract.ts'))));
test('profile input rejects arbitrary actor, role, avatar URL and malformed data',()=>{
 const base={action:'profile',displayName:' Reader ',locale:'es',avatar:'ocean',expectedUpdatedAt:'2026-11-24T12:00:00Z'};
 assert.equal(account.parseAccountCommand(base).displayName,'Reader');
 for(const p of [{id:'another'},{isEditor:true},{email:'other@example.invalid'},{avatar:'https://evil.example/track'},{displayName:''},{locale:'xx'}])assert.throws(()=>account.parseAccountCommand({...base,...p}));
 assert.equal(account.safeAvatar('https://evil.example/avatar'),null);
 assert.equal(account.safeAvatar('/avatars/reader-sun.svg'),'/avatars/reader-sun.svg');
 assert.throws(()=>account.parseAccountCommand({action:'request',kind:'delete',confirmation:'EXPORT'}));
 assert.deepEqual(account.parseAccountCommand({action:'request',kind:'delete',confirmation:'DELETE'}),{action:'request',kind:'delete',confirmation:'DELETE'});
 assert.equal(account.validNewPassword('short'),false);assert.equal(account.validNewPassword('longpassword12'),true);
});
test('inline public media needs approved matching original URL and links are safe',()=>{
 const url='https://example.invalid/approved.jpg',other='https://example.invalid/draft.jpg';
 const image=(src,id)=>({type:'image',attrs:{src,mediaAssetId:id}});
 const body={type:'doc',content:[image(url,'a'),image(url,'b'),image(other,'a'),image('javascript:alert(1)','a'),{type:'paragraph',content:[{type:'text',text:'link',marks:[{type:'link',attrs:{href:'javascript:alert(1)'}}]}]}]};
 assert.deepEqual(content.imageReferences(body),[url,other]);
 const p=content.projectPublicBody(body,new Map([[url,'a']]));
 assert.equal(p.content.length,2);assert.equal(p.content[0].attrs.src,url);assert.equal(p.content[1].content[0].marks.length,0);
 assert.equal(content.safeArticleLink('//evil.example'),false);assert.equal(content.safeArticleLink('https://user:password@evil.example'),false);
});
test('privacy workflow server-derived identity and manual external resolution, direct media deletion blocked',()=>{
 const sql=f('supabase/migrations/20261125012032_ct12_reader_privacy_editorial_guards.sql');
 for(const s of ['reader_account_allowed()','account_id=actor','user_id=actor','reporter_id=actor','voter_id=actor','Independent reviewer required','completed_externally','revoke delete,truncate on public.media_assets','as restrictive for delete','deletionAllowed\',false','guard_byline_ct12','guard_alert_ct12','sync_reader_auth_email'])assert.ok(sql.includes(s),s);
 assert.match(f('app/api/account/auth-callback/route.ts'),/exchangeCodeForSession\(code\)/);
 assert.doesNotMatch(f('app/api/account/auth-callback/route.ts'),/searchParams.get\('next'\)/);
 assert.match(f('components/account/ReaderSecurityForm.tsx'),/auth\.signOut\(\{scope\}\)/);
 assert.match(f('components/account/ReaderSecurityForm.tsx'),/auth\.updateUser\(\{email\}/);
 assert.doesNotMatch(f('lib/services/reader-account.ts'),/SERVICE_ROLE/);
});
