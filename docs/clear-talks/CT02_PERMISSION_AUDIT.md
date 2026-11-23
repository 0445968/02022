# CT-02a — Permission contract and restored-state audit
Date: 2026-11-23 | New slice: **capability registry and fail-closed policy evaluator only**.
Implementation state: code in GitHub review. **No new staff permissions are active yet. No SQL migration applied.**

## Verified GitHub baseline and live read-only database
- `main`: `f5c0140fb2db165e43303a064f7bc15b765d4505` (unchanged).
- Review chain: planning PR #2 -> CT-00 PR #3 -> CT-01 PR #4. CT-02a branch stacked on CT-01 head `5b8480bf819d3989242e7f9bf16f78cb87a74ae9`.
- Supabase `yqqzohrlhiitctwacdad` active healthy, PostgreSQL 17.12; **0 registered hosted migrations**. Repository has historical migrations including a dangerous dev-auth-bypass policy file; do not replay repository migrations blindly.
- Database aggregates (no personal identities exported): 4 Auth users + 4 linked profiles; 3 authors; 2 editors; 2 both author/editor; 1 ordinary reader. 23 stories have an author ID (2 unique author profiles); 14 have editor ID (1 unique editor profile).
- `stories.author_id`, `stories.editor_id`, story history and revisions reference `profiles.id`; retain these associations. `editorial_profiles` remain a separate byline surface. Do not remove/recreate identities based on role flags.
- Existing stories SELECT RLS allows time-published public reads, all stories for editors, own stories for authors. `story_revisions` policies require editor or story-author ownership. Existing media SELECT is public. The role system relies on `profiles.is_editor/is_author` and is **not yet** a per-member scoped capability system.
- Existing public `publish_story_revision(p_story_id uuid,p_user_id uuid)` is SECURITY DEFINER and EXECUTE is granted to authenticated but not anon. Read-only inspected function definition: before modifying data it compares `p_user_id` to `auth.uid()` and checks `profiles.is_editor`, then locks story and revision; the Security Advisor still warns because any authenticated user can invoke this privileged RPC. No production revocation or replacement made.
- Two Security Advisor warnings remain: privileged publishing RPC and Auth leaked-password protection.
- Existing `getCurrentUser` and story API handlers perform legacy checks. For CT-02a, **none of the old route guards or DB policies changed**, avoiding an accidental outage before a safe owner backfill/migration.

## What CT-02a adds
- `lib/permissions/capabilities.ts`: finite registry from the proposed permission matrix, typed grant/override/resource inputs and a pure deny-first evaluator. A current verified principal and matching ACTIVE membership are mandatory for staff capabilities; status, expiry, explicit denies, grants and assignments are checked.
- `reader.personal` enforces owner-only access independently of staff membership; `settings.security_admin` remains locked pending a separately reviewed owner-admin path.
- No trust in `user_metadata`, byline IDs or client-supplied role flags; **the future server adapter must read memberships, assignments, grants and overrides from Supabase on each request**. Pure snapshot evaluation is only safe with server-verified inputs.
- Unit tests cover anonymous/reader denial, identity mismatch, forged user metadata, suspended/revoked/expired users, scope, explicit-deny precedence, time-based expiry, reserved admin capability and reader data ownership.
- RLS/API/storage enforcement across existing endpoints is **NOT shipped** in this slice. Do not route real access checks through the new evaluator with client-provided snapshots.

## CT-02b migration implementation gate (not yet approved/applied)
1. Create versioned migration using current Supabase CLI `migration new` after checking its `--help` and version. Do **not** register or apply legacy migrations to the restored project.
2. Create minimally scoped membership, role preset/capability, grant, assignment, deny override and audit schema. Add FK constraints/unique indexes, RLS `TO authenticated` and verified user/owner predicates; no anon grants. Privileged mutation paths must audit and protect the last active owner.
3. Perform a **manual, reviewed verified-owner backfill**. Do not automatically promote `is_editor` users or restored fictional account identities. Preserve old flags during transitional dual-read, without letting a revoked membership fall back to legacy flags.
4. Add server-only fresh membership resolver and migrate page/route/RPC/storage guards incrementally; prove API and direct RLS tests for anonymous, reader, assigned/unassigned freelancer, editor/admin, revoked and metadata-forged identities.
5. Rework/audit publishing RPC in a dedicated backwards-compatible transaction. Do not grant arbitrary callers, silently revoke publishing, or change production behavior without safe verified fixtures.
6. Before a hosted migration: confirm independent logical backup/rollback method, test SQL on disposable DB, check current advisors, review grants and dependencies and obtain explicit approval for live permission/schema modifications.

## Rollback, deployment, design constraints
- Revert CT-02a feature commit to remove the pure contract/tests. No DB rollback, deployment, auth change or content migration required.
- No fonts, CSS, account/Newsroom UI, published articles, media or publishing behavior changed.
- Vercel project identity/preview access unresolved through linked account; production and preview deployments were **not initiated**.
- Current acceptance only covers the pure unit contract and read-only audit; this is not CT-02 completion.
