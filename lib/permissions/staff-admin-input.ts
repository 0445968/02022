/**
 * CT-02c: narrow, typed admin mutation input validation.
 * The actor ID is deliberately absent: it comes only from auth.getUser().
 */
export const STAFF_ROLE_KEYS = [
  'owner',
  'managing_editor',
  'editor',
  'staff_writer',
  'copy_editor',
  'media_editor',
  'moderator',
  'audience_staff',
  'freelancer',
] as const;

export type StaffRoleKey = (typeof STAFF_ROLE_KEYS)[number];
export type StaffRoleOperation =
  | 'grant_role'
  | 'revoke_role'
  | 'suspend'
  | 'reactivate'
  | 'revoke_membership';

export type StaffRoleChangeRequest = {
  targetMembershipId: string;
  operation: StaffRoleOperation;
  roleKey?: StaffRoleKey | null;
  reason: string;
};

export type ValidatedStaffRoleChange = {
  targetMembershipId: string;
  operation: StaffRoleOperation;
  roleKey: StaffRoleKey | null;
  reason: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIONS: ReadonlySet<string> = new Set([
  'grant_role','revoke_role','suspend','reactivate','revoke_membership',
]);
const ROLES: ReadonlySet<string> = new Set(STAFF_ROLE_KEYS);

export function validateStaffRoleChange(input: unknown): ValidatedStaffRoleChange {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Invalid staff change');
  }

  const obj = input as Record<string, unknown>;
  const target = obj.targetMembershipId;
  const action = obj.operation;
  const reason = obj.reason;
  const role = obj.roleKey ?? null;

  if (typeof target !== 'string' || !UUID_PATTERN.test(target) ||
      typeof action !== 'string' || !ACTIONS.has(action) ||
      typeof reason !== 'string' ||
      reason.trim().length < 12 || reason.length > 500) {
    throw new Error('Invalid staff change');
  }
  if ((action === 'grant_role' || action === 'revoke_role') !== (typeof role === 'string' && ROLES.has(role))) {
    throw new Error('Invalid role for staff action');
  }
  if (action !== 'grant_role' && action !== 'revoke_role' && role !== null) {
    throw new Error('Role not allowed for membership action');
  }
  return {
    targetMembershipId: target,
    operation: action as StaffRoleOperation,
    roleKey: role as StaffRoleKey | null,
    reason: reason.trim(),
  };
}
