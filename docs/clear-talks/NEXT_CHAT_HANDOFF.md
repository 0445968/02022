# CURRENT CT-02c HANDOFF — 2026-11-23
**CT-02 still IN PROGRESS. CT-02c PR #7 is committed but NOT merged, production SQL-applied or deployed.**

## GitHub stack
- Plan PR #2 -> CI CT-00 #3 -> Stories CT-01 #4 -> policy contract CT-02a #5 -> staff schema CT-02b #6 -> **owner/audit CT-02c draft PR #7** https://github.com/0445968/02022/pull/7.
- Branch: `feature/ct02c-admin-mutations-2026-11-23` stacked on `feature/ct02b-staff-schema-2026-11-23` at `36fe8512bec2b73e1a878ea314019968f14db265`.
- Staged SQL: `supabase/migrations/20261123230955_ct02c_owner_guard_and_audit.sql` (requires `20261123222804_ct02b_staff_access.sql`). Only local disposable PostgreSQL has received it.
- Code: `lib/permissions/staff-admin-input.ts`, `lib/services/staff-role-admin.ts`, unit tests and isolated database tests. `CT02C_REVIEW.md` contains detailed security, rollout and rollback gates.
- Real role changes and Auth/backfill are **NOT performed**. No role preset grants seeded or runtime API routes switched. Two env feature flags default FALSE; there is no endpoint invoking service_role logic.

## Verified progress
- PostgreSQL 17 owner/audit integration CI `45287094467` SUCCESS; follow-up `45287120144` SUCCESS. These test current-owner restrictions, anon/reader access denial, automatic per-record audit, expired/last owner constraints, manual SQL bypass attempts and owner succession.
- Quality gates are on the PR checks; do not claim final CT-02 release based on unit tests alone.
- Hosted Supabase `yqqzohrlhiitctwacdad`: 0 migrations, `staff_memberships` absent, 4 Auth/profile records, 23 stories and 4 unpublished revisions intact. Two existing warnings (publisher SECURITY DEFINER RPC, disabled leaked-password protection). No hosted mutation.
- Existing fonts (Figtree, Source Serif 4, IBM Plex Sans, Inter), styles, auth, newsroom, drafts and publishing unaffected. No merge, preview or production deploy.

## NEXT CT-02d
1. Verify GitHub and CI, live read-only DB state and review all four canonical docs + `CT02C_REVIEW.md`.
2. **Human signoff** on first owner Auth identity, full preset capability grants, bootstrap and migration-history reconciled backups; never auto-promote imported accounts or trust byline/editor flags.
3. Design controlled migration/cutover: existing Newsroom APIs/server guards, direct story/revision RLS, storage, publishing RPC. Revocation must prevail over legacy editor flags; run negative tests for signed-out, reader, assigned/unassigned freelancer, specialist, editor, owner, suspended/revoked, forged metadata.
4. Keep full migration/new credentials and flags off until explicit production authorization. Avoid historic bypass migrations. Do not claim CT-02 done until reviewed end-to-end enforcement is proven.
---
## Previous handoffs (historical)
# CT-02b handoff — 2026-11-23 (CURRENT)
**CT-02 still IN PROGRESS. No production deployment or hosted migration.**

## Current stack
- PR #2 planning -> PR #3 CT-00 -> PR #4 CT-01 -> PR #5 CT-02a -> **draft PR #6 CT-02b** https://github.com/0445968/02022/pull/6, branch `feature/ct02b-staff-schema-2026-11-23` stacked on CT-02a.
- CT-02a pure capability policy is not yet connected to active routes.
- CT-02b adds migration `supabase/migrations/20261123222804_ct02b_staff_access.sql` (CLI v3.2.0 generated), `lib/permissions/server.ts` (disabled by default via `CT_STAFF_ACCESS_V2_ENABLED`), static SQL+policy tests, disposable PostgreSQL 17 RLS CI and `CT02B_REVIEW.md`.
- GitHub Actions run `45280957343`: **38 tests, typecheck, lint, build passed**. PostgreSQL RLS run `45280957435`: **passed**. No direct hosted Auth role test or existing API/RPC/storage integration completed.
- Supabase project `yqqzohrlhiitctwacdad`, 0 recorded hosted migrations, 23 stories / 4 revisions intact, new staff table not created on live. Existing security warnings remain publisher definer and leaked-password protection.
- Database migration is READ-ONLY IN GITHUB (never applied). RLS enforces own-only SELECT for NEW tables in disposable PG tests; no authenticated writes; role preset names seeded with no grants. No restored account is automatically elevated.
- Fonts, existing Newsroom, drafts, published media, old profile flags and auth path unchanged. DEV_AUTH_BYPASS still must stay off. No production merge, Vercel deployment or hosted SQL.

## Next (CT-02c)
1. Verify fresh GitHub HEAD/PR checks and live Supabase schema/migration state, then review `CT02B_REVIEW.md` and `ROLE_AND_PERMISSION_MATRIX.md`.
2. Reconcile historic live migration history without replaying dev-bypass migrations; obtain verified backup/rollback plan and independently review team-owner mapping to restored auth accounts.
3. Secure active admin role grants and last-owner invariant with DB-enforced, audited operations; finalize role presets with user approval.
4. Wire new resolver to existing server endpoints and direct Postgres policies/RPC/storage checks in compatibility-safe slices. Revoked staff must never recover access via old `is_editor` flags. Run full authenticated negative matrix.
5. Do NOT apply hosted migration, change privileged publishing SQL, enable feature flag, send invites or deploy/merge production without explicit approval.
---
## Prior handoff (historical)
# CT-02a implementation handoff — 2026-11-23
Current active work: CT-02 authorization foundation, **not production-activated**.

## Review stack and current state
- Planning PR #2 -> CT-00 PR #3 -> CT-01 PR #4 -> **CT-02a PR #5** https://github.com/0445968/02022/pull/5 (draft, based on CT-01 head `5b8480bf819d3989242e7f9bf16f78cb87a74ae9`).
- Code commits CT-02a `3998a9048d862768fdaa32b158afe5bfc70c945b`, test correction `0261541c3ece9bbc951c8bdf43ecd6134ff10653`, ledger/handoff doc commit in PR #5. GitHub Actions run 45278724284 passed: 29 tests, typecheck, lint, Next.js build. Browser and real DB authorization tests remain pending; no main merge or deployment.
- `lib/permissions/capabilities.ts`: pure typed finite authorization registry, matching verified principal/active membership, resource assignment or owner scope, deny precedence, expiration and reserved security-admin handling. Tests in `tests/capabilities.test.mjs`; audit and migration gate `docs/clear-talks/CT02_PERMISSION_AUDIT.md`.
- **Do not call these permissions live.** There are no new membership tables or RLS integrations; the current app's legacy server checks and database policies remain active. Never trust user-supplied snapshots, bylines, JWT user_metadata or profile flags for newly granted capabilities.
- Read-only database baseline: 4 Auth users/4 profiles (3 authors, 2 editors, 2 overlap, 1 reader). Stories reference 2 author profiles and 1 editor profile, so preserve historical FKs and byline mapping. New Supabase project healthy, 0 registered migrations; current two advisor warnings (publisher privileged function, leaked-password protection) remain.
- No SQL, Vercel, Auth, data, media, font or UI changes; no dev auth bypass enabled. Current Vercel connector cannot confirm project identity.

## Next safe implementation
1. Re-verify GitHub current PR stack and CT-02a CI results, read four canonical planning documents plus `CT02_PERMISSION_AUDIT.md`.
2. CT-02b: design the minimum membership, preset, capability grant, override, scoped assignment and audit schema with RLS on all exposed tables, unique indexes and owner guards; generate migration with current Supabase CLI instructions, NOT by replaying historical dev-bypass migrations. Test against disposable/local database and write rollback/preflight; review before hosted migration.
3. Build server-only loader from verified `getUser()` identity and fresh DB membership/assignment rows. Carry the current owner/editor account forward only after validated, human-reviewed mapping. Revoked users must not fall back to old editor flags.
4. Secure all API, direct PostgREST/RPC and storage paths by current DB permissions; run negative role matrix. Existing SECURITY DEFINER publishing RPC must be tested and kept compatible during permission switchover.
5. After CT-02 reaches its security acceptance gate, proceed to CT-03 team manager. Never merge/deploy production without explicit approval.

---
## Prior handoff (historical)
# Clear Talks — Implementation Handoff after CT-00/CT-01
Updated: 2026-11-23 | Two implementation batches committed, NOT merged or production deployed.

## Current branch and review stack
- Planning documentation PR #2: https://github.com/0445968/02022/pull/2 — `planning/clear-talks-completion-2026-11-23`, open draft, based on `main` at `f5c0140fb2db165e43303a064f7bc15b765d4505`.
- CT-00 PR #3: https://github.com/0445968/02022/pull/3 — `feature/ct00-baseline-ci-2026-11-23` against planning branch. Feature commit `97472f5284bfcfcb90f98274126b59be99aef968`; CT-00 ledger commit `c7dd5638f36a0380f3f7afb394da8c0549c8a034`.
- CT-01 PR #4: https://github.com/0445968/02022/pull/4 — `feature/ct01-stories-unpublished-changes-2026-11-23` against CT-00 branch. Feature commit `0119f7b395c97fcad36f2b254bda521245b0ca24`; additional ledger/handoff follow-up commit on this branch.
- Workflow CI checks passed CT-00 (4 tests) and CT-01 (13 tests); typecheck, lint, build succeeded, with existing lint warnings. GitHub Actions runs 45275485231, 45275880755. No live editor browser or screenshot QA done.
- New Supabase project `yqqzohrlhiitctwacdad` healthy. Read-only audit: 23 stories, 18 published, 4 published-with-active-revision, 11 with featured images; anonymous RLS sees 0 revisions. Hosted migration register empty. Existing two security warnings remain.
- Vercel project lookup via connected account unsuccessful: confirm team/project and preview before deployment approval. No production or hosted DB mutations.
- CT-01 behavior: live/main story thumbnail, independent Active draft/None indicator in same existing Newsroom table; EN/ES strings; batches page-scoped metadata, preserves status and filters.
- Fonts/styles untouched; DEV_AUTH_BYPASS must stay disabled. No plan or role-matrix amendments required.

## Next implementation
1. Independently review CT-00 and CT-01 draft PRs and visually verify thumbnails, 4 active published revisions, mobile overflow, filters, EN/ES, missing image, and save/discard/publish indication on a properly configured **preview**, without publishing or discarding production data just to test.
2. Start CT-02 read-only audit of active legacy users/byline foreign keys, API guards, privileged publishing RPC grants, and RLS; make a minimal versioned permissions migration and negative test matrix on a new isolated branch based on verified current HEAD. Follow `MASTER_COMPLETION_PLAN.md` and `ROLE_AND_PERMISSION_MATRIX.md` exactly; do not blindly replay legacy migrations.
3. Require review of CT-02 permission migration, owner/grant backfill and irreversible production changes before applying. Never silently promote legacy identities, change SMTP/invitations or enable bypass.
4. Continue CT-03 team manager, CT-04 onboarding, CT-05 contributor workspace and remaining CT queue; update ledger and handoff after each tested slice. No production merge/deploy without explicit approval.

---
## Original planning-session handoff (historical)
# Clear Talks — New Chat Implementation Handoff
Prepared: 2026-11-23 | PLANNING ONLY; CODE IMPLEMENTATION NOT STARTED
Repo: https://github.com/0445968/02022
Planning branch: planning/clear-talks-completion-2026-11-23
Live website: https://clear-talks.vercel.app/
Supabase project ref: yqqzohrlhiitctwacdad (do not import source backups again).

## Start here

Read these exact files from the above branch before touching code:
1. docs/clear-talks/MASTER_COMPLETION_PLAN.md — full feature and batch requirements, mandatory style invariants and release rules.
2. docs/clear-talks/ROLE_AND_PERMISSION_MATRIX.md — admin/staff/freelancer role defaults and security checks.
3. docs/clear-talks/IMPLEMENTATION_LEDGER.md — current state and append-only history.
4. This file for execution order.

Open draft PR for the plan (check GitHub if merged/closed by start of session). Verify current main HEAD and whether any CT-00/CT-01 code or other batches have been merged since the plan was written. Reconcile existing branches/PRs and any applicable AGENTS.md instructions; never apply against the historical f5c0140fb2 commit without checking.

## Exact first execution order

A. CT-00: Inspect existing Next.js/TypeScript route, RLS, test and CI baseline; introduce minimal tests/CI without altering app layout/fonts or deploying. Confirm new Vercel target, Supabase project and environment variable NAMES only, not their secret values. Add permission-negative tests for signed-out newsroom.
B. CT-01: Implement Stories list small featured-image thumbnail **AND** independent 'Unpublished changes' column (active story_revisions row). A published article can still be Published while showing active unpublished changes. Existing data components: app/newsroom/(shell)/stories/page.tsx; components/editorial/stories-dashboard.tsx; lib/services/stories.ts; types/editorial.ts; lib/services/story-revisions.ts. Preserve all existing filters/sorting and existing styles. New revision presence query batched per page, not N+1.
C. Update ledger at the same time, commit/PR feature slices, record exact checks and migration info. No main branch release without explicit user approval.
D. Then CT-02 permission system, CT-03 admin team manager, CT-04 invitations, CT-05 freelancer newsroom, onward per master plan.

## Live system and known invariants

User-confirmed: restored 23 stories, 22 media files, Auth working with real email/password, logout denial, Newsroom access, drafts save, article publishing on new Vercel. Supabase had 2 remaining advisor warnings (privileged publisher + leaked-password protection). Legacy fictional email accounts exist and may have authorship references; do NOT delete them. DEV_AUTH_BYPASS must remain false.

Existing fonts are Figtree, Source Serif 4, IBM Plex Sans and Inter. User expressly forbids changing fonts or the current UI style. Respect existing CSS variables and component styling, English/Spanish dictionaries, sidebar behavior, page editor and reader shell. This project is **Clear Talks**, not Bivi nor My Texas Case; My Texas Case is only the requested batch-process analogy.

Use current GitHub repo and user-connected tools when possible, do not require user to paste success logs. When proposing schema SQL changes, do a read-only preflight, migration/rollback documentation, role/RLS testing and approval before applying to the hosted project. No credentials, real emails or secrets in commit or chat.

## Message to paste as first prompt in a new chat

Continue development of Clear Talks (formerly West Island Times / Simply Raizal). Repo 0445968/02022; live site https://clear-talks.vercel.app/; Supabase yqqzohrlhiitctwacdad. The full master plan and ledger are in GitHub branch planning/clear-talks-completion-2026-11-23 under docs/clear-talks/: MASTER_COMPLETION_PLAN.md, ROLE_AND_PERMISSION_MATRIX.md, IMPLEMENTATION_LEDGER.md and NEXT_CHAT_HANDOFF.md. First read those documents and inspect latest repo HEAD/current PRs, then implement CT-00 and CT-01 in small verified feature slices. CT-01 must show small featured-image thumbnails and a separate Active unpublished changes column on Newsroom Stories, including for stories whose publication status is already Published. Later follow the plan for remaining Newsroom pages, the reader account portal, admin team permissions and scoped freelancer/staff Newsroom with preset onboarding roles. Do not change any fonts or existing UI style. Preserve live publishing/auth/data. Commit every batch and update the ledger in GitHub with SHA/PR, checks, SQL migrations, deployments and next step. Use feature branches, do not deploy/merge production without explicit approval. Do not enable DEV_AUTH_BYPASS. Start implementation now, not another planning phase.
