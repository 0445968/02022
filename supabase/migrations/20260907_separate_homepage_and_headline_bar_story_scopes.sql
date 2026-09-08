/*
# Separate Front Page and Headline Bar story scopes

A story may appear:

- once in the main Front Page layout
- once in the Headline Bar

The same story may therefore appear in both scopes at the same time.

A story may NOT appear more than once inside the main Front Page layout.
A story may NOT appear more than once inside the Headline Bar.
*/


/* ---------------------------------------------------------
   1. Replace the old global story uniqueness index
   --------------------------------------------------------- */

DROP INDEX IF EXISTS public.homepage_slots_unique_active_story_idx;


/*
 * Main Front Page layout:
 * one active placement per story, excluding Headline Bar.
 */
CREATE UNIQUE INDEX IF NOT EXISTS
  homepage_slots_unique_active_front_page_story_idx
ON public.homepage_slots (story_id)
WHERE
  active = true
  AND slot <> 'headline_bar'::public.homepage_slot_type;


/*
 * Headline Bar:
 * one active placement per story inside the bar.
 */
CREATE UNIQUE INDEX IF NOT EXISTS
  homepage_slots_unique_active_headline_bar_story_idx
ON public.homepage_slots (story_id)
WHERE
  active = true
  AND slot = 'headline_bar'::public.homepage_slot_type;


/* ---------------------------------------------------------
   2. Replace homepage publishing function
   --------------------------------------------------------- */

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
  /*
   * Basic payload validation.
   */
  IF jsonb_typeof(p_selections) <> 'array' THEN
    RAISE EXCEPTION
      'Homepage selections must be a JSON array.';
  END IF;


  /*
   * Main Front Page scope.
   *
   * A story may only appear once among all slots
   * except headline_bar.
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
   * A story may only appear once inside the
   * Headline Bar itself.
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
   * A physical slot/position can still only
   * contain one story.
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
   * Replace the published layout atomically.
   */
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


  /*
   * Ensure every submitted selection actually
   * referenced a published story.
   */
  IF inserted_count <>
     jsonb_array_length(
       p_selections
     )
  THEN
    RAISE EXCEPTION
      'Every homepage selection must reference a published story.';
  END IF;


  /*
   * Keep the shared draft synchronized with the
   * layout that was just published.
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


/* ---------------------------------------------------------
   3. Preserve permissions
   --------------------------------------------------------- */

GRANT EXECUTE
ON FUNCTION public.publish_homepage_layout(
  jsonb,
  uuid
)
TO authenticated, anon;