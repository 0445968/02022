import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CAPABILITY_KEYS,
  hasEffectivePermission,
  isCapability,
  resolveEffectivePermission,
} from '../lib/permissions/capabilities.ts';

const now = new Date('2026-11-23T20:00:00Z');
const principal = { userId: 'verified-account' };
const grant = (capability, scope = 'all', expiresAt) => ({ capability, scope, expiresAt });
const membership = (options = {}) => ({
  id: 'membership-123',
  authUserId: principal.userId,
  status: 'active',
  roleGrants: [],
  overrides: [],
  ...options,
});
const assignedStory = { kind: 'story', assignedMembershipIds: ['membership-123'] };
const otherStory = { kind: 'story', assignedMembershipIds: ['someone-else'] };

test('capability registry is finite and uniquely named', () => {
  assert.ok(CAPABILITY_KEYS.length > 40);
  assert.equal(new Set(CAPABILITY_KEYS).size, CAPABILITY_KEYS.length);
  assert.equal(isCapability('story.publish'), true);
  assert.equal(isCapability('evil.admin'), false);
});

test('anonymous users and unknown capabilities fail closed', () => {
  const m = membership({ roleGrants: [grant('newsroom.access')] });
  assert.equal(hasEffectivePermission(null, m, 'newsroom.access', undefined, now), false);
  assert.equal(hasEffectivePermission(principal, m, 'unknown.power', undefined, now), false);
  assert.equal(resolveEffectivePermission(null, m, 'story.publish', undefined, now).reason, 'unauthenticated');
});

test('ordinary reader cannot access newsroom without a current membership', () => {
  assert.equal(resolveEffectivePermission(principal, null, 'newsroom.access', undefined, now).reason, 'no_membership');
});

test('membership must match Supabase verified identity, never user-supplied metadata', () => {
  const forged = { ...principal, user_metadata: { role: 'owner', is_editor: true } };
  const m = membership({ authUserId: 'another-account', roleGrants: [grant('story.publish')] });
  assert.equal(hasEffectivePermission(forged, m, 'story.publish', undefined, now), false);
});

test('suspended, revoked and invited accounts lose access immediately', () => {
  for (const status of ['suspended', 'revoked', 'invited']) {
    const m = membership({ status, roleGrants: [grant('story.publish')] });
    assert.equal(resolveEffectivePermission(principal, m, 'story.publish', undefined, now).reason, 'membership_inactive');
  }
});

test('expiration and invalid dates fail closed', () => {
  for (const expiresAt of ['2026-11-23T19:59:59Z', 'garbage-date']) {
    const m = membership({ expiresAt, roleGrants: [grant('story.publish')] });
    assert.equal(hasEffectivePermission(principal, m, 'story.publish', undefined, now), false);
  }
});

test('unexpired role grants permit only their named capability', () => {
  const m = membership({ roleGrants: [grant('story.create'), grant('newsroom.access')] });
  assert.equal(hasEffectivePermission(principal, m, 'story.create', undefined, now), true);
  assert.equal(hasEffectivePermission(principal, m, 'newsroom.access', undefined, now), true);
  assert.equal(hasEffectivePermission(principal, m, 'story.publish', undefined, now), false);
});

test('freelancer assigned-only permission never discloses unassigned stories', () => {
  const m = membership({ roleGrants: [grant('story.view_assigned', 'assigned'), grant('story.edit_assigned', 'assigned')] });
  assert.equal(hasEffectivePermission(principal, m, 'story.view_assigned', assignedStory, now), true);
  assert.equal(hasEffectivePermission(principal, m, 'story.edit_assigned', otherStory, now), false);
  assert.equal(hasEffectivePermission(principal, m, 'story.view_assigned', undefined, now), false);
  assert.equal(hasEffectivePermission(principal, m, 'story.publish', assignedStory, now), false);
});

test('assigned-only action cannot be elevated even by a broad all-scope grant', () => {
  const m = membership({ roleGrants: [grant('story.edit_assigned', 'all')] });
  assert.equal(hasEffectivePermission(principal, m, 'story.edit_assigned', otherStory, now), false);
});

test('own media permission requires a real matching ownership relationship', () => {
  const m = membership({ roleGrants: [grant('media.edit_own', 'own')] });
  assert.equal(hasEffectivePermission(principal, m, 'media.edit_own',
    { kind: 'media', ownerMembershipId: 'membership-123' }, now), true);
  assert.equal(hasEffectivePermission(principal, m, 'media.edit_own',
    { kind: 'media', ownerMembershipId: 'another-member' }, now), false);
});

test('explicit deny takes precedence over role grants and explicit allow', () => {
  const m = membership({
    roleGrants: [grant('story.publish')],
    overrides: [
      { ...grant('story.publish'), effect: 'allow' },
      { ...grant('story.publish'), effect: 'deny' },
    ],
  });
  assert.equal(resolveEffectivePermission(principal, m, 'story.publish', undefined, now).reason, 'explicit_deny');
});

test('allow override can grant an ordinary named capability within its scope', () => {
  const m = membership({
    overrides: [{ ...grant('media.upload', 'assigned'), effect: 'allow' }],
  });
  assert.equal(hasEffectivePermission(principal, m, 'media.upload', otherStory, now), false);
  assert.equal(hasEffectivePermission(principal, m, 'media.upload', assignedStory, now), true);
});

test('expired grants/overrides never confer capability or impose stale deny', () => {
  const expired = '2026-11-22T00:00:00Z';
  const m = membership({
    roleGrants: [grant('story.create')],
    overrides: [{ ...grant('story.create', 'all', expired), effect: 'deny' }],
  });
  assert.equal(hasEffectivePermission(principal, m, 'story.create', undefined, now), true);
  assert.equal(hasEffectivePermission(principal, membership({
    roleGrants: [grant('story.create', 'all', expired)],
  }), 'story.create', undefined, now), false);
});

test('owner security administration is reserved even for fabricated role grants/overrides', () => {
  const m = membership({
    roleGrants: [grant('settings.security_admin')],
    overrides: [{ ...grant('settings.security_admin'), effect: 'allow' }],
  });
  assert.equal(resolveEffectivePermission(principal, m, 'settings.security_admin', undefined, now).reason, 'reserved_capability');
});

test('reader.personal requires same authenticated owner and no staff membership', () => {
  const mine = { kind: 'reader', ownerAuthUserId: principal.userId };
  const theirs = { kind: 'reader', ownerAuthUserId: 'someone-else' };
  assert.equal(hasEffectivePermission(principal, null, 'reader.personal', mine, now), true);
  assert.equal(hasEffectivePermission(principal, null, 'reader.personal', theirs, now), false);
  assert.equal(hasEffectivePermission(null, null, 'reader.personal', mine, now), false);
});

test('there are no role grants derived from JWT/user_metadata or user-editable profiles', () => {
  const source = readFileSync(new URL('../lib/permissions/capabilities.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /auth\.jwt\(|raw_user_meta_data|profile\.is_editor|profile\.is_author/);
  assert.match(source, /server\/database/);
});
