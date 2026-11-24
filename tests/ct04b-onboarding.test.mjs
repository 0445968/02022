import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const js=ts.transpileModule(file('lib/permissions/staff-onboarding-input.ts'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {validateStaffOnboarding}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const valid={expectedRevision:0,displayName:'  Private Example  ',locale:'es',bylineRequested:true,acknowledgedVersion:1,confirmed:true};
test('CT04b onboarding validates private fields and version',()=>{
  assert.deepEqual(validateStaffOnboarding(valid),{...valid,displayName:'Private Example'});
  for(const patch of [{expectedRevision:-1},{expectedRevision:1.2},{displayName:'x'},
    {displayName:'a\nb'},{displayName:'x'.repeat(121)},{locale:'fr'},{bylineRequested:'true'},
    {confirmed:false},{acknowledgedVersion:2},{authUserId:'forged'},{role:'owner'},{bylineId:'forged'},{isEditor:true}]){
    assert.throws(()=>validateStaffOnboarding({...valid,...patch}));
  }
});
test('CT04b RPC is server-only, bound to verified identity and current newsroom grant',()=>{
  const service=file('lib/services/staff-onboarding.ts');
  for(const s of ["import 'server-only'","CT_STAFF_ONBOARDING_ENABLED","!isDevAuthBypass()",
    'auth.getUser()','newsroom.access','p_actor:actor','p_expected_revision:input.expectedRevision'])
    assert.ok(service.includes(s),s);
  const sql=file('supabase/migrations/20261124154346_ct04b_staff_onboarding.sql');
  assert.match(sql,/alter table public\.staff_onboarding_profiles enable row level security/);
  assert.match(sql,/staff_invite_verified_identity\(p_actor\)/);
  assert.match(sql,/o\.effect='deny'/);
  assert.match(sql,/pg_advisory_xact_lock\(202611,2302\)/);
  assert.doesNotMatch(sql,/security definer|insert into public\.staff_member_roles|update public\.profiles|update public\.editorial_profiles/);
});
test('CT04b first login gate and independent private preference',()=>{
  assert.match(file('.env.example'),/CT_STAFF_ONBOARDING_ENABLED=false/);
  assert.match(file('app/newsroom/(shell)/page.tsx'),/redirect\('\/newsroom\/onboarding'\)/);
  const ui=file('components/editorial/team/StaffOnboardingForm.tsx');
  assert.match(ui,/records a private request preference only/);
  assert.doesNotMatch(ui,/localStorage|sessionStorage|SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(file('app/api/newsroom/onboarding/route.ts'),/readInviteRequest\(request\)/);
});
