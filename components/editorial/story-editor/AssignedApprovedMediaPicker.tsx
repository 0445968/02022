'use client';
import {useEffect,useState} from 'react';
import {X} from 'lucide-react';
import {parseApprovedMediaPage,type ApprovedImageNode,type ApprovedMediaPage} from '@/lib/permissions/assigned-media-contract';
import type {Locale} from '@/types';
export type AssignedMediaPickerContext={storyId:string;revision:boolean;locale:Locale};
const btn='rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-surface-muted disabled:opacity-50';
export function AssignedApprovedMediaPicker({context,onClose,onSelect}:{context:AssignedMediaPickerContext;onClose:()=>void;onSelect:(node:ApprovedImageNode)=>void}){
 const {storyId,revision,locale}=context,es=locale==='es';
 const [page,setPage]=useState(0),[data,setData]=useState<ApprovedMediaPage|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();setData(null);setError(false);
  fetch('/api/newsroom/contributor/stories/'+storyId+'/approved-media?mode='+(revision?'revision':'draft')+'&page='+page,{cache:'no-store',signal:controller.signal})
    .then(async response=>{if(!response.ok)throw Error();return parseApprovedMediaPage(await response.json());})
    .then(result=>{if(!controller.signal.aborted)setData(result);})
    .catch(()=>{if(!controller.signal.aborted)setError(true);});
  return()=>controller.abort();
 },[storyId,revision,page,retry]);
 useEffect(()=>{
  const close=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();};
  window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);
 },[onClose]);
 return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="approved-media-title">
  <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-white shadow-xl">
   <header className="flex items-start gap-3 border-b border-border p-4">
    <div className="flex-1"><h2 id="approved-media-title" className="font-headline text-lg font-bold text-deep">{es?'Imágenes aprobadas':'Approved images'}</h2>
    <p className="mt-1 text-sm text-muted-foreground">{es?'Solo imágenes autorizadas para reutilización. El crédito y el texto alternativo se conservan.':'Only images cleared for reuse. Credit and alternative text are preserved.'}</p></div>
    <button type="button" autoFocus className="rounded-md p-2 hover:bg-surface-muted" onClick={onClose} aria-label={es?'Cerrar':'Close'}><X className="h-5 w-5"/></button>
   </header>
   <div className="min-h-0 flex-1 overflow-auto p-4">
    {error?<div role="alert" className="space-y-3 text-sm">{es?'No se pudieron cargar las imágenes.':'Unable to load approved images.'}<button type="button" className={btn} onClick={()=>setRetry(x=>x+1)}>{es?'Reintentar':'Retry'}</button></div>:
      !data?<p role="status" className="text-sm text-muted-foreground">{es?'Cargando…':'Loading…'}</p>:
      !data.items.length?<p className="text-sm text-muted-foreground">{es?'No hay imágenes autorizadas en esta página. Solicite al equipo editorial la revisión de sus archivos privados.':'No cleared images on this page. Ask the editorial team to review your private uploads.'}</p>:
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">{data.items.map(node=><li key={node.attrs.mediaAssetId}>
       <button type="button" onClick={()=>onSelect(node)} className="w-full overflow-hidden rounded-lg border border-border text-left hover:border-primary">
        {/* Existing approved public bucket, never a signed/private URL. */}
        <img src={node.attrs.src} alt={node.attrs.alt} loading="lazy" referrerPolicy="no-referrer" className="aspect-[4/3] w-full bg-surface-muted object-cover"/>
        <span className="block break-words p-2 text-xs">{node.attrs.alt||node.attrs.description||(es?'Imagen decorativa':'Decorative image')}{node.attrs.credit&&<span className="mt-1 block text-muted-foreground">{node.attrs.credit}</span>}</span>
       </button></li>)}</ul>}
   </div>
   <footer className="flex items-center justify-between gap-3 border-t border-border p-3">
    <button type="button" className={btn} disabled={page===0||!data&&!error} onClick={()=>setPage(n=>Math.max(0,n-1))}>{es?'Anterior':'Previous'}</button>
    <span className="text-xs text-muted-foreground">{es?'Página':'Page'} {page+1}</span>
    <button type="button" className={btn} disabled={!data?.hasMore} onClick={()=>setPage(n=>n+1)}>{es?'Siguiente':'Next'}</button>
   </footer>
  </div>
 </div>;
}
