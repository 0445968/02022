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
| CT-00 | Baseline, safety, tests and CI | P0 | none | IMPLEMENTED | [Draft PR #3](https://github.com/0445968/02022/pull/3); CI pending |
| CT-01 | Stories thumbnails + active unpublished revision indicator | P0 | CT-00 baseline | IMPLEMENTED | [Draft PR #4](https://github.com/0445968/02022/pull/4); 13 tests and CI green, browser QA pending |
| CT-02 | Permissions schema, server API and RLS foundation | P0 | CT-00 | PLANNED | Roles contract |
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
| CT-15 | Site-wide regression/security/accessibility and closeout | P1 | all launched batches | PLANNED | Final release |

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
