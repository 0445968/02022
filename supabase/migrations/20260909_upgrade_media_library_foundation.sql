/*
  West Island Times
  Media Library Foundation Upgrade

  PURPOSE
  -------
  Upgrade the existing media_assets system into a newsroom-grade
  digital asset management foundation without deleting or replacing
  existing media records.

  This migration adds:

  - richer asset metadata
  - newsroom media statuses
  - rights / licensing metadata
  - geographic metadata
  - dates / archive metadata
  - focal points
  - sensitive-content metadata
  - collections
  - favorites
  - tags
  - usage tracking
  - media versions
  - audit history

  Existing media remains intact.
*/


-- ====================================================================
-- ENUMS
-- ====================================================================

DO $$
BEGIN
  CREATE TYPE media_asset_type AS ENUM (
    'image',
    'graphic',
    'video',
    'audio',
    'document',
    'logo',
    'social',
    'broadcast',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;


DO $$
BEGIN
  CREATE TYPE media_status AS ENUM (
    'draft',
    'approved',
    'restricted',
    'archived',
    'trashed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;


DO $$
BEGIN
  CREATE TYPE media_rights_status AS ENUM (
    'owned',
    'staff_created',
    'freelancer',
    'licensed',
    'wire_service',
    'government',
    'public_domain',
    'creative_commons',
    'reader_submitted',
    'restricted',
    'unknown'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;


DO $$
BEGIN
  CREATE TYPE media_sensitive_level AS ENUM (
    'none',
    'sensitive',
    'disturbing',
    'graphic'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;


-- ====================================================================
-- EXPAND EXISTING MEDIA ASSETS TABLE
-- ====================================================================

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS title text;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS original_file_name text;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS asset_type media_asset_type;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS status media_status;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS photographer text;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS creator_name text;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS copyright_holder text;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS source_name text;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS source_url text;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS rights_status media_rights_status;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS license_name text;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS rights_notes text;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS allowed_uses text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS restrictions text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS license_expires_at timestamptz;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS date_created timestamptz;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS approximate_date text;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS embargo_until timestamptz;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS island island_scope;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS country text;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS region text;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS city text;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS neighborhood text;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS location_name text;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS latitude numeric(9,6);

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS longitude numeric(9,6);

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS language text;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS category_id uuid
    REFERENCES public.categories(id)
    ON DELETE SET NULL;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS focal_point_x numeric(6,5);

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS focal_point_y numeric(6,5);

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS display_caption boolean NOT NULL DEFAULT true;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS display_credit boolean NOT NULL DEFAULT true;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS decorative boolean NOT NULL DEFAULT false;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS sensitive_level media_sensitive_level;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS internal_notes text;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS checksum text;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS is_superseded boolean NOT NULL DEFAULT false;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS superseded_by uuid
    REFERENCES public.media_assets(id)
    ON DELETE SET NULL;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS approved_by uuid
    REFERENCES public.profiles(id)
    ON DELETE SET NULL;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS last_edited_by uuid
    REFERENCES public.profiles(id)
    ON DELETE SET NULL;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS trashed_at timestamptz;


-- ====================================================================
-- SAFE BACKFILL FOR EXISTING MEDIA
-- ====================================================================

UPDATE public.media_assets
SET asset_type = 'image'
WHERE asset_type IS NULL;


UPDATE public.media_assets
SET status = 'approved'
WHERE status IS NULL;


UPDATE public.media_assets
SET rights_status = 'unknown'
WHERE rights_status IS NULL;


UPDATE public.media_assets
SET sensitive_level = 'none'
WHERE sensitive_level IS NULL;


UPDATE public.media_assets
SET original_file_name = file_name
WHERE original_file_name IS NULL;


-- Existing assets are preserved as approved.
-- New assets should enter the library as drafts.

ALTER TABLE public.media_assets
  ALTER COLUMN asset_type SET DEFAULT 'image';

ALTER TABLE public.media_assets
  ALTER COLUMN asset_type SET NOT NULL;


ALTER TABLE public.media_assets
  ALTER COLUMN status SET DEFAULT 'draft';

ALTER TABLE public.media_assets
  ALTER COLUMN status SET NOT NULL;


ALTER TABLE public.media_assets
  ALTER COLUMN rights_status SET DEFAULT 'unknown';

ALTER TABLE public.media_assets
  ALTER COLUMN rights_status SET NOT NULL;


ALTER TABLE public.media_assets
  ALTER COLUMN sensitive_level SET DEFAULT 'none';

ALTER TABLE public.media_assets
  ALTER COLUMN sensitive_level SET NOT NULL;


-- ====================================================================
-- VALIDATION
-- ====================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'media_assets_focal_point_x_check'
  ) THEN
    ALTER TABLE public.media_assets
      ADD CONSTRAINT media_assets_focal_point_x_check
      CHECK (
        focal_point_x IS NULL
        OR (
          focal_point_x >= 0
          AND focal_point_x <= 1
        )
      );
  END IF;
END
$$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'media_assets_focal_point_y_check'
  ) THEN
    ALTER TABLE public.media_assets
      ADD CONSTRAINT media_assets_focal_point_y_check
      CHECK (
        focal_point_y IS NULL
        OR (
          focal_point_y >= 0
          AND focal_point_y <= 1
        )
      );
  END IF;
END
$$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'media_assets_latitude_check'
  ) THEN
    ALTER TABLE public.media_assets
      ADD CONSTRAINT media_assets_latitude_check
      CHECK (
        latitude IS NULL
        OR (
          latitude >= -90
          AND latitude <= 90
        )
      );
  END IF;
END
$$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'media_assets_longitude_check'
  ) THEN
    ALTER TABLE public.media_assets
      ADD CONSTRAINT media_assets_longitude_check
      CHECK (
        longitude IS NULL
        OR (
          longitude >= -180
          AND longitude <= 180
        )
      );
  END IF;
END
$$;


-- ====================================================================
-- MEDIA COLLECTIONS
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.media_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name text NOT NULL,
  description text,

  cover_asset_id uuid
    REFERENCES public.media_assets(id)
    ON DELETE SET NULL,

  is_shared boolean NOT NULL DEFAULT true,

  created_by uuid
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);


ALTER TABLE public.media_collections
  ENABLE ROW LEVEL SECURITY;


CREATE INDEX IF NOT EXISTS media_collections_name_idx
  ON public.media_collections (name);

CREATE INDEX IF NOT EXISTS media_collections_created_by_idx
  ON public.media_collections (created_by);


-- ====================================================================
-- MEDIA COLLECTION ITEMS
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.media_collection_items (
  collection_id uuid NOT NULL
    REFERENCES public.media_collections(id)
    ON DELETE CASCADE,

  media_asset_id uuid NOT NULL
    REFERENCES public.media_assets(id)
    ON DELETE CASCADE,

  position integer NOT NULL DEFAULT 0,

  added_by uuid
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (collection_id, media_asset_id)
);


CREATE INDEX IF NOT EXISTS media_collection_items_asset_idx
  ON public.media_collection_items (media_asset_id);

CREATE INDEX IF NOT EXISTS media_collection_items_position_idx
  ON public.media_collection_items (collection_id, position);


ALTER TABLE public.media_collection_items
  ENABLE ROW LEVEL SECURITY;


-- ====================================================================
-- MEDIA TAGS
--
-- Reuses the existing newsroom tags table.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.media_asset_tags (
  media_asset_id uuid NOT NULL
    REFERENCES public.media_assets(id)
    ON DELETE CASCADE,

  tag_id uuid NOT NULL
    REFERENCES public.tags(id)
    ON DELETE CASCADE,

  created_by uuid
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (media_asset_id, tag_id)
);


CREATE INDEX IF NOT EXISTS media_asset_tags_tag_idx
  ON public.media_asset_tags (tag_id);


ALTER TABLE public.media_asset_tags
  ENABLE ROW LEVEL SECURITY;


-- ====================================================================
-- MEDIA FAVORITES
--
-- Favorites are private to each newsroom user.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.media_favorites (
  user_id uuid NOT NULL
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,

  media_asset_id uuid NOT NULL
    REFERENCES public.media_assets(id)
    ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, media_asset_id)
);


CREATE INDEX IF NOT EXISTS media_favorites_asset_idx
  ON public.media_favorites (media_asset_id);


ALTER TABLE public.media_favorites
  ENABLE ROW LEVEL SECURITY;


-- ====================================================================
-- MEDIA USAGE
--
-- Tracks everywhere an asset is used.
--
-- Examples:
-- story / featured_image
-- story / body_image
-- homepage / lead
-- homepage / highlight
-- vault / primary_image
-- video / thumbnail
-- podcast / artwork
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.media_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  media_asset_id uuid NOT NULL
    REFERENCES public.media_assets(id)
    ON DELETE CASCADE,

  usage_type text NOT NULL,

  story_id uuid
    REFERENCES public.stories(id)
    ON DELETE CASCADE,

  entity_type text,
  entity_id uuid,

  placement text,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_by uuid
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS media_usage_asset_idx
  ON public.media_usage (media_asset_id);

CREATE INDEX IF NOT EXISTS media_usage_story_idx
  ON public.media_usage (story_id);

CREATE INDEX IF NOT EXISTS media_usage_entity_idx
  ON public.media_usage (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS media_usage_type_idx
  ON public.media_usage (usage_type);


ALTER TABLE public.media_usage
  ENABLE ROW LEVEL SECURITY;


-- ====================================================================
-- MEDIA VERSIONS
--
-- Stores historical versions when an asset is replaced or materially
-- changed. The original media asset ID remains stable.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.media_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  media_asset_id uuid NOT NULL
    REFERENCES public.media_assets(id)
    ON DELETE CASCADE,

  version_number integer NOT NULL,

  url text NOT NULL,
  storage_path text NOT NULL,

  file_name text NOT NULL,
  mime_type text NOT NULL,

  width integer,
  height integer,
  file_size bigint,

  checksum text,

  change_note text,

  created_by uuid
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (media_asset_id, version_number)
);


CREATE INDEX IF NOT EXISTS media_versions_asset_idx
  ON public.media_versions (
    media_asset_id,
    version_number DESC
  );


ALTER TABLE public.media_versions
  ENABLE ROW LEVEL SECURITY;


-- ====================================================================
-- MEDIA AUDIT LOG
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.media_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  media_asset_id uuid
    REFERENCES public.media_assets(id)
    ON DELETE SET NULL,

  user_id uuid
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,

  action text NOT NULL,

  before_data jsonb,
  after_data jsonb,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS media_audit_asset_idx
  ON public.media_audit_log (
    media_asset_id,
    created_at DESC
  );

CREATE INDEX IF NOT EXISTS media_audit_user_idx
  ON public.media_audit_log (
    user_id,
    created_at DESC
  );


ALTER TABLE public.media_audit_log
  ENABLE ROW LEVEL SECURITY;


-- ====================================================================
-- MEDIA SEARCH / FILTER INDEXES
-- ====================================================================

CREATE INDEX IF NOT EXISTS media_assets_created_at_idx
  ON public.media_assets (created_at DESC);

CREATE INDEX IF NOT EXISTS media_assets_updated_at_idx
  ON public.media_assets (updated_at DESC);

CREATE INDEX IF NOT EXISTS media_assets_status_idx
  ON public.media_assets (status);

CREATE INDEX IF NOT EXISTS media_assets_type_idx
  ON public.media_assets (asset_type);

CREATE INDEX IF NOT EXISTS media_assets_rights_status_idx
  ON public.media_assets (rights_status);

CREATE INDEX IF NOT EXISTS media_assets_category_idx
  ON public.media_assets (category_id);

CREATE INDEX IF NOT EXISTS media_assets_island_idx
  ON public.media_assets (island);

CREATE INDEX IF NOT EXISTS media_assets_date_created_idx
  ON public.media_assets (date_created DESC);

CREATE INDEX IF NOT EXISTS media_assets_photographer_idx
  ON public.media_assets (photographer);

CREATE INDEX IF NOT EXISTS media_assets_source_idx
  ON public.media_assets (source_name);

CREATE INDEX IF NOT EXISTS media_assets_checksum_idx
  ON public.media_assets (checksum)
  WHERE checksum IS NOT NULL;

CREATE INDEX IF NOT EXISTS media_assets_location_idx
  ON public.media_assets (
    country,
    region,
    city
  );


-- ====================================================================
-- UPDATED_AT TRIGGER FOR COLLECTIONS
-- ====================================================================

CREATE OR REPLACE FUNCTION public.update_media_collection_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS media_collections_updated_at
  ON public.media_collections;


CREATE TRIGGER media_collections_updated_at
BEFORE UPDATE ON public.media_collections
FOR EACH ROW
EXECUTE FUNCTION public.update_media_collection_updated_at();


-- ====================================================================
-- COLLECTION RLS
-- ====================================================================

DROP POLICY IF EXISTS "media_collections_select_staff"
  ON public.media_collections;

CREATE POLICY "media_collections_select_staff"
ON public.media_collections
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.is_author = true
        OR p.is_editor = true
      )
  )
);


DROP POLICY IF EXISTS "media_collections_insert_staff"
  ON public.media_collections;

CREATE POLICY "media_collections_insert_staff"
ON public.media_collections
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.is_author = true
        OR p.is_editor = true
      )
  )
);


DROP POLICY IF EXISTS "media_collections_update_staff"
  ON public.media_collections;

CREATE POLICY "media_collections_update_staff"
ON public.media_collections
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_editor = true
  )
)
WITH CHECK (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_editor = true
  )
);


DROP POLICY IF EXISTS "media_collections_delete_staff"
  ON public.media_collections;

CREATE POLICY "media_collections_delete_staff"
ON public.media_collections
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_editor = true
  )
);


-- ====================================================================
-- COLLECTION ITEMS RLS
-- ====================================================================

DROP POLICY IF EXISTS "media_collection_items_select_staff"
  ON public.media_collection_items;

CREATE POLICY "media_collection_items_select_staff"
ON public.media_collection_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.is_author = true
        OR p.is_editor = true
      )
  )
);


DROP POLICY IF EXISTS "media_collection_items_insert_staff"
  ON public.media_collection_items;

CREATE POLICY "media_collection_items_insert_staff"
ON public.media_collection_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.is_author = true
        OR p.is_editor = true
      )
  )
);


DROP POLICY IF EXISTS "media_collection_items_delete_staff"
  ON public.media_collection_items;

CREATE POLICY "media_collection_items_delete_staff"
ON public.media_collection_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.is_author = true
        OR p.is_editor = true
      )
  )
);


-- ====================================================================
-- MEDIA TAG RLS
-- ====================================================================

DROP POLICY IF EXISTS "media_asset_tags_select_staff"
  ON public.media_asset_tags;

CREATE POLICY "media_asset_tags_select_staff"
ON public.media_asset_tags
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.is_author = true
        OR p.is_editor = true
      )
  )
);


DROP POLICY IF EXISTS "media_asset_tags_insert_staff"
  ON public.media_asset_tags;

CREATE POLICY "media_asset_tags_insert_staff"
ON public.media_asset_tags
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.is_author = true
        OR p.is_editor = true
      )
  )
);


DROP POLICY IF EXISTS "media_asset_tags_delete_staff"
  ON public.media_asset_tags;

CREATE POLICY "media_asset_tags_delete_staff"
ON public.media_asset_tags
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.is_author = true
        OR p.is_editor = true
      )
  )
);


-- ====================================================================
-- FAVORITES RLS
-- ====================================================================

DROP POLICY IF EXISTS "media_favorites_select_own"
  ON public.media_favorites;

CREATE POLICY "media_favorites_select_own"
ON public.media_favorites
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);


DROP POLICY IF EXISTS "media_favorites_insert_own"
  ON public.media_favorites;

CREATE POLICY "media_favorites_insert_own"
ON public.media_favorites
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);


DROP POLICY IF EXISTS "media_favorites_delete_own"
  ON public.media_favorites;

CREATE POLICY "media_favorites_delete_own"
ON public.media_favorites
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
);


-- ====================================================================
-- MEDIA USAGE RLS
-- ====================================================================

DROP POLICY IF EXISTS "media_usage_select_staff"
  ON public.media_usage;

CREATE POLICY "media_usage_select_staff"
ON public.media_usage
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.is_author = true
        OR p.is_editor = true
      )
  )
);


DROP POLICY IF EXISTS "media_usage_insert_staff"
  ON public.media_usage;

CREATE POLICY "media_usage_insert_staff"
ON public.media_usage
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.is_author = true
        OR p.is_editor = true
      )
  )
);


DROP POLICY IF EXISTS "media_usage_update_staff"
  ON public.media_usage;

CREATE POLICY "media_usage_update_staff"
ON public.media_usage
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.is_author = true
        OR p.is_editor = true
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.is_author = true
        OR p.is_editor = true
      )
  )
);


DROP POLICY IF EXISTS "media_usage_delete_staff"
  ON public.media_usage;

CREATE POLICY "media_usage_delete_staff"
ON public.media_usage
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.is_author = true
        OR p.is_editor = true
      )
  )
);


-- ====================================================================
-- MEDIA VERSION RLS
-- ====================================================================

DROP POLICY IF EXISTS "media_versions_select_staff"
  ON public.media_versions;

CREATE POLICY "media_versions_select_staff"
ON public.media_versions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.is_author = true
        OR p.is_editor = true
      )
  )
);


DROP POLICY IF EXISTS "media_versions_insert_staff"
  ON public.media_versions;

CREATE POLICY "media_versions_insert_staff"
ON public.media_versions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.is_author = true
        OR p.is_editor = true
      )
  )
);


DROP POLICY IF EXISTS "media_versions_delete_editor"
  ON public.media_versions;

CREATE POLICY "media_versions_delete_editor"
ON public.media_versions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_editor = true
  )
);


-- ====================================================================
-- AUDIT LOG RLS
-- ====================================================================

DROP POLICY IF EXISTS "media_audit_select_staff"
  ON public.media_audit_log;

CREATE POLICY "media_audit_select_staff"
ON public.media_audit_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.is_author = true
        OR p.is_editor = true
      )
  )
);


DROP POLICY IF EXISTS "media_audit_insert_staff"
  ON public.media_audit_log;

CREATE POLICY "media_audit_insert_staff"
ON public.media_audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.is_author = true
        OR p.is_editor = true
      )
  )
);


-- ====================================================================
-- COMMENTS
-- ====================================================================

COMMENT ON TABLE public.media_assets IS
  'West Island Times master newsroom digital asset records.';

COMMENT ON TABLE public.media_collections IS
  'Newsroom-organized collections of media assets.';

COMMENT ON TABLE public.media_usage IS
  'Tracks where media assets are used throughout West Island Times.';

COMMENT ON TABLE public.media_versions IS
  'Historical file versions of media assets.';

COMMENT ON TABLE public.media_audit_log IS
  'Audit trail for significant Media Library actions.';

COMMENT ON COLUMN public.media_assets.focal_point_x IS
  'Horizontal focal point from 0 to 1.';

COMMENT ON COLUMN public.media_assets.focal_point_y IS
  'Vertical focal point from 0 to 1.';

COMMENT ON COLUMN public.media_assets.internal_notes IS
  'Private newsroom notes. Never intended for public display.';

COMMENT ON COLUMN public.media_assets.rights_notes IS
  'Internal licensing and rights-management notes.';

COMMENT ON COLUMN public.media_assets.approximate_date IS
  'Human-readable historical date such as circa 1950, 1970s, or June 1982.';