/**
 * CT-02d: narrow, opt-in server-only route checks for initial Newsroom
 * endpoints. Every v2 decision is fresh and fail-closed, with NO fallback to
 * legacy editor/author flags if an active member is missing or revoked.
 *
 * FLAG SAFETY: v2 is disabled by default. Turning it on does NOT complete
 * the direct PostgREST RLS, media/storage, or publishing RPC transition.
 * Do not enable until those gates, owner backfill and negative tests pass.
 */
import type { CurrentUser } from '@/types';
import type { StoryStatus } from '@/lib/db/database.types';
import { canAccessNewsroom } from '@/lib/permissions';
import {
  canChangeStatus, canEditStory, canPublish,
} from '@/lib/permissions/stories';
import { resolveStaffPermissionOnServer } from '@/lib/permissions/server';

function v2Enabled(): boolean {
  return process.env.CT_STAFF_ACCESS_V2_ENABLED === 'true';
}

export async function mayEnterNewsroom(user: CurrentUser | null): Promise<boolean> {
  if (!v2Enabled()) return canAccessNewsroom(user);
  if (!user) return false;
  return (await resolveStaffPermissionOnServer('newsroom.access')).allowed;
}

export async function mayEditStory(
  user: CurrentUser | null,
  storyId: string,
  authorId: string | null
): Promise<boolean> {
  if (!v2Enabled()) return canEditStory(user, authorId);
  if (!user) return false;

  if ((await resolveStaffPermissionOnServer('story.edit_all')).allowed) return true;
  return (await resolveStaffPermissionOnServer('story.edit_assigned', {
    kind: 'story', storyId,
  })).allowed;
}

export async function mayPublishRevision(
  user: CurrentUser | null,
  storyId: string
): Promise<boolean> {
  if (!v2Enabled()) return canPublish(user);
  if (!user) return false;

  const canPublishStory = await resolveStaffPermissionOnServer('story.publish', {
    kind: 'story', storyId,
  });
  if (!canPublishStory.allowed) return false;
  return (await resolveStaffPermissionOnServer('revision.publish', {
    kind: 'story', storyId,
  })).allowed;
}

export async function mayChangeStoryStatus(
  user: CurrentUser | null,
  storyId: string,
  status: StoryStatus
): Promise<boolean> {
  if (!v2Enabled()) return canChangeStatus(user, status);
  if (!user) return false;

  if (status === 'published') {
    return (await resolveStaffPermissionOnServer('story.publish', {
      kind: 'story', storyId,
    })).allowed;
  }
  if (status === 'scheduled') {
    return (await resolveStaffPermissionOnServer('story.schedule', {
      kind: 'story', storyId,
    })).allowed;
  }
  if (status === 'archived') {
    return (await resolveStaffPermissionOnServer('story.archive_delete', {
      kind: 'story', storyId,
    })).allowed;
  }
  if (status === 'in_review') {
    if ((await resolveStaffPermissionOnServer('story.submit_review', {
      kind: 'story', storyId,
    })).allowed) return true;
    return (await resolveStaffPermissionOnServer('story.review', {
      kind: 'story', storyId,
    })).allowed;
  }

  // Other statuses still require mayEditStory at the calling route.
  return status === 'draft';
}

/**
 * Protect sensitive/editorial control fields even when the member may edit
 * article copy. Call after parsing the request body, before any writes.
 */
export async function mayEditStoryControlFields(
  user: CurrentUser | null,
  storyId: string,
  fields: {
    authorId?: unknown; editorId?: unknown; scheduledAt?: unknown;
    originallyPublishedAt?: unknown; slug?: unknown; accessLevel?: unknown;
  }
): Promise<boolean> {
  if (!v2Enabled()) return true;
  if (!user) return false;

  if (fields.authorId !== undefined || fields.editorId !== undefined) {
    if (!(await resolveStaffPermissionOnServer('story.assign', {
      kind: 'story', storyId,
    })).allowed) return false;
  }
  if (fields.scheduledAt !== undefined) {
    if (!(await resolveStaffPermissionOnServer('story.schedule', {
      kind: 'story', storyId,
    })).allowed) return false;
  }
  if (fields.originallyPublishedAt !== undefined ||
      fields.slug !== undefined ||
      fields.accessLevel !== undefined) {
    if (!(await resolveStaffPermissionOnServer('story.publish', {
      kind: 'story', storyId,
    })).allowed) return false;
  }
  return true;
}

/**
 * Direct edits to published rows bypass reviewable draft revisions.
 * In v2 this requires full editorial rights AND publishing permission.
 * Assigned contributors must use the separate unpublished revision API.
 */
export async function mayWriteLiveStory(
  user: CurrentUser | null,
  storyId: string
): Promise<boolean> {
  if (!v2Enabled()) return true; // legacy behavior unchanged until approval
  if (!user) return false;
  if (!(await resolveStaffPermissionOnServer('story.edit_all', {
    kind: 'story', storyId,
  })).allowed) return false;
  return (await resolveStaffPermissionOnServer('story.publish', {
    kind: 'story', storyId,
  })).allowed;
}
