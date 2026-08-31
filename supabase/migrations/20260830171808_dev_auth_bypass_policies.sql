/*
# DEV AUTH BYPASS — Temporary development RLS policies

## WARNING: DEVELOPMENT ONLY
These policies grant anonymous (unauthenticated) access to all editorial
tables for local testing when DEV_AUTH_BYPASS=true. They must NEVER be
deployed to production. Remove them by running docs/remove-dev-auth-bypass.sql
before any production deployment.

## What this does
Adds "DEV BYPASS -" prefixed RLS policies to every editorial table that
allow the anon role to SELECT, INSERT, UPDATE, and DELETE without
authentication. The existing production policies are NOT removed or
modified — these are purely additive.

## Affected tables
- profiles
- stories
- story_versions
- categories
- tags
- story_categories
- story_tags
- media_assets
- storage.objects (media bucket)

## Removal
Run: docs/remove-dev-auth-bypass.sql
This file contains DROP POLICY statements for every policy created here.
*/

-- ====================================================================
-- profiles
-- ====================================================================
DROP POLICY IF EXISTS "DEV BYPASS - profiles select all" ON public.profiles;
CREATE POLICY "DEV BYPASS - profiles select all"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (true);

-- ====================================================================
-- stories
-- ====================================================================
DROP POLICY IF EXISTS "DEV BYPASS - stories select all" ON public.stories;
CREATE POLICY "DEV BYPASS - stories select all"
  ON public.stories FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "DEV BYPASS - stories insert all" ON public.stories;
CREATE POLICY "DEV BYPASS - stories insert all"
  ON public.stories FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "DEV BYPASS - stories update all" ON public.stories;
CREATE POLICY "DEV BYPASS - stories update all"
  ON public.stories FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "DEV BYPASS - stories delete all" ON public.stories;
CREATE POLICY "DEV BYPASS - stories delete all"
  ON public.stories FOR DELETE
  TO anon, authenticated
  USING (true);

-- ====================================================================
-- story_versions
-- ====================================================================
DROP POLICY IF EXISTS "DEV BYPASS - versions select all" ON public.story_versions;
CREATE POLICY "DEV BYPASS - versions select all"
  ON public.story_versions FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "DEV BYPASS - versions insert all" ON public.story_versions;
CREATE POLICY "DEV BYPASS - versions insert all"
  ON public.story_versions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "DEV BYPASS - versions update all" ON public.story_versions;
CREATE POLICY "DEV BYPASS - versions update all"
  ON public.story_versions FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ====================================================================
-- categories
-- ====================================================================
DROP POLICY IF EXISTS "DEV BYPASS - categories select all" ON public.categories;
CREATE POLICY "DEV BYPASS - categories select all"
  ON public.categories FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "DEV BYPASS - categories insert all" ON public.categories;
CREATE POLICY "DEV BYPASS - categories insert all"
  ON public.categories FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "DEV BYPASS - categories update all" ON public.categories;
CREATE POLICY "DEV BYPASS - categories update all"
  ON public.categories FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "DEV BYPASS - categories delete all" ON public.categories;
CREATE POLICY "DEV BYPASS - categories delete all"
  ON public.categories FOR DELETE
  TO anon, authenticated
  USING (true);

-- ====================================================================
-- tags
-- ====================================================================
DROP POLICY IF EXISTS "DEV BYPASS - tags select all" ON public.tags;
CREATE POLICY "DEV BYPASS - tags select all"
  ON public.tags FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "DEV BYPASS - tags insert all" ON public.tags;
CREATE POLICY "DEV BYPASS - tags insert all"
  ON public.tags FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "DEV BYPASS - tags update all" ON public.tags;
CREATE POLICY "DEV BYPASS - tags update all"
  ON public.tags FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "DEV BYPASS - tags delete all" ON public.tags;
CREATE POLICY "DEV BYPASS - tags delete all"
  ON public.tags FOR DELETE
  TO anon, authenticated
  USING (true);

-- ====================================================================
-- story_categories
-- ====================================================================
DROP POLICY IF EXISTS "DEV BYPASS - story_categories select all" ON public.story_categories;
CREATE POLICY "DEV BYPASS - story_categories select all"
  ON public.story_categories FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "DEV BYPASS - story_categories insert all" ON public.story_categories;
CREATE POLICY "DEV BYPASS - story_categories insert all"
  ON public.story_categories FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "DEV BYPASS - story_categories update all" ON public.story_categories;
CREATE POLICY "DEV BYPASS - story_categories update all"
  ON public.story_categories FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "DEV BYPASS - story_categories delete all" ON public.story_categories;
CREATE POLICY "DEV BYPASS - story_categories delete all"
  ON public.story_categories FOR DELETE
  TO anon, authenticated
  USING (true);

-- ====================================================================
-- story_tags
-- ====================================================================
DROP POLICY IF EXISTS "DEV BYPASS - story_tags select all" ON public.story_tags;
CREATE POLICY "DEV BYPASS - story_tags select all"
  ON public.story_tags FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "DEV BYPASS - story_tags insert all" ON public.story_tags;
CREATE POLICY "DEV BYPASS - story_tags insert all"
  ON public.story_tags FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "DEV BYPASS - story_tags update all" ON public.story_tags;
CREATE POLICY "DEV BYPASS - story_tags update all"
  ON public.story_tags FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "DEV BYPASS - story_tags delete all" ON public.story_tags;
CREATE POLICY "DEV BYPASS - story_tags delete all"
  ON public.story_tags FOR DELETE
  TO anon, authenticated
  USING (true);

-- ====================================================================
-- media_assets
-- ====================================================================
DROP POLICY IF EXISTS "DEV BYPASS - media_assets select all" ON public.media_assets;
CREATE POLICY "DEV BYPASS - media_assets select all"
  ON public.media_assets FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "DEV BYPASS - media_assets insert all" ON public.media_assets;
CREATE POLICY "DEV BYPASS - media_assets insert all"
  ON public.media_assets FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "DEV BYPASS - media_assets update all" ON public.media_assets;
CREATE POLICY "DEV BYPASS - media_assets update all"
  ON public.media_assets FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "DEV BYPASS - media_assets delete all" ON public.media_assets;
CREATE POLICY "DEV BYPASS - media_assets delete all"
  ON public.media_assets FOR DELETE
  TO anon, authenticated
  USING (true);

-- ====================================================================
-- storage.objects (media bucket)
-- ====================================================================
DROP POLICY IF EXISTS "DEV BYPASS - media bucket select all" ON storage.objects;
CREATE POLICY "DEV BYPASS - media bucket select all"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'media');

DROP POLICY IF EXISTS "DEV BYPASS - media bucket insert all" ON storage.objects;
CREATE POLICY "DEV BYPASS - media bucket insert all"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'media');

DROP POLICY IF EXISTS "DEV BYPASS - media bucket update all" ON storage.objects;
CREATE POLICY "DEV BYPASS - media bucket update all"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'media')
  WITH CHECK (bucket_id = 'media');

DROP POLICY IF EXISTS "DEV BYPASS - media bucket delete all" ON storage.objects;
CREATE POLICY "DEV BYPASS - media bucket delete all"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'media');
