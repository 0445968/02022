/*
# Stage 2: Editorial publishing system — schema

## Purpose
Build the complete database layer for the Simply Raizal editorial publishing
workflow: categories, tags, stories, story versions, story-category/tag
junctions, and media assets. This extends the Stage 1 `profiles` table.

## New tables
1. `categories` — editorial sections (Politics, Environment, Religion, Music, …)
2. `tags` — free-form tagging for stories
3. `stories` — the core article record
4. `story_versions` — snapshot history for restore
5. `story_categories` — many-to-many: stories ↔ categories
6. `story_tags` — many-to-many: stories ↔ tags
7. `media_assets` — image library metadata

## Enums / constraints
- `story_language`: 'en' | 'es' (article language, separate from UI locale)
- `story_status`: 'draft' | 'in_review' | 'scheduled' | 'published' | 'archived'
- `access_level`: 'public' | 'registered' | 'subscriber' | 'premium'
- `island_scope`: 'san_andres' | 'old_providence' | 'saint_catalina' | 'archipelago' | 'none'

## Security (RLS)
- `categories`: public read of active rows; staff manage.
- `tags`: public read; staff manage.
- `stories`: public reads ONLY published + published_at <= now();
  authors read/edit own stories; editors read/edit all stories.
- `story_versions`: staff read (own or all for editors); no direct public access.
- `story_categories` / `story_tags`: public read; staff write (gated by story access).
- `media_assets`: public read; staff write.
- Storage bucket `media`: public read; authenticated upload.

## Notes
1. "Latest" is NOT a category — it is a chronological publication state and is
   handled by the `getLatestStories()` query. It appears in navigation but not
   in the relational category system.
2. `body` is JSONB to store TipTap structured content (not raw HTML).
3. `slug` uniqueness is enforced globally — slugs must be unique across all
   stories regardless of language.
4. Triggers refresh `updated_at` on stories and media_assets.
*/

-- ====================================================================
-- ENUMS
-- ====================================================================
DO $$ BEGIN
  CREATE TYPE story_language AS ENUM ('en', 'es');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE story_status AS ENUM ('draft', 'in_review', 'scheduled', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE access_level AS ENUM ('public', 'registered', 'subscriber', 'premium');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE island_scope AS ENUM ('san_andres', 'old_providence', 'saint_catalina', 'archipelago', 'none');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ====================================================================
-- CATEGORIES
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_en text NOT NULL,
  name_es text NOT NULL,
  description_en text,
  description_es text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS categories_active_sort_idx ON public.categories (active, sort_order);

DROP POLICY IF EXISTS "categories_select_public" ON public.categories;
CREATE POLICY "categories_select_public"
  ON public.categories FOR SELECT
  TO anon, authenticated
  USING (active = true);

DROP POLICY IF EXISTS "categories_select_staff" ON public.categories;
CREATE POLICY "categories_select_staff"
  ON public.categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.is_author = true OR p.is_editor = true))
  );

DROP POLICY IF EXISTS "categories_insert_staff" ON public.categories;
CREATE POLICY "categories_insert_staff"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_editor = true)
  );

DROP POLICY IF EXISTS "categories_update_staff" ON public.categories;
CREATE POLICY "categories_update_staff"
  ON public.categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_editor = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_editor = true)
  );

-- ====================================================================
-- TAGS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS tags_slug_idx ON public.tags (slug);
CREATE INDEX IF NOT EXISTS tags_name_idx ON public.tags (name);

DROP POLICY IF EXISTS "tags_select_public" ON public.tags;
CREATE POLICY "tags_select_public"
  ON public.tags FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "tags_insert_staff" ON public.tags;
CREATE POLICY "tags_insert_staff"
  ON public.tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.is_author = true OR p.is_editor = true))
  );

DROP POLICY IF EXISTS "tags_update_staff" ON public.tags;
CREATE POLICY "tags_update_staff"
  ON public.tags FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.is_author = true OR p.is_editor = true))
  );

-- ====================================================================
-- MEDIA ASSETS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  width integer,
  height integer,
  file_size bigint,
  alt_text text NOT NULL DEFAULT '',
  caption text,
  credit text,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS media_uploaded_by_idx ON public.media_assets (uploaded_by);
CREATE INDEX IF NOT EXISTS media_file_name_idx ON public.media_assets (file_name);

DROP POLICY IF EXISTS "media_select_public" ON public.media_assets;
CREATE POLICY "media_select_public"
  ON public.media_assets FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "media_insert_staff" ON public.media_assets;
CREATE POLICY "media_insert_staff"
  ON public.media_assets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.is_author = true OR p.is_editor = true))
  );

DROP POLICY IF EXISTS "media_update_staff" ON public.media_assets;
CREATE POLICY "media_update_staff"
  ON public.media_assets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.is_author = true OR p.is_editor = true))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.is_author = true OR p.is_editor = true))
  );

DROP POLICY IF EXISTS "media_delete_staff" ON public.media_assets;
CREATE POLICY "media_delete_staff"
  ON public.media_assets FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_editor = true)
  );

-- ====================================================================
-- STORIES
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  headline text NOT NULL DEFAULT '',
  subheadline text,
  summary text,
  body jsonb NOT NULL DEFAULT '{}'::jsonb,
  language story_language NOT NULL DEFAULT 'en',
  status story_status NOT NULL DEFAULT 'draft',
  access_level access_level NOT NULL DEFAULT 'public',
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  editor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  primary_category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  island island_scope NOT NULL DEFAULT 'none',
  featured_image_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  image_caption text,
  image_credit text,
  seo_title text,
  seo_description text,
  published_at timestamptz,
  scheduled_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS stories_slug_idx ON public.stories (slug);
CREATE INDEX IF NOT EXISTS stories_status_idx ON public.stories (status);
CREATE INDEX IF NOT EXISTS stories_language_idx ON public.stories (language);
CREATE INDEX IF NOT EXISTS stories_author_idx ON public.stories (author_id);
CREATE INDEX IF NOT EXISTS stories_published_at_idx ON public.stories (published_at DESC);
CREATE INDEX IF NOT EXISTS stories_island_idx ON public.stories (island);
CREATE INDEX IF NOT EXISTS stories_updated_at_idx ON public.stories (updated_at DESC);

-- Public: read only published stories whose published_at is in the past
DROP POLICY IF EXISTS "stories_select_public" ON public.stories;
CREATE POLICY "stories_select_public"
  ON public.stories FOR SELECT
  TO anon, authenticated
  USING (status = 'published' AND published_at IS NOT NULL AND published_at <= now());

-- Authors: read their own stories (any status)
DROP POLICY IF EXISTS "stories_select_own_author" ON public.stories;
CREATE POLICY "stories_select_own_author"
  ON public.stories FOR SELECT
  TO authenticated
  USING (author_id = auth.uid());

-- Editors: read all stories
DROP POLICY IF EXISTS "stories_select_editor" ON public.stories;
CREATE POLICY "stories_select_editor"
  ON public.stories FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_editor = true)
  );

-- Authors: create stories (author_id must be themselves or they must be an editor)
DROP POLICY IF EXISTS "stories_insert_staff" ON public.stories;
CREATE POLICY "stories_insert_staff"
  ON public.stories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.is_author = true OR p.is_editor = true))
  );

-- Authors: update their own stories (but cannot publish/archive unless also editor)
DROP POLICY IF EXISTS "stories_update_own_author" ON public.stories;
CREATE POLICY "stories_update_own_author"
  ON public.stories FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (
    author_id = auth.uid()
    -- Authors cannot change status to published/scheduled/archived unless they are also an editor
    AND (
      status NOT IN ('published', 'scheduled', 'archived')
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_editor = true)
    )
  );

-- Editors: update all stories
DROP POLICY IF EXISTS "stories_update_editor" ON public.stories;
CREATE POLICY "stories_update_editor"
  ON public.stories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_editor = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_editor = true)
  );

-- Editors: delete stories
DROP POLICY IF EXISTS "stories_delete_editor" ON public.stories;
CREATE POLICY "stories_delete_editor"
  ON public.stories FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_editor = true)
  );

-- ====================================================================
-- STORY VERSIONS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.story_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  headline text NOT NULL DEFAULT '',
  subheadline text,
  summary text,
  body jsonb NOT NULL DEFAULT '{}'::jsonb,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  editor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  language story_language NOT NULL DEFAULT 'en',
  primary_category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.story_versions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS story_versions_story_idx ON public.story_versions (story_id, created_at DESC);

-- Authors: read versions of their own stories
DROP POLICY IF EXISTS "versions_select_own_author" ON public.story_versions;
CREATE POLICY "versions_select_own_author"
  ON public.story_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.author_id = auth.uid())
  );

-- Editors: read all versions
DROP POLICY IF EXISTS "versions_select_editor" ON public.story_versions;
CREATE POLICY "versions_select_editor"
  ON public.story_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_editor = true)
  );

-- Staff: insert versions (author of the story or any editor)
DROP POLICY IF EXISTS "versions_insert_staff" ON public.story_versions;
CREATE POLICY "versions_insert_staff"
  ON public.story_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.is_author = true OR p.is_editor = true))
  );

-- ====================================================================
-- STORY CATEGORIES (many-to-many)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.story_categories (
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, category_id)
);

ALTER TABLE public.story_categories ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS story_categories_cat_idx ON public.story_categories (category_id);

-- Public: read (so published stories' categories are visible)
DROP POLICY IF EXISTS "story_categories_select_public" ON public.story_categories;
CREATE POLICY "story_categories_select_public"
  ON public.story_categories FOR SELECT
  TO anon, authenticated
  USING (true);

-- Staff: write (must have story access)
DROP POLICY IF EXISTS "story_categories_insert_staff" ON public.story_categories;
CREATE POLICY "story_categories_insert_staff"
  ON public.story_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.is_author = true OR p.is_editor = true))
  );

DROP POLICY IF EXISTS "story_categories_delete_staff" ON public.story_categories;
CREATE POLICY "story_categories_delete_staff"
  ON public.story_categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.is_author = true OR p.is_editor = true))
  );

-- ====================================================================
-- STORY TAGS (many-to-many)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.story_tags (
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, tag_id)
);

ALTER TABLE public.story_tags ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS story_tags_tag_idx ON public.story_tags (tag_id);

DROP POLICY IF EXISTS "story_tags_select_public" ON public.story_tags;
CREATE POLICY "story_tags_select_public"
  ON public.story_tags FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "story_tags_insert_staff" ON public.story_tags;
CREATE POLICY "story_tags_insert_staff"
  ON public.story_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.is_author = true OR p.is_editor = true))
  );

DROP POLICY IF EXISTS "story_tags_delete_staff" ON public.story_tags;
CREATE POLICY "story_tags_delete_staff"
  ON public.story_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.is_author = true OR p.is_editor = true))
  );

-- ====================================================================
-- TRIGGERS: refresh updated_at
-- ====================================================================
CREATE OR REPLACE FUNCTION public.update_generic_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stories_set_updated_at ON public.stories;
CREATE TRIGGER stories_set_updated_at
  BEFORE UPDATE ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.update_generic_updated_at();

DROP TRIGGER IF EXISTS media_assets_set_updated_at ON public.media_assets;
CREATE TRIGGER media_assets_set_updated_at
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_generic_updated_at();

DROP TRIGGER IF EXISTS categories_set_updated_at ON public.categories;
CREATE TRIGGER categories_set_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_generic_updated_at();

-- ====================================================================
-- STORAGE BUCKET: media
-- ====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Public can read media bucket objects
DROP POLICY IF EXISTS "media_bucket_read_public" ON storage.objects;
CREATE POLICY "media_bucket_read_public"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'media');

-- Staff can upload to media bucket
DROP POLICY IF EXISTS "media_bucket_insert_staff" ON storage.objects;
CREATE POLICY "media_bucket_insert_staff"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'media'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.is_author = true OR p.is_editor = true))
  );

-- Staff can update media bucket objects
DROP POLICY IF EXISTS "media_bucket_update_staff" ON storage.objects;
CREATE POLICY "media_bucket_update_staff"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'media'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.is_author = true OR p.is_editor = true))
  );

-- Editors can delete media bucket objects
DROP POLICY IF EXISTS "media_bucket_delete_staff" ON storage.objects;
CREATE POLICY "media_bucket_delete_staff"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'media'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_editor = true)
  );
