-- ============================================================
-- DEV AUTH BYPASS — Removal Script
-- ============================================================
--
-- Run this script to remove ALL temporary development RLS policies
-- that were added for the DEV_AUTH_BYPASS testing phase.
--
-- These policies are prefixed with "DEV BYPASS -" and grant
-- unauthenticated access to editorial tables. They must be removed
-- before any production deployment.
--
-- Usage: Run via the Supabase SQL editor or MCP execute_sql tool.
--
-- This script is safe to run multiple times (uses IF EXISTS).
-- ============================================================

-- profiles
DROP POLICY IF EXISTS "DEV BYPASS - profiles select all" ON public.profiles;

-- stories
DROP POLICY IF EXISTS "DEV BYPASS - stories select all" ON public.stories;
DROP POLICY IF EXISTS "DEV BYPASS - stories insert all" ON public.stories;
DROP POLICY IF EXISTS "DEV BYPASS - stories update all" ON public.stories;
DROP POLICY IF EXISTS "DEV BYPASS - stories delete all" ON public.stories;

-- story_versions
DROP POLICY IF EXISTS "DEV BYPASS - versions select all" ON public.story_versions;
DROP POLICY IF EXISTS "DEV BYPASS - versions insert all" ON public.story_versions;
DROP POLICY IF EXISTS "DEV BYPASS - versions update all" ON public.story_versions;

-- categories
DROP POLICY IF EXISTS "DEV BYPASS - categories select all" ON public.categories;
DROP POLICY IF EXISTS "DEV BYPASS - categories insert all" ON public.categories;
DROP POLICY IF EXISTS "DEV BYPASS - categories update all" ON public.categories;
DROP POLICY IF EXISTS "DEV BYPASS - categories delete all" ON public.categories;

-- tags
DROP POLICY IF EXISTS "DEV BYPASS - tags select all" ON public.tags;
DROP POLICY IF EXISTS "DEV BYPASS - tags insert all" ON public.tags;
DROP POLICY IF EXISTS "DEV BYPASS - tags update all" ON public.tags;
DROP POLICY IF EXISTS "DEV BYPASS - tags delete all" ON public.tags;

-- story_categories
DROP POLICY IF EXISTS "DEV BYPASS - story_categories select all" ON public.story_categories;
DROP POLICY IF EXISTS "DEV BYPASS - story_categories insert all" ON public.story_categories;
DROP POLICY IF EXISTS "DEV BYPASS - story_categories update all" ON public.story_categories;
DROP POLICY IF EXISTS "DEV BYPASS - story_categories delete all" ON public.story_categories;

-- story_tags
DROP POLICY IF EXISTS "DEV BYPASS - story_tags select all" ON public.story_tags;
DROP POLICY IF EXISTS "DEV BYPASS - story_tags insert all" ON public.story_tags;
DROP POLICY IF EXISTS "DEV BYPASS - story_tags update all" ON public.story_tags;
DROP POLICY IF EXISTS "DEV BYPASS - story_tags delete all" ON public.story_tags;

-- media_assets
DROP POLICY IF EXISTS "DEV BYPASS - media_assets select all" ON public.media_assets;
DROP POLICY IF EXISTS "DEV BYPASS - media_assets insert all" ON public.media_assets;
DROP POLICY IF EXISTS "DEV BYPASS - media_assets update all" ON public.media_assets;
DROP POLICY IF EXISTS "DEV BYPASS - media_assets delete all" ON public.media_assets;

-- storage.objects (media bucket)
DROP POLICY IF EXISTS "DEV BYPASS - media bucket select all" ON storage.objects;
DROP POLICY IF EXISTS "DEV BYPASS - media bucket insert all" ON storage.objects;
DROP POLICY IF EXISTS "DEV BYPASS - media bucket update all" ON storage.objects;
DROP POLICY IF EXISTS "DEV BYPASS - media bucket delete all" ON storage.objects;
