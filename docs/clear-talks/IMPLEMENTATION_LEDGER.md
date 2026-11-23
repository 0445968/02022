# Clear Talks — Implementation Ledger and Session Log
Last updated: 2026-11-23 | Plan version: 1.0
Project: https://github.com/0445968/02022 | Planning branch: planning/clear-talks-completion-2026-11-23
Planning draft PR: https://github.com/0445968/02022/pull/2 (documentation only; not merged)
Master: MASTER_COMPLETION_PLAN.md | Roles: ROLE_AND_PERMISSION_MATRIX.md | Handoff: NEXT_CHAT_HANDOFF.md

## Rules for state labels

PLANNED: requirements only. IN PROGRESS: active unmerged code. IMPLEMENTED: code committed but not all checks verified. TESTED: tests/checks pass and PR reviewed, deployment unconfirmed. DEPLOYED: verified on intended Vercel production environment. BLOCKED: cannot safely proceed; exact reason recorded. Never promote statuses from assumptions or an app build alone.

Every code batch must update the row AND append an entry under Session log in the same PR, including test commands/results, SQL migration/backfill, Git commit SHA, PR URL, decisions, security implications, Vercel target, and confirmed release state.

## Development queue

| ID | Feature | Priority | Depends on | State | Evidence / link |
| --- | --- | --- | --- | --- | --- |
| CT-00 | Baseline, safety, tests and CI | P0 | none | IMPLEMENTED | [Draft PR #3](https://github.com/0445968/02022/pull/3); CI passed, browser QA pending |
| CT-01 | Stories thumbnails + active unpublished revision indicator | P0 | CT-00 baseline | IMPLEMENTED | [Draft PR #4](https://github.com/0445968/02022/pull/4); 13 tests and CI green, browser QA pending |
| CT-02 | Permissions schema, server API and RLS foundation | P0 | CT-00 | IN PROGRESS | CT-02a [#5](https://github.com/0445968/02022/pull/5), CT-02b [#6](https://github.com/0445968/02022/pull/6), CT-02c [#7](https://github.com/0445968/02022/pull/7), CT-02d [#8](https://github.com/0445968/02022/pull/8): proposed role presets and feature-gated routes; full RLS/cutover pending |
| CT-03 | Newsroom team/admin permission manager | P0 | CT-02 | PLANNED | Roles contract |
| CT-04 | Invited staff/freelancer onboarding and preset assignment | P0 | CT-02/03 | PLANNED | Roles contract |
| CT-05 | Freelancer/contributor and staff-scoped newsroom | P0 | CT-02/04 | PLANNED | Roles contract |
| CT-06 | Story assignments and editorial review workflow | P1 | CT-02/05 | PLANNED | Blueprint §6 |
| CT-07 | Newsroom Comments moderation | P1 | CT-02 | PLANNED | Missing route |
| CT-08 | Newsroom Schedule/editorial calendar | P1 | CT-02/06 | PLANNED | Missing route |
| CT-09 | Newsroom Polls | P1 | CT-02 | PLANNED | Missing route |
| CT-10 | Newsroom Profile and dashboard completion | P1 | CT-02/05 | PLANNED | Missing route |
| CT-11 | Authors, Media, Page Editor and public-page audit | P1 | CT-02 | PLANNED | Existing partial modules |
| CT-12 | Reader Profile and Security | P1 | CT-00 | PLANNED | Missing routes |
| CT-13 | Reader Notifications and Newsletters | P1 | CT-07/12 | PLANNED | Missing routes |
| CT-14 | Reader Subscriptions/entitlements | P2 | CT-12, approved billing details | PLANNED | No charges without approval |
| CT-15 | CT-15a UI/UX refinement; CT-15b accessibility/responsive/performance; CT-15c regression/release | P1 | all launched batches | PLANNED | Dedicated final UI pass approved Nov 23; preserve current fonts/style until reviewed |

Notes: CT-00 and CT-01 are the intended opening work in the next chat. CT-02 precedes meaningful staff authorization changes; permission checks can be introduced gradually. CT-14 is gated and should not delay other reader portal functionality. Split into a/b slices as necessary; do not lump unrelated changes into one PR.

## Current live baseline (user-verified before this plan)

- New Vercel site: https://clear-talks.vercel.app/ (independently imported, not a transferred old Vercel project).
- New Supabase project ref yqqzohrlhiitctwacdad, 23 stories, 41 versions, 4 revisions, 3 legacy auth users/identities, 3 profiles, 22 media records and 22 checksum-verified Storage objects restored at audit time. New real editorial account was then created and admin role granted. Do not interpret old count of 3 users as current.
- User verified working: deployment, real sign-in/out, logged-out newsroom denial, full editorial access, saving drafts, publishing stories. Website remains live.
- Supabase Security Advisor: 2 warnings remain (privileged story-revision publishing function; leaked-password protection not enabled). Earlier security cleanup resolved 8 search_path warnings and 1 broad media-list policy warning. Do not label these two warnings resolved without fresh evidence.
- Legacy placeholder email identities still exist; may have restored story/byline foreign key links. Do not delete blindly.
- Current repository: main commit f5c0140fb2db165e43303a064f7bc15b765d4505, verified 2026-11-23; no AGENTS.md, no test suite/CI seen in tree. Verify HEAD each new session.
- Fonts/styles to preserve: Figtree, Source Serif 4, IBM Plex Sans, Inter; existing app/globals.css, app/layout.tsx, tailwind.config.ts, newsroom/reader shells. Do not redesign.
- Missing Newsroom sidebar routes: comments, polls, schedule, profile. Missing reader account sidebar routes: notifications, newsletters, subscription, profile, security. Existing authors, media, page editor, story editor, /account, saved and comments require focused audits not blanket rewrites.

## Batch completion record template (copy for each slice)

### [YYYY-MM-DD] CT-XX[a] — Feature label
- Status BEFORE -> AFTER:
- Confirmed base SHA/branch and branch HEAD:
- Scope and acceptance criteria:
- Files modified:
- SQL migration identifiers / audit / rollback:
- API/RLS permissions changed and negative tests:
- Design/font parity check and EN/ES/mobile check:
- Commands and exact results (npm typecheck/lint/build, test suite, SQL checks):
- Preview URL and manual QA:
- Git commits and PR link:
- Production approval / Vercel environment / deploy ID:
- Remaining defects and risks:
- Next safe slice:
- User approvals or changed requirements:

## Session log (append-only)

### 2026-11-23 — Planning and repository audit
- Audited GitHub 0445968/02022 main at f5c0140fb2db165e43303a064f7bc15b765d4505, confirmed route tree, current Newsroom/sidebar, reader/sidebar, story list/revisions service, permissions, auth, application CSS and font mapping, package scripts, no AGENTS.md/tests/CI.
- Documented current working Vercel/Supabase migration baseline and remaining 2 warnings from user-verified flow.
- Created isolated branch planning/clear-talks-completion-2026-11-23 and draft documentation PR #2 (https://github.com/0445968/02022/pull/2).
- Added MASTER_COMPLETION_PLAN.md, ROLE_AND_PERMISSION_MATRIX.md, this implementation ledger and NEXT_CHAT_HANDOFF.md.
- Planning documents only. No application code, permissions, database records, API keys, or hosting settings changed. No build/test asserted from planning.
- Next: new chat reads planning files and verifies latest HEAD; CT-00 preflight/test harness and CT-01 stories list thumbnails/unpublished-changes semantics are the first two slices. Do not begin role migrations until reviewed.

### 2026-11-23 — CT-00 safety baseline and test harness
- State: PLANNED -> IMPLEMENTED (automated CI run and browser/RLS integration not yet verified).
- Verified source: main `f5c0140fb2db165e43303a064f7bc15b765d4505`; planning head `b47c89ffbf0a94e80078375c3c73adc564f1d144`.
- Implemented on `feature/ct00-baseline-ci-2026-11-23`: `.github/workflows/clear-talks-checks.yml`, `tests/newsroom-access.test.mjs`, `scripts/smoke-routes.mjs`, `package.json`, `docs/clear-talks/CT00_BASELINE.md`, this ledger.
- Code commit: `97472f5284bfcfcb90f98274126b59be99aef968`; review: https://github.com/0445968/02022/pull/3 (draft, base planning branch). Ledger recorded in follow-up commit within that PR.
- SQL migrations applied: **none**. Read-only query confirmed hosted migration registry empty, 23 stories, 18 published, 4 published with active revisions, 11 featured image references, RLS enabled. No data/auth/publishing/storage modifications.
- Security findings unchanged: authenticated-executable `publish_story_revision` SECURITY DEFINER warning; leaked-password protection disabled. DEV_AUTH_BYPASS remains disabled by required CI configuration; live Vercel env value not independently readable.
- Tests configured: `npm test` (role-denial unit checks + Newsroom server gate source assertions); `npm run smoke:routes` optional EN/ES HTTP + signed-out Newsroom redirect against explicitly approved URL. CI: `npm ci`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
- Test results: **UNVERIFIED pending GitHub Actions**; local environment cannot clone external repository or install npm deps. This record does not claim tests passed. Manual signed-in API/RLS checks, mobile, live image delivery remain pending.
- Font/style: no CSS, global font settings, existing Newsroom/reader shell files changed. Baseline components listed in CT00_BASELINE.md.
- Production deployment: **none authorized or initiated**; preview URL: not verified. Connected Vercel account did not resolve project/hostname; confirm correct team/project prior to any release.
- Rollback: revert commits in PR #3. No schema rollback required.
- Next: CT-01 add batched metadata and Stories table image/active-draft indicators; add data-state unit tests. CT-02 later handles RPC and role security.

### 2026-11-23 — CI completion evidence for CT-00 (append-only update)
- GitHub Actions `Clear Talks quality gates`: commit `c7dd5638f36a0380f3f7afb394da8c0549c8a034`, run `45275485231`, completed **success**. `npm ci`, `npm test` (4 passed, 0 failed), `npm run typecheck`, `npm run lint`, and `npm run build` all finished successfully. ESLint reported existing non-fatal image/React-hook warnings; no appearance changes in CT-00.
- CT-00 remains IMPLEMENTED rather than TESTED because the PR has not been independently reviewed and the EN/ES HTTP smoke against an approved preview has not been run. No production deployment.

### 2026-11-23 — CT-01 Stories thumbnails and active unpublished changes
- State: PLANNED -> IMPLEMENTED (automated tests passed; browser preview and user review still pending).
- Source: CT-00 branch head `c7dd5638f36a0380f3f7afb394da8c0549c8a034` based on verified planning/main. Isolated feature branch `feature/ct01-stories-unpublished-changes-2026-11-23`.
- Scope implemented: stories list now fetches main `featured_image_id`, batches `media_assets(id,url,alt_text)` and visible `story_revisions(story_id,updated_at)` for the paginated set. Render a small lazy-loaded main image or no-image placeholder next to headline; new independent Active draft / None column and EN/ES strings. Published `story.status` remains Published during revision. No unpublished replacement image is displayed as public/current featured image.
- Existing search/status/language/author/category/island filters, sorting, 20-item page offset/count, other columns, Newsroom typography and CSS classes are preserved; table retains horizontal overflow for small screens. Revision-based filter/sort intentionally deferred to avoid miscounting pages without DB-side filtering.
- Files: `lib/services/stories.ts`, `lib/services/story-list-metadata.ts`, `types/editorial.ts`, `components/editorial/stories-dashboard.tsx`, `messages/en.json`, `messages/es.json`, `tests/story-list-metadata.test.mjs`, `docs/clear-talks/IMPLEMENTATION_LEDGER.md`, `docs/clear-talks/NEXT_CHAT_HANDOFF.md`.
- Feature commit: `0119f7b395c97fcad36f2b254bda521245b0ca24`; draft PR https://github.com/0445968/02022/pull/4 (base CT-00 branch, which bases on planning PR #2). Ledger/handoff recorded in follow-up docs commit.
- CI: workflow `Clear Talks quality gates`, run `45275880755`, **success**. Commands: `npm ci` PASS, `npm test` **13 passed / 0 failed** (4 CT-00 plus 9 CT-01), `npm run typecheck` PASS, `npm run lint` PASS with existing non-blocking warnings, `npm run build` PASS. No runtime authenticated editor browser test was performed.
- Security/RLS: direct, transaction-local role test with `SET LOCAL ROLE anon` was read-only and returned 18 visible published stories, **0** visible story revisions. Only RLS-authorized revision rows can affect the new indicator. No new RLS policies or grants added; future CT-02 performs reader/freelancer/editor negative API/RLS matrix.
- SQL migrations: **none**; no schema/data/auth/publishing/storage mutation. No dev bypass enabled. Supabase project `yqqzohrlhiitctwacdad` and all restored data left unchanged.
- UI parity: existing fonts Figtree/Source Serif 4/IBM Plex Sans/Inter unchanged; no global CSS/Tailwind/layout changes. EN/ES dictionary keys tested. Mobile and image delivery still require authorized preview visual QA.
- Vercel: no production merge or deployment; no preview URL independently identified. Connected Vercel account did not reveal the project. CI build uses placeholder credentials if CI-specific variables are not configured, so it does not constitute an authenticated real-DB integration test.
- Rollback: revert CT-01 feature commit and docs commit; no SQL rollback required.
- Blockers/risks: preview access and actual browser visual/keyboard QA; authenticated negative role checks deferred to CT-02; review before merging stacked branches. Existing security warnings remain the privileged publisher RPC and leaked-password protection.
- Next slice: CT-02 read-only legacy profile/byline/API/function-grant audit and reviewed minimum staff permission/RLS migration, then CT-03 team manager; do not send invitations, alter live role grants or deploy until the relevant approval gates.

### 2026-11-23 — CT-02a: permission contract and restored-data audit
- CT-02 overall state: **PLANNED -> IN PROGRESS**; CT-02a pure policy contract implemented, but **not activated**. CT-02b live/SQL RLS and API guards are not implemented or approved. No client-side UI-only permission is considered security.
- Source baseline confirmed again: `main` `f5c0140fb2db165e43303a064f7bc15b765d4505`, planning draft PR #2, CT-00 draft PR #3, CT-01 draft PR #4 head `5b8480bf819d3989242e7f9bf16f78cb87a74ae9`. New isolated `feature/ct02a-capability-contract-2026-11-23`, draft PR https://github.com/0445968/02022/pull/5, stacked on PR #4.
- Code commit: `3998a9048d862768fdaa32b158afe5bfc70c945b`; test syntax-fix commit `0261541c3ece9bbc951c8bdf43ecd6134ff10653`; documentation commit follows in the same feature PR.
- Files: `lib/permissions/capabilities.ts` (typed finite registry, deny-first pure evaluator, active current verified identity + membership, assignment/ownership gating, explicit deny precedence, expiry, reserved owner-admin capability), `tests/capabilities.test.mjs` (16 policy cases), `docs/clear-talks/CT02_PERMISSION_AUDIT.md`, `docs/clear-talks/IMPLEMENTATION_LEDGER.md`, `docs/clear-talks/NEXT_CHAT_HANDOFF.md`.
- Read-only live database preflight: Supabase `yqqzohrlhiitctwacdad`, PostgreSQL 17.12 healthy, 4 Auth users and matching 4 profiles (3 author, 2 editor, 2 both, 1 neither); 23 stories reference two unique author profiles and 14 stories reference one unique editor profile. Foreign-key story/byline history must be preserved. No real names/emails/IDs exported or rewritten.
- Existing production permission findings: protected story/revision RLS depends on `profiles.is_author/is_editor`; media metadata SELECT currently public; privileged `public.publish_story_revision` is executable by `authenticated` (not `anon`) but has `auth.uid()`/editor checks and row locks internally. Security Advisor still reports this definer function and disabled leaked-password protection. Do not silently revoke the RPC and break publishing.
- New policy evaluator is **not wired to runtime**: no fresh membership table exists, and accepting permission snapshots from a client would be unsafe. Future CT-02b introduces least-privilege RLS tables and server-only trusted loader; CT-02c migrates existing endpoints and function/storage policies after a carefully reviewed compatibility/backfill gate.
- SQL migration IDs: **none created or applied** in CT-02a. No new tables, policies, grants, roles, Auth users, invitations, or restored data changes. Hosted migration history still empty. Rollback: revert CT-02a commits only; no DB rollback.
- Automated CI: `npm ci`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` on GitHub Actions. Initial test run was started on first commit; syntactic test-regex escape corrected in second commit. Final results are recorded in the PR checks; do not equate unit tests with effective Supabase RLS enforcement. Browser/preview/manual authorization still unverified.
- Existing fonts/CSS, EN/ES UI and responsive layouts unchanged; this slice has **no UI change**. DEV_AUTH_BYPASS never enabled or modified. No Vercel production or preview deploy initiated. Preview URL unavailable through linked Vercel account.
- Next: CT-02b versioned migrations on a safe disposable DB, owner backfill reconciliation without indiscriminate legacy elevation, server-side membership/capability loader, explicit deny precedence under database checks, negative permission matrix. Live application of any schema/grant change needs review/authorization and backup verification.

### 2026-11-23 — CT-02a automated verification follow-up
- After correcting test source regex on commit `0261541c3ece9bbc951c8bdf43ecd6134ff10653`, GitHub Actions run `45278724284` completed **SUCCESS**, confirmed via job 138057219766: `npm ci`, `npm test` **29 passed, 0 failed** (13 prior + 16 new), `npm run typecheck`, `npm run lint` and `npm run build` all passed. Existing nonfatal lint/image warnings remain.
- First pre-correction commit `3998a9048d862768fdaa32b158afe5bfc70c945b` had an expected failed test parse; fixed within same draft PR, not hidden.
- End-to-end authenticated roles, hosted Supabase RLS checks of new tables, and human review remain **NOT DONE**; maintain CT-02 = IN PROGRESS, CT-02a not deployed.

### 2026-11-23 — CT-02b: staged membership/RLS migration and fail-closed server resolver
- **Status:** CT-02 remains IN PROGRESS. This slice is code-implemented and CI-verified, but **NOT** deployed or production DB tested/applied. CT-02 runtime integration, secure owner backfill, role grants, API/RPC/storage conversion, end-to-end tests and human review remain open.
- **Verified sources:** GitHub `main` at `f5c0140fb2db165e43303a064f7bc15b765d4505`; planning PR #2; CT-00 PR #3; CT-01 PR #4; CT-02a PR #5 head `7dde2738ed60ccd833c479ea0a0b530cdac627a3`. New branch `feature/ct02b-staff-schema-2026-11-23`, draft https://github.com/0445968/02022/pull/6, stacked on PR #5.
- **Files:** `supabase/migrations/20261123222804_ct02b_staff_access.sql`; `lib/permissions/server.ts`; `tests/staff-schema-contract.test.mjs`; `tests/ct02b-postgres-rls.sql`; `.github/workflows/ct02b-postgres-rls.yml`; `.env.example`; `docs/clear-talks/CT02B_REVIEW.md`; `ROLE_AND_PERMISSION_MATRIX.md`; `IMPLEMENTATION_LEDGER.md`; `NEXT_CHAT_HANDOFF.md`.
- **Migration:** Filename generated by pinned Supabase CLI **v3.2.0** on isolated GitHub runner (run `45279910591`), then SQL committed. Creates seven new tables: staff memberships, role presets, role capabilities, member roles, capability overrides, story assignments, append-only audit; finite capability-key enum. RLS enabled for every new public table. Authenticated owner-only/active SELECT where applicable; **no anon grants and no authenticated INSERT/UPDATE/DELETE**. No access to audit for ordinary authenticated users. Role preset names inserted with **zero capability grants and zero membership backfills**. Existing stories, author/editor FKs, published media, restored Auth and publication/RLS functions untouched.
- **Server security:** read-only adapter `resolveStaffPermissionOnServer` uses Supabase `auth.getUser()`, RLS-scoped membership/role/override/assignment reads and CT-02a deny-first evaluator. Gated by `CT_STAFF_ACCESS_V2_ENABLED=true`, absent/false by default. Not wired to any existing newsroom API/pages; setting the flag alone is not permission enforcement on existing endpoints. No service-role credential used.
- **CI checks:** GitHub Actions quality gates run `45280957343` **SUCCESS**: `npm ci`, `npm test` **38 passed / 0 failed**, `npm run typecheck` PASS, `npm run lint` PASS (existing nonfatal warnings), `npm run build` PASS. Separate disposable PostgreSQL 17 RLS migration run `45280957435` **SUCCESS**: applied new migration to isolated fixture and tested unauthenticated grant denial, no implicit staff enrollment/role elevation, active freelancer own-only visibility, ordinary reader no staff visibility, and suspended-member grant/assignment denial. Neither CI job used production credentials.
- **Failure/recovery evidence:** Early CI exposed static test assertion matching a documentation comment; corrected in `7e50c1236b73e8cf793cc8cfe3fddeb5014e454f`. First disposable SQL runs failed due fixture quoting and missing auth schema-grant simulation, corrected in `d7755732d98d372b78777587a5361db5e3b82a04`, `6b0f89fd97691d7551ee0f9225a724e45330d7c9`, `3ad1dcb99af6415edc9e296463fccfa303c66fd5`. Final checked runs succeeded. Temporary migration-name-only workflow was removed (commit `6cc9b818e40715de7e63793d71a98b8c05f05f0c`).
- **Core feature commits:** migration+adapter `5e2052f942225934dfbceacc82492f0a3d468812`; RLS CI fixture `0712ad5e04e14c26989d31008d74e7d6dcbe96c7`; latest tested fixture `3ad1dcb99af6415edc9e296463fccfa303c66fd5`. Follow-up ledger/handoff commit is the final PR head.
- **SQL production state:** **NOT APPLIED**. Read-only after-change check returned `to_regclass('public.staff_memberships') IS NULL = true`, 23 stories and 4 active revisions unchanged. Hosted Supabase migration register still empty. Retained security warnings: authenticated-executable `publish_story_revision` SECURITY DEFINER function and disabled leaked-password protection.
- **UI/style/EN-ES/mobile:** Existing fonts Figtree, Source Serif 4, IBM Plex Sans, Inter and all site CSS and UI untouched. Role preset names include EN/ES; no visible new UI or browser verification required for this slice beyond later integration. No DEV_AUTH_BYPASS activation; no real invitations, member writes, role backfill, emails, database, Vercel production deployment, or merge.
- **Rollback:** Before application: revert PR #6, no hosted SQL rollback. After a future approved application: verified backup and reviewed dependency-ordered rollback preserving any created membership/audit history; never blindly drop active staff tables. Release awaits explicit user approval, verified Vercel project and schema migration history reconciliation.
- **Next safe batch:** CT-02c trusted owner/backfill and capability preset mapping review, secure privileged transactional mutations/audit/last-owner protection, migrate server/API/RLS/RPC/storage stepwise with deny tests; only then CT-03 frontend staff manager.

### 2026-11-23 — CT-02c: restricted role mutations, owner succession and automatic audit
- **State:** CT-02 IN PROGRESS. CT-02c code and isolated PostgreSQL tests completed on draft PR [#7](https://github.com/0445968/02022/pull/7), based on CT-02b PR #6. No human PR review, production SQL migration, real Auth/RPC cutover or deployment.
- **Verified base:** `main` still `f5c0140fb2db165e43303a064f7bc15b765d4505`; planning #2, CT-00 #3, CT-01 #4, CT-02a #5, CT-02b #6 all remain open draft, stacked. CT-02b head `36fe8512bec2b73e1a878ea314019968f14db265`. New isolated `feature/ct02c-admin-mutations-2026-11-23`.
- **Files:** `supabase/migrations/20261123230955_ct02c_owner_guard_and_audit.sql` (migration name generated using Supabase CLI v3.2.0 on GitHub Actions run `45286347774`), `lib/permissions/staff-admin-input.ts`, `lib/services/staff-role-admin.ts`, `tests/staff-role-admin.test.mjs`, `tests/ct02c-postgres-admin.sql`, `.github/workflows/ct02c-postgres-admin.yml`, `.env.example`, `docs/clear-talks/CT02C_REVIEW.md`, role matrix, ledger and handoff.
- **Database design:** Adds atomic `public.staff_apply_role_change` RPC with `SECURITY INVOKER`, `search_path=''`, EXECUTE **only** for `service_role`; explicit revoke from PUBLIC/anon/authenticated. The function authorizes current active owner via Postgres roles/memberships, locks with advisory transaction lock, disallows self modifications, validates target/action/reason, executes role grant/revoke or membership suspend/reactivate/revoke and emits automatically triggered per-row audit events with actor/reason/request UUID in the SAME transaction. Does **not** seed owner, role mappings, legacy membership, capabilities or new permissions.
- **Direct-write defense:** row triggers prevent deleting/expiring/reassigning last active owner and prevent changing built-in role keys. Audit triggers track membership, role assignment, role capabilities, preset, overrides and story assignments even on privileged direct table writes. Service-role write without current owner actor + reason is denied; PostgreSQL database owner can perform separately approved manual bootstraps, audited with NULL actor. Audit table remains append-only for the service role.
- **Application adapter:** server-only `applyStaffRoleChange` validates finite role/action/UUID/reason, derives actor from authenticated Supabase `auth.getUser()`, checks fresh `team.manage_roles` permission via user-session RLS, then calls service-key RPC. Both `CT_STAFF_ACCESS_V2_ENABLED` and independent `CT_STAFF_ADMIN_MUTATIONS_ENABLED` must be TRUE, and the actual reviewed owner grant must exist. Default FALSE. **Not wired into a route**; no client can invoke it from the website in CT-02c. No service_role key stored in Git/client.
- **Verified frontend CI:** GitHub Actions quality run `45287120543` **SUCCESS**: `npm ci`, `npm test` **44 passed/0 failed**, `npm run typecheck`, `npm run lint` and `npm run build` all PASS (existing nonfatal lint warnings). The final docs-only head `d9d6fb8e8f2e25d8d9ff0048f19960877624b3cd` also runs independent CI; see draft PR #7 checks for its status.
- **Checks:** isolated PostgreSQL **17** owner/audit workflow `45287094467` **SUCCESS**, reverified on follow-up head `45287120144` **SUCCESS**; fixtures apply CT-02b+CT-02c SQL with no production credentials and test empty initial grants, anon/reader RPC denial, unauthorized service-role actor denial, owner self-mutation denial, unaudited direct-write denial, owner succession, suspension/reactivation, and last-owner/expiry/builtin-role guards. Quality gate `npm test`, TypeScript, ESLint and Next.js build is recorded in PR #7; final documentation head checks may rerun.
- **Corrections/traceability:** initial static test matched a safety comment and failed on first commit `e02d1a6de84114a9fcf6aaaf796ede757f501955`; assertion corrected `5401c7f5cc2dc540b9f41b4ef429c6ddd6173961`. Hardened SQL owner trigger, SQL expression and builtin preset audit `b48ee44ad42e925b335def7ef32ab4a56bf49d68`; PostgreSQL test/workflow `6c3a9ad89a7533da6005e84775fc4db616431494`. Removed temporary CLI filename-only workflow `a2894844d1b053a923d59391d4f4439b39659fd9`.
- **Live read-only confirmation:** Supabase `yqqzohrlhiitctwacdad` still healthy; 0 registered hosted migrations; `public.staff_memberships` ABSENT; 4 Auth/profile links (2 editor flags, 3 author flags); 23 stories and 4 active unpublished revisions intact. Existing two warnings unchanged (published-revision SECURITY DEFINER RPC available to authenticated; leaked-password protection disabled). The new SQL was **NOT applied**.
- **No effects:** no historic story/byline/media changes, real staff permissions/backfill, Auth identity edits, service env changes, current API routing, EN/ES screens, fonts/styles, Vercel preview/production deployment, or main merge. Review needed before any live privilege/security changes.
- **Rollback:** before live application revert this feature PR; no DB rollback. If subsequently approved and applied, dependency-order removal of CT-02c functions/triggers with DBA-reviewed restore, preserving all audit/membership data. Do not drop production staff tables blindly.
- **Next batch CT-02d:** prepare reviewed role capability seed and verified owner mapping/backfill, secure existing API guards, direct RLS, privileged publishing RPC/storage, and full reader/freelancer/editor/revoked negative matrix on a disposable environment. Explicit user approval, backup and migration-history reconciliation required BEFORE live application/cutover.

### 2026-11-23 — CT-02d: proposed finite role presets and gated initial Newsroom operations
- **State:** CT-02 IN PROGRESS; CT-02d feature code committed in draft PR [#8](https://github.com/0445968/02022/pull/8), stacked on verified CT-02c `c2b9c11d5802fa35420194b9797127157cd18975`. Planning PR #2, CI #3, Stories #4, role contract #5, SQL foundation #6, audited mutations #7 all remain unmerged. `main` unchanged `f5c0140fb2db165e43303a064f7bc15b765d4505`.
- **Scope/files:** `lib/permissions/role-presets.ts`; `lib/permissions/staff-route-gates.ts`; `tests/role-presets-route-gates.test.mjs`; `app/newsroom/(shell)/layout.tsx`; `app/api/stories/[id]/route.ts`; `app/api/stories/[id]/revision/route.ts`; `app/api/stories/[id]/revision/publish/route.ts`; updated Master Completion Plan, ROLE_AND_PERMISSION_MATRIX, LEDGER, NEXT_CHAT_HANDOFF and `CT02D_REVIEW.md`.
- **Role matrix:** nine finite, **proposed only** preset capability sets, scoped all/assigned/own. Freelancer writer cannot publish, create unassigned stories, assign author/editor, manage team or view unassigned stories; editor/manager cannot manage owner role defaults; owner security reserved capability excluded. No live role grant seed/backfill or migration in this batch.
- **Guard changes:** initial Newsroom layout and selected story/revision API paths now consult fresh server-verified role resolver only when opt-in `CT_STAFF_ACCESS_V2_ENABLED=true`. Existing behavior when false preserved. v2 checks special statuses, sensitive author/editor control fields, live published-story mutation and revision publishing. Revoked members cannot regain access from legacy flags **on these guarded server paths**, but other routes and direct PostgREST still need migration.
- **Critical NOT DONE:** Direct legacy RLS on stories/revisions/media/Storage and privileged publishing RPC still grants access by old author/editor booleans. No production activation permitted until comprehensive DB and all-route enforcement is tested. Do not construe this as completed revocation.
- **SQL/migrations:** None created or applied in CT-02d; CT-02b/c remain staged and unapplied. Hosted migration history remains empty. Existing SQL lints: authenticated-callable SECURITY DEFINER publisher and disabled leaked-password protection. No service_role client exposed or Auth settings modified.
- **Automated CI verified:** GitHub Actions quality run **45290839865 SUCCESS** on test-fix commit `d065806bfd7e475ea9c1446d053ab29bfee0d7d2`: `npm ci`, `npm test` **55 passed / 0 failed**, `npm run typecheck`, `npm run lint` (existing nonblocking warnings), `npm run build` **ALL PASS**. Separate PostgreSQL migration/RLS runs **45290839676** (CT-02b) and **45290839801** (CT-02c) **BOTH SUCCESS**. Initial CI failure on earlier code commit was a stale assertion in `tests/newsroom-access.test.mjs`, fixed in `d065806` with new v2-fail-closed verification. These are NOT live authenticated browser/DB negative tests. Latest docs-only head may retrigger CI.
- **Style/UI:** no styles, CSS, fonts, component redesign or new UI; EN/ES current UI maintained. Accepted plan update specifies dedicated CT-15a final UI/UX polish after feature build, CT-15b accessibility/performance, CT-15c release QA, with minor continuous polish in CT-03–14.
- **Production:** no production data/schema/permissions/env change, no owner bootstrap, no Vercel deployment, no merge to main. Rollback before release is Git revert only.
- **Next:** CT-02e existing-table RLS/RPC/Storage gate, complete coverage of other routes, verified owner/backfill and explicit approval gate. See `docs/clear-talks/CT02D_REVIEW.md`.
