# Clear Talks — Staff Roles, Permissions & Onboarding Contract
Version: 1.0 proposal | 2026-11-23 | Companion to MASTER_COMPLETION_PLAN.md.
Status: CT-02j draft PR #14 stages controlled private media review, SHA-256-verified public-copy promotion, explicit rights decisions, approved-media linkage, and a dual-flag Newsroom review panel. CT-02a–i remain unmerged/unapplied. **NO hosted bucket, SQL, first owner/backfill, role grants, Vercel flags or production permission change.** Proposed media.approve remains an independent staff privilege; actual grants/owner require approval and real Supabase Storage/Auth tests before live activation. One published article still references trashed media.

## 1. Principles

The new staff access manager is an **administrator-controlled frontend** over enforceable server and database security. A UI checkbox alone is never a permission. Authenticated readers stay readers unless a verified admin grants membership. Existing profiles.is_author and profiles.is_editor remain compatible until migrated and covered by tests; editorial_profiles is public byline metadata, not a login credential or permission source.

Model five separate concepts: Auth identity; membership (active/invited/suspended/revoked); role preset(s); effective capabilities + explicit overrides; resource assignment/ownership. A staff member may have multiple roles, but resource scope and explicit denies still apply. Confirm any custom role editing before enabling it.

## 2. Capability registry (proposed names, stable keys)

- newsroom.access — enter staff portal.
- story.view_all; story.view_assigned; story.create; story.edit_all; story.edit_assigned; story.submit_review; story.review; story.publish; story.schedule; story.archive_delete; story.assign.
- revision.view; revision.edit_assigned; revision.publish; revision.discard.
- media.view_all; media.upload; media.edit_own; media.edit_all; media.approve; media.delete.
- byline.view; byline.manage.
- homepage.view_editor; homepage.edit; homepage.publish.
- comment.view_queue; comment.moderate; comment.manage_reports.
- poll.view_manage; poll.edit; poll.publish; poll.manage_results.
- calendar.view_team; calendar.manage; calendar.view_assigned.
- audience.view; audience.notify; newsletter.manage.
- team.view; team.invite; team.manage_roles; team.manage_overrides; team.suspend; team.view_audit.
- settings.security_admin (reserved; no ordinary editorial presets); reader.personal (all authenticated users, only own records).

Prefer a finite registry with typed action names and test fixtures, not arbitrary untrusted string permissions. A user must possess **both** the relevant capability and access to the specific resource under ownership/assignment/team RLS.

## 3. Suggested role presets (to approve in CT-02)

Legend: A=all within team; O=owned/assigned; R=review/decision; P=publish; M=manage; —=no access. This table is conceptual; the exact permission registry above is authoritative only once implemented.

| Role | Stories | Revisions | Media | Page layout | Comments | Polls | Team access |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Owner / platform admin | A,P,M | A,P | A,M | M,P | M | M | M incl roles |
| Managing editor | A,R,P,assign | A,P | A,approve | M,P | M | M | view/invite where granted |
| Editor | A,R,P,assign | A,P | A,approve | edit if explicitly assigned | M if explicitly assigned | edit if explicitly assigned | — |
| Staff writer / journalist | O,submit | O | upload, own | — | — | — | — |
| Copy editor / fact-checker | O,R,edit | O,review | view assigned | — | — | — | — |
| Visual / media editor | O | O,visual | A,M | — | — | — | — |
| Moderator / community staff | read published only | — | — | — | M | — | — |
| Audience / newsletter staff | published/read | — | approved media read | — | — | insights if assigned | — |
| Freelancer / contributor | O,submit | O | upload own | — | — | — | — |
| Reader | published according to entitlement | — | public URLs | — | own comments | vote per rules | — |

Definitions / important defaults:
- Owner/admin is a privileged trusted operator, protected against removing the last active owner. At least one verified active owner must remain. Separate team access administration from site editorial content roles.
- Editor can publish only with a real server/DB permission check. Freelancer has **no automatic publish capability** even if they have an Author byline.
- Special editors and audience staff **do not inherit all Editor privileges** merely because their title contains 'editor'.
- Staff writer and freelancer differences may include internal team visibility, assignment pools, editor-only note visibility, upload quotas, or contract expiration. Default freelancer view = only assigned content. Decide precise differences in CT-04.
- User's own reader account and bookmarks remain private even when the user is staff/admin.
- Membership suspension/revoke removes effective capabilities immediately; a person can keep a historical public author/byline record independently.

### CT-02d proposed preset detail — implementation candidate, not yet granted

The finite TypeScript proposals live in `lib/permissions/role-presets.ts`. Only a reviewed, later versioned migration may populate `staff_role_capabilities`. All role presets include `newsroom.access` but there is no membership backfill or automatic access. Scopes: `all` for team-wide actions, `assigned` only when a current database story assignment exists, and `own` only when database ownership is verified. Current media ownership enforcement is not yet migrated.

- **Owner:** all standard editorial, media, publishing, audience and team-management capabilities, excluding reserved `settings.security_admin` and independent `reader.personal`.
- **Managing editor:** all-story editorial/publishing/review, media oversight, Page Editor publish, editorial operations, team view only; cannot change roles without separately reviewed override.
- **Editor:** all-story create/edit/review/publish/schedule/assign, revision publishing, media oversight; cannot manage team roles.
- **Staff writer:** own article creation and assigned-only view/edit/review submission; media upload and own-media edit; no publish.
- **Copy editor:** assigned-only story revision/edit/review; no general publish or team management.
- **Media editor:** media management plus assigned-only visual revision/story preview; no story publishing.
- **Moderator:** comment moderation/report queue only, no backstage story publishing.
- **Audience staff:** audience insights/notification/newsletter duties only, no general editorial access.
- **Freelancer:** **assigned-only** story/revision view/edit/submit, media upload and own-media editing; cannot create unassigned stories, publish, schedule, delete, assign colleagues, manage the homepage or team.

The CT-02d route gates are experimental **and disabled**. Before enabling, finish existing direct RLS and publishing/media RPC transition, verified first-owner membership and production authorization. A status flag alone is not secure deployment.

## 4. Proposed effective-permission resolution

1. Authenticate Supabase user, verify active membership, status, suspension and current admin-approved role/override records.
2. Derive union of role-preset capability grants; apply explicitly authorized per-member allow/deny overrides with explicit deny taking precedence. Never allow a routine role override to grant settings.security_admin.
3. Apply resource scope: story owner/author assignment, editor assignment, agency/freelancer contract/project assignment, media ownership, optional island/team assignment. Do not treat broad page visibility as permission to load hidden rows.
4. Enforce operation in server/API **and** direct RLS/RPC/storage access; dynamic sidebar/buttons reflect the same resolver.
5. Audit every privileged mutation (who, membership, target, before/after, reason, timestamp, request ID, IP if privacy policy permits).
6. Current database state (or securely versioned authorization checks) is source of truth for immediate revocation; do not rely exclusively on stale JWT role claims or editable user_metadata.

Special cases:
- Public frontend published-story reads remain available to anon according to publication/access level.
- Editorial drafts, active story_revisions, confidential media, moderation reports, invitations and role administration are NEVER available to anon.
- Protected public profile/byline pages are not equivalent to internal staff profiles.
- Existing SQL SECURITY DEFINER publishing function warning must be audited with unauthorized-call tests before privilege changes; do not eliminate warning by granting access more broadly or by breaking publishing.

## 5. Minimal schema design proposal (refine before migration)

Potential tables and key fields:
- staff_memberships: id, auth_user_id, status, member_type (employee/contractor/freelancer), joined_at, suspended_at, ended_at, invited_by.
- role_presets: id, key, display_name_en/es, is_builtin, enabled; seeded, versioned and admin-reviewable.
- role_capabilities: role_preset_id, capability_key; finite verified capability allowlist.
- membership_roles: membership_id, role_preset_id, assigned_by, assigned_at, expires_at nullable.
- member_capability_overrides: membership_id, capability_key, allow/deny, scope, reason, assigned_by, timestamps; explicit deny precedence.
- story_assignments: story_id, membership_id, assignment_type (author/editor/reviewer/copy/visual), status, deadline, created_by, timestamps.
- staff_invitations: id, invitee_email_normalized, role_preset, invited_by, token_hash (never plaintext), expiry, redeemed_at, canceled_at, resend/replacement audit; uniqueness and expiry checks.
- staff_access_audit: immutable event ID, actor/target, action, before/after scrubbed values, created_at, request context.
- workflow_events or story_review_requests for editorial approval queues.

Use the minimum tables that safely implement the acceptance criteria; avoid over-normalization or speculative future org/multi-tenancy. Verify whether the existing database schema already supports any of these concepts before creating migrations. Preserve existing writer/editor IDs and archived bylines; initial membership backfill must be audited, not blanket-promoted from restored fake accounts.

All mutations require migrations committed to GitHub with backups, idempotency, RLS, least-privilege grants and rollback notes. Evaluate unique indexes, foreign keys, stale invitations, concurrency and row locking on owner-role changes. Do not store plain invite tokens or secrets.

## 6. Frontend Admin Manager specification (/newsroom/team)

Reuse Newsroom top bar, sidebar, typography, controls and semantic colors. Subsections as tabs or existing-style navigation:
- Members: search, status, role(s), invitation/activation, last activity where privacy-approved, member detail drawer.
- Invite: email, role preset, access scope, expiry, optional message, send/resend/cancel; show accurate delivery status.
- Permissions: grouped capability toggles with preset defaults, lock indicators for unavailable admin capabilities, effective access preview, comparison before save, clear warnings on broad rights.
- Assignments: per-story scoped access, reviewer workflows, expiry or end date.
- Audit: chronological changed-by, permission diffs, filter by member/action, no secret content.
- Safety: confirmation for removal/suspension/broad rights, last-owner guard, reauthentication for privileged operations if needed, optimistic updates only after server confirms.
- Errors, loaders, keyboard/mobile and EN/ES are required; no empty settings panels as shipped features.

## 7. Contributor experience and onboarding

Default freelancer landing: /newsroom/contributor with 'Assigned', 'In progress', 'Submitted', 'Needs changes', 'Completed' work queues; existing editor reused in constrained mode. Permitted scope:
- Read assigned work and own submitted revisions, not unassigned newsroom drafts.
- Draft assigned article, attach permitted own media, submit review, see editor feedback and revision history for their assignment.
- Cannot publish, change editorial ownership outside assigned scope, delete published stories, bulk access Media Library, manage other contributors, access confidential comments, edit homepage, manage team, or change billing.
- Freelancers may be multiple assignments concurrently; hidden fields must also be disallowed on API writes and direct PostgREST operations.

Onboarding:
Admin chooses predetermined role, invitee real email, expiry and optionally initial assignment -> system sends single-use invitation -> invitee confirms/authenticates on Supabase -> verified identity redeems invite -> membership role and scope recorded atomically -> newsroom routes reflect role.
Protect against email mismatch, reused tokens, bulk invitation abuse, unauthorized signups and accidentally granting editor to readers. Plan a safe backfill for existing users and a reversible process for assigning byline to account. Email sender must be verified and working before live invitation emails.

## 8. Required negative-test matrix

For EACH protected route/API/RPC/storage action test: anonymous; authenticated reader; freelancer with assignment; freelancer without assignment; staff writer; specialized staff; editor; managing editor; owner/admin; revoked member; user with expired invite; user whose profile includes forged user_metadata role.

At minimum prove:
- Ordinary reader and anonymous user cannot see unpublished story list, revisions, contributor assignments, team API or private media metadata.
- Assigned freelancer can save/submit their own draft and receive feedback but cannot publish it or view others' drafts.
- A member cannot edit their own role flags or override records or impersonate another staff member by changing submitted IDs.
- Revocation prevents new privileged operations even with a preexisting signed-in session.
- Editors are unable to grant themselves owner privileges; last owner cannot be removed.
- Any SQL function using elevated rights verifies caller identity/capability and resource scope before side effects.
- All public content and reader personal accounts still work.

## 9. Current approval boundary

These are recommended starter presets and architecture, NOT yet an instruction to change live permissions or send invitations. In CT-02 the implementer must verify existing data/requirements, present any consequential privilege or deployment decisions and apply only reviewed safe migrations. Every finalized role/capability change updates this file plus IMPLEMENTATION_LEDGER.md in the same PR.
