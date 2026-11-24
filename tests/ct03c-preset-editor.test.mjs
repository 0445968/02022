import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const sql=file('supabase/migrations/20261124034804_ct03c_role_grant_editor.sql');
const validator=file('lib/permissions/staff-preset-input.ts');
const service=file('lib/services/staff-preset-admin.ts');
const api=file('app/api/newsroom/team/preset-change/route.ts');
const panel=file('components/editorial/team/RolePresetMatrixEditor.tsx');

test('role capability SQL never seeds owner, grants, roles or real users',()=>{
  assert.match(sql,/alter table public\.staff_role_presets/);
  assert.match(sql,/grant_revision integer not null default 0/);
  assert.doesNotMatch(sql,/insert into public\.staff_role_capabilities.*values/i);
  assert.doesNotMatch(sql,/insert into public\.staff_memberships.*values/i);
  assert.doesNotMatch(sql,/security definer/i);
});
test('editable templates enforce role ceilings and prohibit protected privileges',()=>{
  assert.match(sql,/v_cap like 'team\.\%'/);
  for(const token of ["'settings.security_admin'","'reader.personal'",
    "'byline.manage'","p_role='owner'","'freelancer'","'story.view_assigned'","p_scope='assigned'"])
    assert.ok(sql.includes(token),token);
  assert.match(sql,/public\.staff_preset_grant_allowed/);
  assert.match(sql,/staff_guard_preset_grant/);
  assert.match(sql,/staff_guard_preset_revision/);
});
test('preset save is versioned, atomic and audited by current verified owner',()=>{
  assert.match(sql,/staff_save_preset_grants\(/);
  assert.match(sql,/security invoker set search_path=''/);
  assert.match(sql,/pg_advisory_xact_lock\(202611,2302\)/);
  assert.match(sql,/m\.status='active' and m\.expires_at is null/);
  assert.match(sql,/p\.role_key='owner'/);
  assert.match(sql,/p_expected_revision/);
  assert.match(sql,/v_revision<>p_expected_revision/);
  assert.match(sql,/errcode='40001'/);
  assert.match(sql,/set_config\('app\.staff_request_id'/);
  assert.match(sql,/set_config\('app\.staff_reason'/);
  assert.match(sql,/set grant_revision=grant_revision\+1/);
  assert.match(sql,/on conflict/i);
  assert.match(sql,/No permission change to save/);
});
test('no arbitrary direct RPC from reader or anon can edit role grants',()=>{
  assert.match(sql,/revoke all on function public\.staff_save_preset_grants\(/);
  assert.match(sql,/from public,anon,authenticated/);
  assert.match(sql,/to service_role/);
  assert.match(sql,/ct03c_preset_grant_guard/);
  assert.match(sql,/ct03c_preset_revision_guard/);
});
test('validated input excludes owner, duplicate grants and unapproved scopes',()=>{
  assert.match(validator,/roleKey==='owner'/);
  assert.match(validator,/editablePresetCapabilities\(role\)/);
  assert.match(validator,/Object\.keys\(object\)/);
  assert.match(validator,/seen\.has\(object\.capability\)/);
  assert.match(validator,/allowed\.get\(object\.capability\)!==object\.scope/);
  assert.match(validator,/confirmed!==true/);
  assert.match(validator,/reason\.trim\(\)\.length<12/);
});
test('mutation service requires THREE disabled-by-default flags plus live Auth and DB',()=>{
  for(const flag of [
    'CT_STAFF_ACCESS_V2_ENABLED','CT_STAFF_ADMIN_MUTATIONS_ENABLED',
    'CT_STAFF_PRESET_MUTATIONS_ENABLED'
  ])assert.ok(service.includes(flag),flag);
  assert.match(service,/session\.auth\.getUser\(\)/);
  assert.match(service,/getStaffTeamAccess\(\)/);
  assert.match(service,/access\.canManageRoles/);
  assert.match(service,/p_actor_auth_user_id:user\.id/);
  assert.match(service,/rpc\('staff_save_preset_grants'/);
  assert.match(service,/error\.code==='40001'/);
  assert.doesNotMatch(api,/SUPABASE_SERVICE_ROLE_KEY|service_role/);
});
test('preset change request enforces same origin, JSON, size, revision and conflict',()=>{
  assert.match(api,/origin!==new URL\(request\.url\)\.origin/);
  assert.match(api,/length>8192/);
  assert.match(api,/validatePresetGrantChange\(raw\)/);
  assert.match(api,/applyStaffPresetGrantChange\(input\)/);
  assert.match(api,/status:result\.code==='conflict'\?409/);
  assert.match(api,/Cache-Control':'no-store'/);
});
test('bilingual editor is explicit review-only and owner role is immutable',()=>{
  const page=file('components/editorial/team/StaffTeamManager.tsx');
  assert.match(page,/data\.presetMutationsEnabled/);
  assert.match(page,/selectedRole\.key!=='owner'/);
  assert.match(panel,/preset\.key==='owner'/);
  assert.match(panel,/role="alert"/);
  assert.match(panel,/role="status"/);
  assert.match(panel,/expectedRevision:preset\.grantRevision/);
  assert.match(panel,/confirmed:true/);
  assert.match(panel,/reason\.trim\(\)\.length>=12/);
  assert.match(panel,/stale/);
  assert.match(panel,/preset-change/);
  assert.match(panel,/locale==='es'/);
  assert.doesNotMatch(panel,/SUPABASE_SERVICE_ROLE_KEY|user_metadata/);
});
test('DB actual configured grants have revision, proposed permissions still independent',()=>{
  const dir=file('lib/services/staff-team-directory.ts');
  const types=file('lib/permissions/staff-team-types.ts');
  assert.match(dir,/name_en,name_es,is_builtin,grant_revision/);
  assert.match(dir,/grantRevision:/);
  assert.match(dir,/presetMutationsEnabled:/);
  assert.match(types,/grantRevision:number/);
  assert.match(types,/presetMutationsEnabled:boolean/);
  assert.match(file('.env.example'),/CT_STAFF_PRESET_MUTATIONS_ENABLED=false/);
});
