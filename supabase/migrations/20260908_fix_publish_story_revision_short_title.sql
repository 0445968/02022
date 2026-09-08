/*
# Fix short title publishing for story revisions

Ensures that:

1. The currently published short title is preserved in story_versions.
2. The revision short title is copied into stories when Publish Update is used.
3. Existing story revision publishing behavior remains unchanged.
*/

CREATE OR REPLACE FUNCTION public.publish_story_revision(
  p_story_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_revision public.story_revisions%rowtype;
  v_story public.stories%rowtype;
  v_authenticated_user_id uuid;
  v_is_editor boolean;
BEGIN
  /*
   * Verify the supplied user is an Editor.
   *
   * In production, authenticated requests must also match
   * auth.uid(). During DEV_AUTH_BYPASS, auth.uid() can be null,
   * so p_user_id remains temporarily usable by the dev route.
   */
  SELECT auth.uid()
  INTO v_authenticated_user_id;

  IF
    v_authenticated_user_id IS NOT NULL
    AND v_authenticated_user_id <> p_user_id
  THEN
    RAISE EXCEPTION
      'The authenticated user does not match the publishing user.'
      USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(is_editor, false)
  INTO v_is_editor
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT COALESCE(v_is_editor, false) THEN
    RAISE EXCEPTION
      'Only an Editor can publish a story revision.'
      USING ERRCODE = '42501';
  END IF;

  /*
   * Lock the live story so two publication operations cannot
   * update the same story concurrently.
   */
  SELECT *
  INTO v_story
  FROM public.stories
  WHERE id = p_story_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Published story could not be found.'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_story.status <> 'published' THEN
    RAISE EXCEPTION
      'Only a published story can publish an update revision.'
      USING ERRCODE = 'P0001';
  END IF;

  /*
   * Lock and load the pending revision.
   */
  SELECT *
  INTO v_revision
  FROM public.story_revisions
  WHERE story_id = p_story_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'There are no unpublished changes to publish.'
      USING ERRCODE = 'P0002';
  END IF;

  /*
   * Preserve the copy that is currently live.
   *
   * short_title is included so historical versions preserve
   * the compact title that was live at that moment.
   */
  INSERT INTO public.story_versions (
    story_id,
    headline,
    short_title,
    subheadline,
    summary,
    body,
    author_id,
    editor_id,
    language,
    primary_category_id,
    created_by
  )
  VALUES (
    v_story.id,
    v_story.headline,
    v_story.short_title,
    v_story.subheadline,
    v_story.summary,
    v_story.body,
    v_story.author_id,
    v_story.editor_id,
    v_story.language,
    v_story.primary_category_id,
    p_user_id
  );

  /*
   * Publish the revision without resetting the story's
   * original West Island Times publication timestamp.
   *
   * short_title must be copied from the revision into
   * the live story together with the rest of the content.
   */
  UPDATE public.stories
  SET
    headline = v_revision.headline,
    short_title = v_revision.short_title,
    subheadline = v_revision.subheadline,
    summary = v_revision.summary,
    body = v_revision.body,
    language = v_revision.language,
    status = 'published',
    access_level = v_revision.access_level,
    author_id = v_revision.author_id,
    editor_id = v_revision.editor_id,
    primary_category_id = v_revision.primary_category_id,
    island = v_revision.island,
    featured_image_id = v_revision.featured_image_id,
    image_caption = v_revision.image_caption,
    image_credit = v_revision.image_credit,
    seo_title = v_revision.seo_title,
    seo_description = v_revision.seo_description,
    slug = v_revision.slug,
    originally_published_at =
      v_revision.originally_published_at,
    scheduled_at = NULL,
    published_at = COALESCE(
      v_story.published_at,
      now()
    ),
    updated_by = p_user_id
  WHERE id = p_story_id;

  /*
   * Replace category relationships.
   *
   * The primary category is included even if an older client
   * omitted it from category_ids.
   */
  DELETE FROM public.story_categories
  WHERE story_id = p_story_id;

  INSERT INTO public.story_categories (
    story_id,
    category_id,
    is_primary
  )
  SELECT
    p_story_id,
    categories.category_id,
    categories.category_id =
      v_revision.primary_category_id
  FROM (
    SELECT unnest(
      v_revision.category_ids
    ) AS category_id

    UNION

    SELECT
      v_revision.primary_category_id
    WHERE
      v_revision.primary_category_id
      IS NOT NULL
  ) AS categories
  WHERE
    categories.category_id
    IS NOT NULL;

  /*
   * Replace tag relationships.
   */
  DELETE FROM public.story_tags
  WHERE story_id = p_story_id;

  INSERT INTO public.story_tags (
    story_id,
    tag_id
  )
  SELECT DISTINCT
    p_story_id,
    tags.tag_id
  FROM (
    SELECT unnest(
      v_revision.tag_ids
    ) AS tag_id
  ) AS tags
  WHERE
    tags.tag_id
    IS NOT NULL;

  /*
   * Remove the revision only after every publication step
   * has succeeded.
   */
  DELETE FROM public.story_revisions
  WHERE id = v_revision.id;
END;
$function$;