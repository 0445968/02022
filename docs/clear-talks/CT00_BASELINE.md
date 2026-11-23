# CT-00 — Baseline safety and verification record
Date: 2026-11-23 | Scope: read-only production preflight, automated checks, no production release.

## Verified source of truth
- Repository: 0445968/02022, `main` HEAD `f5c0140fb2db165e43303a064f7bc15b765d4505`; planning PR #2 open and draft, head `b47c89ffbf0a94e80078375c3c73adc564f1d144`.
- Planning branch provides the four canonical blueprints; no application feature PRs were open before this batch.
- Next.js 13.5.1, React 18, TypeScript 5.2.2; scripts already available: build, lint, typecheck.
- New Supabase project `yqqzohrlhiitctwacdad` is ACTIVE_HEALTHY, PostgreSQL 17.12. Existing restored tables have RLS enabled.
- Hosted migration registry currently reports **zero entries**. Existing repository SQL migrations include historical dev-auth-bypass policies: NEVER replay these blindly to the restored database.
- Current DB (read-only counts): 23 stories, 18 published, 4 active story revisions (all attached to published stories), 11 stories with a featured_image_id, 22 media_assets.
- Security Advisor warnings remain: authenticated call to `public.publish_story_revision` (SECURITY DEFINER) and Auth leaked-password protection disabled. See https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
- Stories RLS: public may see only time-published stories; signed-in editor can see all; authors see own; active revisions guarded by staff/author ownership. Media metadata SELECT is currently public. CT-02 must audit all RPCs and media scope.
- Current env **names** include `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `DEV_AUTH_BYPASS` (code-only). No secret values were inspected or logged.
- The linked Vercel connector did not resolve the `clear-talks` project/hostname. Production project identity, live environment values, and preview deployment are **not independently verified**; recorded user-tested live behavior remains historical evidence.

## Automated testing
- `npm test`: Node.js 22 native test runner, legacy role denial checks and server-layout guard source assertions. These are unit/source-contract checks, NOT proof of direct API/RLS denial.
- `npm run smoke:routes`: explicit `SMOKE_BASE_URL=https://approved-preview.example` checks EN/ES public HTTP endpoints and a signed-out Newsroom sign-in redirect. Opt-in only; requires a reachable test environment. No tokens or write requests.
- GitHub Actions checks on PR: locked npm install, unit checks, TypeScript, ESLint, Next.js build; no deployment steps. Placeholder CI publishable configuration allows compile-only checks if dedicated GitHub variables/secrets are not configured; it cannot assert live DB behavior.
- Before CT-02, add authenticated direct API/RLS negative tests for every new role. Do not falsely claim those tests are covered by these baseline smoke checks.

## UI parity and rollback
- Visual references: `app/layout.tsx`, `app/globals.css`, `tailwind.config.ts`, `components/editorial/newsroom-shell.tsx`, `components/editorial/stories-dashboard.tsx`, `components/account/account-shell.tsx`; fonts Figtree, Source Serif 4, IBM Plex Sans, Inter.
- No CSS theme/font changes are permitted. CT-01 is limited to established Newsroom components, existing utility classes and new table columns.
- Rollback: revert the feature commits; CT-00/01 have no SQL migrations, data mutations, or authorized production releases. Live Supabase and Vercel projects are untouched.
- Full DB restore/backup strategy before schema-writing CT-02: confirm point-in-time backups and an externally validated logical backup path. Do not infer backup exists from a green application build.

## Still needing verification
- npm install/typecheck/lint/build and CI result; signed-in/signed-out browser tests, mobile layout, EN/ES and image loading on authorized preview.
- Current production Vercel project/branch/environment and exact `DEV_AUTH_BYPASS=false` setting, before any deployment approval.
