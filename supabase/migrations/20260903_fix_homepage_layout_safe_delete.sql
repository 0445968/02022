/*
# Fix homepage layout publishing with safe-delete protection

The database rejects DELETE statements without a WHERE clause. Recreate the
publishing function with an explicit predicate. Since homepage_slots.id is a
non-null primary key, the predicate still clears the complete published layout.
*/

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

  DELETE FROM public.homepage_slots
  WHERE id IS NOT NULL;

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
