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
| CT-00 | Baseline, safety, tests and CI | P0 | none | PLANNED | Blueprint §6 |
| CT-01 | Stories thumbnails + active unpublished revision indicator | P0 | CT-00 baseline | PLANNED | Blueprint §4 |
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
