/*
# West Island Times — Reader bookmarks

Creates the bookmark foundation for authenticated reader accounts.

The table is named `bookmarks` so the application can expose one reusable
bookmark service. It begins with stories because that is the only supported
public content family currently implemented.

Future migrations can add nullable foreign keys such as:

- video_id
- podcast_episode_id
- vault_item_id

This preserves database referential integrity instead of storing an
unvalidated generic content ID.
*/

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid NOT NULL
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,

  story_id uuid NOT NULL
    REFERENCES public.stories(id)
    ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT bookmarks_user_story_unique
    UNIQUE (user_id, story_id)
);


-- --------------------------------------------------
-- Indexes
-- --------------------------------------------------

CREATE INDEX IF NOT EXISTS
  bookmarks_user_created_at_idx
ON public.bookmarks(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS
  bookmarks_story_id_idx
ON public.bookmarks(story_id);


-- --------------------------------------------------
-- Row Level Security
-- --------------------------------------------------

ALTER TABLE public.bookmarks
ENABLE ROW LEVEL SECURITY;


/*
Readers can only see their own bookmarks.
*/
DROP POLICY IF EXISTS
  "Readers can view their own bookmarks"
ON public.bookmarks;

CREATE POLICY
  "Readers can view their own bookmarks"
ON public.bookmarks
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);


/*
Readers can only create bookmarks for themselves.

The application should also set user_id from the authenticated session.
This policy prevents a request from creating a bookmark for another user.
*/
DROP POLICY IF EXISTS
  "Readers can create their own bookmarks"
ON public.bookmarks;

CREATE POLICY
  "Readers can create their own bookmarks"
ON public.bookmarks
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);


/*
Removing a bookmark deletes the relationship, not the story.
Readers can only remove their own bookmarks.
*/
DROP POLICY IF EXISTS
  "Readers can delete their own bookmarks"
ON public.bookmarks;

CREATE POLICY
  "Readers can delete their own bookmarks"
ON public.bookmarks
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
);


-- No UPDATE policy is needed because bookmarks are immutable.
-- A bookmark is either created or removed.

GRANT SELECT, INSERT, DELETE
ON public.bookmarks
TO authenticated;