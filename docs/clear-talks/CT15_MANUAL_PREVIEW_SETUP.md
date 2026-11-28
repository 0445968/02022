# CT15 manual protected preview setup (review only)
Nov 26 hosted review accounts confirmed: exact seven disposable users, seven trigger-created profiles, all email confirmed. Bootstrapped only isolated ct15-owner with explicit audit reason, used versioned staff_save_preset_grants for eight non-owner templates (managing_editor team.view omitted because reviewed DB ceiling prohibits it), 129 total capability grants, 5 active staff memberships, reader/legacy no current staff role, legacy historical editor/author flags intentionally true. First SQL bootstrap attempt rolled back due wrong enum type name, corrected with literals. Seeded 11 synthetic stories (8 published via owner submission/independent editor approval/owner publication RPC with transaction-local simulated claims, 3 drafts), 1 unpublished revision, 2 assignments, 2 test bylines, 149 audit rows, 8 publication events, zero surviving permits, no actual production content or image bytes. Hosted SQL role impersonation read checks passed: anon 6 public articles; owner/editor 8 published/3 drafts/1 revision; staff_writer only own assigned draft, freelancer only assigned draft; moderator/reader/legacy 7 published (including registered) and no drafts/revisions/premium. Anonymous raw profile rows 0, public projection 7 rows with only id/display_name/avatar_url; media projection empty (rights/storage cases still need actual hosted uploads). These are real hosted database RLS checks, NOT verified JWT login/browser tests. Two security-definer view advisories remain; no changes to production. Manual branch-specific Vercel setup documented; protected review URL and actual authenticated browser verification pending. No Vercel access through connector, no secrets retrieved.

## Target and safety
Vercel dashboard https://vercel.com/clear-talks-enterprise/clear-talks, project ID prj_U7CSmTY3XlCycCnfEiCtkt61fK1O. Branch `feature/ct15-framework-rehearsal-2026-11-24`. User may configure only branch-specific **Preview** environment, never Production or main. Confirm Preview deployment protection (Vercel Authentication) is active before deployment; if unavailable or changing it would modify production protection, stop. Do not remove existing production settings. Do not use production URL, keys, provider credentials, SMTP, cron or external delivery. Review Supabase API settings: https://supabase.com/dashboard/project/mfyxyyclygeeklvbhawi/settings/api . Use review project's legacy anon key and legacy service_role key (server-only). No secrets in GitHub, chat, screenshots, logs or NEXT_PUBLIC_ for service_role. Verify the reference of every secret before adding it. If branch scope is unavailable, stop instead of setting all Preview values.

## Branch-specific Preview environment
```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://mfyxyyclygeeklvbhawi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<review legacy anon key>
SUPABASE_SERVICE_ROLE_KEY=<review legacy service_role key, sensitive>
DEV_AUTH_BYPASS=false
CT_STAFF_ACCESS_V2_ENABLED=true
CT_READER_ACCOUNT_ENABLED=true
CT_STAFF_ONBOARDING_ENABLED=true
CT_MEDIA_PRIVATE_DRAFTS_ENABLED=true
CT_COMMENT_MODERATION_ENABLED=true
CT_COMMENT_REPORTS_ENABLED=true
CT_ASSIGNED_DRAFT_EDITOR_ENABLED=true
CT_ASSIGNED_REVISION_EDITOR_ENABLED=true
CT_WRITER_DRAFT_CREATION_ENABLED=true
CT_STORY_REVIEW_ENABLED=true
CT_STAFF_ADMIN_MUTATIONS_ENABLED=true
CT_READER_COMMUNICATIONS_ENABLED=true
CT_EDITORIAL_CALENDAR_ENABLED=true
CT_POLLS_ENABLED=true
CT_REVIEW_INBOX_ENABLED=true
CT_STORY_ASSIGNMENTS_ENABLED=true
CT_HOMEPAGE_HISTORY_ENABLED=true
CT_READER_REPORTING_ENABLED=true
CT_REVIEWED_PUBLICATION_ENABLED=true
CT_REVIEWED_SCHEDULING_ENABLED=true
CT_STAFF_INVITATIONS_ENABLED=true
CT_STAFF_PRESET_MUTATIONS_ENABLED=true
CT_STAFF_OVERRIDE_MUTATIONS_ENABLED=true
CT_STAFF_BYLINE_REVIEW_ENABLED=true
CT_ASSIGNED_APPROVED_MEDIA_ENABLED=true
CT_COMMENT_BULK_ENABLED=true
CT_PUBLIC_POLLS_ENABLED=false
CT_NEWSLETTER_SEND_ENABLED=false
```

Other feature flags are intentionally off unless reviewed. Inherited provider/scheduler credentials must not be active in this branch; inspect scope for RESEND, SMTP, Stripe, CRON_SECRET, CT_NEWSLETTER_* secrets and any scheduler flags. Do not paste production values into branch. Public polls start disabled, will enable for test only after protected preview verified and database gate explicitly reviewed. CT_ASSIGNED_APPROVED_MEDIA_ENABLED and CT_COMMENT_BULK_ENABLED are staged application features; hosted browser checks needed. NEXT_PUBLIC_SITE_URL must use exact protected branch preview origin, never production. If branch alias unknown, use initial protected preview deployment URL after verified, configure exact preview origin then redeploy once; do not guess URL. Verify project settings match Next.js and npm lockfile build; no production build-setting changes.

## Deploy
Once branch settings and protection verified, use Deployments > Create Deployment (if available) with branch above; check target Preview, never Promote to Production. If existing candidate preview present, redeploy that branch's latest commit only after correct env settings. Record exact commit, URL, Ready status and errors without secrets. Review Supabase Authentication URL Configuration only on mfyxyyclygeeklvbhawi: use exact review preview origin for Site URL and narrow redirect allowlist, no production callbacks, no broad wildcards. Password sign-in uses relative router navigation; actual browser origin needs confirmation. No email provider setup. Do not send invitations or password recovery emails until explicit testing approval.

## Verification
Before user UAT, verify signed-out home and sign-in, login/logout with the locally held test passwords, correct review data and roles, no production redirect, full browser role walkthrough. Check two projection-view advisories and actual uploaded synthetic media. User keeps passwords. No live production mutation, merging, data transfer or provider activation. Review environment is a synthetic hosted deployment, not full real-data restore. 
