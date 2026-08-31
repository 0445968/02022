/*
# Create profiles table for Simply Raizal

## Purpose
Establish the user profile layer for the Simply Raizal digital media platform.
A `profiles` row mirrors each Supabase auth user and stores the editorial role
flags (author / editor) and the preferred interface locale. This table is the
single source of truth for application-level user attributes; authentication
itself is handled by Supabase Auth (`auth.users`).

## New tables
- `profiles`
  - `id` (uuid, primary key) — references `auth.users(id)`. One row per auth user.
  - `name` (text) — display name shown publicly and in the newsroom.
  - `email` (text) — convenience copy of the auth email for fast lookups.
  - `email_verified` (timestamptz, nullable) — when email confirmation happened.
  - `image` (text, nullable) — avatar / profile image URL.
  - `is_author` (boolean, default false) — whether the user may author stories.
  - `is_editor` (boolean, default false) — whether the user may manage editorial content.
  - `editorial_title` (text, nullable) — public editorial title (e.g. "Executive Editor").
  - `preferred_locale` (text, default 'en') — interface language preference ('en' | 'es').
  - `created_at` (timestamptz, default now()).
  - `updated_at` (timestamptz, default now(), refreshed by trigger).

## Automation
- A trigger automatically creates a `profiles` row whenever a new auth user signs up,
  copying `email` from `auth.users`. Role flags default to false.
- An `update_profile_updated_at()` trigger refreshes `updated_at` on every row update.

## Security (RLS)
- Enable RLS on `profiles`.
- A user can read their own profile (`auth.uid() = id`).
- A user can update their own profile — but ONLY non-sensitive columns. The columns
  `is_author`, `is_editor`, and `editorial_title` are restricted: a plain UPDATE policy
  would let a user grant themselves editor status. Instead those columns are writable
  only through the service role (admin path). The user-facing UPDATE policy uses a
  `WITH CHECK` that rejects any change to those three columns by requiring them to be
  unchanged from the existing row.
- All other access is denied by default (no anon policy, no cross-user access).

## Notes
1. Peter Bent Archbold is seeded by a separate data step (the seed script), which uses
   the service role to set is_author = true, is_editor = true, editorial_title =
   'Executive Editor'.
2. `preferred_locale` is constrained to 'en' or 'es'. Add locales here when extending.
3. Email confirmation is OFF for this project (Supabase default for Bolt projects).
*/

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  email text,
  email_verified timestamptz,
  image text,
  is_author boolean NOT NULL DEFAULT false,
  is_editor boolean NOT NULL DEFAULT false,
  editorial_title text,
  preferred_locale text NOT NULL DEFAULT 'en' CHECK (preferred_locale IN ('en', 'es')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Index for email lookups (e.g. seed / admin operations)
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (email);

-- ------------------------------------------------------------------
-- Auto-create a profile row on signup
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, email_verified)
  VALUES (NEW.id, NEW.email, NEW.email_confirmed_at)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------
-- Refresh updated_at on profile updates
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_profile_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_updated_at();

-- ------------------------------------------------------------------
-- RLS policies
-- ------------------------------------------------------------------

-- A user can read their own profile.
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- A user can update their own profile, EXCEPT the sensitive role columns.
-- The WITH CHECK rejects any UPDATE that changes is_author, is_editor, or
-- editorial_title by requiring the new values to equal the existing row values.
-- (Columns omitted from a SET clause keep their old value, so this passes for
-- ordinary profile edits that do not touch those columns.)
DROP POLICY IF EXISTS "profiles_update_own_non_sensitive" ON public.profiles;
CREATE POLICY "profiles_update_own_non_sensitive"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_author = (
      SELECT p.is_author FROM public.profiles p WHERE p.id = auth.uid()
    )
    AND is_editor = (
      SELECT p.is_editor FROM public.profiles p WHERE p.id = auth.uid()
    )
    AND COALESCE(editorial_title, '') = COALESCE((
      SELECT p.editorial_title FROM public.profiles p WHERE p.id = auth.uid()
    ), '')
  );

-- No INSERT / DELETE policy for users: profiles are created by the signup
-- trigger and deleted by the auth.users cascade. Admin operations use the
-- service role, which bypasses RLS.
