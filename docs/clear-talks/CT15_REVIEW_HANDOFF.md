# Clear Talks — Consolidated review handoff
**Status: automated local acceptance passed; hosted user review NOT ready.**
As of November 25, 2026. Candidate code: `aeead32422dcecfb7d92ce4a4bf19502297f67a3` (PR #56, feature branch; not production). Evidence: [CI run 45708640590](https://github.com/0445968/02022/actions/runs/45708640590), artifact 15066222948. 43/43 workflows, 484 real local integration PASS lines, 38 ordered forward migrations on reconstructed synthetic legacy schema, 42 authenticated page audits. Framework Next 16.4.6 / React 19.3.1. This evidence is not a real hosted restore or manual signoff.

## Before providing the review URL
- [ ] Correct Vercel account connected; verify project tied to 0445968/02022 and clear-talks.vercel.app. Current connector only lists other projects; do not reuse west-island-times.
- [ ] User chooses isolated Supabase target, with cost reviewed before creation. Clear Talks account currently lists only live ref yqqzohrlhiitctwacdad/default main. No test writes to it.
- [ ] Prefer separate protected review deployment with isolated database. A synthetic review is acceptable as a first UX round only if user agrees; it does not satisfy real-data restore acceptance.
- [ ] Before any actual-content copy, approve handling of existing reader/staff data; take encrypted independent database and storage backups, inventory counts and object hashes, restrict access; do not upload dumps or credentials to GitHub or chat. Use disposable verified identities, not live passwords; preserve historical references. Sanitize personal data where possible without masking schema/attribution regressions.
- [ ] Restore into the approved isolated target; validate actual schema and Auth/Storage baseline, migration history reconciliation, policy/grant drift and counts against current source. No broad db push/reset, legacy migration replay or automatic migrations on production. Apply only 38 ordered reviewed forward migrations from CT15_FORWARD_MIGRATION_MANIFEST.md in the isolated environment. Record per-migration result and post-migration advisors; prove recoverability. Review current source and target fingerprints before each write.
- [ ] Owner identity explicitly approved; bootstrap only in authorized isolated environment with audit; review role grant presets, no implicit legacy-flag promotion. Configure disposable test roles, feature dependencies and verified redirect allowlist; DEV_AUTH_BYPASS=false. No production secrets in review deployment. Keep provider sends, real scheduler, paid subscriptions, public poll activation and destructive operations off; use test-only settings for isolated poll workflows.
- [ ] Reconcile asset rights (previous read-only baseline: 20 unknown, 1 restricted, 1 owned; recheck current counts). Do not approve rights by default. Review public storage URLs and image/author links, no deletion.
- [ ] One consolidated protected preview, exact reviewed code commit, confirmed isolated backend ref. Verify preview sign-in redirects back to preview, session persistence/sign-out, account language and permission denial. Test original design and fonts with real network assets. Do not expose review URL or credentials publicly.
- [ ] Provide user protected URL, secure access instructions and this checklist. Real provider delivery/cron/payment operations remain separate business decisions.

## One comprehensive manual review
Record each case PASS / ISSUE / NOT TESTED and device, language, role, route, expected versus observed, screenshot with private details removed. Use synthetic disposable data; avoid public publication or sends. Start with desktop, phone and tablet; repeat relevant layouts in English and Spanish. Test keyboard Tab, focus indicator, Escape, screen reader landmarks, visible zoom, contrast, long text, touch targets and real image/font loading. Confirm no unwanted changes to original fonts, palette or site identity. Automated viewport checks are not a full accessibility certification.

| Area | Review scenarios |
|---|---|
| Public news | Homepage sections, breaking bar, island/category/latest/search routes, article body and author, image credits, language switch, navigation, registered/premium restrictions, account entry. Verify draft/private/paid content not exposed. |
| Reader account | Sign-in/out, profile/avatar, language, saved stories add/remove, comments and reports, notifications preferences/read/unread/all, newsletter topic opt-out and clear disabled delivery, subscription informational state, security/password recovery and privacy requests. Verify own export and no other account data. |
| Newsroom owner | Dashboard, Stories thumbnail and unpublished-change columns, search/sort/status filters, team directory, permission preview, role grant/revoke, preset edit/stale conflict, override deny/remove, invitation create/cancel/redeem and onboarding, byline review, privacy queue. Verify self/last-owner protection and audit. |
| Freelancer/writer | Onboarding, private profile, assigned stories, writer creation, private uploads, draft/revision editing, review submission, return/rework, assignment dates and only assigned visibility. No full newsroom/team escalation. |
| Editor | Story creation and revision history, assignment lifecycle, review inbox and independence, reviewed publishing, schedule/cancel/calendar, version retention and conflicts. Verify scheduled worker remains off unless separately approved. |
| Media & authors | Upload/private preview, approve with actual rights, reject, retry, metadata/alt/credit, eligible headshot, reference review, historical authorship preservation, no physical deletion. |
| Page Editor | Expand sections, assign/remove slots, autosave and stale conflict, draft vs public separation, history restore/revert/publish, responsive Actions/keyboard modal. |
| Moderation | Reader comment/report, moderator queue, approve/hide/review, bulk confirmation and audit, duplicate/stale actions, own history. |
| Polls | Draft/submit/independent approval, controlled isolated publication, one vote, no counts before release, threshold/close/retire, disabled default and no voter identities. |
| Access & privacy | Separate genuine sessions for owner/editor/staff writer/freelancer/moderator/reader/legacy; test unauthorized direct routes and APIs, revoked roles, private assets, notification isolation, no leak of credentials or invite tokens. |
| Final usability | 390/768/1440 and actual phone/browser; EN/ES; labels, focus, overflow, keyboard and screen reader; real image/font loading, network errors, LCP/CLS and slow connection. |

## Release gates after review
1. Collect all user findings, classify blocking versus optional, consolidate corrections and repeat exact CI plus affected review scenarios. User signs off on UI and functionality.
2. Resolve actual restored-data rehearsal and media rights; verify migration/backup/rollback procedure and current advisors, including historical SECURITY DEFINER and leaked-password protection; do not misstate these as resolved.
3. Agree on real Owner, production role matrix, provider/SMTP and consent policy, scheduler configuration, brand/domain metadata and rollout flags. Paid subscriptions are intentionally not activated. Explicit approvals separate.
4. Obtain separate production release authorization. Preserve backups and reversible deployment plan; verify current main, database state, correct Vercel project and exact candidate. Do not merge or apply hosted changes before authorization. 
5. Production post-release smoke, error review and rollback readiness. Record remaining provider decisions and evidence. 

## Known exclusions from automated acceptance
Real restored hosted data and user-facing Preview have not been tested. No external newsletter delivery, live cron, billing, actual erasure or destructive media deletion was tested/activated. Automated checks are local real Supabase services with synthetic accounts/content; screenshots do not replace manual UX review, assistive technology or production performance testing. No production approval implied.
