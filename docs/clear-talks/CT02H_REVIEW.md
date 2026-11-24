# Clear Talks CT-02h — Remaining editorial route and direct database authorization
Date: 2026-11-23 (America/Chicago)
**Status: DRAFT PR #12, staged/unapplied; CT-02 remains IN PROGRESS.**
PR: https://github.com/0445968/02022/pull/12
Branch: `feature/ct02h-editorial-authorization-2026-11-23`
Stack: Plan #2 -> CI #3 -> stories #4 -> CT-02a #5 -> CT-02b #6 -> CT-02c #7 -> CT-02d #8 -> CT-02e #9 -> CT-02f #10 -> CT-02g #11 -> CT-02h #12.

## Verified live audit — read-only
- Hosted Supabase `yqqzohrlhiitctwacdad` retains **no** `staff_memberships` table and **no recorded hosted migrations**. At start: **23 stories, 4 unpublished revisions, 43 story versions, 22 media assets**; none modified by this batch. Production `main` remains `f5c0140fb2db165e43303a064f7bc15b765d4505`.
- Exact `pg_policy` audit revealed legacy editor/author RLS grants on `homepage_layout_drafts`, `homepage_slots`, `breaking_news`, `editorial_profiles`, `tags`, `story_categories`, `story_tags`. Legacy publicly readable homepage placement, breaking-news window, visible bylines and public tags are intentionally preserved.
- Live `publish_homepage_layout(jsonb,uuid)` is a **SECURITY INVOKER** function with a supplied `p_user_id` and no identity check. Its original function was captured using `pg_get_functiondef` into `tests/fixtures/ct02h-original-homepage-publisher.sql`. Do not change the original atomic business steps.
- CT-02g previously found that the public `media` bucket has 22 ownerless Storage objects, and **one published story references an asset marked trashed**. These are not resolved by CT-02h. Private-draft binary downloads remain possible via the existing public bucket.

## Staged implementation
- New `supabase/migrations/20261124012440_ct02h_editorial_direct_policies.sql` (filename generated with pinned Supabase CLI v3.2.0 in GitHub Actions run `45304812323`, temporary workflow removed). This file must not be applied independently; it requires CT-02b/c/e/f/g, reviewed owner grants and complete compatibility rollout.
- Replaces 3 homepage draft RLS policies: `homepage.view_editor` may see drafts, `homepage.edit` may insert/update, and `updated_by` must match the verified Supabase account.
- Replaces 4 newsroom-only live placement policies and 4 breaking-news policies, requiring **BOTH `homepage.edit` AND `homepage.publish`** to change public placement/alert rows. A SECURITY INVOKER trigger protects immutable `created_by` and verified `updated_by`; read-only public visibility policies remain intact.
- Replaces 6 byline management policies (including duplicate `Editors can update editorial profiles`), granting management only through `byline.manage`. Existing public active/former and own-account byline SELECT policies remain. `editorial_profiles` are presentation metadata, not Auth roles.
- Replaces 2 legacy tag mutation policies: tag creation requires current `story.create` or `story.edit_all`; global tag updates require `story.edit_all`. Public tag reading is retained.
- Replaces 4 story/category/tag relationship write policies. Current editing rights must cover **that particular story**; modifying a **published** story also requires `story.publish`. The existing public relationship SELECT policies remain for compatibility, with further privacy review due before final release.
- Rewrites only the authorization prefix of the **original invoker** `publish_homepage_layout` function: checks `auth.uid() = p_user_id`, `homepage.edit`, `homepage.publish` before all writes. It retains the exact original validation, replace-placements, published-story filtering, and shared-draft update body. PUBLIC/anon EXECUTE revoked; authenticated EXECUTE retained with built-in identity/permission checks.
- New `lib/permissions/editorial-route-gates.ts` and feature-gated API calls: stories/create + authorId assignment, story version restore, homepage draft/live publishing, placements, breaking news, bylines and tag creation. The media-favorites API now requires media-record-specific view rights rather than merely membership or upload rights. **While `CT_STAFF_ACCESS_V2_ENABLED=false` these routes preserve current behavior. When enabled they do NOT fall back to legacy profile booleans.**
- Existing fonts (Figtree, Source Serif 4, IBM Plex Sans, Inter), EN/ES, Newsroom styles and public article layouts untouched.

## Automated verification
- `tests/ct02h-postgres-editorial.sql` and `.github/workflows/ct02h-postgres-editorial.yml` recreate verified legacy policy names in disposable PostgreSQL 17, apply prior CT-02b/c/e plus CT-02h and exercise public reads, expired/revoked and assigned-only user boundaries, draft versus live publishing, direct RPC user-ID spoofing, original homepage logic, byline authority and per-story taxonomy restrictions. [CT-02h PG17 run `45305407712`](https://github.com/0445968/02022/actions/runs/45305407712) **SUCCESS**; [CT-02h PG17 follow-up code run `45305560349`](https://github.com/0445968/02022/actions/runs/45305560349) **SUCCESS**.
- Static `tests/ct02h-policy-contract.test.mjs` verifies the exact original homepage function body is unchanged after its validation marker, cap checks, legacy policy retirement and all migrated route guards.
- Inherited CT-02b/c/e/f/g PG17 workflows passed at tested code commit. App quality (Node tests/typecheck/ESLint/Next.js build) is tracked in PR #12 GitHub Actions; **do not claim the final docs-only head is green unless verified**.
- This is an isolated PostgreSQL role/UID simulation, not end-to-end tests with genuine Supabase Auth JWTs, Storage HTTP calls, browser sessions, and full RLS schema.

## Release blockers (do not activate)
1. Staff owner Auth identity and initial grants **not approved**; proposed presets are in code only. In particular, owner/managing-editor presets have homepage edit/publish, while normal editor has homepage view only; byline.manage is owner-only in the current proposal. Those role rights require a **human decision** before live seeding.
2. Live project has restored data but zero hosted migration history. Require verified restorable backup and schema drift reconciliation; **never bulk db push/reset or replay historic DEV_AUTH_BYPASS policies**.
3. Private draft media design `docs/clear-talks/PRIVATE_DRAFT_MEDIA_ROLLOUT.md` is **not implemented**; live public bucket still exposes uploaded binaries by known URL. One published story uses a trashed featured image. Both must be reviewed before cutover.
4. Additional direct SQL for account-owned favorites, future comments/polls/newsletters and any unaudited services still needs a complete source and RLS coverage inventory. The current `story_categories` and `story_tags` public SELECT policies are still broad because removing them blindly could break existing public stories.
5. Disposable **real** Supabase Auth, JWT and Storage tests, EN/ES publication/browser regression, owner bootstrap and approved rollback plan are not yet complete. Do NOT activate `CT_STAFF_ACCESS_V2_ENABLED`, apply hosted SQL or merge/deploy.
6. Existing Supabase security warnings (privileged publishing function and leaked-password protection disabled) need release review; CT-02f preserves the privileged publisher and its guard.

**Rollback before production:** close/revert draft PR #12; no hosted DB rollback. If later applied with approval, a separately reviewed dependency-ordered policy/function rollback must retain revocation security, version history, public article access and auditability.
