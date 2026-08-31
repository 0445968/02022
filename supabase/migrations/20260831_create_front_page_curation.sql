/*
# Stage 3: Front-page curation

Creates the editorial curation layer for the Simply Raizal homepage.

Tables:
- homepage_slots
- breaking_news

Goals:
- Editors can explicitly decide which stories appear on the homepage.
- Homepage ordering is independent of story publication order.
- Placements may optionally be scheduled.
- Breaking news may link to an internal story or an external URL.
- Public visitors can only read active/current homepage content.

IMPORTANT DEVELOPMENT NOTE:
This project is currently being tested without authentication.

Temporary "DEV BYPASS -" policies are therefore included at the bottom of
this migration for anon access.

REMOVE THOSE POLICIES BEFORE PRODUCTION.
*/


-- ====================================================================
-- ENUM: HOMEPAGE SLOT
-- ====================================================================

DO $$
BEGIN
  CREATE TYPE homepage_slot_type AS ENUM (
    'lead',
    'top_left',
    'top_right',
    'secondary',
    'editors_pick',
    'latest_feature',
    'section_feature',
    'video_feature'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;


-- ====================================================================
-- HOMEPAGE SLOTS
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.homepage_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  slot homepage_slot_type NOT NULL,

  story_id uuid NOT NULL
    REFERENCES public.stories(id)
    ON DELETE CASCADE,

  /*
   * Some slots may contain multiple stories.
   * position controls their ordering.
   */
  position integer NOT NULL DEFAULT 0,

  /*
   * Optional section/category association.
   *
   * Useful for a generic "section_feature" slot where an editor wants
   * to curate a Politics, Environment, Sports, Music, Religion, etc.
   * homepage module.
   */
  category_id uuid
    REFERENCES public.categories(id)
    ON DELETE SET NULL,

  /*
   * Optional scheduling.
   *
   * NULL starts_at = available immediately.
   * NULL ends_at   = remains active indefinitely.
   */
  starts_at timestamptz,
  ends_at timestamptz,

  /*
   * Allows editors to temporarily disable a placement without deleting it.
   */
  active boolean NOT NULL DEFAULT true,

  created_by uuid
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,

  updated_by uuid
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  /*
   * Prevent obviously invalid scheduling windows.
   */
  CONSTRAINT homepage_slots_valid_schedule
    CHECK (
      ends_at IS NULL
      OR starts_at IS NULL
      OR ends_at > starts_at
    ),

  CONSTRAINT homepage_slots_position_nonnegative
    CHECK (position >= 0)
);


ALTER TABLE public.homepage_slots
ENABLE ROW LEVEL SECURITY;


-- ====================================================================
-- HOMEPAGE SLOT INDEXES
-- ====================================================================

CREATE INDEX IF NOT EXISTS homepage_slots_slot_idx
  ON public.homepage_slots (slot);

CREATE INDEX IF NOT EXISTS homepage_slots_story_idx
  ON public.homepage_slots (story_id);

CREATE INDEX IF NOT EXISTS homepage_slots_category_idx
  ON public.homepage_slots (category_id);

CREATE INDEX IF NOT EXISTS homepage_slots_position_idx
  ON public.homepage_slots (slot, position);

CREATE INDEX IF NOT EXISTS homepage_slots_active_idx
  ON public.homepage_slots (active);

CREATE INDEX IF NOT EXISTS homepage_slots_schedule_idx
  ON public.homepage_slots (starts_at, ends_at);


/*
 * A story should not accidentally appear twice in the same exact slot
 * position.
 */
CREATE UNIQUE INDEX IF NOT EXISTS homepage_slots_unique_position_idx
  ON public.homepage_slots (slot, position)
  WHERE active = true;


/*
 * Prevent a story from being assigned more than once to the same slot.
 */
CREATE UNIQUE INDEX IF NOT EXISTS homepage_slots_unique_story_per_slot_idx
  ON public.homepage_slots (slot, story_id)
  WHERE active = true;


-- ====================================================================
-- UPDATED_AT TRIGGER FOR HOMEPAGE SLOTS
-- ====================================================================

CREATE OR REPLACE FUNCTION public.set_homepage_slot_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS homepage_slots_set_updated_at
ON public.homepage_slots;


CREATE TRIGGER homepage_slots_set_updated_at
BEFORE UPDATE ON public.homepage_slots
FOR EACH ROW
EXECUTE FUNCTION public.set_homepage_slot_updated_at();


-- ====================================================================
-- BREAKING NEWS
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.breaking_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  /*
   * Alert headline shown in the breaking-news bar.
   */
  headline text NOT NULL,

  /*
   * Optional internal Simply Raizal story.
   */
  story_id uuid
    REFERENCES public.stories(id)
    ON DELETE SET NULL,

  /*
   * Optional external destination.
   *
   * If both story_id and external_url are NULL,
   * the alert can still display without being clickable.
   */
  external_url text,

  /*
   * Allows newsroom editors to switch the alert on/off.
   */
  active boolean NOT NULL DEFAULT true,

  /*
   * Allows multiple alerts to coexist and be ordered.
   */
  position integer NOT NULL DEFAULT 0,

  starts_at timestamptz,
  ends_at timestamptz,

  created_by uuid
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,

  updated_by uuid
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT breaking_news_valid_schedule
    CHECK (
      ends_at IS NULL
      OR starts_at IS NULL
      OR ends_at > starts_at
    ),

  CONSTRAINT breaking_news_position_nonnegative
    CHECK (position >= 0)
);


ALTER TABLE public.breaking_news
ENABLE ROW LEVEL SECURITY;


-- ====================================================================
-- BREAKING NEWS INDEXES
-- ====================================================================

CREATE INDEX IF NOT EXISTS breaking_news_active_idx
  ON public.breaking_news (active);

CREATE INDEX IF NOT EXISTS breaking_news_position_idx
  ON public.breaking_news (position);

CREATE INDEX IF NOT EXISTS breaking_news_story_idx
  ON public.breaking_news (story_id);

CREATE INDEX IF NOT EXISTS breaking_news_schedule_idx
  ON public.breaking_news (starts_at, ends_at);


-- ====================================================================
-- UPDATED_AT TRIGGER FOR BREAKING NEWS
-- ====================================================================

CREATE OR REPLACE FUNCTION public.set_breaking_news_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS breaking_news_set_updated_at
ON public.breaking_news;


CREATE TRIGGER breaking_news_set_updated_at
BEFORE UPDATE ON public.breaking_news
FOR EACH ROW
EXECUTE FUNCTION public.set_breaking_news_updated_at();


-- ====================================================================
-- PRODUCTION RLS — HOMEPAGE SLOTS
-- ====================================================================

/*
 * PUBLIC
 *
 * Public visitors may only see active placements currently inside their
 * schedule window AND pointing to an actually published story.
 */

DROP POLICY IF EXISTS "homepage_slots_select_public"
ON public.homepage_slots;


CREATE POLICY "homepage_slots_select_public"
ON public.homepage_slots
FOR SELECT
TO anon, authenticated
USING (
  active = true

  AND (
    starts_at IS NULL
    OR starts_at <= now()
  )

  AND (
    ends_at IS NULL
    OR ends_at > now()
  )

  AND EXISTS (
    SELECT 1
    FROM public.stories s
    WHERE s.id = homepage_slots.story_id
      AND s.status = 'published'
      AND s.published_at IS NOT NULL
      AND s.published_at <= now()
  )
);


/*
 * EDITORS
 *
 * Authenticated editors can inspect every placement, including future,
 * expired and disabled placements.
 */

DROP POLICY IF EXISTS "homepage_slots_select_editor"
ON public.homepage_slots;


CREATE POLICY "homepage_slots_select_editor"
ON public.homepage_slots
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_editor = true
  )
);


/*
 * Only editors may create homepage placements in production.
 */

DROP POLICY IF EXISTS "homepage_slots_insert_editor"
ON public.homepage_slots;


CREATE POLICY "homepage_slots_insert_editor"
ON public.homepage_slots
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_editor = true
  )
);


/*
 * Only editors may update homepage placements in production.
 */

DROP POLICY IF EXISTS "homepage_slots_update_editor"
ON public.homepage_slots;


CREATE POLICY "homepage_slots_update_editor"
ON public.homepage_slots
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_editor = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_editor = true
  )
);


/*
 * Only editors may delete placements.
 */

DROP POLICY IF EXISTS "homepage_slots_delete_editor"
ON public.homepage_slots;


CREATE POLICY "homepage_slots_delete_editor"
ON public.homepage_slots
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
-- PRODUCTION RLS — BREAKING NEWS
-- ====================================================================

/*
 * Public visitors only see active alerts inside their schedule window.
 */

DROP POLICY IF EXISTS "breaking_news_select_public"
ON public.breaking_news;


CREATE POLICY "breaking_news_select_public"
ON public.breaking_news
FOR SELECT
TO anon, authenticated
USING (
  active = true

  AND (
    starts_at IS NULL
    OR starts_at <= now()
  )

  AND (
    ends_at IS NULL
    OR ends_at > now()
  )
);


/*
 * Editors may inspect all alerts.
 */

DROP POLICY IF EXISTS "breaking_news_select_editor"
ON public.breaking_news;


CREATE POLICY "breaking_news_select_editor"
ON public.breaking_news
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_editor = true
  )
);


/*
 * Only editors create breaking-news alerts in production.
 */

DROP POLICY IF EXISTS "breaking_news_insert_editor"
ON public.breaking_news;


CREATE POLICY "breaking_news_insert_editor"
ON public.breaking_news
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_editor = true
  )
);


/*
 * Only editors update breaking-news alerts.
 */

DROP POLICY IF EXISTS "breaking_news_update_editor"
ON public.breaking_news;


CREATE POLICY "breaking_news_update_editor"
ON public.breaking_news
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_editor = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_editor = true
  )
);


/*
 * Only editors delete breaking-news alerts.
 */

DROP POLICY IF EXISTS "breaking_news_delete_editor"
ON public.breaking_news;


CREATE POLICY "breaking_news_delete_editor"
ON public.breaking_news
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
-- TEMPORARY DEVELOPMENT AUTH BYPASS
-- ====================================================================

/*
# DEVELOPMENT ONLY

Simply Raizal is currently being tested without login.

These policies permit anonymous CRUD against ONLY the two Stage 3
front-page curation tables.

This mirrors the existing development bypass used by the Stage 2
editorial tables.

REMOVE ALL "DEV BYPASS -" POLICIES BEFORE PRODUCTION.
*/


-- --------------------------------------------------------------------
-- HOMEPAGE SLOTS DEV BYPASS
-- --------------------------------------------------------------------

DROP POLICY IF EXISTS "DEV BYPASS - homepage_slots select all"
ON public.homepage_slots;


CREATE POLICY "DEV BYPASS - homepage_slots select all"
ON public.homepage_slots
FOR SELECT
TO anon, authenticated
USING (true);


DROP POLICY IF EXISTS "DEV BYPASS - homepage_slots insert all"
ON public.homepage_slots;


CREATE POLICY "DEV BYPASS - homepage_slots insert all"
ON public.homepage_slots
FOR INSERT
TO anon, authenticated
WITH CHECK (true);


DROP POLICY IF EXISTS "DEV BYPASS - homepage_slots update all"
ON public.homepage_slots;


CREATE POLICY "DEV BYPASS - homepage_slots update all"
ON public.homepage_slots
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);


DROP POLICY IF EXISTS "DEV BYPASS - homepage_slots delete all"
ON public.homepage_slots;


CREATE POLICY "DEV BYPASS - homepage_slots delete all"
ON public.homepage_slots
FOR DELETE
TO anon, authenticated
USING (true);


-- --------------------------------------------------------------------
-- BREAKING NEWS DEV BYPASS
-- --------------------------------------------------------------------

DROP POLICY IF EXISTS "DEV BYPASS - breaking_news select all"
ON public.breaking_news;


CREATE POLICY "DEV BYPASS - breaking_news select all"
ON public.breaking_news
FOR SELECT
TO anon, authenticated
USING (true);


DROP POLICY IF EXISTS "DEV BYPASS - breaking_news insert all"
ON public.breaking_news;


CREATE POLICY "DEV BYPASS - breaking_news insert all"
ON public.breaking_news
FOR INSERT
TO anon, authenticated
WITH CHECK (true);


DROP POLICY IF EXISTS "DEV BYPASS - breaking_news update all"
ON public.breaking_news;


CREATE POLICY "DEV BYPASS - breaking_news update all"
ON public.breaking_news
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);


DROP POLICY IF EXISTS "DEV BYPASS - breaking_news delete all"
ON public.breaking_news;


CREATE POLICY "DEV BYPASS - breaking_news delete all"
ON public.breaking_news
FOR DELETE
TO anon, authenticated
USING (true);