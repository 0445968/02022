/**
 * CT-04a.1: pure server-side invitation contract.
 * Does not authorize staff, send mail, persist tokens or mutate memberships.
 * Future RPC must repeat every policy check under a transaction and row lock.
 */
import {createHash, randomBytes, timingSafeEqual} from 'node:crypto';

export const INVITABLE_ROLES = [
  'managing_editor','editor','staff_writer','copy_editor','media_editor',
  'moderator','audience_staff','freelancer',
] as const;
export type InvitableRole = typeof INVITABLE_ROLES[number];
export type InviteMemberType = 'employee' | 'contractor' | 'freelancer';
const DAY = 86_400_000;
const MAX_TOKEN_DAYS = 7;
const MAX_CONTRACT_DAYS = 365;
const ROLE_SET: ReadonlySet<string> = new Set(INVITABLE_ROLES);
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;

export type InviteIssue = {
  email: string;
  roleKey: InvitableRole;
  expectedPresetRevision: number;
  memberType: InviteMemberType;
  expiresAt: string;
  membershipExpiresAt: string | null;
  reason: string;
  confirmed: true;
};

function plainRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('Invalid invitation');
  return raw as Record<string, unknown>;
}

function requireExactKeys(raw: Record<string, unknown>, keys: readonly string[]) {
  if (Object.keys(raw).length !== keys.length ||
      !keys.every(key => Object.prototype.hasOwnProperty.call(raw,key))) {
    throw Error('Invalid invitation fields');
  }
}

/** Conservative address syntax. No Gmail-dot/plus or other provider-specific alias folding. */
export function normalizeInviteEmail(raw: unknown): string {
  if (typeof raw !== 'string') throw Error('Invalid email');
  const email = raw.trim().toLowerCase();
  if (email.length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(email)) {
    throw Error('Invalid email');
  }
  const [local, domain] = email.split('@');
  if (local.length > 64 || local.startsWith('.') || local.endsWith('.') ||
      local.includes('..') || domain.split('.').some(label => label.length > 63)) {
    throw Error('Invalid email');
  }
  return email;
}

function canonicalInstant(raw: unknown): number {
  // Require exact UTC timestamp, not locale strings, offsets or rollover dates.
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(raw)) throw Error('Invalid timestamp');
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== raw) throw Error('Invalid timestamp');
  return ms;
}

function assertRoleType(role: unknown, member: unknown): asserts role is InvitableRole {
  if (typeof role !== 'string' || !ROLE_SET.has(role) ||
      !['employee','contractor','freelancer'].includes(String(member)) ||
      (role === 'freelancer') !== (member === 'freelancer') ||
      (member !== 'employee' && member !== 'contractor' && member !== 'freelancer')) {
    throw Error('Invalid invitation role or member type');
  }
}

/**
 * The revision is the *reviewed, configured* preset revision selected by the owner.
 * It is NOT a permission snapshot or an instruction to seed default grants.
 */
export function validateInviteIssue(raw: unknown, now = Date.now()): InviteIssue {
  const obj = plainRecord(raw);
  requireExactKeys(obj, ['email','roleKey','expectedPresetRevision','memberType',
    'expiresAt','membershipExpiresAt','reason','confirmed']);
  const {roleKey,memberType,expectedPresetRevision,expiresAt,membershipExpiresAt,reason,confirmed} = obj;
  assertRoleType(roleKey,memberType);
  if (!Number.isFinite(now) || typeof expectedPresetRevision !== 'number' ||
      !Number.isSafeInteger(expectedPresetRevision) || expectedPresetRevision < 1 ||
      expectedPresetRevision > 2_147_483_647 ||
      confirmed !== true || typeof reason !== 'string' ||
      reason.trim().length < 12 || reason.length > 500) throw Error('Invalid invitation');
  const expiry = canonicalInstant(expiresAt);
  if (expiry <= now || expiry > now + MAX_TOKEN_DAYS * DAY) throw Error('Invalid invitation expiry');
  if (memberType === 'employee') {
    if (membershipExpiresAt !== null) throw Error('Employee expiry must be null');
  } else {
    const contractExpiry = canonicalInstant(membershipExpiresAt);
    if (contractExpiry <= expiry || contractExpiry > now + MAX_CONTRACT_DAYS * DAY) {
      throw Error('Invalid contract expiry');
    }
  }
  return {email:normalizeInviteEmail(obj.email),roleKey,memberType:memberType as InviteMemberType,
    expectedPresetRevision,expiresAt:expiresAt as string,membershipExpiresAt:membershipExpiresAt as string|null,
    reason:reason.trim(),confirmed:true};
}

export function hashInviteToken(raw: unknown): string {
  if (typeof raw !== 'string' || !TOKEN_PATTERN.test(raw)) throw Error('Invalid token');
  const bytes = Buffer.from(raw,'base64url');
  if (bytes.length !== 32 || bytes.toString('base64url') !== raw) throw Error('Invalid token');
  return createHash('sha256').update('clear-talks:staff-invite:v1:').update(bytes).digest('hex');
}

/** Caller must never persist or log token. Only the hash is safe to persist in the invite store. */
export function createInviteToken(): {token:string; tokenHash:string} {
  const token = randomBytes(32).toString('base64url');
  return {token,tokenHash:hashInviteToken(token)};
}

export function verifyInviteToken(raw: unknown, storedHash: unknown): boolean {
  if (typeof storedHash !== 'string' || !HASH_PATTERN.test(storedHash)) return false;
  try {
    return timingSafeEqual(Buffer.from(hashInviteToken(raw),'hex'),Buffer.from(storedHash,'hex'));
  } catch { return false; }
}

export type InviteSnapshot = {
  email:string; roleKey:InvitableRole; memberType:InviteMemberType;
  presetRevision:number; expiresAt:string; membershipExpiresAt:string|null;
  tokenHash:string; redeemedAt:string|null; canceledAt:string|null;
};
export type VerifiedInviteIdentity = {
  id:string; email:string|null; emailConfirmedAt:string|null; isAnonymous:boolean;
};

/**
 * Preflight only. Identity MUST be built from fresh server auth.getUser(), never
 * JSON/user_metadata. Snapshot and current revision MUST be DB-derived.
 * The redeem RPC must independently validate verified auth.users email, current
 * Owner approval, preset eligibility, token state and consume+grant atomically.
 * A true result here is not permission and must never activate an account.
 */
export function invitePreflightEligible(
  rawToken: unknown, invitation: InviteSnapshot, identity: VerifiedInviteIdentity,
  currentPresetRevision: number, now = Date.now()
): boolean {
  try {
    if (!Number.isFinite(now) || !identity || identity.isAnonymous !== false ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identity.id) ||
        !identity.emailConfirmedAt || !Number.isFinite(Date.parse(identity.emailConfirmedAt)) ||
        Date.parse(identity.emailConfirmedAt) > now ||
        invitation.redeemedAt !== null || invitation.canceledAt !== null ||
        !Number.isSafeInteger(invitation.presetRevision) || invitation.presetRevision < 1 ||
        invitation.presetRevision !== currentPresetRevision ||
        canonicalInstant(invitation.expiresAt) <= now ||
        normalizeInviteEmail(identity.email) !== invitation.email) return false;
    assertRoleType(invitation.roleKey,invitation.memberType);
    if (invitation.memberType === 'employee') {
      if (invitation.membershipExpiresAt !== null) return false;
    } else if (canonicalInstant(invitation.membershipExpiresAt) <= now ||
        canonicalInstant(invitation.membershipExpiresAt) <= canonicalInstant(invitation.expiresAt)) {
      return false;
    }
    return verifyInviteToken(rawToken,invitation.tokenHash);
  } catch { return false; }
}
