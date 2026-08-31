import type { CurrentUser, UserRole } from '@/types';

/**
 * Reusable, server-side permission logic for Simply Raizal.
 *
 * All access checks should go through these helpers so permission rules
 * are defined in exactly one place. Never duplicate role logic across
 * pages or components.
 */

export function isAuthor(user: CurrentUser | null): boolean {
  return Boolean(user?.profile?.isAuthor);
}

export function isEditor(user: CurrentUser | null): boolean {
  return Boolean(user?.profile?.isEditor);
}

export function isStaff(user: CurrentUser | null): boolean {
  return isAuthor(user) || isEditor(user);
}

/** A user who is both author and editor. */
export function isAuthorEditor(user: CurrentUser | null): boolean {
  return isAuthor(user) && isEditor(user);
}

/**
 * Resolves the effective role label for a user. Used for display only —
 * never use this for authorization. Use the boolean helpers above.
 */
export function resolveRoleLabel(user: CurrentUser | null): UserRole {
  if (!user) return 'user';
  const author = isAuthor(user);
  const editor = isEditor(user);
  if (author && editor) return 'author-editor';
  if (author) return 'author';
  if (editor) return 'editor';
  return 'user';
}

export function canAccessNewsroom(user: CurrentUser | null): boolean {
  return isStaff(user);
}

/**
 * Future capability placeholders (Stage 2+). Defined now so permission
 * checks stay centralized as features are added.
 */
export function canCreateStories(user: CurrentUser | null): boolean {
  return isAuthor(user) || isEditor(user);
}

export function canManageAllEditorialContent(user: CurrentUser | null): boolean {
  return isEditor(user);
}
