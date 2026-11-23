/**
 * CT-02c: privileged staff role operations are server-only, OFF by default.
 * Future CT-03 team routes may call this; existing pages/handlers do not.
 *
 * Danger: service_role bypasses RLS. We always verify auth.getUser() with the
 * caller's session first and preflight a live capability before using the
 * separate server-side service_role client. The SECURITY INVOKER RPC performs
 * its OWN fresh DB owner check and writes audit records in the same transaction.
 * Never accept the actor ID from a form or use user_metadata claims.
 */
import { randomUUID } from 'node:crypto';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient as createSessionClient } from '@/lib/db/supabase-server';
import { resolveStaffPermissionOnServer } from '@/lib/permissions/server';
import {
  validateStaffRoleChange,
  type StaffRoleChangeRequest,
} from '@/lib/permissions/staff-admin-input';

export type StaffRoleChangeResult =
  | { ok: true; requestId: string }
  | { ok: false; code: 'disabled' | 'invalid' | 'unauthorized' | 'forbidden' | 'rejected' };

export async function applyStaffRoleChange(
  input: StaffRoleChangeRequest
): Promise<StaffRoleChangeResult> {
  // Separate opt-in from the read permission rollout; both must be enabled
  // only after SQL, admin backfill, grants, audit and API RLS have been reviewed.
  if (process.env.CT_STAFF_ACCESS_V2_ENABLED !== 'true' ||
      process.env.CT_STAFF_ADMIN_MUTATIONS_ENABLED !== 'true') {
    return { ok: false, code: 'disabled' };
  }

  let change;
  try {
    change = validateStaffRoleChange(input);
  } catch {
    return { ok: false, code: 'invalid' };
  }

  try {
    const sessionClient = createSessionClient();
    const { data: { user }, error } = await sessionClient.auth.getUser();
    if (error || !user) return { ok: false, code: 'unauthorized' };

    // Read through the user's own session: never use the service_role key for
    // authorization lookup. The DB RPC additionally checks active owner.
    const permission = await resolveStaffPermissionOnServer('team.manage_roles');
    if (!permission.allowed) return { ok: false, code: 'forbidden' };

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return { ok: false, code: 'disabled' };

    const requestId = randomUUID();
    const service = createServiceClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error: rpcError, data } = await service.rpc('staff_apply_role_change', {
      p_actor_auth_user_id: user.id,
      p_target_membership_id: change.targetMembershipId,
      p_operation: change.operation,
      p_role_key: change.roleKey,
      p_reason: change.reason,
      p_request_id: requestId,
    });

    // Do not leak database internals or privilege details to callers.
    if (rpcError || data !== requestId) return { ok: false, code: 'rejected' };
    return { ok: true, requestId };
  } catch {
    return { ok: false, code: 'rejected' };
  }
}
