# CT-02k — Manual Real Supabase Auth, JWT, Storage, and Publication Smoke
**Prepared only; not run.** This test uses real Storage API write operations in a separate, disposable Supabase project. Never point at Clear Talks production.

## Preconditions
- Separately approve/create a brand-new expendable Supabase project with its own Auth users, Storage buckets and **no restored reader or Newsroom personal data**. Project ref must be a new, distinct lowercase 20-character ref and not `yqqzohrlhiitctwacdad`. The test script hard-stops on the live ref, malformed/mismatching URL, non-HTTPS endpoint or absent acknowledgment.
- Install a reviewed, dependency-ordered **schema-only** baseline for the restored Clear Talks structures on disposable and then the staged CT-02b/c/e/f/g/h/i/j/k migrations. Do not bulk replay historical dev-bypass policies or copy production credentials, live files, comments, users or editorial data.
- Create **four distinct, disposable Auth accounts**: READER (no staff membership), REVOKED (legacy `is_editor=true` profile if desired, but revoked staff membership), WRITER (active media.upload and owner read only) and REVIEWER (active `media.view_all`, `media.edit_all`, `media.approve`, `media.upload` grants). Test-only memberships/role grants must be applied **to disposable only**; never seed live. Ensure all four passwords/accounts work with `signInWithPassword`.
- Configure repository workflow *secret values for the test project only*: `CT_E2E_SUPABASE_URL`, `CT_E2E_ANON_KEY`, `CT_E2E_READER_EMAIL/PASSWORD`, `CT_E2E_REVOKED_EMAIL/PASSWORD`, `CT_E2E_WRITER_EMAIL/PASSWORD`, `CT_E2E_REVIEWER_EMAIL/PASSWORD`. **Never use any user-provided production or secret-role keys.** Admin/service-role key is NOT required. GitHub masks configured secrets.
- Manually run `.github/workflows/ct02k-real-supabase-e2e.yml` via Actions > workflow_dispatch, entering the **new disposable ref**. The runner passes `YES_DISPOSABLE_WRITES` acknowledgement; the script validates before contacting the server. It deliberately writes temporary blobs and DB rows and leaves them for audit. Delete the entire disposable project after reviewing results. No scheduled or PR trigger is present.
- The manual GitHub workflow might require the file to be on a default branch for GitHub UI dispatch; if it is not offered while the draft PR is unmerged, run the script from an isolated local clone with the same disposable-only env variables. **Do not merge code or loosen production permissions merely to run the QA.**

## Assertions the script executes
1. Uses genuine Auth `signInWithPassword` for four different accounts and never a service-role client.
2. Anon reader cannot list private staging; anonymous and reader uploads are rejected.
3. Writer uploads an actual private Storage object in its own `drafts/<auth.uid()>/` namespace; anon, reader and revoked editor cannot download it.
4. Writer can issue a 60-second preview; a bearer holding that link can download until expiry (expected property, not immediate revocation). Reader/revoked editor cannot issue an independent signed link.
5. Writer creates staging metadata with SHA-256 tied to its actual owned object; reader cannot view it.
6. Writer cannot copy directly into approved public path; reviewer also cannot copy before the explicit rights-review claim.
7. Current reviewer may claim the exact deterministic approved destination with recorded rights, then uses real Supabase `storage.copy(...,{destinationBucket:'media'})`, verifies downloaded public bytes against SHA-256, creates a standard media catalog draft, approves it with independent staff rights, finalizes private link and checks fixed allowlisted public view as anon.
8. On failure, stop with exit code nonzero. No blind retries or unverified cleanup, because Storage and PostgreSQL are not one atomic transaction. Preserve forensic artifacts and document the first failure (without printing sensitive URLs/tokens).

## Separate manual browser acceptance (NOT executed)
Verify English and Spanish reader comment creation/edit/delete, published-thread public rendering, personal bookmark add/remove, revoked old editor cannot access moderation, assigned freelancer cannot publish, reviewer can inspect private media without exposing direct Storage paths in public HTML, private mode disables public uploader, and failed promotion retry preserves original rights. Test publication image handling and cache/CDN behavior, mobile responsive Media Library and basic accessibility. Existing 22 public URLs and 23 stories must remain unchanged in production.

## Deployment approval gates
Current state is code-only, no first-owner selection or migrated permissions. Require a restorable backup, empty-hosted-history reconciliation, approved role grants and first-owner Auth identity, nonempty results from **real** Supabase E2E and EN/ES browser QA, editorial decision on the trashed featured image, security advisor warning remediation, rollback and explicit production approval before enabling staff access or private upload flags.
