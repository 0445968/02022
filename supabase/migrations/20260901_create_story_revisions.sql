/*
# West Island Times — unpublished story revisions

Published stories must remain stable while editors and authors prepare
updates.

A story can have one active unpublished revision at a time.

The public article continues reading from public.stories.
The newsroom editor reads/writes public.story_revisions whenever a
published story has unpublished changes.

Publishing a revision copies its values back into public.stories and
then removes the revision.
*/

CREATE TABLE IF NOT EXISTS public.story_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  story_id uuid NOT NULL
    REFERENCES public.stories(id)
    ON DELETE CASCADE,

  headline text NOT NULL,

  subheadline text,
  summary text,

  body jsonb NOT NULL DEFAULT
    '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,

  language story_language NOT NULL DEFAULT 'en',

  status story_status NOT NULL DEFAULT 'draft',

  access_level access_level NOT NULL DEFAULT 'public',

  author_id uuid
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,

  editor_id uuid
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,

  primary_category_id uuid
    REFERENCES public.categories(id)
    ON DELETE SET NULL,

  category_ids uuid[] NOT NULL DEFAULT '{}',

  tag_ids uuid[] NOT NULL DEFAULT '{}',

  island island_scope NOT NULL DEFAULT 'none',

  featured_image_id uuid
    REFERENCES public.media_assets(id)
    ON DELETE SET NULL,

  image_caption text,
  image_credit text,

  seo_title text,
  seo_description text,

  slug text NOT NULL,

  originally_published_at timestamptz,

  scheduled_at timestamptz,

  created_by uuid
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,

  updated_by uuid
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),

  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT story_revisions_story_unique
    UNIQUE (story_id)
);


-- --------------------------------------------------
-- Indexes
-- --------------------------------------------------

CREATE INDEX IF NOT EXISTS
  story_revisions_story_id_idx
ON public.story_revisions(story_id);

CREATE INDEX IF NOT EXISTS
  story_revisions_updated_at_idx
ON public.story_revisions(updated_at DESC);

CREATE INDEX IF NOT EXISTS
  story_revisions_status_idx
ON public.story_revisions(status);


-- --------------------------------------------------
-- updated_at
-- --------------------------------------------------

CREATE OR REPLACE FUNCTION
public.set_story_revision_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS
  story_revisions_set_updated_at
ON public.story_revisions;

CREATE TRIGGER
  story_revisions_set_updated_at
BEFORE UPDATE
ON public.story_revisions
FOR EACH ROW
EXECUTE FUNCTION
  public.set_story_revision_updated_at();


-- --------------------------------------------------
-- Row Level Security
-- --------------------------------------------------

ALTER TABLE
  public.story_revisions
ENABLE ROW LEVEL SECURITY;


/*
Authors may read revisions belonging to stories
they authored.

Editors may read all revisions.
*/
DROP POLICY IF EXISTS
  "Editorial staff can read story revisions"
ON public.story_revisions;

CREATE POLICY
  "Editorial staff can read story revisions"
ON public.story_revisions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles profile
    WHERE profile.id = auth.uid()
      AND (
        profile.is_editor = true

        OR EXISTS (
          SELECT 1
          FROM public.stories story
          WHERE story.id =
            story_revisions.story_id
            AND story.author_id =
              auth.uid()
        )
      )
  )
);


/*
Authors may create revisions for their own stories.
Editors may create revisions for any story.
*/
DROP POLICY IF EXISTS
  "Editorial staff can create story revisions"
ON public.story_revisions;

CREATE POLICY
  "Editorial staff can create story revisions"
ON public.story_revisions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles profile
    WHERE profile.id = auth.uid()
      AND (
        profile.is_editor = true

        OR EXISTS (
          SELECT 1
          FROM public.stories story
          WHERE story.id =
            story_revisions.story_id
            AND story.author_id =
              auth.uid()
        )
      )
  )
);


/*
Authors may update revisions for their own stories.
Editors may update any revision.
*/
DROP POLICY IF EXISTS
  "Editorial staff can update story revisions"
ON public.story_revisions;

CREATE POLICY
  "Editorial staff can update story revisions"
ON public.story_revisions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles profile
    WHERE profile.id = auth.uid()
      AND (
        profile.is_editor = true

        OR EXISTS (
          SELECT 1
          FROM public.stories story
          WHERE story.id =
            story_revisions.story_id
            AND story.author_id =
              auth.uid()
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles profile
    WHERE profile.id = auth.uid()
      AND (
        profile.is_editor = true

        OR EXISTS (
          SELECT 1
          FROM public.stories story
          WHERE story.id =
            story_revisions.story_id
            AND story.author_id =
              auth.uid()
        )
      )
  )
);


/*
Deleting a revision is the "Revert changes"
operation.

Authors may discard revisions on their own stories.
Editors may discard any revision.
*/
DROP POLICY IF EXISTS
  "Editorial staff can delete story revisions"
ON public.story_revisions;

CREATE POLICY
  "Editorial staff can delete story revisions"
ON public.story_revisions
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles profile
    WHERE profile.id = auth.uid()
      AND (
        profile.is_editor = true

        OR EXISTS (
          SELECT 1
          FROM public.stories story
          WHERE story.id =
            story_revisions.story_id
            AND story.author_id =
              auth.uid()
        )
      )
  )
);