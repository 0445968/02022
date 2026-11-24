# CURRENT HANDOFF — CT-02g (2026-11-23 America/Chicago)
**CT-02 IN PROGRESS; media/Storage security is STAGED in draft PR #11, not applied to hosted Supabase or deployed.**

## Branches and completed batch
- Plan #2 -> CT-00 #3 -> CT-01 #4 -> CT-02a #5 -> CT-02b #6 -> CT-02c #7 -> CT-02d #8 -> CT-02e #9 -> CT-02f #10 -> **CT-02g [draft PR #11](https://github.com/0445968/02022/pull/11)**. Branch `feature/ct02g-media-storage-security-2026-11-23` stacked on CT-02f `3b8812c92c49462d4053dac9cfa005eb6cfd51bb`; `main` unchanged.
- Proposed, unapplied migration `supabase/migrations/20261124003447_ct02g_media_storage_security.sql`, CLI-generated in GitHub run 45298277039; all earlier CT-02b/c/e/f SQL still unapplied. Never replay historic dev-bypass SQL or bulk push the empty-migration-register restored database.
- Public-safe `media_public_assets` view (fixed 10-field approved-only whitelist, intentional view-owner privilege exception subject to security review), no anon base media select; staff/RLS media insert/update/delete and Storage list/upload/upsert/delete use verified current memberships and uploader ID. No existing Storage object or owner_id backfill. Public bucket remains public.
- `lib/permissions/media-route-gates.ts`, extended media owner resolver and media API routes; public `lib/services/stories.ts` detail/feed/related image code selects the whitelisted media view when v2 ON, preserving old paths while OFF. UI/styles/fonts unchanged.
- [CT-02g code quality `45299897381`](https://github.com/0445968/02022/actions/runs/45299897381) **SUCCESS**: **77 tests**, TypeScript, lint and Next.js build PASS. [CT-02g PG17 media/Storage `45299897330`](https://github.com/0445968/02022/actions/runs/45299897330) **SUCCESS**; inherited CT-02b/c/e/f PG17 suites on the same code commit all passed. First TS user-null issue was corrected `afd82b4`. Docs-only head CI may rerun; consult PR #11.
- LIVE READ-ONLY: project `yqqzohrlhiitctwacdad`, 23 stories, 4 unpublished revisions, 43 versions, 22 media + 22 public Storage objects; ALL objects `owner_id=NULL`; 21 approved, 1 trashed. No new staff table and zero hosted migration entries. **11 published story featured images: 10 approved, 1 trashed**. Current `internal_notes` all blank but base metadata RLS currently public true.
- The new public view would hide the trashed asset referenced by a published story. Do **not** auto-reclassify or delete it; require explicit editorial/media resolution before cutover. Public Storage URLs still expose binaries even with database RLS.
- No DB changes, new owner/role grants, Vercel env activation, production deployment or main merge. User wants to preserve Figtree, Source Serif 4, IBM Plex Sans, Inter and existing UI; CT-15a dedicated UI polish remains later.

## NEXT CT-02h
1. Verify PR #11 final CI and exact branch HEAD; review `CT02G_REVIEW.md`, ledger and role matrix.
2. Audit all remaining newsroom routes and server actions still using `profiles.is_editor/is_author`, additional direct relationship tables and RPCs; feature-gate or migrate and test against revoked old editor/nonassigned freelancers.
3. Design and get approval for private unpublished-media bucket/ingest/promote workflow without breaking 22 existing public files, URL caching or editor uploads; address the 1 published article linked to trashed media before turning on approved-only view.
4. Prepare actual disposable Supabase Auth+Storage HTTP/API browser negative tests, verify owner Auth identity and a complete first-owner/staff role grant plan, reconcile empty hosted migration register with restorable backup. Require explicit approval before production SQL or Vercel env toggle.
5. Keep `CT_STAFF_ACCESS_V2_ENABLED` FALSE and never deploy partially protected media/public reads to production; do not change established fonts/style.

---
## Previous handoffs
# CURRENT HANDOFF — CT-02f (2026-11-23, America/Chicago)
**CT-02 still IN PROGRESS. New publishing/version security is in DRAFT PR #10, not applied or deployed.**

## Verified GitHub stack
- Plan [#2](https://github.com/0445968/02022/pull/2) -> CT-00 #3 -> CT-01 #4 -> CT-02a #5 -> CT-02b #6 -> CT-02c #7 -> CT-02d #8 -> CT-02e #9 -> **CT-02f draft [#10](https://github.com/0445968/02022/pull/10)**.
- Branch `feature/ct02f-publisher-versions-2026-11-23`, base CT-02e head `381ba2309c15c03109b2d2489fe870328febd558`. Do not merge/deploy any of these into `main` without approval.
- Staged-only Supabase migration `supabase/migrations/20261124001339_ct02f_publisher_versions.sql` generated with CLI v3.2.0 in CI. It requires prior CT-02b/c/e and approved first-owner/role grants. NO hosted SQL applied.
- Original live publishing RPC saved in `tests/fixtures/ct02f-original-publisher.sql` with exact transaction body retained in new migration. Security checks now require signed-in `auth.uid() = p_user_id`, fresh story edit permission and **story.publish + revision.publish**. Direct legacy editor-flag route is removed by the proposed migration. SECURITY DEFINER remains for atomic compatibility and still requires warning review.
- Historical `story_versions` policies reworked for scoped reads, verified creator and exact snapshots. `restoreStoryVersion` now snapshots the confirmed post-restore record with short title, author/editor IDs and full fields; no design/UI changes.
- [CT-02f isolated PG17 publisher workflow 45296916363](https://github.com/0445968/02022/actions/runs/45296916363) **SUCCESS**, including blocked revoked editor, reader, freelancer, spoofed user ID, role expiration, explicit denies; successful publication preserving old version/timestamp/categories/tags/revision deletion; injected error rolls back all. [Quality CI 45296916270](https://github.com/0445968/02022/actions/runs/45296916270) **SUCCESS**, **67 tests**, typecheck, lint, Next.js build. Earlier CT-02b/c/e PG17 suites also green. Refer to PR #10 latest commit checks for doc rerun status.
- Live Supabase project `yqqzohrlhiitctwacdad`: 23 stories, 4 active revisions, **43 story_versions**, 22 media, `staff_memberships` ABSENT and hosted migration history EMPTY. No new staff identity/role/preset seeded; no Vercel deploy, main merge or production feature toggle.
- CT-15a dedicated final UI refinement remains scheduled after feature build; preserve current fonts/style.

## NEXT CT-02g — media metadata, Storage and remaining auth guard inventory
1. Verify fresh repo/main/PR, live Supabase state and exact RLS/Storage bucket permissions. Review `CT02F_REVIEW.md`, role matrix, master plan and ledger.
2. Design scoped `media_assets` writes, **public-safe media reads** that never leak `internal_notes` and rights/embargo-sensitive fields. Existing `media_assets` public SELECT is `true` and must be replaced carefully to preserve existing approved image/article delivery. Review whether public Storage media bucket itself exposes files independently of RLS; use approved minimal changes and disposable PG/Supabase tests.
3. Migrate `storage.objects` media-bucket INSERT/SELECT/UPDATE/DELETE and upsert policies to new capabilities with ownership checks and public delivery compatibility; avoid untested bucket conversion and breaking URLs.
4. Audit remaining Newsroom endpoints, taxonomy, other RPCs, direct writes, permissions, reader and freelancer access. Run real disposable Supabase JWT/Storage tests. Keep `CT_STAFF_ACCESS_V2_ENABLED=false` and never claim fully secure live rollout until all routes and direct RLS are migrated.
5. Reconcile empty restored migration register; verify independent backup and restore. Explicit human approval for selecting real first owner, backfill, role grants, hosted migrations, env flags and production deployment. Never replay historical DEV_AUTH_BYPASS SQL.
---
## Historical handoffs
# CURRENT HANDOFF — CT-02e (2026-11-23)
**CT-02 IN PROGRESS. Draft PR #9 complete as staged code, NO live changes or production merge.**

## Stack/current state
- Plan #2 -> CI #3 -> Stories #4 -> capability contract #5 -> staff schema #6 -> audit/owner guard #7 -> role presets and gated routes #8 -> **CT-02e** [draft PR #9](https://github.com/0445968/02022/pull/9), branch `feature/ct02e-story-revision-rls-2026-11-23`, base CT-02d head `2ba4dcdc72ed976dd7277478800a53da98ce2aff`.
- `supabase/migrations/20261123235430_ct02e_story_revision_rls.sql` is staged **only on GitHub**, generated with pinned CLI naming. Requires CT-02b/c migrations before it. **No live schema application**.
- Private `newsroom_private` invoker functions resolve current membership, role, scope, assignment, expiration and deny precedence in SQL; six existing stories staff policies and four revision policies replaced by deny-first new ones; public published stories SELECT preserved; authenticated direct UPDATE/INSERT guard triggers added. Does not alter live articles or bylines.
- Source: `tests/ct02e-policy-contract.test.mjs`; `tests/ct02e-postgres-rls.sql`; `.github/workflows/ct02e-postgres-rls.yml`; `docs/clear-talks/CT02E_REVIEW.md`.
- GitHub Actions quality `45293492498` **SUCCESS**: **61 tests**, typecheck, lint and build green. Isolated PG17 CT-02e `45293492430` **SUCCESS**: assigned freelancer can edit own assigned draft/revision, cannot publish/reassign/alter protected fields; revoked legacy editor with is_editor=true cannot see private story/revision; reader/anon only see published story; explicit deny beats editor. Inherited CT-02b `45293492418` and CT-02c `45293492472` green.
- Read-only live audit: Supabase `yqqzohrlhiitctwacdad` ACTIVE_HEALTHY, zero recorded migrations, `staff_memberships` ABSENT, 23 original stories, 4 unpublished revisions; two security warnings, publisher privileged RPC and leaked-password protection. No hosted SQL applied, no Vercel merge/deploy; no new permission grants/owner backfill/role assignment.
- Current fonts (Figtree, Source Serif 4, IBM Plex Sans, Inter), styling and EN/ES UI preserved; CT-15a/b/c design refinement/testing already documented.

## NEXT CT-02f — close the remaining direct-access holes
1. Re-verify all GitHub HEAD/PR CI and hosted schema; review CT02E_REVIEW and full original `publish_story_revision` body carefully.
2. Author migration/negative tests to replace legacy publisher function's editor boolean gate with current SQL capability checks while **preserving complete atomic version/copy/relationships behavior** and original timestamps. Avoid untested FUNCTION replacement or abrupt revoke that breaks publish.
3. Migrate `story_versions` RLS and any direct client version-creation service, preserving 41 historical versions and bylines. Include media metadata `public.media_assets` (currently SELECT true, including internal notes) and Storage media bucket write policies. Public media links must not break; bucket visibility requires explicit review.
4. Finish remaining editorial routes/server actions/workflows and direct database negative suite, including expired/suspended/revoked old editors, owner, editor, freelancer, signed-out readers and full public read/publish/discard. Use a disposable Supabase integration environment before live deployment.
5. Explicit approval required for production owner identity, backfill/grant matrix, migration history reconciliation/backup, production SQL and feature flag enablement. NEVER replay historic DEV_AUTH_BYPASS migration or claim new permissions live before cutover.
---
## Historical handoffs
# CURRENT CT-02d HANDOFF — 2026-11-23
**CT-02 remains IN PROGRESS; PR #8 is draft/unmerged. No Supabase hosted migration or production deployment.**

## Review stack and state
- Planning PR #2 -> CT-00 #3 -> CT-01 #4 -> CT-02a #5 -> CT-02b #6 -> CT-02c #7 -> **CT-02d draft PR #8** https://github.com/0445968/02022/pull/8.
- Feature branch `feature/ct02d-role-presets-route-gates-2026-11-23`, parent CT-02c at `c2b9c11d5802fa35420194b9797127157cd18975`. New `role-presets.ts` proposes nine permission preset mappings; they are not inserted into the DB.
- New `staff-route-gates.ts` offers fresh server authorization to Newsroom entry, story PUT, revision GET/PUT/DELETE and revision publishing. It is active **ONLY IF `CT_STAFF_ACCESS_V2_ENABLED=true`**, which remains false. It rejects revoked legacy editors on these guarded paths when enabled, but direct data policies and other routes still need secure migration. **DO NOT ACTIVATE YET**.
- Existing fonts/style preserved. User-approved final UI refinement stages added to master blueprint: CT-15a final UI/UX, CT-15b accessibility/performance, CT-15c regression/release.

## Live and release
- Clear Talks Supabase `yqqzohrlhiitctwacdad`: healthy, 0 recorded hosted migrations, staff_memberships absent, 23 stories and 4 active revisions unchanged; publisher definer and password-protection warnings remain.
- CT-02d GitHub Actions run **45290839865 SUCCESS**: **55 tests**, TypeScript, lint, Next.js build all passed. Inherited CT-02b PG17 **45290839676** and CT-02c PG17 **45290839801** both passed. Earlier stale newsroom-test assertion was corrected at `d065806bfd7e475ea9c1446d053ab29bfee0d7d2`. No main merge, browser test, preview/deployment, owner assignment, role seed, or auth/SQL changes.

## Next CT-02e
- Review nine proposed preset rights and verified real owner Auth identity before writing approved SQL/grants.
- Reconcile baseline/history and restorable backup; never replay historical dev-auth-bypass migration or reset live DB.
- Migrate direct RLS for story, revision, media and storage and secure publish RPC, **plus other API/server-action checks**, with full revoke/reader/assigned freelancer negative matrix and real Supabase test environment. An activated server-only flag is insufficient.
- Obtain explicit user approval before applying any hosted migration, first-owner bootstrap, role activation, env change, or main deployment.
---
## Previous handoffs (historical)
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
