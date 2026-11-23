# Clear Talks — Master Completion Blueprint
Version: 1.0 | Prepared: 2026-11-23 | Planning branch: planning/clear-talks-completion-2026-11-23
Source: GitHub 0445968/02022, main at f5c0140fb2db165e43303a064f7bc15b765d4505 (verified before planning).
Live site: https://clear-talks.vercel.app/ | New Supabase project ref: yqqzohrlhiitctwacdad
Related documents: ROLE_AND_PERMISSION_MATRIX.md, IMPLEMENTATION_LEDGER.md, NEXT_CHAT_HANDOFF.md.

## 1. Mission and guardrails

Complete all remaining Newsroom routes, the reader account portal, an administrator-facing staff access manager, and dedicated scoped freelancer/other-staff experiences. Implement in small, independently verifiable batches, with changes, SQL migrations, test results, PR links, and deployment notes committed to GitHub after **every** batch.

Non-negotiable product constraints:
- **Do not change any existing fonts or the current UI style.** Preserve Figtree (headlines), Source Serif 4 (subheadlines), IBM Plex Sans (body), Inter (interface), the existing CSS variables, components, layout rhythm, color palette, spacing, and existing visual treatment. Add features in established style; no unsolicited redesign, new design system, rebranding, font substitutions, or wholesale component replacement.
- Preserve all live published stories, historical revisions/versions, existing media, comments, editorial bylines, reader data, and working draft/publish workflows.
- Never reinstate DEV_AUTH_BYPASS, anon write/edit policies, or public elevated API credentials. Keep the Supabase publishable key in frontend environments; server secrets stay server-side and out of Git.
- Keep the new Vercel hosting separate from any old Vercel account, and the new Supabase project separate from the old Bolt project. Do not migrate/import the restored data again.
- No speculative functionality disguised as complete: a link to a future route is not a working feature; no fake stats, dummy pages, fake payments, or no-op controls.
- Respect bilingual EN/ES conventions already present. Make all role and permission enforcement server-side + Supabase RLS; client visibility is not authorization.
- Work on isolated feature branches. No push to production/main or public deployment without explicit approval of that release. Prefer preview and/or locally verified code; confirm final project/branch/environment before deployment. Plan/ledger changes themselves may be reviewed in a PR.
- Avoid deletions or disabling restored legacy Auth users until their foreign-key/story references, active sessions, and historical bylines are audited and a reversible preservation strategy exists.

## 2. Verified current baseline — implementation versus intentions

Snapshot based on actual repo inspection (GitHub main, 2026-11-23) plus user-tested live flows:
- Next.js 13.5.1 App Router / React 18 / TypeScript / Tailwind / Supabase JS 2.112.x and SSR 0.5.x. npm scripts: dev, build, start, lint, typecheck; no committed automated test suite or CI workflow observed. Verify exact installed dependency versions and supported migration paths before changing packages.
- Existing working user-confirmed: migrated database, 23 restored stories, 22 verified Storage images, Vercel deployment, real editorial sign-in/out, newsroom protection, draft save, article publish. Supabase security warnings reduced to two (privileged publishing function, leaked-password protection); final disposition is not yet a verified closed security review.
- Newsroom: dashboard /newsroom; stories list /newsroom/stories; create/edit/preview; media library; authors/bylines; front-page Page Editor. These have code and partial or user-tested functionality; do not mark every feature complete without fresh testing.
- Newsroom sidebar links exist **without matching route files** for /newsroom/comments, /newsroom/polls, /newsroom/schedule, and /newsroom/profile. These are implementation targets, not working pages.
- Reader portal /account, /account/saved, /account/comments have code; their navigation also points to currently nonexistent /account/notifications, /account/newsletters, /account/subscription, /account/profile, and /account/security. An older /[locale]/account page uses separate AccountSettings; reconcile route behavior without breaking links.
- Existing permissions rely primarily on profiles.is_author and profiles.is_editor, as well as lib/permissions and lib/permissions/stories. editorial_profiles represents public bylines and is distinct from accounts. This **is not yet** a per-user admin-controlled capability system.
- Existing story_revisions table provides one active unpublished working revision per published story (unique story_id) and publication workflow. The story status in stories.status is an **independent concept**. Current listStories in lib/services/stories.ts does not fetch featured_image_id or revision presence; components/editorial/stories-dashboard.tsx renders a 7-column table, no thumbnail and no unpublished-change indicator.
- Live code still contains DEV_AUTH_BYPASS branches; Vercel environment must remain false. The restored dev bypass database policies are absent. Check the two remaining Supabase Advisor warnings against latest results before changes.
- Front-end files anchoring current UI: app/layout.tsx, app/globals.css, tailwind.config.ts, components/editorial/newsroom-shell.tsx, components/editorial/newsroom-sidebar.tsx, components/account/account-shell.tsx, components/editorial/stories-dashboard.tsx.

### Route / feature inventory

| Area | Current source | State | Completion objective |
| --- | --- | --- | --- |
| Newsroom dashboard | app/newsroom/(shell)/page.tsx | Exists; metrics and profile summary | Role-scoped actionable dashboard, pending reviews/assignments, no bogus counts |
| Stories list/editor | app/newsroom/(shell)/stories; components/editorial/stories-dashboard.tsx | User-tested draft/publish; list lacks requested columns | Thumbnail + independent active-unpublished-changes column; task/assignment scopes |
| Authors | /newsroom/authors, editorial_profiles service | Exists, editor-only | Preserve public bylines, separate staff access manager |
| Media | /newsroom/media, /api/media/* | Exists | Enforce role-based upload/approve/delete and media rights, do not break public URLs |
| Page Editor | /newsroom/page-editor | Exists; front-page-focused | Audit all visible controls, page scope, permissions and publish/revert/history |
| Comments moderation | /newsroom/comments | Sidebar only; route absent | Real moderation queue, policies, reports, audit and filters |
| Polls | /newsroom/polls | Sidebar only; route absent | Poll drafts, questions, schedule, publish, results and voting safeguards |
| Schedule | /newsroom/schedule | Sidebar only; route absent | Editorial calendar, due/assignment dates, genuinely reliable publish scheduling |
| Staff profile | /newsroom/profile | Sidebar only; route absent | Staff identity, byline/account link, preferences and security handoff |
| Team access manager | Not present | New | Admin invite/role/per-user grants, audit/revoke, least privilege |
| Freelancer/staff newsroom | Not present | New | Assigned-only contributor workspace; other staff see role-scoped modules |
| Reader overview | /account | Exists | Real summaries, navigation to completed destinations |
| Reader saved stories | /account/saved | Exists | Verify bookmark/add/remove/pagination/access |
| Reader comments | /account/comments | Exists | Verify owner-only edit/delete/status and counts |
| Reader notifications | /account/notifications | Sidebar only | Preferences + delivered notifications, read state |
| Reader newsletters | /account/newsletters | Sidebar only | Consent, topics, confirmation/unsubscribe, real delivery pipeline |
| Reader subscription | /account/subscription | Sidebar only | Entitlement/billing management, real provider before charges |
| Reader profile | /account/profile | Sidebar only | Name, avatar, language, contact preferences, account edits |
| Reader security | /account/security | Sidebar only | Password recovery/change, session sign-out, account deletion/export safeguards |
| Legacy localized account | /[locale]/account | Separate page | Canonical/redirect strategy; do not break EN/ES |

## 3. Product information architecture

Newsroom shared shell and existing sidebar style remain the visual foundation. Show modules dynamically by **effective capability**, not hard-coded author/editor flags. Desired modules:
- /newsroom: personalized dashboard;
- /newsroom/stories, /newsroom/stories/new, /newsroom/stories/[id]/edit, /preview;
- /newsroom/media, /authors, /page-editor, /comments, /polls, /schedule, /profile;
- /newsroom/team (new; admin management of members, invitations, presets, overrides, access log);
- /newsroom/contributor (new; focused contributor/freelancer work queue, drafts, submissions, assigned assets; freelancer may land here on sign-in).
Do not expose staff-only links to readers, and do not expose administrative links to freelancers. Role-specific Newsroom is a **scoped experience in the existing visual system**, not a separate duplicate application.

Reader portal keeps its current shell and navigation; complete /account/notifications, /newsletters, /subscription, /profile, /security. Preserve /account/saved and /comments as real working functionality. Resolve the overlapping localized profile page using backwards-compatible redirects and locale preferences.

## 4. Specific Stories list contract (CT-01)

**Two independent axes, never conflate:**
1. Publishing status = stored story.status (draft, in_review, scheduled, published, archived).
2. Unpublished changes = whether an active story_revisions record exists for the story; for a currently published story, show a discrete 'Unpublished changes' badge/column while status stays 'Published'. For a never-published draft, show its status as 'Draft' without treating it as an active unpublished revision of a live publication.

Required UI:
- Small lazy-loaded, fixed-ratio preview of the **currently live/main story featured image**, next to headline or in compact image column; source stories.featured_image_id -> media_assets metadata, preserve meaningful alt text. Graceful no-image placeholder. Never show unpublished replacement image on public list as if already published.
- New clearly labeled 'Unpublished changes' column or equivalent indicator, with explicit values: Active draft / None. Optionally show revision updated timestamp and an edit-review link. Keep existing status, language, author, editor, category and updated date.
- Works for published stories with active revision, plus historical status types without false positives. Changes remain isolated to author/editor authorized views.
- Filter 'Has unpublished changes' and optional sort only after a scalable query is in place. Batch-fetch current page featured images and revision existence (or safe joins), avoid one network request per row; pagination and counts remain accurate under filters.
- Mobile responsive treatment and EN/ES strings; reuse existing font, badges, row heights, colors, hover behavior. No new UI style.
- Tests: published+revision, published+no revision, ordinary draft, revision discard, revision publish, media missing, no access to others' drafts, 20+ page rows, mobile, sorting/pagination. Publishing/discarding revision removes the indicator without mutating the status prematurely.

## 5. Staff access & onboarding architecture

See ROLE_AND_PERMISSION_MATRIX.md for detailed role presets, access matrix and security model. Key principles:
- Roles grant named capabilities; team membership and assignments additionally scope accessible records. Distinguish authentication (Supabase Auth user), newsroom membership, effective permissions, story assignments, and editorial byline. Never use a public byline as proof of access.
- Admin-facing manager with member directory, invites and resend/revoke, role preset selection, explicit granted/denied overrides, per-member effective-permissions preview, status/pending access, timestamps, and immutable audit history. Two-step confirmation for dangerous actions. Prevent self-promotion and accidental removal of the last owner.
- Role presets for owner/admin, managing editor, editor, staff writer, copy editor/fact-checker, visual/media editor, moderator, audience/newsletter staff, freelancer/contributor, and reader. Optional custom roles later, introduced only with server-defined capability allowlist and admin review.
- Freelancer onboarding via invitation to verified real email, expiry, one-time redemption and account linking; no general sign-up should self-assign staff privileges. Invited contributors see only assigned stories/tasks/approved media actions; can draft and submit for review but cannot publish, change role, list all sensitive material, access billing, or change site layout. Staff members see only their permitted modules and assignment scopes.
- Security enforcement must span Next.js route handlers/server components, RPCs, storage policies, row-level security, any export/search endpoints, and background jobs. Revoke must take effect without depending solely on stale JWT role flags. Add permission test matrix and audit trails.
- Migrate existing is_author/is_editor behavior compatibly before switching endpoints; preserve existing author_id and editor_id references, public editorial_profiles, and historical author credits.
- Verify Supabase Auth email/invitation deliverability and production email provider before invitations go live. Avoid sending invites to restored fictional legacy emails.

## 6. Delivery batches, ordered dependencies and acceptance gates

Every batch starts only after reading the current repo HEAD and ledger. Marked PLANNED at document creation; no application changes were made in this planning session.

### CT-00 — Safety, test harness and baseline inventory [P0, prerequisite]
- Confirm new Vercel production project, new Supabase ref, production branch and env variable names **without outputting secrets**; confirm DEV_AUTH_BYPASS false, sign-out blocks newsroom, public images load.
- Inspect current schema/migrations/RLS policies/function grants, missing routes, app navigation, ownership/backfill constraints, API enforcement. Record existing 2 advisor warnings and deferred decisions.
- Add a minimal automated smoke and permission regression test harness, CI with npm ci / npm run typecheck / npm run lint / npm run build, plus EN/ES route and basic e2e tests, without changing typography.
- Record baseline screenshots or markup references for UI parity; document rollback and data backup strategy.
- Gate: build/tests pass, snapshots intact, no prod DB mutation, exact dependencies mapped.

### CT-01 — Stories table: image thumbnails + unpublished-change column [P0]
- Implement section 4, update StoryListItem, listStories data fetching, table and dictionaries. Preserve all existing filters/sorting. No schema change expected unless justified by tests.
- Gate: independent status/revision behavior proved, no N+1, responsive/EN-ES, published article still shows Published with active revision badge, revision publish/discard updates indication.

### CT-02 — Permission model + migration + deny-first gates [P0, foundation for remaining]
- Add versioned schema for team memberships, role templates/role-to-capability mapping, member roles and scoped overrides, story assignments, staff invitations, and security audit trail. Choose normalized minimal schema and test constraints before applying.
- Create server-only effective-permission resolver; integrate identity, user profile and newsroom access with legacy compatibility phase. Introduce comprehensive RLS and server guard helpers without granting anything to anon or making ordinary readers staff.
- Convert existing story/media/page editor/author operations to documented capability checks in an incremental compatibility-safe manner.
- Gate: owner/admin, editor, staff writer, freelancer, normal reader, signed-out user tested across UI, API and direct DB calls, with allow and deny cases; no privilege escalation; signed-out flows still work.

### CT-03 — Frontend Team & Permissions Manager [P0]
- Add /newsroom/team inside current Newsroom shell: searchable members, invite status, roles, capability matrix, effective access summary, actions, audit log and revocation. Server routes and transaction logging required.
- Gate: admin can manage scoped permissions; non-admin denied at page/API/DB; cannot remove last owner or assign own elevation; stale-session behavior tested.

### CT-04 — Invited staff & freelancer onboarding [P0]
- Build invitation management with Supabase Auth-compatible verified-email redemption, expiry, resend/cancel, approved role presets, status lifecycle and atomic membership activation.
- Integrate contributor/staff profile creation, optional byline linkage, approval and disabled/suspended states; no false email-confirmed claims or blind user-metadata authorization.
- Gate: invite -> redeem -> default permissions -> first login -> revoke, duplicate/expired/bad tokens, staff vs reader signup isolation and audit history.

### CT-05 — Freelancer and role-specific Newsroom [P0]
- Build /newsroom/contributor with focused assigned work, draft create/edit, upload within quota, submit for review, respond to requested changes, profile, and minimal sidebar. Other staff presets see capability-specific navigation.
- Reuse existing story editor and media components rather than forking their logic or redesigning.
- Gate: freelancers cannot view unassigned drafts, publish, change page editor, manage users, moderate, or access privileged assets; editors see and assign work.

### CT-06 — Story assignment, collaboration & review workflow [P1]
- Add owner/assignee, review requests, editors, decision notes, requested changes, due dates, notifications, revision history integrity and who-did-what event log.
- Preserve published version vs unpublished revision separation, conflict-safe save/autosave and existing versions/restore. Scheduling and approval cannot accidentally make a draft public.
- Gate: contributor submits -> editor accepts/rejects -> publish, revision remains separate until approval, permission & race tests.

### CT-07 — Newsroom Comments & Moderation [P1]
- Implement missing /newsroom/comments: queue by status/report, search/story/author filters, approve/hide/delete with reason, reports, appeals/restore as supported, bulk actions with confirmation and event log.
- Respect reader comment history and visibility rules; do not expose unpublished comments through public endpoints.
- Gate: moderator only permissions, audit and per-story handling; reader comment state reflects moderation.

### CT-08 — Newsroom Schedule & Editorial Calendar [P1]
- Implement missing /newsroom/schedule: calendar by assigned tasks/story publication targets, editors/reviewers, conflicts, deadline alerts, and links to existing stories.
- If offering auto-publication, implement a verified idempotent authorized scheduler with replay handling, reliable provider and observability. Vercel legacy Cron precision/cadence differs by plan; verify current account capability before choosing a minute-level scheduling promise. Never claim a schedule is active until a real job is installed and tested.
- Gate: schedule, modify, cancel, idempotent publish, incorrect timezones/DST, failed job and manual fallback all tested.

### CT-09 — Newsroom Polls [P1]
- Implement missing /newsroom/polls: create/edit questions/options, draft/review, open/close windows, editorial publish/retire, response caps, visible results and moderation as appropriate.
- Add public voting components/API only after privacy, abuse protections, duplicate vote rules and data retention policy are specified.
- Gate: voting and results cannot be manipulated by unprivileged users, closed polls remain closed, bilingual UI.

### CT-10 — Newsroom Profile and editorial dashboard completion [P1]
- Implement missing /newsroom/profile: user info, preferences, password/security handoff, byline linkage, optional headshot; do not permit self-editing role flags.
- Dashboard: real assignments, recent review events, summary metrics scoped by effective permissions; hide unauthorized actions; replace stage notice only when genuinely complete.
- Gate: role-scoped user experience, account/byline distinction and no broken profile controls.

### CT-11 — Existing Author, Media, Page Editor and public output audit [P1]
- Complete missing behavior in already-rendered controls, check front-page drafts/publish/revert/history, media moderation/rights/asset delete, editorial byline management and homepage article previews. Distinguish page-editor destinations actually supported from unimplemented tabs.
- Gate: all existing visible operations perform real changes with correct privileges and public frontend reflects reviewed updates; no visual change to current UI.

### CT-12 — Reader profile and security pages [P1]
- Implement /account/profile and /account/security, with bilingual naming, editable permitted profile info, language/avatar preferences, password update/reset, email change verification, active-session/revocation controls where supported, account export/deletion flow with confirmation and privacy constraints.
- Consolidate /[locale]/account compatibility and account links. Do not expose editorial role controls.
- Gate: reader can maintain own data, other users cannot access it; tested verification links, invalid sessions, sign-out, deletion safeguards.

### CT-13 — Reader notifications and newsletters [P1]
- Implement /account/notifications inbox, read/unread controls, preference matrix, actual event triggers from stories/replies/editorial changes where authorized; delivery retention rules.
- Implement /account/newsletters with topic subscriptions, double opt-in where needed, unsubscribe/resubscribe/preferences, actual email integration and bounce/no-send behavior.
- Gate: permission/consent, unsubscribe reliability, duplicate send prevention, real delivery, clean public preference state.

### CT-14 — Reader subscriptions, paid entitlements and account completion [P2, gated by product decisions]
- Implement /account/subscription with plan display, access entitlements, billing provider integration, change/cancel, webhook signature verification/idempotency and billing history. Only activate charges if business plan, pricing, taxes and Stripe account are authorized and configured.
- Keep /account/saved and /comments stable; check paginated lists, bookmarks, content access levels and denied entitlements. Never launch mock billing.
- Gate: provider test mode flows, cancel/refund/failed payment reconciliation, webhook retry, role-independent entitlement security. If paid product not approved, finish the page with truthful 'not offered' state and keep charging disabled.

### CT-15 — Cross-site release readiness and closure [P1/P2]
- Review broken links, route completion, reader and newsroom navigation in both languages, keyboard/accessibility and responsive behavior, SEO/indexing/auth redirects, email templates, edge/API errors, media access, performance and Vercel runtime logs.
- Re-run RLS advisors and permission matrices; explicitly document retained warnings and justified exceptions; retire fictional accounts only through separate reviewed preservation plan.
- Final acceptance: no dead-end sidebar routes, no unauthenticated access to protected pages/data, no regression in live article publishing, media uploads, reader experience, or existing look and feel. Obtain explicit production approval and record deployment verification.

## 7. Batch execution protocol — modeled on user's My Texas Case approach

One coherent feature slice per batch; split large batches into CT-XXa/XXb if needed. No bulk patch containing unrelated modules.

**Before each batch**
1. Read this blueprint, ROLE_AND_PERMISSION_MATRIX, ledger, open PRs, and latest branch/main HEAD. Recheck user-specified constraints. Reconcile what is already merged, what exists only on a feature branch, and pending SQL. Never apply to an assumed historical baseline.
2. Inspect impacted code, schema/permissions, auth/RLS policies, .env.example names, latest safe migration IDs, and any AGENTS.md instructions if subsequently introduced.
3. Choose minimum implementation slice with exact acceptance criteria and reversible approach. Note whether a production data migration, deploy, external vendor, or billing decision requires separate approval.

**During batch**
4. Implement on isolated branch from verified baseline. Maintain current CSS/typography invariants; no cleanup/refactor beyond necessary files.
5. If schema changes: create ordered committed SQL migrations, a read-only preflight, data-backfill/rollback plan, and role/RLS test queries. Never apply old dev-bypass migrations to the new restored database. Request approval before applying hosted mutations.
6. Exercise permission-negative tests (anonymous, reader, staff roles, freelancer, admin), happy/edge paths, EN/ES, mobile, and error messages. Add or update regression tests alongside code.

**After batch**
7. Run npm ci as needed, npm run typecheck, npm run lint, npm run build, and the relevant unit/integration/e2e/RLS tests. Do not 'fix' a failing build by replacing a feature with placeholder content. If environment prevents checks, label them UNVERIFIED rather than PASSED.
8. Stage a reviewable commit/PR with descriptive scope, test outcomes, migration names, Vercel preview URL if available, and risks. Do not merge/deploy production without explicit user approval.
9. Update IMPLEMENTATION_LEDGER.md **in the same feature PR**: state (PLANNED/IN PROGRESS/IMPLEMENTED/TESTED/DEPLOYED/BLOCKED), files/migrations, decisions, commit SHA/PR, checks/observed errors, next batch, and any changed requirements. Keep an appended dated session log. Include links to artifacts and exact command(s) only if useful.
10. State what was actually done and what remains; do not require user to paste successful terminal output, only failures if the user prefers.

**Single source of truth**
- Master blueprint = requirements and acceptance criteria; update via versioned PR if scope changes.
- Role matrix = security/role contract; update with migrations and tests.
- Ledger = actual state, evidence and blockers; do not call a merely coded item deployed.
- Handoff = most recent safe next action; update it at end of every working session.
- If interrupted, new conversation starts by reading these files, not reconstructing the plan from conversation memory.

## 8. Cross-cutting quality and security acceptance criteria

- Authorization: deny by default; RLS + API guards, no role permission granted by profile editing or user_metadata; role changes auditable; team admin manager protected from staff.
- Data: preserve foreign keys to legacy profiles, byline associations, version history; no destructive data import or unsafe enum changes; idempotent migrations and existing production data backfill.
- UX: current four fonts, palette, shell, headline/table styles and spacing unchanged; accessible focus, alt text, labels, loading/errors, responsive desktop/mobile; EN/ES labels.
- Stories: publish/draft/history/edit, image selection/URL, restored articles unchanged; active published-story revision indicator independent of status.
- Reader: owner-only bookmarks, comments, profile/security/billing/notifications; consent and privacy requirements.
- Reliability: no duplicate notifications, payments, poll votes or scheduler jobs; API rate limits; observable event logs.
- Production: confirm new Vercel team/project identity; test against new Supabase ref; do not expose sb_secret_/service_role keys in repo or NEXT_PUBLIC_ variables; keep legacy services untouched until dependencies reviewed.

## 9. Priorities, sequencing, open decisions

Start CT-00 and CT-01 immediately in the **next chat**. After Stories quick win, CT-02 permission foundation must precede admin access and freelancer onboarding. Finish missing Newsroom modules, then reader portal, then comprehensive release checks. CT-14 billing remains conditional on user approving a paid product; do not hold up the free reader portal for Stripe decisions.

Decisions requiring confirmation only when their batch begins: exact staff role labels/presets and override power, invitation sender/domain/email provider, freelancer contract/privacy policy, newsroom polling/voting policy, scheduling reliability/plan, newsletter service, subscription pricing and taxes, account deletion retention. Use safe defaults in ROLE_AND_PERMISSION_MATRIX as proposals, not silently bind business decisions.

## 10. Current approved work versus future implementation

This planning change commits **only documentation**. No app feature, RLS migration, Vercel environment setting, or Supabase record is changed here. Start implementation in new conversation on CT-00/CT-01 after checking current HEAD; follow the ledger strictly.
