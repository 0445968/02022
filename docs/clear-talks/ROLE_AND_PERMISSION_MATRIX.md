# Clear Talks — Staff Roles, Permissions & Onboarding Contract
Version: 1.0 proposal | 2026-11-23 | Companion to MASTER_COMPLETION_PLAN.md.
Status: CT-03c draft PR #18 adds a bilingual versioned role preset permissions editor with restricted capability/scope ceilings, immutable Owner role, explicit owner-authorized/audited grant replacements and stale revision rejection. Proposed presets remain suggestions until a current owner explicitly saves them; **NO automatic grants or preset seed**, and all three server flags stay OFF. CT-02a–k and CT-03a–b are still draft/unmerged/unapplied. **NO hosted SQL, first Owner, staff grants, Storage changes, Vercel flags or deployment.** Disposable Auth/Storage tests, approved first owner, verified DB+Storage backup/restore, zero migration history reconciliation and EN/ES browser tests remain mandatory before live permissions activation.

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

### CT-04a.1 staged invitation contract

[Draft PR #19](https://github.com/0445968/02022/pull/19): strict finite nonowner role/member type and approved preset revision, explicit reason/confirmation, invite expiry at most 7 days, contractor/freelancer membership expiry at most 365 days and after invite expiry. No caller-supplied scopes, actor/byline IDs or grants. 256-bit random URL-safe token with domain-separated hash and constant-time comparison; raw token never persisted/logged. Verified current Auth email, confirmation, identity and invite state must be checked again by an atomic DB transaction. A preflight true result is NOT permission. Role grants remain disabled and unseeded; actual persistence, owner approval, one-time redemption, resend/revoke, UI, sender approval and real Auth tests remain next. No invitations sent or members created.

### CT-04a.2 staged database lifecycle

[Draft PR #20](https://github.com/0445968/02022/pull/20): unapplied invitation storage/RLS and service-only invoker RPCs, finite nonowner roles, current verified Auth email with confirmation/ban/deletion checks, active nonexpiring employee Owner with actual team.invite and no active deny, reviewed preset revision plus actual grant fingerprint and valid newsroom.access. 30 issues/replacements per owner/hour, one outstanding invitation/email, atomic replacement/cancel, one-time consume+membership+role+audits under shared lock. No existing membership revival, byline linkage, auto-grants or user creation. Owner listing only masked email/status, no hash. New narrow service-role SELECT on six Auth identity/status columns requires approval with real disposable verification; never expose auth schema or service key. Existing Owner preset must have deliberately reviewed grants in bootstrap order. All UI/server API, real JWT/email-change/SMTP delivery and first-login QA remain pending. No live SQL, emails or permission changes.

### CT-04a.3 staged frontend and API

[Draft PR #21](https://github.com/0445968/02022/pull/21): separate disabled-by-default invitation flag, fresh verified Auth user plus live team.invite and independent current Owner DB check for management; redemption available to verified readers only via token POST, no staff roles required before redeem. Strict streamed 4KB bounded same-origin JSON; no caller actor/role grant in redemption. EN/ES manual code manager and redemption page, exact original email for replacement, masked list, explicit reason/confirmation; raw code returned once after issuance, no automatic delivery, no public query-string or persistent storage. No new database grant/migration or Auth user admin. Real Auth/browser tests and delivery/sender approval remain; CT-04b first-login and separate byline linkage follow.

### CT-04b.1 staged first-login private profile

[Draft PR #22](https://github.com/0445968/02022/pull/22): private membership-keyed staff profile, RLS and service-only self read/save, fresh verified Auth identity, active nonexpired membership and deny-first current newsroom.access, revision conflict and scrubbed audit. Separate disabled onboarding flag, EN/ES first-dashboard-login profile, read-only assigned roles/expiry, private display name/language and acknowledgement, optional byline request preference. No public byline or reader profile write, no authority from onboarding, no automatic grant, no backfill. Actual byline approval/link/reject/unlink separate CT-04b.2 and must preserve published attribution. Dashboard onboarding is UX not a new authorization boundary; deeper pages/APIs remain capability-gated. Real Auth and browser checks pending; no live migration or release.

### CT-04b.2 staged private byline association

[Draft PR #23](https://github.com/0445968/02022/pull/23): current verified nonexpiring active employee Owner with actual all-scope byline.manage and no deny; independently reviewed private request approval/reject/unlink, revision conflicts, audited transitions, unique eligible association to unlinked or same-account author only. All existing 18 published stories resolve account-linked authors; never overwrite legacy editorial_profiles.account_id or article author_id. Narrow five-column SELECT grant for service role requires release review; no legacy UPDATE or automatic public publication. New disabled flag; EN/ES owner admin directory, no staff-facing review status yet (CT-10). Public attribution model and existing Authors workflow compatibility CT-11, FK restrict deletion until unlink. No privilege grant or live changes.

### CT-05a staged scoped Newsroom

[Draft PR #24](https://github.com/0445968/02022/pull/24): actual verified current membership grants and deny-first policy drive sidebar and landing. Broad story.view_all only sees newsroom-wide counts/list; limited staff land on own active assignments with exact story.view_assigned checked before title data, preview only. Independent direct page guards for full legacy editor, story creation, revision/version preview, author management, homepage and media; resource-specific denies rechecked. Upload-only staff private draft panel only if private media flag active. Partial capability editor controls and staff-writer creation intentionally withheld until CT-05b granular UI and payloads. Missing module routes hidden in V2, no role-name defaults, no new grant, no live release. CT-06 assignment/review workflow and CT-07/08/09 modules follow.

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


### CT-05b.1–2 staged contributor copy editing
[Draft PR #25](https://github.com/0445968/02022/pull/25) and [#26](https://github.com/0445968/02022/pull/26): exact assigned copy edit/view and newsroom access, submit_review for transition to in_review; assigned-only cannot reopen or edit submitted drafts. Published revisions additionally require exact revision.view/revision.edit_assigned, live + revision CAS, metadata preserved; no public publishing, author changes, scheduling, new media or permission grants. Direct DB guards, narrow authenticated invoker RPCs. CT-05b.3 safe creation, CT-05b.4 media, CT-06 actual review decisions; prior production gates remain.


### CT-05b.3 staged writer creation
[Draft PR #27](https://github.com/0445968/02022/pull/27): actual newsroom.access/story.create plus prospective self-assigned view/edit and current verified identity; atomic private narrowly privileged draft and own internal assignment creation with audit and exact post-assignment recheck. Public author unset; no direct role/assignment grant or publish privilege. Idempotent request retry, strict input, public invoker wrappers, default-off app flag and no live migration. Generated search index guard correction. Review private definer and full legacy parity before release. CT05b.4 media and CT06 editorial workflow next.


### CT-05b.4 staged approved contributor inline media
[Draft PR #28](https://github.com/0445968/02022/pull/28): exact current assigned view/edit and global media.upload, plus revision.view/edit_assigned for published source, allow safe approved image picker. No media.view_all grant or unrestricted base-table access. Only canonical cleared public asset nodes, no private URL, exact credit/caption/alt/asset ID/source and tagged revalidation on save/submit. Existing untagged legacy images preserved; new clones/forgery denied. Narrow draft/revision CAS invoker RPCs, direct assigned-only guards. No featured-image mutation or approval/promotion privilege; existing private upload/review workflow separate. Aggregate quota next and CT06 actual approval/publish gate; no live changes.


### CT-05b.4b staged private media quota
[Draft PR #29](https://github.com/0445968/02022/pull/29): actual newsroom.access and media.upload required, 25 immutable reserved paths per authenticated account, 10MiB file max (250MiB upper bound, not actual measured bytes). Standard JWT Storage upload only to reserved path, no private overwrite or signed upload URL creation; no new public media insert/update by limited staff, independent approval/edit_all needed. Existing reviewer promotion path remains. No automatic slot reclamation or reset; owner-configurable quota/retention CT11 release gate. No broad permission grants or live migration. CT06 review decisions and assignments next.


### CT-06a staged editorial assignment lifecycle
[Draft PR #30](https://github.com/0445968/02022/pull/30): actual newsroom.access, exact story.view_all + story.assign and verified current actor manage only this story's assignments. Minimal eligible staff picker (editor preset need not have team.view), no auth IDs or team admin details. Target active verified identity and prospective existing view/edit/review/media grants with deny precedence. Internal author/editor/reviewer/copy/visual labels do not change role grants or public bylines. No self mutation; create/reschedule/complete/revoke/reopen with CAS and audit reason, no delete; last active assignment closure removes assigned scope. No auto publication/review decision. Narrow private definer and public invoker RPC, flag OFF. CT06b review requests/decisions and CT06c mandatory approval next.


### CT-06b.1 staged editorial review lifecycle
[Draft PR #31](https://github.com/0445968/02022/pull/31): current verified newsroom actor with exact story view, revision.view for revisions; submit_review plus edit for request, story.review for independent decision; no requester/creator/updater/latest actual editor/active author assignment self-approval. Private immutable request/decision records and exact version fingerprint+epoch, requested changes or rejection returns working copy to draft, approval does not publish. Current approval helper is not yet enforced by publisher. No direct table grants or new roles. Strict session API flag OFF; submission/UI inbox integration CT06b.2, mandatory publishing gate CT06c. No live changes.


### CT-06b.2a staged review interface and atomic submission
[Draft PR #32](https://github.com/0445968/02022/pull/32): existing current submit_review + exact edit/view (revision.view/edit where applicable), saved draft fingerprint, restricted copy and tagged media recheck, atomically transition working copy and create exact final snapshot request; recover existing in_review. Independent current reviewer decides with notes; review page shows current/previous history and pinned preview, no publication. Scoped editor/preview links, flag OFF. Inbox and internal notifications CT06b.2b, mandatory publication gate CT06c. No live changes.


### CT-06b.2b staged review inbox / feedback
[Draft PR #33](https://github.com/0445968/02022/pull/33): current verified newsroom access; pending exact independent story.review and view, revision.view as appropriate, latest current undecided request only. Feedback original requester only and current submit/edit/view + existing working copy; private self-only idempotent read acknowledgement, no raw table grants or other-recipient data. Flag OFF, no push/email/global count. CT06c mandatory approval/media gate next.


### CT-06c.1 staged immediate publication gate
[Draft PR #34](https://github.com/0445968/02022/pull/34): verified publisher current newsroom/access, story view/edit/publish and revision.view/publish where needed, latest independent exact current approval and current actual reviewer grant recheck, eligible media. Narrow private publisher transaction permit, direct live writes/taxonomy and legacy RPC denied, immutable publication event, no direct grants. Status-only archive permitted with existing verified authority. Scheduling fail closed pending CT06c.2; do not activate independently. Flag OFF, no live changes.


### CT-06c.2 staged reviewed scheduling
[Draft PR #35](https://github.com/0445968/02022/pull/35): current verified exact story view/edit/publish and story.schedule (revision.view/publish if revision) authorize future exact approved queue, cancel with current authority; current independent reviewer/actor/media revalidated at DB due time. Owner-only private bounded executor, no API role or caller clock/actor; no duplicate, blocked failures, cancel before manual publish. Separate queue preserves in_review source; CT08 status projection/calendar and actual job installation required. No legacy auto publication, flag OFF, no live changes.


### CT-07a staged audited comment moderation
[Draft PR #36](https://github.com/0445968/02022/pull/36): verified newsroom access + exact published-story comment.view_queue or comment.moderate for queue/detail, current exact comment.moderate for audited actions, no own-comment moderation, explicit deny/assignment scope. Reader edit/erase preserved. Approve/hide/restore-to-pending/remove-redact, revision CAS and reason, private immutable events, no direct authenticated staff update/delete. Scoped comment.manage_reports required for report reads/counts, direct report disposition blocked until CT07c. API flag OFF, UI next CT07b. No live changes.


### CT-07b staged moderation interface
[Draft PR #37](https://github.com/0445968/02022/pull/37): existing CT07a exact DB permissions and verified session, scoped Comments navigation with global view_queue/moderate or current published assigned grant, bounded assignment discovery. Per-comment action availability from current projection and explicit reason/confirmation, no raw HTML or new grants. Report count/filter requires comment.manage_reports; report-only access and resolution CT07c. Flag OFF, no live changes.


### CT-07c.1 staged audited reports
[Draft PR #38](https://github.com/0445968/02022/pull/38): verified current newsroom + exact published-story comment.manage_reports for redacted queue and detail/decision; no raw other reporter IDs, no self-report or own-comment resolution. Dual report/comment revision CAS, recorded actual actor/reason, terminal dismiss/actioned, actioned requires exact matching audited hide/remove event. Reader own create/read preserved; report-only navigation and reader form CT07c.2. Flag OFF, no live changes.


### CT-07c.2a staged staff Reports UI
[Draft PR #39](https://github.com/0445968/02022/pull/39): report-only current comment.manage_reports can discover Reports and resolve independent reports without comment.moderate. Current scope enforced per row/action in existing CT07c1 SQL; separate exact comment queue/moderation rights for comment link, actual report rights and same story/comment for return link. No raw other reporter IDs; no automatic comment mutation. Flag OFF, no live changes.


### CT-07c.2b staged reader reporting
[Draft PR #40](https://github.com/0445968/02022/pull/40): current verified reader only, exact published third-party comment and displayed timestamp, one report per comment with duplicate receipt recovery. Own report status projection only, no reviewer IDs/internal notes or raw report table grants. Existing staff scope and resolution preserved, no auto moderation. Flag OFF, no live changes.
