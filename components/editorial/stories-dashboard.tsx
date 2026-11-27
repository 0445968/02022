'use client';
import {STORY_TYPES,storyTypeLabel,type StoryType} from '@/lib/permissions/story-types';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Search, ChevronLeft, ChevronRight, ImageOff, ExternalLink, Pencil, Share2, Eye, Settings2, ChevronUp, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { StoryListItem, Category, StaffOption } from '@/types/editorial';
import type { StoryStatus, StoryLanguage, IslandScope, AccessLevel } from '@/lib/db/database.types';
import { statusLabel, accessLabel, islandLabel, categoryLabel } from '@/types/editorial';
import type { Locale } from '@/types';
import {queuePresentation,type StoryQueueDisplay} from '@/lib/permissions/story-publication-queue';

interface StoriesDashboardProps {
  dict: Dictionary;
  locale?:Locale;
  publicationQueue?:StoryQueueDisplay;
  canEdit?:boolean;
  canCreate?:boolean;
  preferenceKey?:string;
  asOf:string;
  stories: StoryListItem[];
  page: number;
  totalPages: number;
  total: number;
  categories: Category[];
  authors: StaffOption[];
  storyTypesEnabled?:boolean;
  currentFilters: {
    storyType?:StoryType|'all';
    search: string;
    accessLevel?:AccessLevel|'all';
    status: StoryStatus | 'all';
    language: StoryLanguage | 'all';
    authorId: string | 'all';
    categoryId: string | 'all';
    island: IslandScope | 'all';
    sortBy: 'updated_desc' | 'updated_asc' | 'published_desc' | 'headline_asc';
  };
}

const STATUSES: (StoryStatus | 'all')[] = ['all', 'draft', 'in_review', 'scheduled', 'published', 'archived'];
const LANGUAGES: (StoryLanguage | 'all')[] = ['all', 'en', 'es'];
const ISLANDS: (IslandScope | 'all')[] = ['all', 'san_andres', 'old_providence', 'saint_catalina', 'archipelago', 'none'];
const SORT_LABELS = {updated_desc:'sortUpdatedDesc',updated_asc:'sortUpdatedAsc',published_desc:'sortPublishedDesc',headline_asc:'sortHeadlineAsc'} as const;

type ColumnKey='headline'|'status'|'draft'|'queue'|'language'|'author'|'editor'|'category'|'updated'|'published'|'access'|'island'|'slug'|'short'|'type'|'actions';
const ALL_COLUMNS:ColumnKey[]=['headline','status','draft','queue','language','author','editor','category','updated','published','access','island','slug','short','type','actions'];
type ColumnPrefs={order:ColumnKey[];hidden:ColumnKey[]};
const DEFAULT_PREFS:ColumnPrefs={order:ALL_COLUMNS,hidden:['published','access','island','slug','short']};
function parsePrefs(value:unknown):ColumnPrefs{
 if(!value||typeof value!=='object')return DEFAULT_PREFS;
 const v=value as Partial<ColumnPrefs>;
 const order=Array.isArray(v.order)?v.order.filter(k=>ALL_COLUMNS.includes(k)):ALL_COLUMNS;
 const hidden=Array.isArray(v.hidden)?v.hidden.filter(k=>ALL_COLUMNS.includes(k)&&k!=='headline'&&k!=='actions'):DEFAULT_PREFS.hidden;
 return {order:[...new Set([...order,...ALL_COLUMNS])],hidden:[...new Set(hidden)]};
}
export function StoriesDashboard({ storyTypesEnabled=false, dict, locale='en', publicationQueue=null, canEdit=true, canCreate=true, preferenceKey='local', asOf, stories, page, totalPages, total, categories, authors, currentFilters }: StoriesDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(currentFilters.search);
  const [pending,startTransition]=useTransition();
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [notice,setNotice]=useState('');
  const [prefs,setPrefs]=useState<ColumnPrefs>(DEFAULT_PREFS);
  const prefStorage='ct-stories-columns-v1:'+preferenceKey;
  useEffect(()=>{const handle=setTimeout(()=>{try{const raw=localStorage.getItem(prefStorage);setPrefs(raw?parsePrefs(JSON.parse(raw)):DEFAULT_PREFS);}catch{setPrefs(DEFAULT_PREFS);}},0);return()=>clearTimeout(handle);},[prefStorage]);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  function savePrefs(next:ColumnPrefs){setPrefs(next);try{localStorage.setItem(prefStorage,JSON.stringify(next));}catch{/* current session */}}
  const hasFilters=!!currentFilters.search||[currentFilters.status,currentFilters.language,currentFilters.authorId,currentFilters.categoryId,currentFilters.island,currentFilters.accessLevel??'all',currentFilters.storyType??'all'].some(v=>v!=='all')||currentFilters.sortBy!=='updated_desc';
  const es=locale==='es';
  const queuePage=publicationQueue&&publicationQueue!=='unavailable'?publicationQueue:null;
  const queues=new Map(queuePage?.items.map(i=>[i.storyId.toLowerCase(),i] as const)??[]);
  const queueLabels={legacy:es?'Programación anterior sin verificar':'Unverified legacy schedule',blocked:es?'Publicación bloqueada':'Publication blocked',stale:es?'Revisión desactualizada':'Review out of date',due:es?'Pendiente de ejecución':'Due / awaiting execution',queued:es?'Programado (en cola)':'Scheduled (queued)'};
  const queueDate=new Intl.DateTimeFormat(locale,{timeZone:'America/Bogota',dateStyle:'medium',timeStyle:'short'});

  const columns=prefs.order.filter(k=>!prefs.hidden.includes(k)&&(k!=='queue'||publicationQueue!==null)&&(k!=='type'||storyTypesEnabled));
  const labels:Record<ColumnKey,string>={headline:dict.stories.columns.headline,status:dict.stories.columns.status,draft:dict.stories.columns.unpublishedChanges,queue:es?'Cola de publicación':'Publication queue',language:dict.stories.columns.language,author:dict.stories.columns.author,editor:dict.stories.columns.editor,category:dict.stories.columns.category,updated:dict.stories.columns.updated,published:es?'Publicado':'Published',access:es?'Acceso':'Access',island:dict.stories.filterIsland,slug:'Slug',short:es?'Título corto':'Short title',type:es?'Tipo de artículo':'Story type',actions:es?'Acciones':'Actions'};
  function updateFilter(key:string,value:string,replace=false){
    if(timer.current){clearTimeout(timer.current);timer.current=null;}
    const params=new URLSearchParams(searchParams.toString());
    if(key!=='search'&&searchInput!==currentFilters.search){if(searchInput.trim())params.set('search',searchInput.trim());else params.delete('search');}
    if(value==='all'||!value)params.delete(key);else params.set(key,value);
    if(key!=='page')params.delete('page');
    const url='/newsroom/stories?'+params.toString();
    startTransition(()=>{if(replace)router.replace(url,{scroll:false});else router.push(url,{scroll:false});});
  }
  function handleSearch(e:React.FormEvent){e.preventDefault();updateFilter('search',searchInput.trim(),true);}
  function changeSearch(value:string){
    setSearchInput(value);
    if(timer.current)clearTimeout(timer.current);
    timer.current=setTimeout(()=>updateFilter('search',value.trim(),true),300);
  }
  function moveColumn(k:ColumnKey,delta:number){const order=[...prefs.order],at=order.indexOf(k),to=at+delta;if(to<0||to>=order.length)return;[order[at],order[to]]=[order[to],order[at]];savePrefs({...prefs,order});}
  function livePath(s:StoryListItem){return s.status==='published'&&s.publishedAt&&Date.parse(s.publishedAt)<=Date.parse(asOf)?'/'+s.language+'/article/'+encodeURIComponent(s.slug):null;}
  async function share(s:StoryListItem){const path=livePath(s);if(!path)return;const url=new URL(path,window.location.origin).href;try{if(navigator.share)await navigator.share({title:s.headline,url});else{await navigator.clipboard.writeText(url);setNotice(es?'Enlace copiado.':'Link copied.');}}catch(e){if(!(e instanceof DOMException&&e.name==='AbortError'))setNotice(es?'No se pudo compartir.':'Unable to share.');}}
  const iconButton='inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-white text-muted-foreground hover:text-primary hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40';
  function cell(k:ColumnKey,story:StoryListItem){
   const queue=queues.get(story.id.toLowerCase()),state=queue&&queuePage?queuePresentation(queue,queuePage.asOf):null;
   const date=(v:string|null)=>v?new Date(v).toLocaleDateString(locale,{month:'short',day:'numeric',year:'numeric'}):'—';
   switch(k){
    case 'headline':return <div className="flex min-w-[12rem] items-center gap-2">{story.featuredImageUrl?<Image src={story.featuredImageUrl} alt={story.featuredImageAlt||story.headline||dict.stories.imageFallbackAlt} width={56} height={40} unoptimized loading="lazy" className="h-10 w-14 shrink-0 rounded-md border border-border object-cover"/>:<span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-md border border-border bg-surface-muted" title={dict.stories.noFeaturedImage}><ImageOff className="h-4 w-4 text-muted-foreground" aria-hidden/><span className="sr-only">{dict.stories.noFeaturedImage}</span></span>}<Link href={'/newsroom/stories/'+story.id+(canEdit?'/edit':'/preview')} className="font-medium text-deep hover:text-primary focus-visible:underline">{story.headline||'(untitled)'}</Link></div>;
    case 'status':return <StatusBadge status={story.status} locale={locale}/>;
    case 'draft':return story.hasUnpublishedChanges?<span className="inline-flex rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary" title={story.unpublishedChangesUpdatedAt?new Date(story.unpublishedChangesUpdatedAt).toLocaleString():undefined}>{dict.stories.activeDraft}</span>:<span className="text-xs text-muted-foreground">{dict.stories.noUnpublishedChanges}</span>;
    case 'queue':return queue&&state?<div className="space-y-1"><span className="inline-flex rounded-md border border-border bg-surface-muted px-2 py-0.5 text-xs font-semibold text-deep">{queue.source==='revision'?(es?'Cambios: ':'Revision: '):''}{queueLabels[state]}</span>{queue.dueAt&&<p className="text-xs text-muted-foreground">{queueDate.format(new Date(queue.dueAt))}</p>}{queue.snapshotCurrent===false&&state==='blocked'&&<p className="text-xs text-muted-foreground">{queueLabels.stale}</p>}</div>:<span className="text-xs text-muted-foreground">{publicationQueue==='unavailable'?(es?'Sin verificar':'Unverified'):'—'}</span>;
    case 'language':return <span className="font-semibold uppercase text-muted-foreground">{story.language}</span>;
    case 'author':return story.authorName??'—';
    case 'editor':return story.editorName??'—';
    case 'category':return (es?story.primaryCategoryNameEs:story.primaryCategoryNameEn)??'—';
    case 'updated':return date(story.updatedAt);
    case 'published':return date(story.publishedAt);
    case 'access':return accessLabel(story.accessLevel,locale);
    case 'island':return islandLabel(story.island,locale);
    case 'slug':return story.slug;
    case 'short':return story.shortTitle??'—';
    case 'type':return story.storyType?storyTypeLabel(story.storyType,locale):'—';
    case 'actions':{const path=livePath(story);return <div className="flex items-center gap-1">{path&&<><Link href={path} target="_blank" rel="noopener noreferrer" title={es?'Abrir artículo publicado':'Open live article'} aria-label={es?'Abrir artículo publicado':'Open live article'} className={iconButton}><ExternalLink size={15}/></Link><button type="button" onClick={()=>void share(story)} title={es?'Compartir':'Share article'} aria-label={es?'Compartir artículo':'Share article'} className={iconButton}><Share2 size={15}/></button></>}{canEdit&&<Link href={'/newsroom/stories/'+story.id+'/edit'} title={es?'Editar':'Edit article'} aria-label={es?'Editar artículo':'Edit article'} className={iconButton}><Pencil size={15}/></Link>}<Link href={'/newsroom/stories/'+story.id+'/preview'} title={es?'Vista previa':'Preview'} aria-label={es?'Vista previa':'Preview'} className={iconButton}><Eye size={15}/></Link></div>;}
   }
  }
  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    router.push(`/newsroom/stories?${params.toString()}`);
  }

  return (
    <div className="mt-3 min-w-0" aria-busy={pending}>
      {/* Filters bar */}
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-white p-3 2xl:flex-row 2xl:items-end">
        <form onSubmit={handleSearch} className="flex min-w-0 flex-1 items-center gap-2">
          <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => changeSearch(e.target.value)}
            maxLength={160}
            placeholder={dict.stories.searchPlaceholder}
            className="h-9 w-full rounded-md border border-border bg-white pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={dict.common.search}
          />
          </div>
          <button type="submit" className="h-9 shrink-0 rounded-md border border-border bg-white px-3 text-xs font-medium text-foreground hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{dict.common.search}</button>
        </form>

        <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:flex xl:flex-wrap xl:items-end">
          <FilterSelect
            label={dict.stories.filterStatus}
            value={currentFilters.status}
            onChange={(v) => updateFilter('status', v)}
            options={STATUSES.map((s) => ({ value: s, label: s === 'all' ? dict.common.all : statusLabel(s, locale) }))}
          />
          <FilterSelect
            label={dict.stories.filterLanguage}
            value={currentFilters.language}
            onChange={(v) => updateFilter('language', v)}
            options={LANGUAGES.map((l) => ({ value: l, label: l === 'all' ? dict.common.all : l === 'en' ? dict.common.languageEN : dict.common.languageES }))}
          />
          <FilterSelect
            label={dict.stories.filterAuthor}
            value={currentFilters.authorId}
            onChange={(v) => updateFilter('author', v)}
            options={[
              { value: 'all', label: dict.common.all },
              ...authors.map((a) => ({ value: a.id, label: a.name })),
            ]}
          />
          <FilterSelect
            label={dict.stories.filterCategory}
            value={currentFilters.categoryId}
            onChange={(v) => updateFilter('category', v)}
            options={[
              { value: 'all', label: dict.common.all },
              ...categories.map((c) => ({ value: c.id, label: categoryLabel(c, locale) })),
            ]}
          />
          <FilterSelect
            label={dict.stories.filterIsland}
            value={currentFilters.island}
            onChange={(v) => updateFilter('island', v)}
            options={ISLANDS.map((i) => ({ value: i, label: i === 'all' ? dict.common.all : islandLabel(i, locale) }))}
          />
          <FilterSelect
            label={dict.stories.sortBy}
            value={currentFilters.sortBy}
            onChange={(v) => updateFilter('sort', v)}
            options={Object.entries(SORT_LABELS).map(([value,key])=>({value,label:dict.stories[key]}))}
          />
          <FilterSelect label={es?'Acceso':'Access'} value={currentFilters.accessLevel??'all'} onChange={v=>updateFilter('access',v)} options={[{value:'all',label:dict.common.all},...(['public','registered','subscriber','premium'] as const).map(v=>({value:v,label:accessLabel(v,locale)}))]}/>
          {storyTypesEnabled&&<FilterSelect label={es?'Tipo de artículo':'Story type'} value={currentFilters.storyType??'all'} onChange={v=>updateFilter('storyType',v)} options={[{value:'all',label:dict.common.all},...STORY_TYPES.map(([value,en,spanish])=>({value,label:es?spanish:en}))]}/>}
          <button type="button" onClick={()=>setSettingsOpen(v=>!v)} aria-expanded={settingsOpen} className="inline-flex h-9 items-center gap-2 self-end rounded-md border border-border px-3 text-xs font-medium"><Settings2 size={15}/>{es?'Columnas':'Columns'}</button>
          {hasFilters&&<button type="button" onClick={()=>{if(timer.current)clearTimeout(timer.current);setSearchInput('');router.push('/newsroom/stories');}} className="h-9 self-end border border-border bg-white px-3 text-xs font-medium text-foreground hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{es?'Limpiar filtros':'Clear filters'}</button>}
        </div>
      </div>

      {publicationQueue!==null&&<p className="mt-3 text-xs text-muted-foreground">{es?'El filtro de estado usa el estado guardado del artículo. La cola se muestra por separado según sus permisos; un guion no confirma que no haya una programación.':'The status filter uses the stored article status. Queue information is shown separately according to your permissions; a dash does not confirm that no schedule exists.'} {es?'La cola no garantiza la publicación automática.':'A queue does not guarantee automatic publication.'} · America/Bogota</p>}
      {publicationQueue==='unavailable'&&<p role="alert" className="mt-2 text-xs text-muted-foreground">{es?'No se pudo verificar la cola. Actualice la página.':'Unable to verify the publication queue. Refresh the page.'}</p>}
      {settingsOpen&&<section className="mt-3 rounded-xl border border-border bg-white p-3" aria-label={es?'Configuración de columnas':'Column settings'}><div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">{es?'Organizar columnas':'Organize columns'}</h2><button type="button" className="text-xs text-primary underline" onClick={()=>savePrefs(DEFAULT_PREFS)}>{es?'Restablecer':'Reset defaults'}</button></div><div className="mt-2 grid gap-1 sm:grid-cols-2 xl:grid-cols-3">{prefs.order.filter(k=>(k!=='queue'||publicationQueue!==null)&&(k!=='type'||storyTypesEnabled)).map(k=><div key={k} className="flex min-w-0 items-center gap-2 rounded-md border border-border px-2 py-1"><label className="flex min-w-0 flex-1 items-center gap-2 text-xs"><input type="checkbox" checked={!prefs.hidden.includes(k)} disabled={k==='headline'||k==='actions'} onChange={e=>savePrefs({...prefs,hidden:e.target.checked?prefs.hidden.filter(v=>v!==k):[...prefs.hidden,k]})}/>{labels[k]}</label><button type="button" className={iconButton} disabled={prefs.order.indexOf(k)===0} aria-label={(es?'Subir ':'Move up ')+labels[k]} onClick={()=>moveColumn(k,-1)}><ChevronUp size={14}/></button><button type="button" className={iconButton} disabled={prefs.order.indexOf(k)===prefs.order.length-1} aria-label={(es?'Bajar ':'Move down ')+labels[k]} onClick={()=>moveColumn(k,1)}><ChevronDown size={14}/></button></div>)}</div><p className="mt-2 text-xs text-muted-foreground">{es?'Las preferencias se guardan en este navegador.':'Preferences are saved in this browser.'}</p></section>}
      <p role="status" className="text-xs text-muted-foreground">{notice|| (pending?(es?'Buscando…':'Updating results…'):'')}</p>
      <div role="region" aria-label={es?'Lista de artículos':'Story list'} tabIndex={0} className="mt-3 max-w-full overflow-x-auto rounded-xl border border-border bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
       <table className="w-full text-sm"><thead><tr className="border-b border-border bg-surface-muted text-left">{columns.map(k=><th key={k} scope="col" className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{labels[k]}</th>)}</tr></thead>
       <tbody>{stories.length===0?<tr><td colSpan={columns.length} className="px-4 py-10 text-center"><p className="font-headline text-lg font-semibold text-deep">{dict.stories.noStories}</p>{canCreate&&<><p className="mt-1 text-sm text-muted-foreground">{dict.stories.noStoriesDesc}</p><Link href="/newsroom/stories/new" className="mt-4 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-semibold text-white">{dict.stories.createFirst}</Link></>}</td></tr>:stories.map(s=><tr key={s.id} className="border-b border-border/60 hover:bg-surface-muted/50">{columns.map(k=><td key={k} className={'px-3 py-2 '+(k==='headline'?'':'text-xs text-muted-foreground whitespace-nowrap')}>{cell(k,s)}</td>)}</tr>)}</tbody></table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {dict.pagination.page.replace('{page}', String(page)).replace('{total}', String(totalPages))}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-white px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
              {dict.pagination.previous}
            </button>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-white px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {dict.pagination.next}
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex min-w-0 max-w-full flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full min-w-0 max-w-full rounded-md border border-border bg-white pl-2 pr-8 text-xs font-medium text-foreground focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusBadge({ status, locale }: { status: StoryStatus; locale: Locale }) {
  const colors: Record<StoryStatus, string> = {
    draft: 'bg-surface-muted text-foreground border-border',
    in_review: 'bg-highlight/20 text-deep border-highlight/40',
    scheduled: 'bg-primary/10 text-primary border-primary/30',
    published: 'bg-live/10 text-live border-live/30',
    archived: 'bg-surface-subtle text-muted-foreground border-border',
  };
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${colors[status]}`}>
      {statusLabel(status, locale)}
    </span>
  );
}
