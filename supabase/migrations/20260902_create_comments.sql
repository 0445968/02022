/*
# West Island Times — Reader comments

Creates:

- public reader profile view
- comments
- threaded replies
- moderation states
- comment reports
- reader/editor RLS policies

Reader identity comes from profiles.display_name.

Editorial profile information is deliberately not used for comments.
Revoking Newsroom access therefore has no effect on a reader's comments
or public identity.
*/


-- ==================================================
-- Comment status types
-- ==================================================

DO $$
BEGIN
  CREATE TYPE public.comment_status AS ENUM (
    'pending',
    'published',
    'hidden',
    'deleted'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.comment_report_status AS ENUM (
    'open',
    'reviewed',
    'dismissed',
    'actioned'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;


-- ==================================================
-- Safe public reader profiles
-- ==================================================
--
-- profiles contains private account and authorization
-- information. Public comment queries must never expose
-- email, role flags, locale preference, or editorial data.
-- ==================================================

CREATE OR REPLACE VIEW public.reader_public_profiles
WITH (
  security_barrier = true
)
AS
SELECT
  id,
  COALESCE(
    NULLIF(
      btrim(display_name),
      ''
    ),
    NULLIF(
      btrim(name),
      ''
    ),
    'Reader'
  ) AS display_name,
  image AS avatar_url
FROM public.profiles;

COMMENT ON VIEW public.reader_public_profiles IS
  'Public reader identity containing only display name and avatar.';


-- ==================================================
-- Comments
-- ==================================================

CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  story_id uuid NOT NULL
    REFERENCES public.stories(id)
    ON DELETE CASCADE,

  /*
   * Nullable so a future account-deletion workflow can
   * anonymize a comment without destroying the thread.
   */
  user_id uuid
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,

  parent_id uuid
    REFERENCES public.comments(id)
    ON DELETE SET NULL,

  body text NOT NULL,

  status public.comment_status
    NOT NULL
    DEFAULT 'pending',

  created_at timestamptz
    NOT NULL
    DEFAULT now(),

  updated_at timestamptz
    NOT NULL
    DEFAULT now(),

  CONSTRAINT comments_body_length_check
    CHECK (
      char_length(
        btrim(body)
      ) BETWEEN 1 AND 5000
    ),

  CONSTRAINT comments_not_own_parent_check
    CHECK (
      parent_id IS NULL
      OR parent_id <> id
    )
);


-- ==================================================
-- Comment reports
-- ==================================================

CREATE TABLE IF NOT EXISTS public.comment_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  comment_id uuid NOT NULL
    REFERENCES public.comments(id)
    ON DELETE CASCADE,

  reporter_id uuid NOT NULL
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,

  reason text NOT NULL,

  status public.comment_report_status
    NOT NULL
    DEFAULT 'open',

  reviewed_by uuid
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,

  reviewed_at timestamptz,

  created_at timestamptz
    NOT NULL
    DEFAULT now(),

  CONSTRAINT comment_reports_reason_length_check
    CHECK (
      char_length(
        btrim(reason)
      ) BETWEEN 3 AND 1000
    ),

  CONSTRAINT comment_reports_reporter_unique
    UNIQUE (
      comment_id,
      reporter_id
    )
);


-- ==================================================
-- Indexes
-- ==================================================

CREATE INDEX IF NOT EXISTS
  comments_story_status_created_idx
ON public.comments(
  story_id,
  status,
  created_at
);

CREATE INDEX IF NOT EXISTS
  comments_user_created_idx
ON public.comments(
  user_id,
  created_at DESC
);

CREATE INDEX IF NOT EXISTS
  comments_parent_created_idx
ON public.comments(
  parent_id,
  created_at
)
WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS
  comment_reports_status_created_idx
ON public.comment_reports(
  status,
  created_at
);

CREATE INDEX IF NOT EXISTS
  comment_reports_comment_idx
ON public.comment_reports(
  comment_id
);

CREATE INDEX IF NOT EXISTS
  comment_reports_reporter_idx
ON public.comment_reports(
  reporter_id,
  created_at DESC
);


-- ==================================================
-- Validate reply relationships
-- ==================================================
--
-- A reply must belong to the same story as its parent.
-- Readers may only reply to a published comment.
-- ==================================================

CREATE OR REPLACE FUNCTION
  public.validate_comment_parent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_story_id uuid;
  parent_status public.comment_status;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    comment.story_id,
    comment.status
  INTO
    parent_story_id,
    parent_status
  FROM public.comments comment
  WHERE comment.id = NEW.parent_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Parent comment does not exist.';
  END IF;

  IF parent_story_id <> NEW.story_id THEN
    RAISE EXCEPTION
      'Reply and parent comment must belong to the same story.';
  END IF;

  IF parent_status <> 'published' THEN
    RAISE EXCEPTION
      'Replies may only be added to published comments.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS
  comments_validate_parent
ON public.comments;

CREATE TRIGGER
  comments_validate_parent
BEFORE INSERT OR UPDATE OF
  parent_id,
  story_id
ON public.comments
FOR EACH ROW
EXECUTE FUNCTION
  public.validate_comment_parent();


-- ==================================================
-- Maintain updated_at
-- ==================================================

CREATE OR REPLACE FUNCTION
  public.set_comment_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS
  comments_set_updated_at
ON public.comments;

CREATE TRIGGER
  comments_set_updated_at
BEFORE UPDATE
ON public.comments
FOR EACH ROW
EXECUTE FUNCTION
  public.set_comment_updated_at();


-- ==================================================
-- Row Level Security
-- ==================================================

ALTER TABLE public.comments
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.comment_reports
ENABLE ROW LEVEL SECURITY;


-- --------------------------------------------------
-- Public comment reading
-- --------------------------------------------------

DROP POLICY IF EXISTS
  "Anyone can read published comments"
ON public.comments;

CREATE POLICY
  "Anyone can read published comments"
ON public.comments
FOR SELECT
TO anon, authenticated
USING (
  status = 'published'

  AND EXISTS (
    SELECT 1
    FROM public.stories story
    WHERE story.id =
      comments.story_id

      AND story.status =
        'published'

      AND story.published_at <=
        now()
  )
);


-- --------------------------------------------------
-- Readers can see all states of their own comments
-- --------------------------------------------------

DROP POLICY IF EXISTS
  "Readers can read their own comments"
ON public.comments;

CREATE POLICY
  "Readers can read their own comments"
ON public.comments
FOR SELECT
TO authenticated
USING (
  auth.uid() =
    user_id
);


-- --------------------------------------------------
-- Editors can read all comments
-- --------------------------------------------------

DROP POLICY IF EXISTS
  "Editors can read all comments"
ON public.comments;

CREATE POLICY
  "Editors can read all comments"
ON public.comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles profile
    WHERE profile.id =
      auth.uid()

      AND profile.is_editor =
        true
  )
);


-- --------------------------------------------------
-- Authenticated readers can comment
-- --------------------------------------------------

DROP POLICY IF EXISTS
  "Readers can create comments"
ON public.comments;

CREATE POLICY
  "Readers can create comments"
ON public.comments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() =
    user_id

  AND status =
    'pending'

  AND EXISTS (
    SELECT 1
    FROM public.stories story
    WHERE story.id =
      comments.story_id

      AND story.status =
        'published'

      AND story.published_at <=
        now()
  )
);


-- --------------------------------------------------
-- Readers edit or soft-delete their own comments.
--
-- An edited published comment must return to pending
-- before it can be shown publicly again.
--
-- Editors can update any moderation state.
-- --------------------------------------------------

DROP POLICY IF EXISTS
  "Readers and editors can update comments"
ON public.comments;

CREATE POLICY
  "Readers and editors can update comments"
ON public.comments
FOR UPDATE
TO authenticated
USING (
  auth.uid() =
    user_id

  OR EXISTS (
    SELECT 1
    FROM public.profiles profile
    WHERE profile.id =
      auth.uid()

      AND profile.is_editor =
        true
  )
)
WITH CHECK (
  (
    auth.uid() =
      user_id

    AND status IN (
      'pending',
      'deleted'
    )
  )

  OR EXISTS (
    SELECT 1
    FROM public.profiles profile
    WHERE profile.id =
      auth.uid()

      AND profile.is_editor =
        true
  )
);


-- --------------------------------------------------
-- Only editors can permanently delete comments.
--
-- Reader deletion uses status = deleted so moderation
-- history and reply relationships can be retained.
-- --------------------------------------------------

DROP POLICY IF EXISTS
  "Editors can permanently delete comments"
ON public.comments;

CREATE POLICY
  "Editors can permanently delete comments"
ON public.comments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles profile
    WHERE profile.id =
      auth.uid()

      AND profile.is_editor =
        true
  )
);


-- --------------------------------------------------
-- Readers can view their own reports
-- --------------------------------------------------

DROP POLICY IF EXISTS
  "Readers can view their own reports"
ON public.comment_reports;

CREATE POLICY
  "Readers can view their own reports"
ON public.comment_reports
FOR SELECT
TO authenticated
USING (
  auth.uid() =
    reporter_id
);


-- --------------------------------------------------
-- Editors can view every report
-- --------------------------------------------------

DROP POLICY IF EXISTS
  "Editors can view all comment reports"
ON public.comment_reports;

CREATE POLICY
  "Editors can view all comment reports"
ON public.comment_reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles profile
    WHERE profile.id =
      auth.uid()

      AND profile.is_editor =
        true
  )
);


-- --------------------------------------------------
-- Readers can report another published comment once
-- --------------------------------------------------

DROP POLICY IF EXISTS
  "Readers can create comment reports"
ON public.comment_reports;

CREATE POLICY
  "Readers can create comment reports"
ON public.comment_reports
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() =
    reporter_id

  AND status =
    'open'

  AND EXISTS (
    SELECT 1
    FROM public.comments comment
    WHERE comment.id =
      comment_reports.comment_id

      AND comment.status =
        'published'

      AND comment.user_id IS DISTINCT FROM
        auth.uid()
  )
);


-- --------------------------------------------------
-- Editors can review reports
-- --------------------------------------------------

DROP POLICY IF EXISTS
  "Editors can update comment reports"
ON public.comment_reports;

CREATE POLICY
  "Editors can update comment reports"
ON public.comment_reports
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles profile
    WHERE profile.id =
      auth.uid()

      AND profile.is_editor =
        true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles profile
    WHERE profile.id =
      auth.uid()

      AND profile.is_editor =
        true
  )

  AND (
    reviewed_by IS NULL
    OR reviewed_by =
      auth.uid()
  )
);


-- ==================================================
-- Database privileges
-- ==================================================
--
-- Explicit column privileges prevent readers from
-- changing comment ownership, story, parent, timestamps,
-- report ownership, or review metadata.
-- ==================================================

REVOKE ALL
ON public.reader_public_profiles
FROM PUBLIC, anon, authenticated;

GRANT SELECT
ON public.reader_public_profiles
TO anon, authenticated;


REVOKE ALL
ON public.comments
FROM anon, authenticated;

GRANT SELECT
ON public.comments
TO anon, authenticated;

GRANT INSERT (
  story_id,
  user_id,
  parent_id,
  body
)
ON public.comments
TO authenticated;

GRANT UPDATE (
  body,
  status
)
ON public.comments
TO authenticated;

GRANT DELETE
ON public.comments
TO authenticated;


REVOKE ALL
ON public.comment_reports
FROM anon, authenticated;

GRANT SELECT
ON public.comment_reports
TO authenticated;

GRANT INSERT (
  comment_id,
  reporter_id,
  reason
)
ON public.comment_reports
TO authenticated;

GRANT UPDATE (
  status,
  reviewed_by,
  reviewed_at
)
ON public.comment_reports
TO authenticated;