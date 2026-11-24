-- CT-02f DRAFT migration. NOT APPLIED to hosted Clear Talks.
-- Migration name created by pinned Supabase CLI v3.2.0 in GitHub Actions 45295371087.
-- Requires CT-02b/c/e. DO NOT apply without approved/restorable backup,
-- verified owner + role grants, migration-history reconciliation, media/Storage
-- and all-route authorization parity, end-to-end QA and explicit user approval.
begin;

-- The restored live publisher function body below was taken verbatim from
-- pg_get_functiondef on November 23, 2026, except for replacing the legacy
-- profiles.is_editor authorization block with current dual-capability checks.
-- The rest of its atomic body is intentionally byte-for-byte identical.

CREATE OR REPLACE FUNCTION public.publish_story_revision(p_story_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_revision public.story_revisions%rowtype;
  v_story public.stories%rowtype;
  v_authenticated_user_id uuid;
BEGIN
  /*
   * CT-02f: atomically verify the caller's real Supabase identity and
   * current staff capabilities before the privileged publication body.
   * No profile.is_editor, user_metadata or user-supplied role fallback.
   */
  SELECT auth.uid() INTO v_authenticated_user_id;
  IF v_authenticated_user_id IS NULL
     OR v_authenticated_user_id IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION
      'The authenticated user does not match the publishing user.'
      USING ERRCODE = '42501';
  END IF;

  -- This function remains SECURITY DEFINER solely to preserve the current
  -- atomic version/story/relations/revision transaction. The helper matches
  -- auth.uid() against live, active/non-expired membership + current role/
  -- override rows and checks explicit DENY precedence. Using the helper
  -- as the definer does NOT permit an actor mismatch: the identity check
  -- above is mandatory and is separately regression-tested.
  IF NOT (
       newsroom_private.has_staff_permission(
         'story.edit_all'::public.staff_capability_key, p_story_id
       )
       OR newsroom_private.has_staff_permission(
         'story.edit_assigned'::public.staff_capability_key, p_story_id
       )
     )
     OR NOT newsroom_private.has_staff_permission(
       'story.publish'::public.staff_capability_key, p_story_id
     )
     OR NOT newsroom_private.has_staff_permission(
       'revision.publish'::public.staff_capability_key, p_story_id
     ) THEN
    RAISE EXCEPTION
      'A current authorized editor is required to publish a revision.'
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

-- Prevent anonymous/PUBLIC callers from executing the privileged publisher.
-- Keep authenticated EXECUTE for compatibility, with authorization INSIDE
-- the definer function. The remaining advisor warning is intentional pending
-- a separately tested invoker-only/privileged backend migration.
revoke all on function public.publish_story_revision(uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.publish_story_revision(uuid,uuid)
  to authenticated;

-- Version RLS: remove exactly the verified live legacy policies.
-- Existing rows, author FKs and immutable history are never updated/deleted.
drop policy if exists versions_insert_staff on public.story_versions;
drop policy if exists versions_select_editor on public.story_versions;
drop policy if exists versions_select_own_author on public.story_versions;

create policy ct02f_versions_read_staff
on public.story_versions for select to authenticated using (
  newsroom_private.has_staff_permission('story.view_all', story_id)
  or newsroom_private.has_staff_permission('story.view_assigned', story_id)
  or newsroom_private.has_staff_permission('revision.view', story_id)
  or newsroom_private.has_staff_permission('story.edit_all', story_id)
  or newsroom_private.has_staff_permission('story.edit_assigned', story_id)
);

create policy ct02f_versions_insert_staff
on public.story_versions for insert to authenticated with check (
  created_by = (select auth.uid())
  and (
    newsroom_private.has_staff_permission('story.edit_all', story_id)
    or newsroom_private.has_staff_permission('story.edit_assigned', story_id)
  )
);

-- Direct authenticated users may only save an actual current-state snapshot
-- as a version. Forged historical content and forged creator fields are denied.
-- Published revision publishing remains a privileged, separately authorized
-- atomic function, not a direct row-writing permission.
create function newsroom_private.guard_story_version_snapshot()
returns trigger language plpgsql security invoker set search_path = ''
as $fn$
begin
  if current_user <> 'authenticated' then return new; end if;
  if new.created_by is distinct from (select auth.uid()) then
    raise exception 'A version must be attributed to the current user'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.stories s
    where s.id = new.story_id
      and (
        newsroom_private.has_staff_permission('story.edit_all',new.story_id)
        or newsroom_private.has_staff_permission('story.edit_assigned',new.story_id)
      )
      and s.headline is not distinct from new.headline
      and s.short_title is not distinct from new.short_title
      and s.subheadline is not distinct from new.subheadline
      and s.summary is not distinct from new.summary
      and s.body is not distinct from new.body
      and s.author_id is not distinct from new.author_id
      and s.editor_id is not distinct from new.editor_id
      and s.language is not distinct from new.language
      and s.primary_category_id is not distinct from new.primary_category_id
  ) then
    raise exception 'History snapshot must match the current editable story'
      using errcode = '42501';
  end if;
  return new;
end;
$fn$;

create trigger ct02f_story_version_snapshot_guard
  before insert on public.story_versions
  for each row execute function newsroom_private.guard_story_version_snapshot();

revoke all on function newsroom_private.guard_story_version_snapshot()
  from public, anon, authenticated;

commit;
