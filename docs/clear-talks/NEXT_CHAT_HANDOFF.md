# CURRENT HANDOFF — CT-03c (2026-11-23 America/Chicago)
**CT-03c staged role preset capability matrix code/isolated security tests, draft PR #18; NOT MERGED OR DEPLOYED.** CT-02 live security cutover remains blocked.

## Verified branch/PR inheritance
- GitHub repo `0445968/02022`; protected live `main=f5c0140fb2db165e43303a064f7bc15b765d4505` unchanged. Stacked drafts: Plan #2 / CI #3 / story table #4 / CT-02a–k #5–#15 / CT-03a #16 / CT-03b #17 / **CT-03c [draft PR #18](https://github.com/0445968/02022/pull/18)**.
- Current branch `feature/ct03c-role-preset-editor-2026-11-23`, parent CT-03b final SHA `bc03e669d14798f1b75f0351caa4a3239eb4c946`.
- **UNAPPLIED migration** `supabase/migrations/20261124034804_ct03c_role_grant_editor.sql` filename from Supabase CLI v3.2.0 [run #45321966824](https://github.com/0445968/02022/actions/runs/45321966824); owner role preset read-only, no initial owner/grants seeded. Depends on unapplied CT-02b/c and audited tables.
- SQL role-ceiling policy limits each newsroom staff preset to reviewed capability/scope pairs. No `team.*`, security, personal-reader or byline.manage privilege via preset editor; owner role immutable. Independent DB Owner check + advisory lock + optimistic revision/CAS + full atomic grant replacement + original CT-02c audit trigger. Service-only security invoker RPC; anon/authenticated cannot call.
- `lib/permissions/staff-preset-input.ts`, `lib/services/staff-preset-admin.ts`, `app/api/newsroom/team/preset-change/route.ts`: cookie-bound verified real Auth, live `team.manage_roles`, same-origin JSON, strict confirmation, reason and approved capability ceiling, stale 409 conflict. **All three flags must be ON only after approval** (`CT_STAFF_ACCESS_V2_ENABLED`, `CT_STAFF_ADMIN_MUTATIONS_ENABLED`, new `CT_STAFF_PRESET_MUTATIONS_ENABLED`). Default **OFF** in code and `.env.example`. NO service key shipped to browser.
- Bilingual `components/editorial/team/RolePresetMatrixEditor.tsx`, integrated into CT-03a Team page; toggles reviewed permission pairs, current grant revision and additions/removals, explicit audit reason+confirmation. It does NOT seed any default grants or modify owner preset. Existing UI fonts/colors/global CSS untouched. Users without edit grant get read-only view.
- [CT-03c isolated PG17 security suite #45322183399](https://github.com/0445968/02022/actions/runs/45322183399) **SUCCESS**: anon/nonowner, owner immutable, freelancer cap/scope limits, duplicate/extra JSON rejection, grants create/revise/remove, no-op/stale CAS and attributed audit. Inherited 10 PostgreSQL suites expected; verify latest CI.
- [Quality run #45322593737](https://github.com/0445968/02022/actions/runs/45322593737) on code commit `068a0bb117f836f41b5857a65bc33636aa8aed86`: expected **129 tests** plus TypeScript/lint/Next build; verify exact final result. Early contract fixture corrected to match implementation's DELETE/UPDATE/INSERT atomic replacement rather than a single ON CONFLICT. Verify PR #18 final docs-only head before claiming all checks green.
- Read-only hosted Supabase `yqqzohrlhiitctwacdad`: 23 stories, 4 revisions, 43 versions, 22 public media/Storage objects; staff schema PRIVATE draft catalog/bucket ABSENT, hosted migration log EMPTY. No production SQL/write/bucket/role/env/deploy changes made.

## NEXT — CT-04a staff and freelancer invitations
1. Build **invitation + onboarding workflow** with scoped preset defaults, role guard and short-lived invite lifecycle; keep editorial byline separately managed from staff Auth user, and no inheritance from `profiles.is_editor/is_author`. Add audit/expiry, revocation, negative token tests, and paginated invited staff UI; no unapproved external emails.
2. CT-04b complete first-login experience, separate staff vs freelance Newsroom with preset scope and assignment, then CT-05 scoped newsroom, CT-06 story assignments/review and remaining pages.
3. **CT-02 release blocked**: independent restorable backup of hosted PostgreSQL AND Storage bytes, empty migration history reconciliation, approved first real Owner UUID and exact initial grants, real separate-disposable Supabase Auth/JWT/Storage tests (manual probe prepared, NOT RUN), EN/ES browser, published story with trashed featured-media editorial decision, privileged publisher and leaked-password advisor warnings, approved rollout/rollback.
4. Never apply staged SQL to live project, turn on CT flags, seed owner, merge main, deploy Vercel or replay `DEV_AUTH_BYPASS` / bulk db push/reset without explicit user approval.
5. Preserve current fonts Figtree, Source Serif 4, IBM Plex Sans, Inter, layout and styling. CT-15a dedicated final UI refinement later. Read `CT03C_REVIEW.md` and `ROLE_AND_PERMISSION_MATRIX.md` before next batch.

---
## Historical handoffs
# CURRENT HANDOFF — CT-03b (2026-11-23 America/Chicago)
**CT-03 IN PROGRESS: CT-03b code + isolated security checks are tested in a new DRAFT PR, not merged/deployed. CT-02 production security gates still open.**

## GitHub base
- Repo `0445968/02022`. Production `main=f5c0140fb2db165e43303a064f7bc15b765d4505` unchanged.
- Stack: planning #2 -> baseline #3 -> stories #4 -> CT-02a–k draft #5–#15 -> CT-03a draft #16 -> **CT-03b [DRAFT PR #17](https://github.com/0445968/02022/pull/17)**.
- Branch `feature/ct03b-permission-overrides-2026-11-23`, based on CT-03a final `3dc894cbe400d2260f722b3a0e5c0219755927d7`.
- **UNAPPLIED** CLI-generated `supabase/migrations/20261124031658_ct03b_staff_overrides.sql`, run `45318371778` pinned CLI 3.2.0. Depends on previous uninstalled CT-02b/c staff/owner audit schema. No role assignments seeded.

## Implemented in CT-03b
- Owner-only, transactionally audited SECURITY INVOKER override RPC `staff_apply_override_change` with service_role-only EXECUTE; double-protected table trigger and immutable membership/capability/scope, reserved/administrative cap blacklist, current owner verification even after server validation. Valid allow expirations 1 hour–90 days, deny can be perpetual or expires within 365 days. No self/owner target. Deny-first policy model preserved; legacy profile editor flags ignored.
- `lib/permissions/staff-override-input.ts`, `lib/services/staff-override-admin.ts`, `app/api/newsroom/team/override-change/route.ts`: valid UUID/action/capability/scope/effect/expires/reason; cookie Auth + `team.manage_overrides`; same-origin JSON POST, 2048-byte bound. Three opt-in flags required (`CT_STAFF_ACCESS_V2_ENABLED`, `CT_STAFF_ADMIN_MUTATIONS_ENABLED`, **new `CT_STAFF_OVERRIDE_MUTATIONS_ENABLED`**, all default **false**). No client service key and no live SQL.
- `lib/services/staff-effective-access.ts` and `GET /api/newsroom/team/[id]/effective`: rechecks current viewer session + team.manage_overrides before server-only service-role read of actual DB membership, role grants, overrides, expiry. Results `allowed`, `denied`, `conditional`; conditional does **not** mean access, because it does NOT know the real assigned/owned story or media. Resource-specific gates still take final decision.
- `StaffPermissionInspector.tsx`: bilingual review of current effective grants and individual overrides, reason/confirm, set/remove and expiry. Visible only for `team.manage_overrides` viewer. Role/feature preset edit remains read-only. `StaffTeamManager.tsx` now has actual pagination (25 member records/page, 15 audit events/page), status filter and audit selected-member filter under `team.view_audit`; search within CURRENT page only. Real staged permission RLS cannot be browser QA'd until approved activation.
- **Verified application quality** [#45319380204](https://github.com/0445968/02022/actions/runs/45319380204) **SUCCESS** on source SHA `4ad07860d6fb19909cbfbda3bd61505068153c8a`: **120/120 tests**, TypeScript, ESLint and Next.js build all pass. [CT-03b PG17 #45319380232](https://github.com/0445968/02022/actions/runs/45319380232) **SUCCESS**; all 9 inherited PG17 suites passed (10 total). Docs-only final HEAD reruns CI; verify PR checks.
- No font/UI/CSS changes. Data remains 23 stories / 4 revisions / 43 historical versions / 22 media. Live Supabase `yqqzohrlhiitctwacdad` has **NO staff schema, NO private staging bucket, ZERO recorded migrations**, no newly deployed roles. `main` and production URL `https://clear-talks.vercel.app/` untouched.

## NEXT — CT-03c and CT-04
1. CT-03c: build a **real role preset capability editor**, not just proposal preview. Owner-only audited RPC for updating built-in role grant/scope with protection of high-risk administrative and entry privileges, explicit approval before seeded grants, database revision/collision handling and negative tests. Keep all mutations disabled before verified identity/first owner and CT-02 releases. Review `ROLE_AND_PERMISSION_MATRIX.md`.
2. CT-04: invitation/onboarding with separated Auth identity vs editorial byline, role defaults for freelancers and different staff types, scoped project/story assignments and expiring contracts. Requiring owner approval and providing minimum accounts/UI is the objective. No auto-grants from `profiles.is_author`, `is_editor` or `user_metadata`.
3. CT-02 security work remains **BLOCKED for live** pending independent restorable backup+Storage, reconciled empty Supabase hosted migration history, verified first owner account and approved grants, real disposable Supabase JWT/Storage test (manual harness prepared NOT RUN), EN/ES browser QA and archived published media rights decision (one published story references trashed media). Existing authenticated privileged publishing function and leaked-password protection advisor issues remain.
4. Do not apply SQL to project `yqqzohrlhiitctwacdad`, merge main, deploy Vercel, enable CT flags, seed permissions, grant owner or perform live writes without explicit user approval. No `db push/reset` or historical DEV_AUTH_BYPASS migration replay. Preserve current fonts (Figtree, Source Serif 4, IBM Plex Sans, Inter) and current UI; CT-15a later.

---
## Historical handoffs
# CURRENT HANDOFF — CT-03a (2026-11-23, America/Chicago)
**CT-03 IN PROGRESS. PR #16 is unmerged/staged. CT-02 live cutover still BLOCKED and no hosted or production changes made.**

## Latest feature branch
- GitHub repo `0445968/02022`, `main=f5c0140fb2db165e43303a064f7bc15b765d4505`. Stack: Plan #2 -> CT-00 #3 -> CT-01 #4 -> CT-02a-k #5–#15 -> **CT-03a draft PR #16** https://github.com/0445968/02022/pull/16.
- Branch `feature/ct03a-team-permissions-2026-11-23`, stacked on CT-02k SHA `b54a6a36d0d67c43ecc7efd4c9c1c9cbcde5568e`.
- Feature-gated Newsroom `/newsroom/team` page and sidebar link, EN/ES `newsroom.team` labels, React `StaffTeamManager` with roster, status, current roles, configured-vs-proposed grants, role/membership mutations (grant/revoke/suspend/reactivate/revoke membership), reason+confirmation and current audit history.
- `lib/services/staff-team-directory.ts`: cookie Auth and current team.view, **rechecks Auth/grants directly before server-only service role** to project member status, name but no email, roles and grants. `GET /api/newsroom/team` sanitized/no-store; `POST /api/newsroom/team/role-change` same-origin+input validation, calls existing CT-02c audited `applyStaffRoleChange` and protected SECURITY INVOKER owner-check RPC. No client-side service key.
- Both `CT_STAFF_ACCESS_V2_ENABLED=false` and `CT_STAFF_ADMIN_MUTATIONS_ENABLED=false` remain in all deployed environments; NONE of these routes grants legacy editor access while off. All CT-02b–k SQL remains UNAPPLIED, no first owner grants, no preset seeding, no new buckets. No font/color/global CSS changes.
- [Application quality run `45317507264`](https://github.com/0445968/02022/actions/runs/45317507264) **SUCCESS** on code SHA `ed2de2d67b503c298c3698fae8c38bff1eb84eec`: **111 Node tests**, TypeScript, ESLint, Next build all green; seven CT-03a contracts. All nine inherited PG17 security suites passed. Docs-only final PR head reruns; check current checks. Isolated test fixture is not real JWT/browser verification.
- Live Supabase project `yqqzohrlhiitctwacdad`: 23 stories/4 revisions/43 versions/22 media; staff tables/private bucket absent, hosted migration table empty. Do not run SQL or role grants until approved. No merge or Vercel deployment.

## NEXT — CT-03b + CT-04
1. Build an explicit, audited per-member capability override UI backed by secure database/RPC APIs, with deny-first handling, expiration, scoping, positive/negative tests and preview of actual effective permissions (not simply nominal roles). Test owner and self-edit guards. Do not allow editable team grants without reviewed SQL/role constraints.
2. Implement pagination for >100 member records, audit filtering and accurate count; add member-specific details and status/expiration warnings. Do not expose account email unless permission contract and privacy review explicitly allow.
3. CT-04 staff and freelancer invitations/onboarding, preset assignment and early capability guard; no auto-promotion from legacy is_editor/is_author or Auth user_metadata.
4. Independent CT-02 gates remain: real **separate disposable** Supabase Auth+Storage probe prepared but NOT RUN, verified restorable backup (DB+Storage), baseline/migration reconciliation (hosted has zero migration entries), approved first owner/grant presets, real EN/ES browser and revoked-staff negative tests, published story with trashed featured media, publisher/leaked-password advisor issues. No bulk db push/reset or DEV_AUTH_BYPASS replay. Explicit user approval required before cutover.
5. Preserve current fonts (Figtree, Source Serif 4, IBM Plex Sans, Inter), UI/style and all content; CT-15a dedicated final UI refinement later.

---
## Historical handoffs
# CURRENT HANDOFF — CT-02k (2026-11-23 America/Chicago)
**CT-02 is STAGED / IN PROGRESS. Draft PR #15 implements reader authorization parity and a REAL Supabase test harness, but the external test is NOT run. No live migration or deployment.**

## Verified GitHub / Supabase state
- Planning PR #2 -> CT-00 #3 -> CT-01 #4 -> CT-02a #5 -> CT-02b #6 -> CT-02c #7 -> CT-02d #8 -> CT-02e #9 -> CT-02f #10 -> CT-02g #11 -> CT-02h #12 -> CT-02i #13 -> CT-02j #14 -> **CT-02k [draft PR #15](https://github.com/0445968/02022/pull/15)**.
- Current working branch `feature/ct02k-reader-comment-rls-2026-11-23` stacked on CT-02j `d442558530b151378481fc59ead7f94ffe92798e`; main remains `f5c0140fb2db165e43303a064f7bc15b765d4505`, NOT touched.
- Unapplied SQL `supabase/migrations/20261124021851_ct02k_reader_comments_rls.sql` (filename generated by pinned CLI 3.2.0 run `45311410978`), depends on prior CT-02 stack. Removes legacy `profiles.is_editor` comment/report moderation policies and installs live-current capabilities plus immutable/audited write triggers. Direct bookmark INSERT now checks publication. Bookmark route DEV_AUTH_BYPASS excluded.
- Hosted Supabase `yqqzohrlhiitctwacdad` has **23 stories, 4 unpublished revisions, 22 media assets and 22 PUBLIC objects**; `staff_memberships`, `media_private_drafts` absent; zero hosted migrations despite restored schema. No new buckets, role grants, migration, Vercel flags, content or UI changes.
- [Quality CI `45312143203`](https://github.com/0445968/02022/actions/runs/45312143203) **SUCCESS** on code SHA `e734bea0c89efde80f2f676fda45f0c1166f75d9`: **104 Node tests**, TypeScript, ESLint and Next.js build PASS. [CT-02k PG17 `45312143104`](https://github.com/0445968/02022/actions/runs/45312143104) **SUCCESS**; 8 inherited PG17 suites all green (**9 total**). Check final docs-only HEAD CI.
- A manual `workflow_dispatch` `ct02k-real-supabase-e2e.yml` plus `scripts/ct02k-disposable-supabase-e2e.mjs` is **prepared, not executed**. Real `signInWithPassword` users, private signed URLs, Storage.copy and public SHA-256 checks require a disposable Supabase project, four test accounts, test-only role grants and GitHub secrets. Hard-coded refusal to contact Clear Talks production; no service-role key. See `CT02K_DISPOSABLE_SUPABASE_QA.md`.
- Docs updated: `CT02K_REVIEW.md`, `CT02K_DISPOSABLE_SUPABASE_QA.md`, `CT02K_RELEASE_GATES.md`, implementation ledger and role matrix. Fonts and styling preserved. No final UI refinement till CT-15a.

## NEXT — CT-03a and tracked CT-02 production gate
1. **Recommended next build: CT-03a** admin-facing team, preset/role permission manager UI against staged server reads/mutations, protected by OFF feature flags. Existing permissions/presets must remain NO grants until owner identity and full deployment approved. Avoid blocking app feature development waiting for production cutover.
2. Remaining CT-02 release gate: run genuine Auth/JWT/Storage manual fixture in a **separate disposable project** only after approval/setup; reader/comment/bookmark negative tests, EN/ES browser, staff revocation, public/private media and all legacy paths. Do not use live Supabase.
3. Approve first real owner UUID and exact staff presets before any grants, verified independent backup/restore (DB+Storage), empty hosted migration-register reconciliation, negative database/Data API/RPC tests and explicit release authorization. Never replay dev bypass or bulk `db push/reset`.
4. Resolve **one published article referencing trashed featured media** editorially, preserve 22 public files with owner_id NULL, review privileged publisher/leaked-password Advisor findings and public allowlisted view privilege exception.
5. Main and live site unchanged, all SQL staged, `CT_STAFF_ACCESS_V2_ENABLED=false` and `CT_MEDIA_PRIVATE_DRAFTS_ENABLED=false`, no merge or Vercel deployment. Existing UI and fonts Figtree, Source Serif 4, IBM Plex Sans, Inter preserved; CT-15a final refinement later.

---
## Historical handoffs
# CURRENT HANDOFF — CT-02j (2026-11-23 America/Chicago)
**CT-02 IN PROGRESS. CT-02j code is committed and CI-tested, but all SQL/Storage/role changes are STAGED ONLY. Nothing live deployed.**

## Stack and current working branch
- Plan #2 -> CT-00 #3 -> CT-01 #4 -> CT-02a #5 -> CT-02b #6 -> CT-02c #7 -> CT-02d #8 -> CT-02e #9 -> CT-02f #10 -> CT-02g #11 -> CT-02h #12 -> CT-02i #13 -> **CT-02j [DRAFT PR #14](https://github.com/0445968/02022/pull/14)**. Branch `feature/ct02j-private-media-approval-2026-11-23` based on CT-02i `08ab407d80e593f08f2c6893c8b961737cdb05ee`. `main` unchanged `f5c0140fb2db165e43303a064f7bc15b765d4505`.
- Unapplied `supabase/migrations/20261124020117_ct02j_media_promotion.sql` generated with pinned CLI 3.2.0 in CI run `45309261926`; relies on staged CT-02b/c/e/f/g/h/i, reviewed grants, backup and migration-history reconciliation. Do not create live bucket or turn on flags.
- Staged `media_private_drafts` review states/actor/rights/status/sha256/public path, immutable source trigger, RLS, Storage public `approved/<draft ID>` copy-only policy. Private reviewer requires current `media.approve`, `media.edit_all`, `media.upload`, `media.view_all`; no service role.
- `app/api/media/drafts/[id]/approve/route.ts` verifies actual JWT + original/public SHA256, claims with compare-and-swap, no overwrite, creates/approves normal public `media_assets`, finalizes private `published`. Failed operation is `failed` and can retry the SAME immutable target; cross-bucket Storage/SQL is not one transaction. `.../reject` keeps private original and reviewer reason. `GET /api/media/drafts` RLS list without private URL. `app/api/media/drafts/route.ts` upload now hashes bytes.
- `PrivateDraftMediaPanel.tsx` added to Newsroom media page when **BOTH `CT_STAFF_ACCESS_V2_ENABLED=true` and `CT_MEDIA_PRIVATE_DRAFTS_ENABLED=true`**, default false. When on, normal MediaLibrary Upload button scrolls to private flow and old public drawer is disabled. While OFF, all existing UI/behavior/styling/fonts remain unchanged.
- [Quality CI `45310184651`](https://github.com/0445968/02022/actions/runs/45310184651) **SUCCESS** on code SHA `09b4894b5077d17bc848aa6a347b7b8364e7c77a`: **96 Node tests**, TypeScript, lint and Next.js build PASS. [CT-02j isolated PG17 `45310185178`](https://github.com/0445968/02022/actions/runs/45310185178) **SUCCESS**; CT-02b/c/e/f/g/h/i inherited suites also passed (8 in total). Final documentation head may rerun; see latest PR #14 checks.
- Live read-only verified: project `yqqzohrlhiitctwacdad` has **23 stories, 4 unpublished revisions, 43 versions, 22 media**, 22 public Storage files, `staff_memberships` missing, `media_private_drafts` missing, `media-drafts` bucket absent, hosted migrations history empty. All existing owner_id for media objects NULL. NO live data edits, SQL, role changes, deployments or env flags. One published story points to a trashed asset.
- Review `docs/clear-talks/CT02J_REVIEW.md`, `PRIVATE_DRAFT_MEDIA_ROLLOUT.md`, `ROLE_AND_PERMISSION_MATRIX.md` and this ledger. Preserve current fonts (Figtree, Source Serif 4, IBM Plex Sans, Inter), UI/EN-ES and CT-15a final refinement.

## NEXT CT-02k
1. **Real disposable Supabase Auth + Storage**: verify roles with JWT, Storage.copy cross bucket, private upload/preview/download/TTL, public copy SHA, idempotent partial failure, signed URLs, source owner, direct API spoofing, revoked editor/freelancer/reader/anon negative tests. PG17 alone cannot prove Storage HTTP behavior.
2. Finish direct SQL/RLS and server action audit for comments, reader profiles/favorites, polls/notifications and any remaining old author/editor flag checks. Preserve public article relations. Record real browser EN/ES Media Library QA.
3. First owner real Auth ID and reviewed exact preset permissions, independently restorable backup, empty hosted migration-history reconciliation and explicit user approval required before any hosted application, initial role grant, new private bucket, Vercel flag, main merge or deployment.
4. Resolve published article with trashed featured-media reference via deliberate editorial decision; preserve all 22 public URLs and existing image data. Advisor privileged publisher warning and leaked-password-protection also still open.
5. No unreviewed historical DEV_AUTH_BYPASS migration, no `db push/reset`, no UI/font restyling. Keep CT-02 OFF until full site-wide security cutover.

---
## Previous handoffs
# CURRENT HANDOFF — CT-02i (2026-11-23 America/Chicago)
**CT-02 IN PROGRESS. PR #13 is CODE TESTED AND STAGED ONLY; NOTHING DEPLOYED.**

## Stacked PR and state
- Planning #2 -> CT-00 #3 -> CT-01 #4 -> CT-02a #5 -> CT-02b #6 -> CT-02c #7 -> CT-02d #8 -> CT-02e #9 -> CT-02f #10 -> CT-02g #11 -> CT-02h #12 -> **CT-02i [draft PR #13](https://github.com/0445968/02022/pull/13)**. Branch `feature/ct02i-private-draft-media-2026-11-23` base CT-02h `10204a57d72530bcdcdf91f15c5a5146a0b1866e`. Main remains `f5c0140fb2db165e43303a064f7bc15b765d4505`.
- Unapplied migration `supabase/migrations/20261124013801_ct02i_private_media_drafts.sql`, filename from pinned Supabase CLI 3.2.0 CI run 45306452322. Requires prior staged CT-02b/c/e/f/g/h; DO NOT apply on hosted restored DB, which has zero recorded migrations, before approved owner+roles/verified restore backup/migration reconciliation.
- Proposes a **NEW private `media-drafts` bucket** with 10MB/image MIME limits. **Existing `media` public bucket and all old data/URLs untouched.** New `media_private_drafts` private catalog uses owner/role RLS; Storage policies restrict uploaded file paths, object owners, selects and orphan cleanup. No UPDATE/overwrite and no publicly accessible URLs.
- Routes `/api/media/drafts` POST and `/api/media/drafts/[id]/preview` GET: both require `CT_STAFF_ACCESS_V2_ENABLED=true` **AND** `CT_MEDIA_PRIVATE_DRAFTS_ENABLED=true`, genuine Supabase user, current role and private object RLS. Private upload validates MIME, magic bytes, 10MB cap and stores catalog; preview returns 60-second signed URL with no-store. Existing `/api/media/upload` blocks public fallback WHEN private mode active; legacy behavior unchanged with flags off.
- [Quality CI `45306804142`](https://github.com/0445968/02022/actions/runs/45306804142) **SUCCESS** on source commit `e7955f03b8e5a9549d4ffe271c00fb2d9f16dede`: **88 tests**, TypeScript, lint, Next.js build PASS. [CT-02i PG17 `45306804137`](https://github.com/0445968/02022/actions/runs/45306804137) **SUCCESS**, all inherited CT-02b/c/e/f/g/h PG17 suites green. Final docs-only head may retrigger CI.
- LIVE read-only: Supabase `yqqzohrlhiitctwacdad` still has **23 stories / 4 revisions / 43 versions / 22 media**. One public bucket `media`, 22 objects all owner_id NULL; no private bucket, no staff table, no hosted migrations or role grants. Production unchanged. All fonts/styling/EN-ES UI preserved.

## NEXT CT-02j — media approval/promotion and remaining cutover
1. Review `CT02I_REVIEW.md` and `PRIVATE_DRAFT_MEDIA_ROLLOUT.md`. Stage/test PRIVATE draft -> approved public media approval/promote/copy lifecycle with idempotency, rights, embargo, checksum, async Storage copy/DB mismatch cleanup, and authorized media approval. Never expose unpublished bytes, delete originals or auto-change 22 restored files.
2. Integrate private upload and signed-preview routes into the existing media-library editor UI using current styling WITHOUT activating flags or sacrificing existing legacy upload flow until full parity. Keep existing editor workflows usable while v2 off.
3. Audit remaining account/reader, bookmarks/favorites, comments, polls and pending direct Data API privilege paths. Run actual disposable Supabase Auth JWT + Storage HTTP API/URLs and browser negative matrix (owner, managing editor, assigned freelancer, legacy revoked editor, reader, anon).
4. One published article points to media marked trashed; resolve explicitly by editorial rights decision before approved-only public media view activation. Existing 22 public Storage objects have no owner_id; do not fabricate ownership.
5. Explicit real first-owner Auth identity and approved role grants/permission matrix, independent backup-and-restore rehearsal and empty migration history reconciliation required before hosted CT-02b–i SQL, any bucket creation, Vercel env flags or deploy. DO NOT replay historical DEV_AUTH_BYPASS or bulk db push/reset.
6. CT-02 still in progress, no merge or deploy without explicit approval. Preserve Figtree/Source Serif 4/IBM Plex Sans/Inter and current UI. CT-15a UI polish still scheduled after functional completion.

---
## Historical handoffs
# CURRENT HANDOFF — CT-02h (2026-11-23 America/Chicago)
**CT-02 remains IN PROGRESS. PR #12 is a DRAFT with staged SQL and code only; no live application.**

## Current GitHub state
- Plan #2 -> CI #3 -> Stories #4 -> CT-02a #5 -> CT-02b #6 -> CT-02c #7 -> CT-02d #8 -> CT-02e #9 -> CT-02f #10 -> CT-02g #11 -> **CT-02h [draft PR #12](https://github.com/0445968/02022/pull/12)**, branch `feature/ct02h-editorial-authorization-2026-11-23` stacked on CT-02g `9e09fd2414ff6cbd2685e04c8b130548886fdb33`. Production `main` remains `f5c0140fb2db165e43303a064f7bc15b765d4505`.
- New **UNAPPLIED** SQL `supabase/migrations/20261124012440_ct02h_editorial_direct_policies.sql`, generated by pinned CLI 3.2.0 run `45304812323`. Requires CT-02b/c/e/f/g migrations and approved owner and role grants BEFORE installation. Never replay dev auth bypass or bulk `db push` on restored DB with empty migration history.
- Staged direct homepage draft/live placements/breaking-news RLS, staff byline grants, global tags and per-story relation writes. `publish_homepage_layout` preserved verbatim after original validation body; new invoker authorization requires `auth.uid()=p_user_id` and `homepage.edit` + `homepage.publish`. Public homepage/time windows, bylines and taxonomy reads preserved.
- All named route checks from CT-02h reviewed in `docs/clear-talks/CT02H_REVIEW.md`. New `editorial-route-gates.ts` includes story create/author assignment, version restoration, homepage, breaking news, bylines and tag creation. Media favorites additionally gated per record. `CT_STAFF_ACCESS_V2_ENABLED` STILL OFF; no legacy fallback when future v2 ON.
- [CT-02h PG17 `45305560349`](https://github.com/0445968/02022/actions/runs/45305560349) **SUCCESS**, all inherited CT-02b/c/e/f/g PG17 workflows green. [Application quality `45305560332`](https://github.com/0445968/02022/actions/runs/45305560332) **SUCCESS**, **84/84 tests**, typecheck, ESLint, Next.js build passing on code SHA `345e49228e25d92797b25ce8db6e21338cbaa27c`. Docs-only final head rerun may still be in progress.
- LIVE READ-ONLY Supabase `yqqzohrlhiitctwacdad`: 23 stories, 4 unpublished revisions, 43 versions, 22 media, zero hosted migrations, `staff_memberships` missing; no prod SQL, member role grants, Vercel env or deployed changes.
- Current proposal: homepage.publish available to owner/managing_editor, not standard editor; byline.manage only owner. Role design needs user approval before initial grants. Preserve all current UI/fonts; CT-15a visual refinement remains after feature build.

## NEXT CT-02i / release blockers
1. `docs/clear-talks/PRIVATE_DRAFT_MEDIA_ROLLOUT.md` is a proposed, **NOT IMPLEMENTED** private bucket + publication/promotion state machine. Current public media bucket exposes drafts by known URL; 22 restored objects have no Storage owner IDs; one published article has trashed featured image. Explicit media rights decision and bucket design approval required before rollout.
2. Audit any remaining direct RLS and endpoint paths (comments, polls, favorites, profile/notification access, taxonomy joins), and replace historical editor flags WITHOUT granting reader roles staff rights. Preserve public article/front page relationships and bylines.
3. Run disposable **real Supabase** with JWT/Storage SDK and browser tests, including public articles images, revoked editor, assigned freelancer, spoofed user IDs, signed URL/private binary denial and category/tag changes. PG17 mocks alone insufficient.
4. Obtain verified real owner identity and reviewed exact presets, independent restorable backup, reconcile empty hosted migration history, staged dependency-ordered installation, explicit permission for any live SQL/role grants/env flag/merge/deploy. Keep all CT-02 flags OFF until coherent cutover.
5. No font, CSS or established UI changes, final CT-15a polish separate and approved.

---
## Historical handoffs
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
