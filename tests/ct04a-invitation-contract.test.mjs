import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {INVITABLE_ROLES,normalizeInviteEmail,validateInviteIssue,createInviteToken,
  hashInviteToken,verifyInviteToken,invitePreflightEligible} from '../lib/permissions/staff-invitation-contract.ts';

const now=Date.parse('2026-11-24T04:00:00.000Z');
const issue={email:' Person+staff@Example.com ',roleKey:'freelancer',memberType:'freelancer',
  expectedPresetRevision:2,expiresAt:'2026-11-26T04:00:00.000Z',
  membershipExpiresAt:'2027-02-01T04:00:00.000Z',
  reason:'Approved freelance assignment',confirmed:true};
const auth={id:'aa000000-0000-4000-8000-000000000001',email:'PERSON+staff@example.com',
  emailConfirmedAt:'2026-11-23T04:00:00.000Z',isAnonymous:false};
const fixture=()=>{
  const {token,tokenHash}=createInviteToken();
  const inv=validateInviteIssue(issue,now);
  return {token,invitation:{email:inv.email,roleKey:inv.roleKey,memberType:inv.memberType,
    expiresAt:inv.expiresAt,membershipExpiresAt:inv.membershipExpiresAt,
    presetRevision:inv.expectedPresetRevision,tokenHash,redeemedAt:null,canceledAt:null}};
};
test('CT04a invites only finite existing non-owner newsroom roles',()=>{
  const registry=readFileSync(new URL('../lib/permissions/staff-admin-input.ts',import.meta.url),'utf8');
  const roleList=registry.match(/STAFF_ROLE_KEYS = \[([\s\S]*?)\] as const/)[1];
  const roles=[...roleList.matchAll(/'([^']+)'/g)].map(x=>x[1]).filter(x=>x!=='owner');
  assert.deepEqual([...INVITABLE_ROLES],roles);
  for(const roleKey of ['owner','reader','admin','unknown']){
    assert.throws(()=>validateInviteIssue({...issue,roleKey},now));
  }
});
test('CT04a validates role/member type and fixed scope, not caller-granted permissions',()=>{
  assert.equal(validateInviteIssue(issue,now).email,'person+staff@example.com');
  for(const memberType of ['employee','contractor','unknown',null]){
    assert.throws(()=>validateInviteIssue({...issue,memberType},now));
  }
  assert.throws(()=>validateInviteIssue({...issue,roleKey:'editor'},now));
  assert.throws(()=>validateInviteIssue({...issue,scope:'all'},now));
  assert.throws(()=>validateInviteIssue({...issue,actorId:auth.id},now));
  assert.throws(()=>validateInviteIssue({...issue,bylineId:auth.id},now));
  assert.equal(validateInviteIssue({...issue,roleKey:'editor',memberType:'employee',membershipExpiresAt:null},now).memberType,'employee');
});
test('CT04a email normalization does not fold unrelated aliases',()=>{
  assert.equal(normalizeInviteEmail(' X.Y+foo@Example.com '),'x.y+foo@example.com');
  assert.notEqual(normalizeInviteEmail('x.y@example.com'),normalizeInviteEmail('xy@example.com'));
  assert.notEqual(normalizeInviteEmail('x+foo@example.com'),normalizeInviteEmail('x@example.com'));
  for(const value of ['a..b@x.com','.a@x.com','a.@x.com','a@-x.com','a@x','a@x.com\nBcc: y@x.com','a'.repeat(65)+'@x.com',null]){
    assert.throws(()=>normalizeInviteEmail(value));
  }
});
test('CT04a rejects stale/unapproved preset revisions and non-explicit confirmation',()=>{
  for(const expectedPresetRevision of [0,-1,1.2,NaN,Infinity,'2',2147483648]){
    assert.throws(()=>validateInviteIssue({...issue,expectedPresetRevision},now));
  }
  for(const confirmed of [false,'true',1,null]){
    assert.throws(()=>validateInviteIssue({...issue,confirmed},now));
  }
  for(const reason of ['short',' '.repeat(12),'x'.repeat(501)]){
    assert.throws(()=>validateInviteIssue({...issue,reason},now));
  }
});
test('CT04a validates canonical expiry and finite contract duration',()=>{
  for(const expiresAt of ['2026-11-24T04:00:00.000Z','2026-12-02T04:00:00.000Z',
    '2026-11-25','2026-11-25T04:00:00+00:00','2026-11-31T04:00:00.000Z']){
    assert.throws(()=>validateInviteIssue({...issue,expiresAt},now));
  }
  for(const membershipExpiresAt of [null,issue.expiresAt,'2026-11-25T04:00:00.000Z','2028-01-01T04:00:00.000Z']){
    assert.throws(()=>validateInviteIssue({...issue,membershipExpiresAt},now));
  }
  assert.throws(()=>validateInviteIssue({...issue,roleKey:'editor',memberType:'employee'},now));
});
test('CT04a random 256-bit URL-safe secrets, canonical token digest and invalid hash handling',()=>{
  const generated=Array.from({length:100},()=>createInviteToken());
  assert.equal(new Set(generated.map(x=>x.token)).size,100);
  for(const {token,tokenHash} of generated){
    assert.match(token,/^[A-Za-z0-9_-]{43}$/);
    assert.match(tokenHash,/^[a-f0-9]{64}$/);
    assert.notEqual(token,tokenHash);
    assert.equal(hashInviteToken(token),tokenHash);
    assert.equal(verifyInviteToken(token,tokenHash),true);
    assert.equal(verifyInviteToken(token,createInviteToken().tokenHash),false);
  }
  for(const bad of [null,'','a'.repeat(43),'A'.repeat(42)+'B','A'.repeat(43)+'=']){
    assert.equal(verifyInviteToken(bad,generated[0].tokenHash),false);
  }
  assert.equal(verifyInviteToken(generated[0].token,'Z'.repeat(64)),false);
});
test('CT04a matching verified real identity can pass preflight but mismatched token/email cannot',()=>{
  const {token,invitation}=fixture();
  assert.equal(invitePreflightEligible(token,invitation,auth,2,now),true);
  for(const identity of [{...auth,email:'other@example.com'},{...auth,email:'person@example.com'},
    {...auth,emailConfirmedAt:null},{...auth,emailConfirmedAt:'invalid'},
    {...auth,emailConfirmedAt:'2027-01-01T00:00:00.000Z'},{...auth,isAnonymous:true},
    {...auth,id:'unverified'},{...auth,email:null}]){
    assert.equal(invitePreflightEligible(token,invitation,identity,2,now),false);
  }
  assert.equal(invitePreflightEligible(createInviteToken().token,invitation,auth,2,now),false);
});
test('CT04a preflight refuses redeemed/canceled/expired invites, preset changes and invalid membership types',()=>{
  const {token,invitation}=fixture();
  for(const bad of [{...invitation,redeemedAt:issue.expiresAt},{...invitation,canceledAt:issue.expiresAt},
    {...invitation,expiresAt:new Date(now).toISOString()},{...invitation,presetRevision:0},
    {...invitation,membershipExpiresAt:issue.expiresAt},{...invitation,roleKey:'owner'},
    {...invitation,memberType:'employee'}]){
    assert.equal(invitePreflightEligible(token,bad,auth,2,now),false);
  }
  assert.equal(invitePreflightEligible(token,invitation,auth,3,now),false);
  assert.equal(invitePreflightEligible(token,invitation,auth,2,Date.parse(issue.expiresAt)),false);
});
test('CT04a contract contains no runtime Auth, database write, mail delivery or permission activation',()=>{
  const source=readFileSync(new URL('../lib/permissions/staff-invitation-contract.ts',import.meta.url),'utf8');
  assert.match(source,/from 'node:crypto'/);
  assert.doesNotMatch(source,/\.rpc\(|db\.from\(|inviteUserByEmail\(|signUp\(|fetch\(|SUPABASE_SERVICE_ROLE_KEY/);
});
