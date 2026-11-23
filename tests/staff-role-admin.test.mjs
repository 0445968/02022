import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateStaffRoleChange, STAFF_ROLE_KEYS } from '../lib/permissions/staff-admin-input.ts';

const a = '20000000-0000-4000-8000-000000000001';
const good = { targetMembershipId: a, operation: 'grant_role', roleKey: 'editor', reason: 'Approved by site owner for CT-02 rollout' };
const valid = (candidate) => validateStaffRoleChange(candidate);

test('complete role mutation is normalized but never accepts caller-defined actor ID', () => {
  const value = valid({ ...good, actorId: 'forged-owner' });
  assert.equal(value.targetMembershipId, a);
  assert.equal(value.reason, good.reason);
  assert.equal('actorId' in value, false);
});

test('finite approved builtin role keys and operations', () => {
  assert.equal(new Set(STAFF_ROLE_KEYS).size, STAFF_ROLE_KEYS.length);
  for (const action of ['grant_role', 'revoke_role']) {
    for (const role of STAFF_ROLE_KEYS) {
      assert.equal(valid({ ...good, operation: action, roleKey: role }).roleKey, role);
    }
  }
  assert.throws(() => valid({ ...good, roleKey: 'untrusted_super_admin' }));
  assert.throws(() => valid({ ...good, operation: 'delete_everyone' }));
});

test('role cannot be submitted for a membership status change', () => {
  for (const operation of ['suspend','reactivate','revoke_membership']) {
    assert.equal(valid({ ...good, operation, roleKey: null }).roleKey, null);
    assert.throws(() => valid({ ...good, operation }));
  }
});

test('bad UUID and missing/short or oversized audit reasons fail closed', () => {
  assert.throws(() => valid({ ...good, targetMembershipId: '1' }));
  assert.throws(() => valid({ ...good, reason: 'too short' }));
  assert.throws(() => valid({ ...good, reason: 'x'.repeat(501) }));
  assert.throws(() => valid({ ...good, reason: '' }));
  assert.throws(() => valid(null));
});

test('server adapter requires two independent release gates and session auth', () => {
  const source = readFileSync(new URL('../lib/services/staff-role-admin.ts', import.meta.url), 'utf8');
  assert.match(source, /CT_STAFF_ACCESS_V2_ENABLED !== 'true'/);
  assert.match(source, /CT_STAFF_ADMIN_MUTATIONS_ENABLED !== 'true'/);
  assert.match(source, /sessionClient\.auth\.getUser\(\)/);
  assert.match(source, /resolveStaffPermissionOnServer\('team\.manage_roles'\)/);
  assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(source, /p_actor_auth_user_id: user\.id/);
  assert.doesNotMatch(source, /user\.user_metadata|isDevAuthBypass\(|NEXT_PUBLIC_SUPABASE_SERVICE_ROLE/);
});

test('staged migration is service-role-only and does not use SECURITY DEFINER', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20261123230955_ct02c_owner_guard_and_audit.sql', import.meta.url), 'utf8');
  assert.match(sql, /security invoker/g);
  assert.doesNotMatch(sql, /security definer/i);
  assert.match(sql, /revoke all on function public\.staff_apply_role_change[\s\S]*from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.staff_apply_role_change[\s\S]*to service_role/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /Cannot revoke or move the last active owner role/);
  assert.match(sql, /Cannot remove or deactivate the last active owner/);
  assert.match(sql, /create trigger staff_member_roles_audit/);
  assert.match(sql, /create trigger staff_memberships_audit/);
  assert.doesNotMatch(sql, /insert into public\.staff_memberships|insert into public\.staff_role_capabilities/i);
});
