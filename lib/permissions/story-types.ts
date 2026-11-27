// CT16 editorial format catalog, independent of status, category and locale.
export const STORY_TYPES = [
  [
    "news_report",
    "News report",
    "Noticia"
  ],
  [
    "video_story",
    "Video story",
    "Reportaje en video"
  ],
  [
    "press_release",
    "Press release",
    "Comunicado de prensa"
  ],
  [
    "breaking_news",
    "Breaking news",
    "Última hora"
  ],
  [
    "qa",
    "Q&A",
    "Preguntas y respuestas"
  ],
  [
    "editorial",
    "Editorial",
    "Editorial"
  ],
  [
    "profile",
    "Profile",
    "Perfil"
  ],
  [
    "column",
    "Column",
    "Columna"
  ],
  [
    "review",
    "Review",
    "Reseña"
  ],
  [
    "investigative",
    "Investigative",
    "Investigación"
  ],
  [
    "service_journalism",
    "Service journalism",
    "Periodismo de servicio"
  ],
  [
    "listicle_roundup",
    "Listicle / Roundup",
    "Lista / Recopilación"
  ],
  [
    "case_study",
    "Case study",
    "Estudio de caso"
  ],
  [
    "annual_impact_report",
    "Annual / Impact report",
    "Informe anual / de impacto"
  ],
  [
    "correction_clarification",
    "Correction / Clarification",
    "Corrección / Aclaración"
  ],
  [
    "letter_to_editor",
    "Letter to the editor",
    "Carta al editor"
  ],
  [
    "obituary",
    "Obituary",
    "Obituario"
  ],
  [
    "explainer",
    "Explainer",
    "Explicativo"
  ],
  [
    "analysis",
    "Analysis",
    "Análisis"
  ],
  [
    "opinion",
    "Opinion",
    "Opinión"
  ],
  [
    "interview",
    "Interview",
    "Entrevista"
  ],
  [
    "photo_essay",
    "Photo essay",
    "Ensayo fotográfico"
  ],
  [
    "live_blog",
    "Live blog",
    "En directo"
  ],
  [
    "data_journalism",
    "Data journalism",
    "Periodismo de datos"
  ],
  [
    "fact_check",
    "Fact check",
    "Verificación de hechos"
  ],
  [
    "podcast_audio",
    "Podcast / Audio",
    "Pódcast / Audio"
  ],
  [
    "timeline",
    "Timeline",
    "Cronología"
  ],
  [
    "announcement",
    "Announcement",
    "Anuncio"
  ]
] as const;
export type StoryType = typeof STORY_TYPES[number][0];
export const DEFAULT_STORY_TYPE: StoryType = 'news_report';
export function isStoryType(value:unknown):value is StoryType {
 return typeof value==='string' && STORY_TYPES.some(([key])=>key===value);
}
export function storyTypeLabel(value:StoryType,locale:'en'|'es'):string {
 const entry=STORY_TYPES.find(([key])=>key===value);
 if(!entry)throw new Error('Unknown story type');
 return entry[locale==='es'?2:1];
}
