/*
# Add short story titles + headline bar homepage slot

## Purpose

Adds support for compact story titles that can be used in dense UI areas,
especially the story bar directly below the main site navigation.

Also adds a dedicated homepage slot type so editors can curate which stories
appear in that bar using the existing homepage_slots system.

## Changes

1. Add `short_title` to `public.stories`
2. Add `headline_bar` to `homepage_slot_type`

## Behavior

- `headline` remains the primary/full story headline.
- `short_title` is optional.
- Frontend components should fall back to `headline` whenever `short_title`
  is NULL or empty.
- Stories assigned to the `headline_bar` homepage slot will use their
  `short_title` automatically.
*/


-- ====================================================================
-- STORIES: SHORT TITLE
-- ====================================================================

ALTER TABLE public.stories
ADD COLUMN IF NOT EXISTS short_title text;


/*
 * Compact titles are intentionally optional.
 *
 * Existing stories therefore remain valid without requiring a data migration.
 *
 * Frontend usage should follow:
 *
 *   story.short_title?.trim() || story.headline
 *
 * rather than requiring short_title to always be populated.
 */


COMMENT ON COLUMN public.stories.short_title IS
  'Optional compact version of the story headline for headline bars, navigation, and other condensed editorial surfaces.';


-- ====================================================================
-- HOMEPAGE SLOT TYPE: HEADLINE BAR
-- ====================================================================

ALTER TYPE homepage_slot_type
ADD VALUE IF NOT EXISTS 'headline_bar';


-- ====================================================================
-- OPTIONAL INDEX
-- ====================================================================

/*
 * No new story index is required for short_title because the field is
 * intended for display rather than filtering or sorting.
 *
 * homepage_slots already has indexes covering:
 *
 *   slot
 *   story_id
 *   position
 *   active
 *
 * so the new headline_bar slot can use the existing indexes.
 */