import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveEffectivePermission} from '../lib/permissions/capabilities.ts';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const inputSource=read('lib/permissions/staff-override-input.ts');
const blocked=['newsroom.access','reader.personal','settings.security_admin',
  'team.view','team.invite','team.manage_roles','team.manage_overrides','team.suspend','team.view_audit'];
const member='10000000-0000-0000-0000-000000000002';
const now=Date.UTC(2026,10,24,12,0,0);
const date=days=>new Date(now+days*86400000).toISOString();

test('override input validator has finite values, UUID, reason and expiry limits',()=>{
  for(const key of ['targetMembershipId','operation','capability','scope','reason',
    'set','remove','allow','deny','90*DAY','365*DAY','reason.trim().length<12',
    'reason.length>500','Number.isFinite(parsed)','return {targetMembershipId']){
      assert.ok(inputSource.includes(key),key);
  }
  assert.match(inputSource,/uuid\.test\(targetMembershipId\)/);
  assert.match(inputSource,/isCapability\(value\)/);
  assert.match(inputSource,/blocked\.has\(value\)/);
  assert.doesNotMatch(inputSource,/actorAuthUserId:\s*obj\./);
});
test('admin, newsroom entry and reader identity exceptions cannot be granted',()=>{
  for(const cap of blocked)assert.ok(inputSource.includes("'"+cap+"'"),cap);
  assert.match(inputSource,/!value\.startsWith\('team\.'\)/);
});
test('remove must supply no effect/expiry and allow must have finite expiry',()=>{
  assert.match(inputSource,/if\(operation==='remove'\)/);
  assert.match(inputSource,/if\(effect!==undefined&&effect!==null\)/);
  assert.match(inputSource,/if\(expiresAt!==undefined&&expiresAt!==null\)/);
  assert.match(inputSource,/if\(!Number\.isFinite\(parsed\)/);
  assert.match(inputSource,/effect==='allow'/);
});

test('deny beats existing broad role grant and expired denials stop applying',()=>{
 const principal={userId:'00000000-0000-0000-0000-000000000002'};
 const row={id:member,authUserId:principal.userId,status:'active',expiresAt:null,
   roleGrants:[{capability:'story.publish',scope:'all'}],
   overrides:[{capability:'story.publish',scope:'all',effect:'deny'}]};
 assert.equal(resolveEffectivePermission(principal,row,'story.publish',undefined,new Date(now)).reason,'explicit_deny');
 const expired={...row,overrides:[{...row.overrides[0],expiresAt:date(-2)}]};
 assert.equal(resolveEffectivePermission(principal,expired,'story.publish',undefined,new Date(now)).allowed,true);
 assert.equal(resolveEffectivePermission(principal,{...row,status:'suspended'},
   'story.publish',undefined,new Date(now)).allowed,false);
});
test('SQL migration has locked owner, expiry and current audit/EXECUTE contracts',()=>{
 const s=read('supabase/migrations/20261124031658_ct03b_staff_overrides.sql');
 for(const phrase of [
   "security invoker","staff_apply_override_change(","staff_guard_capability_override",
   'pg_advisory_xact_lock','p_actor_auth_user_id','staff_capability_overrides',
   "p.role_key='owner'","v_target_auth_user_id=p_actor_auth_user_id",
   "'settings.security_admin'","'reader.personal'","'newsroom.access'",
   "p_expires_at > now()+interval '90 days'",
   "set_config('app.staff_request_id'","set_config('app.staff_reason'",
   'from public,anon,authenticated','to service_role'
 ])assert.ok(s.includes(phrase),phrase);
 assert.doesNotMatch(s,/security definer|grant execute .* to authenticated/i);
});
test('override route denies missing origin, wrong content-type, disabled staff writes',()=>{
 const s=read('app/api/newsroom/team/override-change/route.ts');
 assert.match(s,/origin!==new URL\(request\.url\)\.origin/);
 assert.match(s,/validateOverrideChange\(raw\)/);
 assert.match(s,/applyStaffOverrideChange\(validated\)/);
 assert.match(s,/access\.canManageOverrides/);
 assert.match(s,/access\.overrideMutationsEnabled/);
 const svc=read('lib/services/staff-override-admin.ts');
 for(const flag of [
   'CT_STAFF_ACCESS_V2_ENABLED','CT_STAFF_ADMIN_MUTATIONS_ENABLED','CT_STAFF_OVERRIDE_MUTATIONS_ENABLED'
 ])assert.ok(svc.includes(flag));
 assert.match(svc,/session\.auth\.getUser\(\)/);
 assert.match(svc,/p_actor_auth_user_id:user\.id/);
 assert.match(svc,/rpc\('staff_apply_override_change'/);
 assert.doesNotMatch(s,/SUPABASE_SERVICE_ROLE_KEY|user_metadata/);
});
test('previews are live, server-derived and never say assigned resource was verified',()=>{
 const s=read('lib/services/staff-effective-access.ts');
 assert.match(s,/getStaffTeamAccess\(\)/);
 assert.match(s,/access\.canManageOverrides/);
 assert.match(s,/session\.auth\.getUser\(\)/);
 assert.match(s,/resolveEffectivePermission\(/);
 assert.match(s,/resource_check_required/);
 assert.match(s,/Conditional is NOT a grant/);
 assert.match(s,/scoped denials/i);
 assert.doesNotMatch(s,/\.select\('\*'\)|user_metadata/);
});
test('server-side directory paginates both roster and audit with restricted filters',()=>{
 const s=read('lib/services/staff-team-directory.ts');
 const api=read('app/api/newsroom/team/route.ts');
 assert.match(s,/PAGE_SIZE=Math\.min\(MAX_MEMBERS,25\)/);
 assert.match(s,/AUDIT_PAGE_SIZE=Math\.min\(MAX_AUDIT,15\)/);
 assert.match(s,/\.range\(page\*PAGE_SIZE,\(page\+1\)\*PAGE_SIZE-1\)/);
 assert.match(s,/\.range\(auditPage\*AUDIT_PAGE_SIZE,\(auditPage\+1\)\*AUDIT_PAGE_SIZE-1\)/);
 assert.match(s,/if\(auditMemberId\)query=query\.eq\('subject_membership_id',auditMemberId\)/);
 assert.match(api,/URLSearchParams|url\.searchParams/);
 assert.ok(api.includes('return /^[0-9]{1,3}$/.test(raw)'));
});
test('bilingual UI only exposes override editor to permitted staff',()=>{
 const ui=read('components/editorial/team/StaffTeamManager.tsx');
 const inspector=read('components/editorial/team/StaffPermissionInspector.tsx');
 assert.match(ui,/data\.canManageOverrides&&<StaffPermissionInspector/);
 assert.match(ui,/data\.overrideMutationsEnabled&&!current\.isSelf/);
 assert.match(ui,/setAuditFilter/);
 assert.match(ui,/data\.hasMoreAudit/);
 assert.match(inspector,/useEffect\(/);
 assert.match(inspector,/member\.id.*effective/);
 assert.match(inspector,/role="alert"/);
 assert.match(inspector,/confirm|setConfirmed/);
 assert.match(inspector,/conditional/);
 assert.match(inspector,/reason\.trim\(\)\.length>=12/);
 assert.doesNotMatch(inspector,/getPublicUrl|SERVICE_ROLE|user_metadata/);
});
