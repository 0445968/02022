/*
# Fix homepage publish DELETE

Supabase safe-update protection requires DELETE statements
to contain a WHERE clause.

The homepage publish function intentionally replaces all
published homepage placements, so WHERE true is appropriate.
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
    RAISE EXCEPTION
      'Homepage selections must be a JSON array.';
  END IF;


  /*
   * Main Front Page scope.
   *
   * A story may appear only once in the main layout.
   * Headline Bar placements are excluded from this scope.
   */
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_selections) AS item
    WHERE
      item->>'slot' <> 'headline_bar'
    GROUP BY
      item->>'storyId'
    HAVING
      count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'A story cannot appear more than once on the front page.';
  END IF;


  /*
   * Headline Bar scope.
   *
   * A story may appear only once inside the Headline Bar.
   */
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_selections) AS item
    WHERE
      item->>'slot' = 'headline_bar'
    GROUP BY
      item->>'storyId'
    HAVING
      count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'A story cannot appear more than once in the headline bar.';
  END IF;


  /*
   * A slot position can contain only one story.
   */
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_selections) AS item
    GROUP BY
      item->>'slot',
      item->>'position'
    HAVING
      count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'A homepage position cannot contain more than one story.';
  END IF;


  /*
   * Replace all currently published homepage placements.
   *
   * WHERE true is intentional here because publishing replaces
   * the complete layout.
   */
  DELETE FROM public.homepage_slots
  WHERE true;


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

    COALESCE(
      (item->>'position')::integer,
      0
    ),

    NULLIF(
      item->>'categoryId',
      ''
    )::uuid,

    true,

    p_user_id,

    p_user_id

  FROM
    jsonb_array_elements(
      p_selections
    ) AS item

  JOIN public.stories AS story
    ON story.id =
      (item->>'storyId')::uuid

   AND story.status =
      'published';


  GET DIAGNOSTICS
    inserted_count =
      ROW_COUNT;


  IF inserted_count <>
     jsonb_array_length(
       p_selections
     )
  THEN
    RAISE EXCEPTION
      'Every homepage selection must reference a published story.';
  END IF;


  /*
   * Keep the shared editor draft synchronized
   * with the newly published layout.
   */
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

  ON CONFLICT (id)
  DO UPDATE SET
    selections =
      EXCLUDED.selections,

    updated_by =
      EXCLUDED.updated_by,

    updated_at =
      now();

END;
$$;


GRANT EXECUTE
ON FUNCTION public.publish_homepage_layout(
  jsonb,
  uuid
)
TO authenticated, anon;