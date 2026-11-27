import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const directory=read('lib/services/staff-team-directory.ts');
const getRoute=read('app/api/newsroom/team/route.ts');
const mutation=read('app/api/newsroom/team/role-change/route.ts');
const view=read('components/editorial/team/StaffTeamManager.tsx');
const layout=read('app/newsroom/(shell)/layout.tsx');
const sidebar=read('components/editorial/newsroom-sidebar.tsx');
const page=read('app/newsroom/(shell)/team/page.tsx');

test('staff directory requires real cookie session + current team.view, excludes mock editor access',()=>{
  assert.match(directory,/CT_STAFF_ACCESS_V2_ENABLED!=='true'/);
  assert.match(directory,/isDevAuthBypass\(\)/);
  assert.match(directory,/session\.auth\.getUser\(\)/);
  assert.match(directory,/resolveStaffPermissionOnServer\('team\.view'\)/);
  assert.match(directory,/resolveStaffPermissionOnServer\('team\.manage_roles'\)/);
  assert.match(directory,/resolveStaffPermissionOnServer\('team\.view_audit'\)/);
  assert.match(getRoute,/getStaffTeamAccess\(\)/);
  assert.match(page,/if\(!access\.allowed\)redirect\('\/newsroom\/denied'\)/);
});

test('service-role lookups occur after live authorized viewer check and sanitize rows',()=>{
  const gate=directory.indexOf('if(!access.allowed||!access.userId||!fresh.allowed');
  const service=directory.indexOf('createServiceClient(url,key');
  assert.ok(gate>=0&&service>gate,'Privilege read must occur only after viewer gate');
  assert.match(directory,/SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(directory,/select\('id,auth_user_id,status,member_type,expires_at,created_at'/);
  assert.match(directory,/select\('id,name,display_name,image'\)/);
  assert.match(directory,/image\.origin===new URL\(url\)\.origin/);
  assert.ok(directory.includes('/storage/v1/object/public/'));
  assert.match(directory,/access\.canViewAudit \? \(\(\) =>/);
  assert.match(directory,/db\.from\('staff_access_audit'\)/);
  assert.doesNotMatch(directory,/raw_user_meta_data|\.from\('auth\.users'\)|\.select\('\*'\)/);
  assert.doesNotMatch(getRoute,/SUPABASE_SERVICE_ROLE_KEY|service_role/);
  assert.match(getRoute,/Cache-Control':'private, no-store/);
});

test('role updates require separate mutation flag, same-origin browser request and narrow input',()=>{
  assert.match(directory,/CT_STAFF_ADMIN_MUTATIONS_ENABLED==='true'/);
  assert.match(mutation,/request\.headers\.get\('origin'\)/);
  assert.match(mutation,/origin!==new URL\(request\.url\)\.origin/);
  assert.match(mutation,/validateStaffRoleChange\(input\)/);
  assert.match(mutation,/applyStaffRoleChange\(valid\)/);
  assert.match(mutation,/access\.canManageRoles/);
  assert.match(mutation,/access\.mutationsEnabled/);
  assert.doesNotMatch(mutation,/\.from\('staff_member_roles'\)\.insert|\.from\('staff_memberships'\)\.update/);
  const existing=read('lib/services/staff-role-admin.ts');
  assert.match(existing,/rpc\('staff_apply_role_change'/);
  assert.match(existing,/p_actor_auth_user_id: user\.id/);
  assert.match(existing,/sessionClient\.auth\.getUser\(\)/);
});

test('team navigation disappears when staff v2 flag is off or viewer lacks team.view',()=>{
  const workspace=read('lib/services/newsroom-workspace.ts');
  const policy=read('lib/permissions/workspace-policy.ts');
  assert.match(workspace,/CT_STAFF_ACCESS_V2_ENABLED==='true'/);
  assert.match(workspace,/resolveGlobalStaffPermissionsOnServer\(WORKSPACE_CAPABILITIES\)/);
  assert.match(policy,/const viewTeam=all\('team\.view'\)/);
  assert.match(policy,/if\(viewTeam\)nav\.push\('team'\)/);
  assert.match(layout,/scopedNewsroomEnabled\(\)\?await getWorkspaceAccess\(\):null/);
  assert.match(layout,/const showTeamNav = scoped\?\.viewTeam\?\?false/);
  assert.match(layout,/showTeamNav=\{showTeamNav\}/);
  assert.match(layout,/scopedNav=\{scoped&&reviewInboxEnabled\(\)\?\[\.\.\.scoped\.nav,'reviewInbox'\]:scoped\?\.nav\}/);
  assert.doesNotMatch(layout,/scoped\.nav,'team'/);
  assert.match(sidebar,/item\.key!=='team'\|\|showTeamNav/);
  assert.match(sidebar,/href: '\/newsroom\/team'/);
});

test('team UI distinguishes deployed grants from proposal and prevents self edits',()=>{
  assert.match(view,/configuredGrants/);
  assert.match(view,/proposedRoleGrants\(rolePreview\)/);
  assert.match(view,/data\?\.mutationsEnabled/);
  assert.match(view,/!current\.isSelf/);
  assert.match(view,/reason\.trim\(\)\.length>=12/);
  assert.match(view,/confirmed&&!saving/);
  assert.match(view,/current\.status==='suspended'/);
  assert.match(view,/access change|Access change|Acceso|cambio/i);
  assert.doesNotMatch(view,/user_metadata|service_role|SUPABASE_SERVICE_ROLE_KEY/);
});

test('new management labels available in both language dictionaries',()=>{
  for(const language of ['en','es']){
    const messages=JSON.parse(read('messages/'+language+'.json'));
    assert.ok(typeof messages.newsroom.team==='string'&&messages.newsroom.team.length>2);
  }
  assert.match(view,/es:/);
  assert.match(view,/en:/);
});

test('CT-03a does not create accounts, seed role grants or enable production flags',()=>{
  assert.doesNotMatch(directory,/\.auth\.admin|inviteUserByEmail/);
  assert.doesNotMatch(mutation,/CT_STAFF_ACCESS_V2_ENABLED\s*=\s*'true'/);
  assert.doesNotMatch(view,/fetch\('\/api\/newsroom\/team\/invite/);
  assert.match(directory,/MAX_MEMBERS=100/);
  assert.match(view,/hasMoreMembers/);
});
