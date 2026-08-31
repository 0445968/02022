import type { CurrentUser } from '@/types';
import type { StoryStatus } from '@/lib/db/database.types';
import { isAuthor, isEditor } from '@/lib/permissions';

/**
 * Story workflow permission rules.
 * These extend the base permission module with story-specific logic.
 * All checks are server-side only.
 */

/** Can the user create a new story? */
export function canCreateStory(user: CurrentUser | null): boolean {
  return isAuthor(user) || isEditor(user);
}

/** Can the user edit a specific story? Authors can edit their own; editors can edit any. */
export function canEditStory(
  user: CurrentUser | null,
  storyAuthorId: string | null
): boolean {
  if (!user) return false;
  if (isEditor(user)) return true;
  if (isAuthor(user) && storyAuthorId === user.id) return true;
  return false;
}

/** Can the user change the story's status to the given value? */
export function canChangeStatus(
  user: CurrentUser | null,
  targetStatus: StoryStatus
): boolean {
  if (!user) return false;
  // Authors can move to draft or in_review
  if (isAuthor(user) && !isEditor(user)) {
    return targetStatus === 'draft' || targetStatus === 'in_review';
  }
  // Editors can set any status
  if (isEditor(user)) return true;
  return false;
}

/** Can the user publish a story? */
export function canPublish(user: CurrentUser | null): boolean {
  return isEditor(user);
}

/** Can the user schedule a story? */
export function canSchedule(user: CurrentUser | null): boolean {
  return isEditor(user);
}

/** Can the user archive a story? */
export function canArchive(user: CurrentUser | null): boolean {
  return isEditor(user);
}

/** Can the user assign an author to a story? */
export function canAssignAuthor(user: CurrentUser | null): boolean {
  return isEditor(user);
}

/** Can the user assign an editor to a story? */
export function canAssignEditor(user: CurrentUser | null): boolean {
  return isEditor(user);
}

/** Can the user edit the slug of a published story? (Requires editor) */
export function canEditPublishedSlug(user: CurrentUser | null): boolean {
  return isEditor(user);
}

/** Can the user delete a story? */
export function canDeleteStory(user: CurrentUser | null): boolean {
  return isEditor(user);
}

/** Can the user manage media (upload)? */
export function canUploadMedia(user: CurrentUser | null): boolean {
  return isAuthor(user) || isEditor(user);
}

/** Can the user view the story in the newsroom (drafts, reviews, etc.)? */
export function canViewStory(
  user: CurrentUser | null,
  storyAuthorId: string | null
): boolean {
  if (!user) return false;
  if (isEditor(user)) return true;
  if (isAuthor(user) && storyAuthorId === user.id) return true;
  return false;
}
