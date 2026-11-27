/**
 * CT-02a: pure, deny-first capability decision contract.
 *
 * IMPORTANT: this is NOT a source of DB permissions or identity. The caller
 * must load the principal from Supabase Auth and the membership, grants and
 * resource assignments from the server/database on each privileged request.
 * This module does NOT grant staff access until CT-02b RLS/server integration.
 * Never deserialize client-supplied permission snapshots to call this policy.
 */

export const CAPABILITY_KEYS = [
  'newsroom.access',
  'story.view_all',
  'story.view_assigned',
  'story.create',
  'story.edit_all',
  'story.edit_assigned',
  'story.submit_review',
  'story.review',
  'story.publish',
  'story.schedule',
  'story.archive_delete',
  'story.assign',
  'revision.view',
  'revision.edit_assigned',
  'revision.publish',
  'revision.discard',
  'media.view_all',
  'media.upload',
  'media.edit_own',
  'media.edit_all',
  'media.approve',
  'media.delete',
  'byline.view',
  'byline.manage',
  'homepage.view_editor',
  'homepage.edit',
  'homepage.publish',
  'comment.view_queue',
  'comment.moderate',
  'comment.manage_reports',
  'poll.view_manage',
  'poll.edit',
  'poll.publish',
  'poll.manage_results',
  'calendar.view_team',
  'calendar.manage',
  'calendar.view_assigned',
  'audience.view',
  'audience.notify',
  'newsletter.manage',
  'team.view',
  'team.invite',
  'team.manage_roles',
  'team.manage_overrides',
  'team.suspend',
  'team.view_audit',
  'settings.security_admin',
  'reader.personal',
  'assignment.view_team',
  'assignment.manage',
  'assignment.view_assigned',
  'assignment.update_assigned',
  'story.publish_own_without_review',
  'byline.self_service',
  'media.quota_exempt',
] as const;

export type Capability = (typeof CAPABILITY_KEYS)[number];
export const EDITORIAL_OWN_PRIVILEGES:ReadonlySet<string>=new Set(['story.publish_own_without_review','byline.self_service','media.quota_exempt']);
export type AccessScope = 'all' | 'assigned' | 'own';
export type MembershipStatus = 'invited' | 'active' | 'suspended' | 'revoked';

export interface VerifiedPrincipal {
  /** From auth.getUser(), never from a request-supplied user ID or metadata. */
  userId: string;
}

export interface CapabilityGrant {
  capability: Capability;
  scope: AccessScope;
  expiresAt?: string | null;
}

export interface CapabilityOverride extends CapabilityGrant {
  effect: 'allow' | 'deny';
}

export interface MembershipSnapshot {
  id: string;
  /** FK to auth.users, queried from the live DB. */
  authUserId: string;
  status: MembershipStatus;
  expiresAt?: string | null;
  /** Server-loaded role-capability rows; no JWT/user_metadata roles. */
  roleGrants: readonly CapabilityGrant[];
  /** Server-loaded authorized overrides; deny always wins. */
  overrides: readonly CapabilityOverride[];
}

export interface ResourceContext {
  /** From a server/database resource lookup, never from submitted form data. */
  kind: 'story' | 'media' | 'calendar' | 'reader' | 'assignment' | 'other';
  /** For assigned-only access, the row must list the effective membership ID. */
  assignedMembershipIds?: readonly string[];
  ownerMembershipId?: string | null;
  /** Only for reader.personal: row's authenticated owner. */
  ownerAuthUserId?: string | null;
}

export type DenyReason =
  | 'unauthenticated'
  | 'unknown_capability'
  | 'reserved_capability'
  | 'no_membership'
  | 'membership_identity_mismatch'
  | 'membership_inactive'
  | 'membership_expired'
  | 'reader_not_owner'
  | 'explicit_deny'
  | 'missing_resource_scope'
  | 'no_grant';

export type PermissionDecision =
  | { allowed: true; reason: 'granted' }
  | { allowed: false; reason: DenyReason };

const CAPABILITY_SET: ReadonlySet<string> = new Set(CAPABILITY_KEYS);

// These capabilities can never be satisfied just because a role has broad
// scope: the named permission itself always means assigned or own resources.
const ASSIGNED_ONLY_CAPABILITIES: ReadonlySet<Capability> = new Set([
  'story.view_assigned',
  'story.edit_assigned',
  'revision.edit_assigned',
  'calendar.view_assigned',
  'assignment.view_assigned',
  'assignment.update_assigned',
]);
const OWN_ONLY_CAPABILITIES: ReadonlySet<Capability> = new Set([
  'media.edit_own',
]);

export function isCapability(value: string): value is Capability {
  return CAPABILITY_SET.has(value);
}

/** Invalid timestamps fail closed, rather than keeping expired permissions. */
function stillValid(expiresAt: string | null | undefined, nowMs: number): boolean {
  if (expiresAt == null) return true;
  const expiresMs = Date.parse(expiresAt);
  return Number.isFinite(expiresMs) && expiresMs > nowMs;
}

function scopeCovers(
  scope: AccessScope,
  resource: ResourceContext | undefined,
  membershipId: string
): boolean {
  if (scope === 'all') return true;
  if (!resource) return false;
  if (scope === 'assigned') {
    return resource.assignedMembershipIds?.includes(membershipId) === true;
  }
  return resource.ownerMembershipId === membershipId;
}

function ruleApplies(
  grant: CapabilityGrant,
  resource: ResourceContext | undefined,
  membershipId: string,
  nowMs: number
): boolean {
  return stillValid(grant.expiresAt, nowMs) && scopeCovers(grant.scope, resource, membershipId);
}

const deny = (reason: DenyReason): PermissionDecision => ({ allowed: false, reason });

/**
 * Resolves a single capability against fresh, verified server-side records.
 * When any prerequisite is absent or malformed, access is denied.
 */
export function resolveEffectivePermission(
  principal: VerifiedPrincipal | null,
  membership: MembershipSnapshot | null,
  capability: string,
  resource?: ResourceContext,
  now: Date = new Date()
): PermissionDecision {
  if (!principal?.userId) return deny('unauthenticated');
  if (!isCapability(capability)) return deny('unknown_capability');

  // Reader privileges require no newsroom membership, but always owner scope.
  if (capability === 'reader.personal') {
    if (resource?.kind !== 'reader' || resource.ownerAuthUserId !== principal.userId) {
      return deny('reader_not_owner');
    }
    return { allowed: true, reason: 'granted' };
  }

  // This capability is reserved for a future separately reviewed owner-only
  // security flow (reauthentication, two-person/last-owner protections).
  // Neither presets nor routine overrides may grant it in CT-02a.
  if (capability === 'settings.security_admin') return deny('reserved_capability');
  if (!membership) return deny('no_membership');
  if (!membership.id || !membership.authUserId || membership.authUserId !== principal.userId) {
    return deny('membership_identity_mismatch');
  }
  if (membership.status !== 'active') return deny('membership_inactive');

  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs) || !stillValid(membership.expiresAt, nowMs)) {
    return deny('membership_expired');
  }

  if ((capability==='assignment.view_assigned'||capability==='assignment.update_assigned')&&resource?.kind!=='assignment')return deny('missing_resource_scope');
  if (ASSIGNED_ONLY_CAPABILITIES.has(capability) &&
      (!resource || !scopeCovers('assigned', resource, membership.id))) {
    return deny('missing_resource_scope');
  }
  if (EDITORIAL_OWN_PRIVILEGES.has(capability)) return deny('missing_resource_scope'); // dedicated database gate; generic resource checks cannot authorize
  if (OWN_ONLY_CAPABILITIES.has(capability) &&
      (!resource || !scopeCovers('own', resource, membership.id))) {
    return deny('missing_resource_scope');
  }

  // Explicit deny wins over any number of grants/allow overrides, including
  // broad or unscoped denies. Expired overrides do not apply.
  const denies = membership.overrides.filter((entry) =>
    entry.capability === capability && entry.effect === 'deny' &&
    ruleApplies(entry, resource, membership.id, nowMs)
  );
  if (denies.length > 0) return deny('explicit_deny');

  const candidateGrants = [
    ...membership.roleGrants,
    ...membership.overrides.filter((entry) => entry.effect === 'allow'),
  ];
  if (candidateGrants.some((entry) =>
    entry.capability === capability && ruleApplies(entry, resource, membership.id, nowMs)
  )) {
    return { allowed: true, reason: 'granted' };
  }

  return deny('no_grant');
}

export function hasEffectivePermission(
  principal: VerifiedPrincipal | null,
  membership: MembershipSnapshot | null,
  capability: string,
  resource?: ResourceContext,
  now: Date = new Date()
): boolean {
  return resolveEffectivePermission(principal, membership, capability, resource, now).allowed;
}
