# CT15 — forward migration manifest (review only)

Baseline: restored Clear Talks project `yqqzohrlhiitctwacdad`, empty hosted migration registry observed November 24, 2026 (Chicago). 23 historical repository migrations excluded from this manifest; do not replay them. This list contains the original 38 staged forward migrations plus CT16 refinement migrations, in order (45 total). They are candidates for a **separate restored rehearsal**, not a command to run on production. Each migration requires schema/policy drift review, backup/restore evidence and final exact CI. Never run bulk db push/reset/repair on the restored live project.

1. `supabase/migrations/20261123222804_ct02b_staff_access.sql`
2. `supabase/migrations/20261123230955_ct02c_owner_guard_and_audit.sql`
3. `supabase/migrations/20261123235430_ct02e_story_revision_rls.sql`
4. `supabase/migrations/20261124001339_ct02f_publisher_versions.sql`
5. `supabase/migrations/20261124003447_ct02g_media_storage_security.sql`
6. `supabase/migrations/20261124012440_ct02h_editorial_direct_policies.sql`
7. `supabase/migrations/20261124013801_ct02i_private_media_drafts.sql`
8. `supabase/migrations/20261124020117_ct02j_media_promotion.sql`
9. `supabase/migrations/20261124021851_ct02k_reader_comments_rls.sql`
10. `supabase/migrations/20261124031658_ct03b_staff_overrides.sql`
11. `supabase/migrations/20261124034804_ct03c_role_grant_editor.sql`
12. `supabase/migrations/20261124150021_ct04a_staff_invitations.sql`
13. `supabase/migrations/20261124154346_ct04b_staff_onboarding.sql`
14. `supabase/migrations/20261124154819_ct04b_staff_byline_review.sql`
15. `supabase/migrations/20261124164358_ct05b_assigned_draft_guard.sql`
16. `supabase/migrations/20261124165002_ct05b_assigned_revision_guard.sql`
17. `supabase/migrations/20261124165545_ct05b_writer_draft_creation.sql`
18. `supabase/migrations/20261124170144_ct05b_approved_media_attachments.sql`
19. `supabase/migrations/20261124174529_ct05b_private_upload_quota.sql`
20. `supabase/migrations/20261124175744_ct06a_assignment_lifecycle.sql`
21. `supabase/migrations/20261124182027_ct06b_review_lifecycle.sql`
22. `supabase/migrations/20261124182734_ct06b_atomic_review_request.sql`
23. `supabase/migrations/20261124183816_ct06b_review_inbox.sql`
24. `supabase/migrations/20261124190734_ct06c_publication_gate.sql`
25. `supabase/migrations/20261124193511_ct06c_reviewed_schedule.sql`
26. `supabase/migrations/20261124195029_ct07a_comment_moderation.sql`
27. `supabase/migrations/20261124201656_ct07c_audited_reports.sql`
28. `supabase/migrations/20261124211055_ct07c_reader_reports.sql`
29. `supabase/migrations/20261124214830_ct07d_bulk_moderation.sql`
30. `supabase/migrations/20261124221450_ct08a_editorial_calendar.sql`
31. `supabase/migrations/20261124225839_ct08b2b_effective_schedule.sql`
32. `supabase/migrations/20261124230401_ct08b2c_calendar_conflicts.sql`
33. `supabase/migrations/20261124230953_ct08c1_scheduler_reliability.sql`
34. `supabase/migrations/20261124231511_ct08c_scheduler_controls.sql`
35. `supabase/migrations/20261124231848_ct09_polls.sql`
36. `supabase/migrations/20261125004543_ct11b_homepage_history.sql`
37. `supabase/migrations/20261125012032_ct12_reader_privacy_editorial_guards.sql`
38. `supabase/migrations/20261125014031_ct13_reader_communications.sql`
39. `supabase/migrations/20261127050000_ct16_owner_dashboard.sql`
40. `supabase/migrations/20261127053000_ct16_comment_article_groups.sql`
41. `supabase/migrations/20261127154150_ct16_story_types.sql`
42. `supabase/migrations/20261127173913_ct16_work_assignments.sql`
43. `supabase/migrations/20261127204156_ct16_work_overview.sql`
44. `supabase/migrations/20261127205525_ct16_editorial_privileges.sql`
45. `supabase/migrations/20261127221612_ct16_homepage_visibility.sql`

Before each migration verify expected preconditions, record success/rollback boundary, recheck permissions and aggregate counts. Do not use fixture SQL or seed accounts on hosted production. After rehearsal confirm the migration registry and schema accurately reflect the approved baseline. Pause scheduler, public voting and mail gates. First Owner bootstrap requires approved verified identity and audited role/capability grant; never infer from legacy flags. Reconcile media rights and existing public URLs before enabling new public projection. No hosted execution performed.
