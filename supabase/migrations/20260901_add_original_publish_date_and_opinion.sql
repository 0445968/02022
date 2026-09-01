/*
# West Island Times editorial additions

Adds:
- originally_published_at to stories
- Opinion / Opinión editorial category

Notes:
- published_at remains the actual West Island Times publication timestamp.
- scheduled_at already exists and remains the future publication schedule.
- originally_published_at is editorial metadata for pieces that were
  first published at an earlier date or elsewhere.
*/

-- ============================================================
-- ORIGINAL PUBLICATION DATE
-- ============================================================

ALTER TABLE public.stories
ADD COLUMN IF NOT EXISTS originally_published_at timestamptz;

COMMENT ON COLUMN public.stories.originally_published_at IS
  'Optional original publication timestamp for previously published or republished material. Separate from the West Island Times published_at timestamp.';

CREATE INDEX IF NOT EXISTS stories_originally_published_at_idx
  ON public.stories (originally_published_at DESC);


-- ============================================================
-- OPINION CATEGORY
-- ============================================================

INSERT INTO public.categories (
  slug,
  name_en,
  name_es,
  description_en,
  description_es,
  active,
  sort_order
)
VALUES (
  'opinion',
  'Opinion',
  'Opinión',
  'Commentary, analysis, columns, editorials and contributed viewpoints.',
  'Comentarios, análisis, columnas, editoriales y puntos de vista de colaboradores.',
  true,
  COALESCE(
    (
      SELECT MAX(sort_order) + 1
      FROM public.categories
    ),
    0
  )
)
ON CONFLICT (slug)
DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_es = EXCLUDED.name_es,
  description_en = EXCLUDED.description_en,
  description_es = EXCLUDED.description_es,
  active = true,
  updated_at = now();