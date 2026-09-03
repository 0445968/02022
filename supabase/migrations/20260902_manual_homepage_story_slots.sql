/*
# Manual homepage story slots

Adds a dedicated placement type for every story position that was previously
filled automatically on the homepage.

This is intentionally separate from the category migration so it can be run
even when the earlier migration has already been applied.
*/

ALTER TYPE public.homepage_slot_type
  ADD VALUE IF NOT EXISTS 'lead_support';

ALTER TYPE public.homepage_slot_type
  ADD VALUE IF NOT EXISTS 'more_coverage';

ALTER TYPE public.homepage_slot_type
  ADD VALUE IF NOT EXISTS 'highlight';

ALTER TYPE public.homepage_slot_type
  ADD VALUE IF NOT EXISTS 'world';

ALTER TYPE public.homepage_slot_type
  ADD VALUE IF NOT EXISTS 'latest_news';

ALTER TYPE public.homepage_slot_type
  ADD VALUE IF NOT EXISTS 'island_feature';
