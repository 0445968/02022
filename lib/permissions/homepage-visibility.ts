export const HOME_SECTIONS=[
 ['breaking_news','Breaking news','Última hora'],['headline_bar','Headline bar','Barra de titulares'],['latest_news','Latest news','Últimas noticias'],['editors_picks',"Editors’ picks",'Selección editorial'],['podcast','Podcast','Pódcast'],['featured_content','Featured content','Contenido destacado'],['watch_live','Watch live','En directo'],['shorts','Shorts','Vídeos cortos'],['section_features','Section features','Secciones'],['across_the_islands','Across the islands','Por las islas'],['radio','Radio','Radio']
] as const;
export type HomeSection=(typeof HOME_SECTIONS)[number][0];
export type HomeVisibility=Record<HomeSection,boolean>;
export function defaultHomeVisibility(visible=true):HomeVisibility{return Object.fromEntries(HOME_SECTIONS.map(([key])=>[key,visible])) as HomeVisibility;}
export function parseHomeVisibility(raw:unknown):HomeVisibility{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid visibility');
 const x=raw as Record<string,unknown>;
 if(Object.keys(x).length!==HOME_SECTIONS.length||HOME_SECTIONS.some(([key])=>typeof x[key]!=='boolean'))throw Error('Invalid visibility');
 return Object.fromEntries(HOME_SECTIONS.map(([key])=>[key,x[key]])) as HomeVisibility;
}
export function countVisibilityChanges(draft:HomeVisibility|null,published:HomeVisibility|null){return draft&&published?HOME_SECTIONS.filter(([k])=>draft[k]!==published[k]).length:0;}
