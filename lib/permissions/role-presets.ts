/**
 * CT-02d: PROPOSED built-in staff presets for review only.
 * NO role mappings are written to Supabase by importing this file.
 * Production grant seeding requires separately approved SQL after a verified
 * first-owner bootstrap, and direct API/RPC/storage permission cutover.
 *
 * Each role receives precisely the capabilities below, never inferred from
 * the account's byline/title, editable profile or JWT user_metadata.
 */
import type { Capability, CapabilityGrant, AccessScope } from './capabilities';
import type { StaffRoleKey } from './staff-admin-input';

type ProposedRoleGrants = Readonly<Record<StaffRoleKey, readonly CapabilityGrant[]>>;

function grants(scope: AccessScope, ...capabilities: Capability[]): CapabilityGrant[] {
  return capabilities.map((capability) => ({ capability, scope }));
}

export const PROPOSED_STAFF_ROLE_GRANTS: ProposedRoleGrants = {
  owner: [
    ...grants('all',
      'newsroom.access', 'story.view_all', 'story.create', 'story.edit_all',
      'story.submit_review', 'story.review', 'story.publish', 'story.schedule',
      'story.archive_delete', 'story.assign', 'revision.view',
      'revision.publish', 'revision.discard',
      'media.view_all', 'media.upload', 'media.edit_all', 'media.approve', 'media.delete',
      'byline.view', 'byline.manage',
      'homepage.view_editor', 'homepage.edit', 'homepage.publish',
      'comment.view_queue', 'comment.moderate', 'comment.manage_reports',
      'poll.view_manage', 'poll.edit', 'poll.publish', 'poll.manage_results',
      'calendar.view_team', 'calendar.manage',
      'audience.view', 'audience.notify', 'newsletter.manage',
      'team.view', 'team.invite', 'team.manage_roles', 'team.manage_overrides',
      'team.suspend', 'team.view_audit'
    ),
  ],
  managing_editor: [
    ...grants('assigned','assignment.view_assigned','assignment.update_assigned'),
    ...grants('all','assignment.view_team','assignment.manage'),
    ...grants('all',
      'newsroom.access', 'story.view_all', 'story.create', 'story.edit_all',
      'story.submit_review', 'story.review', 'story.publish', 'story.schedule',
      'story.archive_delete', 'story.assign', 'revision.view',
      'revision.publish', 'revision.discard', 'media.view_all', 'media.upload',
      'media.edit_all', 'media.approve', 'byline.view',
      'homepage.view_editor', 'homepage.edit', 'homepage.publish',
      'comment.view_queue', 'comment.moderate', 'poll.view_manage',
      'poll.edit', 'poll.publish', 'calendar.view_team', 'calendar.manage',
      'team.view'
    ),
  ],
  editor: [
    ...grants('assigned','assignment.view_assigned','assignment.update_assigned'),
    ...grants('all','assignment.view_team','assignment.manage'),
    ...grants('all',
      'newsroom.access', 'story.view_all', 'story.create', 'story.edit_all',
      'story.submit_review', 'story.review', 'story.publish', 'story.schedule',
      'story.archive_delete', 'story.assign', 'revision.view',
      'revision.publish', 'revision.discard', 'media.view_all', 'media.upload',
      'media.edit_all', 'media.approve', 'byline.view',
      'homepage.view_editor', 'calendar.view_team'
    ),
  ],
  staff_writer: [
    ...grants('assigned','assignment.view_assigned','assignment.update_assigned'),
    ...grants('all', 'newsroom.access', 'story.create', 'media.upload'),
    ...grants('assigned', 'story.view_assigned', 'story.edit_assigned',
      'story.submit_review', 'revision.view', 'revision.edit_assigned'),
    ...grants('own', 'media.edit_own'),
  ],
  copy_editor: [
    ...grants('assigned','assignment.view_assigned','assignment.update_assigned'),
    ...grants('all', 'newsroom.access'),
    ...grants('assigned', 'story.view_assigned', 'story.edit_assigned',
      'story.review', 'revision.view', 'revision.edit_assigned'),
  ],
  media_editor: [
    ...grants('assigned','assignment.view_assigned','assignment.update_assigned'),
    ...grants('all', 'newsroom.access', 'media.view_all', 'media.upload',
      'media.edit_all', 'media.approve', 'media.delete'),
    ...grants('assigned', 'story.view_assigned', 'revision.view',
      'revision.edit_assigned'),
  ],
  moderator: [
    ...grants('assigned','assignment.view_assigned','assignment.update_assigned'),
    ...grants('all', 'newsroom.access', 'comment.view_queue',
      'comment.moderate', 'comment.manage_reports'),
  ],
  audience_staff: [
    ...grants('assigned','assignment.view_assigned','assignment.update_assigned'),
    ...grants('all', 'newsroom.access', 'audience.view',
      'audience.notify', 'newsletter.manage'),
  ],
  freelancer: [
    ...grants('assigned','assignment.view_assigned','assignment.update_assigned'),
    // Freelancers cannot create unassigned stories. An editor must first
    // create an assignment that the DB can verify.
    ...grants('all', 'newsroom.access', 'media.upload'),
    ...grants('assigned', 'story.view_assigned', 'story.edit_assigned',
      'story.submit_review', 'revision.view', 'revision.edit_assigned'),
    ...grants('own', 'media.edit_own'),
  ],
};

/** Static fixture for proposal comparison/UI preview, NOT an access source. */
export function proposedRoleGrants(role: StaffRoleKey): readonly CapabilityGrant[] {
  return PROPOSED_STAFF_ROLE_GRANTS[role];
}
