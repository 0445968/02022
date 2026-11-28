# Sentence-level incremental translation and Colombian editorial standard

User confirmed continuation after discussing sentence-level retranslation and Colombian readers. Preserve site typography and current EN/ES routing; es-CO editorial/formatting locale, Azure standard target es. No custom paid model or provider activation without explicit approval.

## Translation behavior
Default changed sentences, with opt-in selected sentence, paragraph or whole article. Count actual submitted source characters including any supplied context. Exact unchanged reviewed sentences reuse their saved translation at zero provider usage, including manual corrections. Deletions do not require provider calls. Ambiguous duplicates, unaligned rich text, changed manually edited passages or context-sensitive transitions require editor choice; no silent overwrite or invented matching. Show estimated reserved characters and context warning before confirmation. Mark changed translations stale and require independent review before publication.

## Persistence and UI still required
Stable per-article block and sentence alignment bound to source fingerprint, target version, editor, locale and review provenance. Preserve marks, links, images, quotes, names, code and structured content. For rich-text blocks with unclear sentence/mark alignment, use paragraph fallback or manual review, never flatten or replace existing work. Persist approved translation memory only within authorized article by default; broader glossary is explicitly managed, no cross-article confidential memory. On edit, invalidate affected alignments; use exact immutable baseline, optimistic checks, atomic save and independent review. No translation of reader page views.

## Colombian Spanish
Owner-managed terminology settings: preferred words, protected names, regional style, approved exceptions, audit history and permissions. Professional Colombian news Spanish, no mechanical search-and-replace, no dialect stereotypes. Keep database language es; use es-CO for structured date/number formatting; keep original currency and value. Glossary suggestions and review are local initially. Evaluate Azure custom dictionary/model only after privacy, quality and cost approval. Initial vocabulary is guidance, not a claim of provider-specific Colombian generation.

## Rollout
Offline sentence planner and glossary in R4m. Next alignment persistence and review contract, secure source/target retrieval and proposal apply, settings/UI and preview cost, synthetic bilingual evaluation; activate only after verified release gates and explicit Azure authorization.
