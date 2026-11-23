import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PROPOSED_STAFF_ROLE_GRANTS, proposedRoleGrants,
} from '../lib/permissions/role-presets.ts';
import { STAFF_ROLE_KEYS } from '../lib/permissions/staff-admin-input.ts';
import { resolveEffectivePermission } from '../lib/permissions/capabilities.ts';

const principal = { userId: 'u-verified' };
const time = new Date('2026-11-23T19:00:00Z');
const assigned = { kind: 'story', assignedMembershipIds: ['member-1'] };
const other = { kind: 'story', assignedMembershipIds: ['some-other-member'] };

function access(role, capability, resource) {
  return resolveEffectivePermission(
    principal, {
      id: 'member-1',
      authUserId: principal.userId,
      status: 'active',
      roleGrants: proposedRoleGrants(role),
      overrides: [],
    }, capability, resource, time
  ).allowed;
}

test('all nine proposed built-in roles have finite, unique capability entries', () => {
  assert.deepEqual(Object.keys(PROPOSED_STAFF_ROLE_GRANTS).sort(), [...STAFF_ROLE_KEYS].sort());
  for (const role of STAFF_ROLE_KEYS) {
    const grants = proposedRoleGrants(role);
    assert.ok(grants.length > 0, role);
    assert.equal(new Set(grants.map(g => g.capability)).size, grants.length, role);
    assert.ok(grants.some(g => g.capability === 'newsroom.access'), role);
    for (const g of grants) assert.ok(['all', 'assigned', 'own'].includes(g.scope));
  }
});

test('security admin and reader personal capability are never granted by staff presets', () => {
  for (const grants of Object.values(PROPOSED_STAFF_ROLE_GRANTS)) {
    assert.equal(grants.some(g => g.capability === 'settings.security_admin'), false);
    assert.equal(grants.some(g => g.capability === 'reader.personal'), false);
  }
});

test('only owner can manage team roles and overrides by default', () => {
  assert.equal(access('owner', 'team.manage_roles'), true);
  assert.equal(access('owner', 'team.manage_overrides'), true);
  for (const role of STAFF_ROLE_KEYS.filter(r => r !== 'owner')) {
    assert.equal(access(role, 'team.manage_roles'), false, role);
    assert.equal(access(role, 'team.manage_overrides'), false, role);
  }
});

test('freelancer cannot publish, delete, schedule, assign, create or access team management', () => {
  for (const capability of ['story.publish','revision.publish','story.schedule',
    'story.archive_delete','story.assign','story.create','story.view_all',
    'team.view','homepage.publish']) {
    assert.equal(access('freelancer', capability, assigned), false, capability);
  }
});

test('freelancer may only edit and submit assigned article, not unassigned articles', () => {
  assert.equal(access('freelancer', 'story.view_assigned', assigned), true);
  assert.equal(access('freelancer', 'story.edit_assigned', assigned), true);
  assert.equal(access('freelancer', 'story.submit_review', assigned), true);
  assert.equal(access('freelancer', 'story.edit_assigned', other), false);
  assert.equal(access('freelancer', 'story.view_assigned', other), false);
});

test('ordinary staff writer can create but never publish without a separate grant', () => {
  assert.equal(access('staff_writer', 'story.create'), true);
  assert.equal(access('staff_writer', 'story.publish'), false);
  assert.equal(access('staff_writer', 'revision.publish'), false);
  assert.equal(access('staff_writer', 'story.edit_assigned', assigned), true);
  assert.equal(access('staff_writer', 'story.edit_assigned', other), false);
});

test('specialized team roles do not inherit editorial publishing access', () => {
  for (const role of ['copy_editor','media_editor','moderator','audience_staff']) {
    assert.equal(access(role, 'story.publish'), false, role);
    assert.equal(access(role, 'story.edit_all'), false, role);
    assert.equal(access(role, 'team.manage_roles'), false, role);
  }
});

test('editor and managing editor can publish but not perform owner-only role management', () => {
  for (const role of ['editor','managing_editor']) {
    assert.equal(access(role, 'story.publish'), true);
    assert.equal(access(role, 'revision.publish'), true);
    assert.equal(access(role, 'team.manage_roles'), false);
  }
});

test('a revoked member cannot access newsroom despite proposed role grants', () => {
  const m = {
    id: 'member-1', authUserId: principal.userId, status: 'revoked',
    roleGrants: proposedRoleGrants('owner'), overrides: [],
  };
  assert.equal(resolveEffectivePermission(principal, m, 'newsroom.access', undefined, time).allowed, false);
});

test('Newsroom and targeted story routes use a gated async server authorization path', () => {
  const files = [
    ['app/newsroom/(shell)/layout.tsx', 'mayEnterNewsroom'],
    ['app/api/stories/[id]/route.ts', 'mayEditStory'],
    ['app/api/stories/[id]/revision/route.ts', 'mayEditStory'],
    ['app/api/stories/[id]/revision/publish/route.ts', 'mayPublishRevision'],
  ];
  for (const [filename, check] of files) {
    const code = readFileSync(new URL('../' + filename, import.meta.url), 'utf8');
    assert.match(code, new RegExp('await ' + check + '\\('), filename);
  }
});

test('gated route authorization does not fall back to legacy flags when enabled', () => {
  const code = readFileSync(new URL('../lib/permissions/staff-route-gates.ts', import.meta.url), 'utf8');
  assert.match(code, /CT_STAFF_ACCESS_V2_ENABLED === 'true'/);
  assert.match(code, /resolveStaffPermissionOnServer\('story\.edit_assigned'/);
  assert.match(code, /resolveStaffPermissionOnServer\('story\.publish'/);
  assert.match(code, /resolveStaffPermissionOnServer\('revision\.publish'/);
  assert.match(code, /mayEditStoryControlFields/);
  assert.match(code, /fields\.authorId !== undefined \|\| fields\.editorId !== undefined/);
});
