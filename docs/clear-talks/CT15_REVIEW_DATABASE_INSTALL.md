# CT15 — hosted synthetic review database installation
Nov 26 review-only hosted install: mfyxyyclygeeklvbhawi (NOT yqqzohrlhiitctwacdad). User explicitly chose synthetic content and manual Vercel fallback. Empty-target guards verified. Applied 21 non-dev legacy SQL files + two reconstructed legacy shape fixtures, scrubbed embedded DEV BYPASS policies inside atomic groups; enum headline_bar required separate committed transaction (first grouped attempt rolled back completely). All 38 ordered forward files installed in four atomic groups, removing only their outer BEGIN/COMMIT, fixture legacy grants before forward cutover, exact 41 proposed owner capabilities before CT03c immutability; no actual owner membership or users. 34 public +30 private tables, all RLS enabled, zero dev policies, 19 categories, two media buckets (media public, media-drafts private), zero stories/files/users/members. Applied review-only legacy trigger hardening (seven timestamp functions fixed search_path; two qualified SECURITY DEFINER trigger functions fixed search_path and revoked direct anon/authenticated/PUBLIC execute); advisors now 33 INFO no-policy entries (deny by default) and 2 ERROR security-definer projection views reader_public_profiles/media_public_assets; neither view changed; must review projected fields and privileges with actual test data, reconcile actual source invoker view and production schema before release. One private table grant is intended reservation RLS (own verified auth + upload permission). No production writes, provider activation, deployment, real data copy. Hosted review migration registry has 8 grouped entries; NOT a production migration history. Actual source backup/restore remains outstanding. No user credentials retrieved. Next: local secure disposable Auth creation via scripts/ct15-create-review-users.mjs or dashboard; owner bootstrap and reviewed non-owner grants, synthetic seed, role/API tests, branch-scoped manual Vercel configuration. Exact application candidate unchanged.

## Migration groups (review only)
| Registry version | Group |
|---|---|
| 20261126180426 | ct15_review_only_legacy_baseline_part1 |
| 20261126180509 | ct15_review_only_legacy_baseline_part2a |
| 20261126180526 | ct15_review_only_legacy_baseline_part2b |
| 20261126180556 | ct15_review_only_forward_01_10 |
| 20261126180610 | ct15_review_only_forward_11_20 |
| 20261126180621 | ct15_review_only_forward_21_30 |
| 20261126180632 | ct15_review_only_forward_31_38 |
| 20261126180739 | ct15_review_only_legacy_trigger_hardening |

Exact source commit 93d04e93f29bce1d31379bea46042407c30e3542. Application candidate aeead324. This grouped registry is intentionally review-only, not suitable for production repair or db push. Separate reconstructed legacy schema from actual data restore. No fake platform auth/storage schema installed. Historical development migrations 20260830171808 and 20260908_dev_editorial_profiles_update omitted. Legacy profile/extras shape fixtures were used only in this empty target.

## Auth next step (user-operated, review only)
Create exactly seven synthetic users by running scripts/ct15-create-review-users.mjs locally with review project's legacy service_role key, entered privately into local shell (not chat, not a repository or Vercel production). Script validates JWT ref and role, verifies empty auth, generates unique passwords, creates verified users using managed Auth Admin endpoint with no email delivery, writes a new chmod-0600 credentials JSON outside repo. Script is source-reviewed and syntax checked but not executed against hosted Auth. Alternatively create the seven emails ct15-{owner,editor,staff_writer,freelancer,moderator,reader,legacy}@example.test in the review project's Authentication > Users using manually generated passwords and auto-confirm. No role assignment until verified exact accounts. Do not copy private data, passwords or session tokens. When user confirms, use audited disposable owner bootstrap and approved ceilings, seed synthetic content with controlled publication workflow; perform actual login and RLS tests. No real owner selection.

## Review-only trigger hardening
```sql
alter function public.update_generic_updated_at() set search_path='';
alter function public.set_homepage_slot_updated_at() set search_path='';
alter function public.set_breaking_news_updated_at() set search_path='';
alter function public.update_profile_updated_at() set search_path='';
alter function public.set_story_revision_updated_at() set search_path='';
alter function public.set_comment_updated_at() set search_path='';
alter function public.update_media_collection_updated_at() set search_path='';
alter function public.handle_new_user() set search_path='';
alter function public.validate_comment_parent() set search_path='';
revoke execute on function public.handle_new_user(),public.validate_comment_parent() from public,anon,authenticated;
```
Two security-definer views still require explicit review of controlled public projection with actual synthetic data (only public profile id/display name/avatar; approved public media metadata with rights/time constraints). Do not mark advisors fully resolved or blindly enable security_invoker in ways that expose underlying private columns or break public displays. Production reader_public_profiles has security_invoker already; no source changes. Reservation table own read/insert is intentional scoped RLS. 33 no-policy INFO findings are deny-by-default; verify actual role access before release.

## Preview gates
Vercel account connection succeeds but known project id prj_U7CSmTY3XlCycCnfEiCtkt61fK1O returns 404. Dashboard https://vercel.com/clear-talks-enterprise/clear-talks. User chose manual configuration. Use protected branch-specific Preview only, verify target backend, explicit safe flags and URL, no inherited production credentials or live external providers. Do not deploy before test role setup and verification; provide consolidated manual steps then. No production settings changes. 


## Hosted review test accounts and synthetic content
Nov 26 hosted review accounts confirmed: exact seven disposable users, seven trigger-created profiles, all email confirmed. Bootstrapped only isolated ct15-owner with explicit audit reason, used versioned staff_save_preset_grants for eight non-owner templates (managing_editor team.view omitted because reviewed DB ceiling prohibits it), 129 total capability grants, 5 active staff memberships, reader/legacy no current staff role, legacy historical editor/author flags intentionally true. First SQL bootstrap attempt rolled back due wrong enum type name, corrected with literals. Seeded 11 synthetic stories (8 published via owner submission/independent editor approval/owner publication RPC with transaction-local simulated claims, 3 drafts), 1 unpublished revision, 2 assignments, 2 test bylines, 149 audit rows, 8 publication events, zero surviving permits, no actual production content or image bytes. Hosted SQL role impersonation read checks passed: anon 6 public articles; owner/editor 8 published/3 drafts/1 revision; staff_writer only own assigned draft, freelancer only assigned draft; moderator/reader/legacy 7 published (including registered) and no drafts/revisions/premium. Anonymous raw profile rows 0, public projection 7 rows with only id/display_name/avatar_url; media projection empty (rights/storage cases still need actual hosted uploads). These are real hosted database RLS checks, NOT verified JWT login/browser tests. Two security-definer view advisories remain; no changes to production. Manual branch-specific Vercel setup documented; protected review URL and actual authenticated browser verification pending. No Vercel access through connector, no secrets retrieved.
