/*
# Homepage taxonomy and story uniqueness

Adds the complete initial editorial category set and guarantees that one
story cannot occupy more than one active curated homepage placement.
*/

INSERT INTO public.categories (
  slug,
  name_en,
  name_es,
  description_en,
  description_es,
  active,
  sort_order
)
VALUES
  ('news', 'News', 'Noticias', 'Breaking and general news.', 'Noticias de última hora y noticias generales.', true, 0),
  ('raizal', 'Raizal', 'Raizal', 'Raizal people, identity and public life.', 'Pueblo raizal, identidad y vida pública.', true, 1),
  ('environment', 'Environment', 'Medio ambiente', 'The islands, climate and conservation.', 'Las islas, el clima y la conservación.', true, 2),
  ('politics', 'Politics', 'Política', 'Government, policy and public affairs.', 'Gobierno, políticas y asuntos públicos.', true, 3),
  ('business', 'Business', 'Economía', 'Business, jobs and the island economy.', 'Empresas, empleo y economía de las islas.', true, 4),
  ('sports', 'Sports', 'Deportes', 'Local, regional and international sports.', 'Deportes locales, regionales e internacionales.', true, 5),
  ('health', 'Health', 'Salud', 'Health, medicine and public wellbeing.', 'Salud, medicina y bienestar público.', true, 6),
  ('culture', 'Culture', 'Cultura', 'Arts, heritage, food and island life.', 'Arte, patrimonio, gastronomía y vida isleña.', true, 7),
  ('religion', 'Religion', 'Religión', 'Faith communities and religious life.', 'Comunidades de fe y vida religiosa.', true, 8),
  ('music', 'Music', 'Música', 'Artists, releases and island sound.', 'Artistas, lanzamientos y sonidos de las islas.', true, 9),
  ('opinion', 'Opinion', 'Opinión', 'Commentary, analysis and editorials.', 'Comentarios, análisis y editoriales.', true, 10),
  ('world', 'World', 'Mundo', 'International news and global affairs.', 'Noticias internacionales y asuntos mundiales.', true, 11),
  ('community', 'Community', 'Comunidad', 'People, neighborhoods and community initiatives.', 'Personas, barrios e iniciativas comunitarias.', true, 12),
  ('education', 'Education', 'Educación', 'Schools, students and learning.', 'Escuelas, estudiantes y aprendizaje.', true, 13),
  ('entertainment', 'Entertainment', 'Entretenimiento', 'Film, television, personalities and popular culture.', 'Cine, televisión, personalidades y cultura popular.', true, 14),
  ('travel', 'Travel', 'Viajes', 'Travel guidance and destinations beyond the islands.', 'Guías de viaje y destinos fuera de las islas.', true, 15),
  ('tourism', 'Tourism', 'Turismo', 'Tourism policy, industry and island visitors.', 'Política turística, industria y visitantes de las islas.', true, 16),
  ('wellness', 'Wellness', 'Bienestar', 'Lifestyle, fitness and personal wellbeing.', 'Estilo de vida, actividad física y bienestar personal.', true, 17),
  ('events', 'Events', 'Eventos', 'Festivals, gatherings and public events.', 'Festivales, encuentros y eventos públicos.', true, 18)
ON CONFLICT (slug)
DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_es = EXCLUDED.name_es,
  description_en = EXCLUDED.description_en,
  description_es = EXCLUDED.description_es,
  active = true,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

/* Keep the most prominent active placement when old data contains repeats. */
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY story_id
      ORDER BY
        CASE slot
          WHEN 'lead' THEN 0
          WHEN 'top_left' THEN 1
          WHEN 'top_right' THEN 2
          WHEN 'secondary' THEN 3
          WHEN 'editors_pick' THEN 4
          WHEN 'latest_feature' THEN 5
          WHEN 'video_feature' THEN 6
          WHEN 'section_feature' THEN 7
          ELSE 8
        END,
        position,
        updated_at DESC
    ) AS placement_rank
  FROM public.homepage_slots
  WHERE active = true
)
UPDATE public.homepage_slots AS homepage_slot
SET active = false
FROM ranked
WHERE homepage_slot.id = ranked.id
  AND ranked.placement_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS homepage_slots_unique_active_story_idx
  ON public.homepage_slots (story_id)
  WHERE active = true;
