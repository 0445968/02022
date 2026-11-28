# CT16 coordinated translation access and unlink release contract

Status: proposed, not activated. Implement only against the verified tracked migration sequence. Archive ordering remains available; language/access changes remain blocked on both linked articles.

## Access change
- Never infer authority from owner display labels or legacy profiles. Require verified active identity, current newsroom access, view/edit and publish authorization for both stories; require independent review for any newly published copy.
- Stage a paired access transition with exact story IDs, both current saved/review fingerprints, timestamps, link revision, requested target access and audit reason. Lock in deterministic UUID order with the publication advisory lock. Reject stale/replayed mismatched requests and scheduled or conflicting drafts rather than overwrite them.
- Restrict initial implementation to public/registered. Treat more restrictive access as a coordinated withdrawal first: archive both using the proven ordered route and re-review independently before republication. Never temporarily make a restricted article public. Preserve author, creator, version history, existing ballots, comments, and URLs. Do not permit unilateral live updates, disable triggers or rely on client validation.
- Before release, define treatment of cached public pages, search/SEO, embeds, bookmarks, comment threads and article poll placements for every access transition. Do not carry shared discussion or inherited placements into restricted counterparts.

## Unlink
- No destructive deletion or cascade of private link/event records. Preserve original and target IDs and all audit history; use a separately audited retired relationship state. No reuse of old relationship IDs for a new link without explicit review.
- Initial unlink eligibility: both articles archived, no active draft/schedule/review or pending access operation. Require independently authorized editor for both and explicit confirmation of the consequences. Unlink must not republish, modify audience, reassign bylines, change poll votes or silently merge/split comments.
- Public relationship projection excludes retired links; no inherited placements/locale redirects/shared thread routing. Explicit placements remain bound to their exact eligible article. Document what readers see after any subsequent independently reviewed republication.
- Establish concurrency, replay, privilege expiry, restricted visibility, cached page behavior and rollback fixtures on disposable database and real Auth before enabling any UI control. User must approve policy implications if historical discussion separation is desired.

## Release boundaries
No hosted migration, provider call, external data transfer or activation. A new migration and API/UI must be implemented and separately verified; this document is not a claim that those capabilities are complete.
