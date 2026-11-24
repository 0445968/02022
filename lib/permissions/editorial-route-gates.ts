/**
 * CT-02h: current verified-session editorial capability gates.
 * Keep legacy routes compatible while CT_STAFF_ACCESS_V2_ENABLED is OFF.
 * Once enabled, there is NO fallback to profiles.is_editor/is_author.
 */
import type { CurrentUser } from '@/types';
import { canCreateStory, canEditStory } from '@/lib/permissions/stories';
import { resolveStaffPermissionOnServer } from '@/lib/permissions/server';

const v2 = () => process.env.CT_STAFF_ACCESS_V2_ENABLED === 'true';
async function has(capability: string): Promise<boolean> {
  return (await resolveStaffPermissionOnServer(capability)).allowed;
}
export async function mayCreateStory(user: CurrentUser | null): Promise<boolean> {
  if (!v2()) return canCreateStory(user);
  return !!user && await has('story.create');
}
export async function mayAssignStoryAuthor(user: CurrentUser | null): Promise<boolean> {
  if (!v2()) return true; // legacy create author selection unchanged
  return !!user && await has('story.assign');
}
export async function mayRestoreStoryVersion(
  user: CurrentUser | null, storyId: string, authorId: string | null
): Promise<boolean> {
  if (!v2()) return !!user?.profile?.isEditor && canEditStory(user, authorId);
  if (!user) return false;
  // Restoration of history is editor-only, not merely assigned-copy editing.
  return (await has('story.edit_all')) &&
    (await resolveStaffPermissionOnServer('revision.view', {kind:'story',storyId})).allowed;
}
export async function mayEditHomepage(user: CurrentUser | null): Promise<boolean> {
  if (!v2()) return user?.profile?.isEditor === true;
  return !!user && await has('homepage.edit');
}
export async function mayPublishHomepage(user: CurrentUser | null): Promise<boolean> {
  if (!v2()) return user?.profile?.isEditor === true;
  // Publishing is not the same as editing a draft layout.
  return !!user && (await has('homepage.edit')) && (await has('homepage.publish'));
}
export async function mayManageBreakingNews(user: CurrentUser | null): Promise<boolean> {
  return mayPublishHomepage(user);
}
export async function mayManageByline(user: CurrentUser | null): Promise<boolean> {
  if (!v2()) return user?.profile?.isEditor === true;
  return !!user && await has('byline.manage');
}
export async function mayCreateTag(user: CurrentUser | null): Promise<boolean> {
  if (!v2()) return !!user && (user.profile?.isAuthor === true || user.profile?.isEditor === true);
  // No story resource on taxonomy POST, so assigned-only grants cannot be used.
  return !!user && ((await has('story.create')) || (await has('story.edit_all')));
}
