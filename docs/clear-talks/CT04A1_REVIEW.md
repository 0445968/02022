# CT-04a.1 — invitation token and input contract (staged)
Date: 2026-11-23 America/Chicago. Based on CT-03c PR #18, final SHA a9dc0d743180c26bdfc64789f49711cf66f00e73.
All 12 final-head CT-03c checks verified successful (quality #45322835883; 11 PG17 workflows).
No production merges, SQL, flag changes, mail, account creation, role grants or UI changes.

## This slice
- Pure server-side `lib/permissions/staff-invitation-contract.ts`: finite nonowner roles, strict fields, nonzero configured preset revision, typed member/role pairing, reason and explicit confirmation, maximum seven-day token lifetime, finite contractor/freelancer membership expiry (maximum 365 days, after token expiry). No scope field accepted; permissions follow reviewed database presets, not the invitation input.
- Crypto-random 256-bit URL-safe token, domain-separated SHA-256 digest, canonical encoding and constant-time hash match. The raw token is ephemeral and must never be stored, logged, included in audit or sent to analytics.
- Identity/expiry/revocation/preset-revision preflight, explicitly NOT authentication/authorization or a transaction. Future caller must fetch verified auth.getUser() and actual DB state; invite email comparison is case-normalized but does not collapse aliases. The function cannot activate membership.
- Runtime Node tests for token validation, role escalation/forged fields, expired/reused/canceled state, unverified/anonymous or mismatched identity, and changed grant revision. CI results pending at commit time.

## CT-04a.2 — next implementation (not implemented here)
1. Use pinned CLI migration naming. Create RLS-enabled invitation storage with no anonymous/authenticated table privileges or token access; store digest only. Separate owner-only issue/revoke/replace/list operations from verified-user redeem. Use the CT-02c shared advisory lock and auditable RPC transactions; no Owner role invitation or implicit preset grant.
2. Check real active, non-expiring employee Owner and team.invite capability, role configuration/revision and actual newsroom.access grant at issue; bind invitation to a reviewed preset revision, revoke/replace if the revision changes. Bound creation rate; prevent duplicate active invitations. Recheck issuing Owner eligibility at redemption. Do not revive suspended/revoked or overwrite existing memberships; never auto-link bylines.
3. Recheck auth.users verified email and identity independently in DB, hash equality, time, lifecycle, membership conflicts, role revision, role/member type and actual grant eligibility under lock. Consume once and create membership + role + scrubbed audit in one transaction. Rejection must leave no grants or partial state. Direct authenticated calls must not supply a forged actor; use service-role-only RPCs guarded by server-verified JWT. Add PostgreSQL negative and concurrent redemption tests.
4. Add disabled-by-default server-only invite flag, same-origin bounded JSON APIs, page/list with redacted emails and no hashes. Token enters redemption via protected POST, not URL query/logs; use vetted fragment-to-POST or code-entry flow, no third-party scripts, Cache-Control no-store and no-referrer. No automatic emails until sender/delivery approved; never contact restored fictional accounts. Never report delivery before actually verified. Explicit admin resend invalidates old token. Bilingual UI and real disposable Auth/browser tests remain required.
5. CT-04b first-login and optional separately authorized byline link. CT-05 scoped Newsroom remains next after onboarding acceptance.

## Release boundary
Keep all staff flags OFF. Existing live project and main remain untouched. Prior CT-02 release gates persist (independent database AND Storage backup/restore, hosted migration registry reconciliation, approved Owner/grants, real disposable Auth/JWT/Storage and EN/ES browser QA, media rights and advisor review). Do not claim this slice is a functioning invite workflow. No migration or endpoint is shipped by CT-04a.1; rollback is revert/close draft PR.

### Verification update — CT-04a.1
- Draft PR [#19](https://github.com/0445968/02022/pull/19), exact code SHA `201e193ec38eee0325297a32943f9d2fbfb15adb`. On source SHA: 11 of 11 inherited PG17 security workflows successful; [quality run #45329196599](https://github.com/0445968/02022/actions/runs/45329196599) not yet verified complete; do not claim a green quality/build result.
- No new SQL/PG suite in this slice, no live activation. Next CT-04a.2 only after source-quality check, including actual RLS schema and atomic audited redemption tests. Final documentation head may trigger fresh CI.
