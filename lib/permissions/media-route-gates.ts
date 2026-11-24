/**
 * CT-02g: server-only media route guards. V2 remains OFF in production.
 * No legacy profile fallback once the new feature has been enabled.
 */
import type { CurrentUser } from '@/types';
import { resolveStaffPermissionOnServer } from '@/lib/permissions/server';

function oldStaff(user: CurrentUser | null): boolean {
  return !!user && !!(user.profile?.isAuthor || user.profile?.isEditor);
}
function oldEditor(user: CurrentUser | null): boolean {
  return !!user && user.profile?.isEditor === true;
}
async function check(key: string, mediaId?: string): Promise<boolean> {
  return (await resolveStaffPermissionOnServer(
    key,
    mediaId ? { kind: 'media', mediaId } : undefined
  )).allowed;
}
function v2Enabled(): boolean {
  return process.env.CT_STAFF_ACCESS_V2_ENABLED === 'true';
}
export async function mayListMedia(user: CurrentUser | null): Promise<boolean> {
  if (!v2Enabled()) return oldStaff(user);
  if (!user) return false;
  return (await check('media.view_all')) ||
    (await check('media.edit_all')) ||
    (await check('media.upload'));
}
/**
 * Favorite/read actions must be backed by the real media object's current
 * per-account visibility, not just a general media.upload capability.
 */
export async function mayViewMedia(user: CurrentUser | null, mediaId: string): Promise<boolean> {
  if (!v2Enabled()) return oldStaff(user);
  if (!user) return false;
  return (await check('media.view_all', mediaId)) ||
    (await check('media.edit_all', mediaId)) ||
    (await check('media.edit_own', mediaId));
}
export async function mayUploadMedia(user: CurrentUser | null): Promise<boolean> {
  if (!v2Enabled()) return oldStaff(user);
  return !!user && await check('media.upload');
}
export async function mayEditMedia(user: CurrentUser | null, mediaId: string): Promise<boolean> {
  if (!v2Enabled()) return oldStaff(user);
  return !!user && ((await check('media.edit_all', mediaId)) ||
    (await check('media.edit_own', mediaId)));
}
export async function mayApproveMedia(user: CurrentUser | null, mediaId: string): Promise<boolean> {
  if (!v2Enabled()) return oldEditor(user);
  return !!user && await check('media.approve', mediaId);
}
export async function mayDeleteMedia(user: CurrentUser | null): Promise<boolean> {
  if (!v2Enabled()) return oldEditor(user);
  return !!user && await check('media.delete');
}
