import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  canAccessNewsroom,
  canCreateStories,
  canManageAllEditorialContent,
} from '../lib/permissions/index.ts';

const user = (isAuthor, isEditor) => ({
  id: 'fixture',
  email: null,
  profile: { isAuthor, isEditor },
});

test('signed-out users and ordinary readers are denied newsroom/staff actions', () => {
  for (const value of [null, user(false, false)]) {
    assert.equal(canAccessNewsroom(value), false);
    assert.equal(canCreateStories(value), false);
    assert.equal(canManageAllEditorialContent(value), false);
  }
});

test('legacy author/editor access is retained without privilege elevation', () => {
  assert.equal(canAccessNewsroom(user(true, false)), true);
  assert.equal(canCreateStories(user(true, false)), true);
  assert.equal(canManageAllEditorialContent(user(true, false)), false);
  assert.equal(canAccessNewsroom(user(false, true)), true);
  assert.equal(canManageAllEditorialContent(user(false, true)), true);
});

test('newsroom layout enforces authentication and authorization server-side', () => {
  const layout = readFileSync(new URL('../app/newsroom/(shell)/layout.tsx', import.meta.url), 'utf8');
  assert.match(layout, /await getCurrentUser\(\)/);
  assert.match(layout, /if \(!user\)/);
  assert.match(layout, /const scoped=scopedNewsroomEnabled\(\)\?await getWorkspaceAccess\(\):null/);
  assert.match(layout, /if\(scoped\?!scoped\.allowed:!\(await mayEnterNewsroom\(user\)\)\)/);
  assert.match(layout, /redirect\('\/newsroom\/denied'\)/);
  const workspace=readFileSync(new URL('../lib/services/newsroom-workspace.ts',import.meta.url),'utf8');
  const policy=readFileSync(new URL('../lib/permissions/workspace-policy.ts',import.meta.url),'utf8');
  assert.match(workspace,/resolveGlobalStaffPermissionsOnServer\(WORKSPACE_CAPABILITIES\)/);
  assert.match(policy,/const allowed=grants\.has\('newsroom\.access'\)/);
  const gates = readFileSync(new URL('../lib/permissions/staff-route-gates.ts', import.meta.url), 'utf8');
  // Existing author/editor access is preserved ONLY while the feature is off.
  // Once enabled, the new gate must query current server permissions.
  assert.match(gates, /if \(!v2Enabled\(\)\) return canAccessNewsroom\(user\)/);
  assert.match(gates, /resolveStaffPermissionOnServer\('newsroom\.access'\)/);
});

test('CI never sets DEV_AUTH_BYPASS=true', () => {
  const ci = readFileSync(new URL('../.github/workflows/clear-talks-checks.yml', import.meta.url), 'utf8');
  assert.match(ci, /DEV_AUTH_BYPASS: 'false'/);
  assert.doesNotMatch(ci, /DEV_AUTH_BYPASS: ['"]?true/);
});
