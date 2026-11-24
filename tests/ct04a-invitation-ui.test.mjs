import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const contract=file('lib/permissions/staff-invite-http.ts');
const base=file('lib/permissions/staff-invitation-contract.ts');
const baseJs=ts.transpileModule(base,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const baseUrl='data:text/javascript;base64,'+Buffer.from(baseJs).toString('base64');
const js=ts.transpileModule(contract,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace("'./staff-invitation-contract'",JSON.stringify(baseUrl)).replace('"./staff-invitation-contract"',JSON.stringify(baseUrl));
const {validateInviteCommand,readInviteRequest,INVITE_BODY_LIMIT}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const url='https://example.test/api/newsroom/team/invitations';
const headers={'origin':'https://example.test','content-type':'application/json'};
const request=(body,more={})=>new Request(url,{method:'POST',headers:{...headers,...more},body});
test('CT04a3 rejects cross-origin, missing origin, wrong content type, malformed and oversized body',async()=>{
  for(const [req,status] of [[request('{}',{origin:'https://evil.test'}),403],
    [new Request(url,{method:'POST',body:'{}'}),403],[request('{}',{'content-type':'text/plain'}),415],
    [request('{'),400],[request('{}',{'content-length':'9000'}),413],[request('x'.repeat(INVITE_BODY_LIMIT+1)),413]]){
    await assert.rejects(()=>readInviteRequest(req),e=>e.status===status);
  }
  assert.deepEqual(await readInviteRequest(request('{"action":"redeem"}')),{action:'redeem'});
});
test('CT04a3 streamed bodies cannot bypass actual byte limit',async()=>{
  const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(3000));c.enqueue(new Uint8Array(2000));c.close();}});
  const req=new Request(url,{method:'POST',headers,body:stream,duplex:'half'});
  await assert.rejects(()=>readInviteRequest(req),e=>e.status===413);
});
test('CT04a3 strict commands reject forged identity, arbitrary fields and malformed replacement',()=>{
  const token=Buffer.alloc(32,1).toString('base64url');
  const valid=validateInviteCommand({action:'redeem',token});
  assert.equal(valid.action,'redeem');assert.match(valid.tokenHash,/^[0-9a-f]{64}$/);
  assert.equal('token' in valid,false);
  for(const payload of [{action:'redeem',token,actorId:'forged'},{action:'redeem',token,role:'owner'},
    {action:'redeem',token:'wrong'},{action:'cancel',id:'bad',reason:'valid long reason',confirmed:true},
    {action:'replace',input:{},replaceId:'invalid'},{action:'list'}]){
    assert.throws(()=>validateInviteCommand(payload));
  }
});
test('CT04a3 protected server uses fresh Auth, independent owner RPC and verified reader redemption',()=>{
  const source=file('lib/services/staff-invitations.ts');
  assert.match(source,/import 'server-only'/);
  for(const term of ['CT_STAFF_ACCESS_V2_ENABLED','CT_STAFF_ADMIN_MUTATIONS_ENABLED','CT_STAFF_INVITATIONS_ENABLED','!isDevAuthBypass()','auth.getUser()','team.invite','staff_invite_owner_allowed','staff_redeem_invitation','p_verified_auth_user_id:user.id','p_token_hash:command.tokenHash'])assert.ok(source.includes(term),term);
  assert.match(source,/if\(command.action==='redeem'\)/);
  assert.match(file('.env.example'),/CT_STAFF_INVITATIONS_ENABLED=false/);
  assert.doesNotMatch(source,/inviteUserByEmail|console\.|user_metadata/);
});
test('CT04a3 UI code stays in memory and POST, manual delivery only, no plaintext URL',()=>{
  const panel=file('components/editorial/team/StaffInvitationManager.tsx');
  const redeem=file('components/forms/staff-invite-redeem-form.tsx');
  for(const text of [panel,redeem]){
    assert.doesNotMatch(text,/localStorage|sessionStorage|SUPABASE_SERVICE_ROLE_KEY|console\./);
    assert.match(text,/method:'POST'/);
  }
  assert.match(panel,/setCode\(''\)/);
  assert.match(panel,/result.delivery==='manual'/);
  assert.match(panel,/grantRevision===selectedRevision/);
  assert.match(redeem,/JSON.stringify\(\{action:'redeem',token:token.trim\(\)\}\)/);
  assert.match(file('app/api/newsroom/team/invitations/route.ts'),/no-store, private/);
  assert.match(file('app/[locale]/staff-invite/page.tsx'),/no-referrer/);
});
