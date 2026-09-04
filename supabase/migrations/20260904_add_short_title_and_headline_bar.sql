/*
# Add short title support to story revisions

Adds the short_title field to unpublished revisions so
published stories can preserve and autosave their compact title.
*/

ALTER TABLE public.story_revisions
ADD COLUMN IF NOT EXISTS short_title text;

COMMENT ON COLUMN public.story_revisions.short_title IS
  'Optional compact version of the story headline stored with unpublished revisions.';