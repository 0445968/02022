/*
# Add short title to story versions

Allows historical story snapshots to preserve the compact headline
used by the headline bar and other condensed editorial surfaces.
*/

ALTER TABLE public.story_versions
ADD COLUMN IF NOT EXISTS short_title text;

COMMENT ON COLUMN public.story_versions.short_title IS
  'Optional compact story title preserved in historical story versions.';