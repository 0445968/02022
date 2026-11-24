import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  validateOverrideChange,canOverrideCapability,OVERRIDE_BLOCKED_CAPABILITIES
} from '../lib/permissions/staff-override-input.ts';
import {resolveEffectivePermission} from '../lib/permissions/capabilities.ts';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const member='10000000-0000-0000-0000-000000000002';
const now=Date.UTC(2026,10,24,12,0,0);
const date=days=>new Date(now+days*86400000).toISOString();
const normal={
  targetMembershipId:member,operation:'set',capability:'story.publish',
  scope:'all',effect:'allow',expiresAt:date(7),
  reason:'Reviewed exceptional publisher assignment'
};

test('override validator requires restricted IDs, meaningful reason and typed scope',()=>{
 const r=validateOverrideChange({...normal,actorAuthUserId:'forged',role:'owner'},now);
 assert.equal(r.targetMembershipId,member);
 assert.equal(r.reason,normal.reason);
 assert.equal('actorAuthUserId' in r,false);
 for(const patch of [
   {targetMembershipId:'other'},{scope:'everywhere'},{capability:'unknown.cap'},
   {effect:'maybe'},{reason:'short'},{reason:'x'.repeat(501)},
   {expiresAt:null},{expiresAt:date(91)}, {expiresAt:date(-1)},
 ]){
   assert.throws(()=>validateOverrideChange({...normal,...patch},now));
 }
 assert.equal(validateOverrideChange({...normal,effect:'deny',expiresAt:null},now).expiresAt,null);
});
test('no team, security, newsroom-entry, or personal reader access overrides',()=>{
 for(const cap of OVERRIDE_BLOCKED_CAPABILITIES){
   assert.equal(canOverrideCapability(cap),false,cap);
   assert.throws(()=>validateOverrideChange({...normal,capability:cap},now),cap);
 }
 assert.equal(canOverrideCapability('story.edit_assigned'),true);
 assert.equal(canOverrideCapability('media.approve'),true);
});
test('only time-boxed allow, bounded deny and exact removal accepted',()=>{
 assert.equal(validateOverrideChange({...normal,operation:'remove',effect:null,expiresAt:null},now).effect,null);
 assert.throws(()=>validateOverrideChange({...normal,operation:'remove'},now));
 assert.throws(()=>validateOverrideChange({...normal,operation:'remove',effect:null,expiresAt:date(1)},now));
 assert.equal(validateOverrideChange({...normal,effect:'deny',expiresAt:date(200)},now).effect,'deny');
 assert.throws(()=>validateOverrideChange({...normal,effect:'deny',expiresAt:date(366)},now));
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
 assert.match(api,/return \^\[0-9\]/);
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
