# CT-02c — Restricted staff access mutations and owner protection
2026-11-23 | Draft PR #7 (https://github.com/0445968/02022/pull/7)
**Status: CODE STAGED AND ISOLATED SQL VERIFIED; NOT ON PRODUCTION.**

## Purpose and tested scope
This is the third slice of CT-02. It prepares a database-enforced administrative mutation and audit path while preserving the working Newsroom and all restored stories, user IDs, media and publishing behavior.

- `supabase/migrations/20261123230955_ct02c_owner_guard_and_audit.sql` generated with a pinned Supabase CLI in CI, not deployed. Requires unapplied CT-02b SQL first.
- `public.staff_apply_role_change` accepts actor UUID, target membership, action, builtin role key, meaningful audit reason, and request UUID. Authorized only for current ACTIVE non-expiring owner, with actor ≠ target and separate server verification. Supported operations: grant_role, revoke_role, suspend, reactivate, revoke_membership. Executes within one PostgREST transaction; advisory lock serializes owner role changes. Does not create memberships/invitations.
- RPC is SECURITY INVOKER, not DEFINER, and has EXECUTE granted ONLY to service_role; no public/anon/authenticated RPC access. It does not remove or replace the existing `publish_story_revision` RPC.
- Triggers prevent losing the last active owner through direct service-role DML or role/membership expiry. Owner roles must belong to active permanent employee memberships with no expiry. Built-in role keys cannot be changed or deleted. Audit triggers record all relevant staff changes, including changes made directly by privileged SQL, with before/after, reason, actor, request ID. DBA manual bootstrap is the only allowed NULL-actor path and is not performed.
- `lib/services/staff-role-admin.ts` is a **server-only, uninvoked adapter**; derives the actor from `auth.getUser()` and uses new membership capability authorization before it contacts the separate service_role client. Both independent feature flags must be enabled after formal review; in current repository env examples both are FALSE. No new route is exposed.
- `lib/permissions/staff-admin-input.ts` constrains builtin role keys, operations, reason lengths and target UUID; never accepts a caller-provided actor as authority.
- `tests/ct02c-postgres-admin.sql` and `.github/workflows/ct02c-postgres-admin.yml` apply CT-02b + CT-02c to isolated PostgreSQL 17 and verify grants, illegal actor rejection, self-mutation, audit, owner rotation, last-owner defense, owner expiry and builtin key immutability. GitHub Actions run `45287094467` passed, and follow-up `45287120144` passed.
- Static/unit tests + TypeScript, lint, build run in existing quality gates. No Supabase production credentials included.

## Security boundary and prerequisites to production
1. **DO NOT apply SQL yet.** Restored production has an empty migration register despite populated data and historical dev-auth-bypass migration files. Never replay the old SQL or run an indiscriminate `supabase db reset/push`. Back up and rehearse a restore against a disposable project; reconcile the exact live schema/migration history.
2. **Manually review which real Auth user should be the first owner.** No legacy `profiles.is_editor`, `is_author`, historical byline or imported fictional account is automatically assigned new membership or owner. The operator must approve identity mapping, role presets and capability grants. Owner bootstrap requires a separately reviewed DBA operation in production; no exposed bootstrap API is supplied.
3. **No privilege grant seed yet.** No team.manage_roles grants exist in the proposed new tables. The server wrapper refuses mutation until the verified owner has an active membership AND an approved role grants `team.manage_roles` AND both flags are enabled. The RPC independently requires that actor be current owner.
4. **No runtime cutover yet.** Current Newsroom paths and underlying direct story/media/revision RLS/RPC still use legacy `profiles.is_editor/is_author`; merely activating the new flag would NOT secure existing routes. Do not activate until all API/RLS/storage paths are protected and negative-tested, with revocation never falling back to old flags.
5. **The service-role key must never be public.** `SUPABASE_SERVICE_ROLE_KEY` may be configured only in the approved Vercel server environment after a complete server review. No secret value is recorded in source, and no CT-02c route publishes the mutation adapter.
6. **Auth, release and audit checks.** Test direct authenticated PostgREST user roles against a real disposable Supabase instance, then actual SQL roles, storage/media policies, sign-in, publishing, draft revisions, role revoke under an existing session, and owner succession. Existing Supabase Advisor warnings remain; independently verify the publisher `SECURITY DEFINER` function and leaked-password protection.
7. **Production signoff:** User authorization is required before any SQL migration, production role owner selection, service-key configuration, Vercel merge/deploy or active permission changes.

## Rollback
Before approved SQL: revert draft PR #7, no production DB mutation.
After any future approved SQL: take a verified backup of audit and membership data and prepare a reviewed dependency-ordered rollback of the CT-02c triggers/functions/index/column; never remove staff history casually.

## Limitations
Isolated SQL tests simulate Supabase roles/UID on PostgreSQL 17; they are not proof of real hosted Auth, RLS for existing tables, public RPC publishing behavior, end-to-end browser UX, or completed CT-02. The service_role has intrinsic bypass privileges and its key must remain isolated to the server. The project has **not** completed account/Newsroom migration or front-end team manager.
