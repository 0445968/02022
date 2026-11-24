/**
 * CT-02b: fail-closed, server-side reader for future staff permission gates.
 *
 * NOT CONNECTED TO EXISTING ROUTES. Requires reviewed migration AND
 * CT_STAFF_ACCESS_V2_ENABLED=true, which is OFF by default. Never accept
 * memberships, roles, grants, assignments or permission snapshots from clients.
 * RLS and mutation checks must be added to existing APIs before cutover.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/db/supabase-server';
import {
  isCapability,
  resolveEffectivePermission,
  type AccessScope,
  type CapabilityGrant,
  type CapabilityOverride,
  type MembershipSnapshot,
  type PermissionDecision,
  type ResourceContext,
} from '@/lib/permissions/capabilities';

type StoryRequest = { kind: 'story'; storyId: string };
type MediaRequest = { kind: 'media'; mediaId: string };
type StaffCapabilityRequest = StoryRequest | MediaRequest | undefined;

type MemberRow = {
  id: string;
  auth_user_id: string;
  status: MembershipSnapshot['status'];
  expires_at: string | null;
};
type MemberRoleRow = { role_preset_id: string; expires_at: string | null };
type RoleGrantRow = { role_preset_id: string; capability_key: string; scope: string };
type OverrideRow = {
  capability_key: string;
  effect: string;
  scope: string;
  expires_at: string | null;
};

const denied: PermissionDecision = { allowed: false, reason: 'no_membership' };

function isScope(value: string): value is AccessScope {
  return value === 'all' || value === 'assigned' || value === 'own';
}
function notExpired(value: string | null): boolean {
  if (value === null) return true;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp > Date.now();
}

/**
 * Uses verified Supabase getUser and user-session RLS for all reads.
 * NEVER exposes Supabase service_role keys and never grants by profile flags.
 */
export async function resolveStaffPermissionOnServer(
  capability: string,
  resourceRequest?: StaffCapabilityRequest
): Promise<PermissionDecision> {
  if (!isCapability(capability) || capability === 'reader.personal') {
    return { allowed: false, reason: 'unknown_capability' };
  }

  // Safe gradual rollout: feature gate is false by default, even after
  // SQL creation. Legacy routes continue to use existing RLS until CT-02c.
  if (process.env.CT_STAFF_ACCESS_V2_ENABLED !== 'true') return denied;

  const client = createClient() as unknown as SupabaseClient;
  try {
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) return { allowed: false, reason: 'unauthenticated' };

    const { data: member, error: memberError } = await client
      .from('staff_memberships')
      .select('id, auth_user_id, status, expires_at')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (memberError || !member) return denied;
    const m = member as MemberRow;
    if (m.auth_user_id !== user.id || m.status !== 'active' || !notExpired(m.expires_at)) {
      return { allowed: false, reason: 'membership_inactive' };
    }

    const [rolesResult, overridesResult] = await Promise.all([
      client.from('staff_member_roles')
        .select('role_preset_id, expires_at').eq('membership_id', m.id),
      client.from('staff_capability_overrides')
        .select('capability_key, effect, scope, expires_at').eq('membership_id', m.id),
    ]);
    if (rolesResult.error || overridesResult.error) return denied;

    const activeRoles = (rolesResult.data ?? [] as MemberRoleRow[])
      .filter((row: MemberRoleRow) => notExpired(row.expires_at));
    const presetIds = [...new Set(activeRoles.map((r: MemberRoleRow) => r.role_preset_id))];
    const roleGrants: CapabilityGrant[] = [];

    if (presetIds.length > 0) {
      const { data: grantRows, error: grantError } = await client
        .from('staff_role_capabilities')
        .select('role_preset_id, capability_key, scope')
        .in('role_preset_id', presetIds);
      if (grantError) return denied;

      for (const row of (grantRows ?? []) as RoleGrantRow[]) {
        if (!isCapability(row.capability_key) || !isScope(row.scope)) continue;
        const matchingRole = activeRoles.find((r: MemberRoleRow) => r.role_preset_id === row.role_preset_id);
        if (!matchingRole) continue;
        roleGrants.push({
          capability: row.capability_key,
          scope: row.scope,
          expiresAt: matchingRole.expires_at,
        });
      }
    }

    const overrides: CapabilityOverride[] = [];
    for (const row of (overridesResult.data ?? []) as OverrideRow[]) {
      if (!isCapability(row.capability_key) ||
          !isScope(row.scope) ||
          (row.effect !== 'allow' && row.effect !== 'deny')) continue;
      overrides.push({
        capability: row.capability_key,
        scope: row.scope,
        effect: row.effect,
        expiresAt: row.expires_at,
      });
    }

    let resource: ResourceContext | undefined;
    if (resourceRequest?.kind === 'story') {
      // No client-supplied assignments or ownership. Query the live DB.
      const { data: assignmentRows, error: assignmentError } = await client
        .from('staff_story_assignments')
        .select('id')
        .eq('membership_id', m.id)
        .eq('story_id', resourceRequest.storyId)
        .eq('status', 'active')
        .limit(1);
      if (assignmentError) return denied;
      resource = {
        kind: 'story',
        assignedMembershipIds: assignmentRows?.length ? [m.id] : [],
      };
    }

    if (resourceRequest?.kind === 'media') {
      // Always resolve ownership from a live, RLS-filtered DB row. Never
      // use caller-submitted uploadedBy or self-described role metadata.
      const { data: media, error: mediaError } = await client
        .from('media_assets')
        .select('uploaded_by')
        .eq('id', resourceRequest.mediaId)
        .maybeSingle();
      if (mediaError || !media) return denied;
      resource = {
        kind: 'media',
        ownerMembershipId: media.uploaded_by === user.id ? m.id : null,
      };
    }

    // A saved staff membership is NOT itself a grant. Empty presets/roles
    // deny all staff actions unless separately, explicitly authorized.
    return resolveEffectivePermission(
      { userId: user.id },
      {
        id: m.id,
        authUserId: m.auth_user_id,
        status: m.status,
        expiresAt: m.expires_at,
        roleGrants,
        overrides,
      },
      capability,
      resource
    );
  } catch {
    // A missing table, blocked RLS read or backend error must NEVER grant.
    return denied;
  }
}
