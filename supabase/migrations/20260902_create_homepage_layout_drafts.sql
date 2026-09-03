/*
# Homepage layout drafts

Separates newsroom layout editing from the public homepage. Editors can save
and autosave a shared draft without changing homepage_slots. Publishing uses
one database transaction so visitors never see a partially updated layout.
*/

CREATE TABLE IF NOT EXISTS public.homepage_layout_drafts (
  id text PRIMARY KEY DEFAULT 'current',
  selections jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT homepage_layout_drafts_singleton CHECK (id = 'current'),
  CONSTRAINT homepage_layout_drafts_array CHECK (jsonb_typeof(selections) = 'array')
);

ALTER TABLE public.homepage_layout_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "homepage_layout_drafts_select_editor"
ON public.homepage_layout_drafts;
CREATE POLICY "homepage_layout_drafts_select_editor"
  ON public.homepage_layout_drafts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_editor = true
    )
  );

DROP POLICY IF EXISTS "homepage_layout_drafts_insert_editor"
ON public.homepage_layout_drafts;
CREATE POLICY "homepage_layout_drafts_insert_editor"
  ON public.homepage_layout_drafts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_editor = true
    )
  );

DROP POLICY IF EXISTS "homepage_layout_drafts_update_editor"
ON public.homepage_layout_drafts;
CREATE POLICY "homepage_layout_drafts_update_editor"
  ON public.homepage_layout_drafts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_editor = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_editor = true
    )
  );

/* Temporary development access while DEV_AUTH_BYPASS is enabled. */
DROP POLICY IF EXISTS "DEV BYPASS - homepage layout drafts select all"
ON public.homepage_layout_drafts;
CREATE POLICY "DEV BYPASS - homepage layout drafts select all"
  ON public.homepage_layout_drafts FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "DEV BYPASS - homepage layout drafts insert all"
ON public.homepage_layout_drafts;
CREATE POLICY "DEV BYPASS - homepage layout drafts insert all"
  ON public.homepage_layout_drafts FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "DEV BYPASS - homepage layout drafts update all"
ON public.homepage_layout_drafts;
CREATE POLICY "DEV BYPASS - homepage layout drafts update all"
  ON public.homepage_layout_drafts FOR UPDATE TO anon
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.publish_homepage_layout(
  p_selections jsonb,
  p_user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  inserted_count integer;
BEGIN
  IF jsonb_typeof(p_selections) <> 'array' THEN
    RAISE EXCEPTION 'Homepage selections must be a JSON array.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_selections) AS item
    GROUP BY item->>'storyId'
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'A story cannot appear more than once on the homepage.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_selections) AS item
    GROUP BY item->>'slot', item->>'position'
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'A homepage position cannot contain more than one story.';
  END IF;

  DELETE FROM public.homepage_slots;

  INSERT INTO public.homepage_slots (
    slot,
    story_id,
    position,
    category_id,
    active,
    created_by,
    updated_by
  )
  SELECT
    (item->>'slot')::public.homepage_slot_type,
    (item->>'storyId')::uuid,
    COALESCE((item->>'position')::integer, 0),
    NULLIF(item->>'categoryId', '')::uuid,
    true,
    p_user_id,
    p_user_id
  FROM jsonb_array_elements(p_selections) AS item
  JOIN public.stories AS story
    ON story.id = (item->>'storyId')::uuid
   AND story.status = 'published';

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  IF inserted_count <> jsonb_array_length(p_selections) THEN
    RAISE EXCEPTION 'Every homepage selection must reference a published story.';
  END IF;

  INSERT INTO public.homepage_layout_drafts (
    id,
    selections,
    updated_by,
    updated_at
  )
  VALUES (
    'current',
    p_selections,
    p_user_id,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    selections = EXCLUDED.selections,
    updated_by = EXCLUDED.updated_by,
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_homepage_layout(jsonb, uuid)
TO authenticated, anon;
