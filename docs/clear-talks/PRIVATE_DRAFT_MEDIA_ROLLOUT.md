# Clear Talks — Private Draft Media / Public Publication Runbook (PROPOSAL ONLY)
Date: 2026-11-23 | CT-02h companion | **No bucket, policy, file or URL created/changed**
Required human approval before implementing in CT-02i or future work.

## Problem and immutable compatibility boundaries
The existing Supabase Storage `media` bucket is `public=true`. All 22 restored Storage objects have `owner_id=NULL` and matching `media_assets.storage_path` records. Public CDN/getPublicUrl downloads bypass object SELECT RLS. Even if `media_assets` is restricted by staff RLS and an approved-only view, an unpublished or embargoed file uploaded to the public bucket remains retrievable by anyone knowing its URL. Keeping that bucket public is necessary to avoid breaking existing published articles during a staged cutover.

A read-only audit found 11 published stories with featured media, **one of which is marked trashed**; that reference needs an explicit editorial/rights decision, not an automatic SQL update.

## Proposed dual-bucket workflow
1. **Retain `media` PUBLIC** for already-published assets and existing article URL compatibility. Do not make existing URLs private or bulk-move 22 files. Avoid silently assigning Storage owner IDs to restored objects.
2. Create a **new PRIVATE `media-drafts` bucket** only after approval. All new uploads not yet explicitly approved for publication go into that bucket. Authenticate uploads with Supabase JWT, `media.upload`, verified ownership, file MIME/size checks and collision-resistant paths. Avoid rendering permanent public URLs for private objects.
3. Keep media records in a state model that distinguishes *physical storage location* from *editorial status*. Migration design must safely represent bucket/path, optional public distribution path/URL, publication status, approval actor/time, attribution and rights/embargo. Do not overload the existing `media_assets.storage_path` without a compatibility migration for 22 restored assets. A separate `media_publication_objects` mapping or extra explicit columns are candidate designs, not approved schema.
4. Newsroom authenticated previews use signed URLs with short expiration and checks against current staff permission and media ownership. Do not put service-role keys, long-lived signed tokens or rights notes in public HTML or client bundles. Revoked staff must not obtain new signed URLs; already-issued links remain valid until expiration, so choose conservative TTLs.
5. On media approval and explicit publication, verify rights/license/embargo, copy or promote the approved bytes from private draft to public bucket with a deterministic idempotency key. Verify object existence/checksum before updating the public URL. Handle partial copy/DB failure with a retriable state and clean up only verified orphans. Do NOT delete the original draft until public distribution is confirmed. Avoid promising atomic Storage+PostgreSQL transactions.
6. For publishing an article, validate referenced featured media eligibility (or require editorial override with recorded reason). A trashed, unlicensed or embargoed draft should not silently become a publicly served file.
7. Public pages retrieve only approved public metadata via `media_public_assets` and established public Storage URLs. Existing CDN caches and old story URLs require a regression baseline; no unexpected 404s after the switch.
8. Stage a migration/backfill simulation using a disposable Supabase project, genuine Auth JWT sessions, signed and public URL requests, Storage upload/upsert/copy/delete, revoked member negative cases, published story media links, client cache and rollback. Record the results in GitHub.

## Production approval checklist
- Real owner Auth ID and preset grants reviewed; no promotion from `profiles.is_author/is_editor`.
- Working independent backup and restore verified; empty hosted migration register reconciled.
- Decision on the published-story / trashed-media reference recorded; preserve article/body/byline history.
- Existing 22 public files still accessible; newly uploaded drafts private, unauthorized authenticated and anonymous downloads denied; approved images public.
- Signed-URL expiry and revocation windows tested; uploads, upserts, rollback/retries, storage cleanup and media library editing verified.
- EN/ES browser smoke tests and public story article/feed SEO/media previews pass; `CT_STAFF_ACCESS_V2_ENABLED` remains off until every direct RLS/RPC and route gate is covered.
- Explicit written permission to create a bucket, apply migrations, seed roles, toggle Vercel flags and deploy.

## Reversal
Prior to production: no changes to reverse. After approved implementation: stop new draft uploads via reviewed feature gate, preserve both buckets and original public URLs, restore consistent RLS and ownership permissions; never mass-delete private drafts or re-enable unrestricted public uploads as a shortcut.
