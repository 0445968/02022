'use client';
import {useEffect,useState} from 'react';
import type {Locale} from '@/types';
import {parseVersionedLayout,type VersionedLayout} from '@/lib/permissions/homepage-history-contract';
export function LayoutHistoryPanel({locale,onRestore}:{locale:Locale;onRestore:(revision:number)=>Promise<void>}){
 const es=locale==='es';const [state,setState]=useState<VersionedLayout|null>(null),[error,setError]=useState(false),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;fetch('/api/front-page/history',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error();const s=parseVersionedLayout(await r.json());if(active)setState(s);}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[]);
 async function restore(revision:number){if(busy||!window.confirm(es?'¿Restaurar esta versión como borrador sin publicar?':'Restore this version as an unpublished draft?'))return;setBusy(true);try{await onRestore(revision);}catch{setError(true);}finally{setBusy(false);}}
 return <div className="mt-3 space-y-3"><p className="text-xs text-muted-foreground">{es?'Últimas 20 versiones. Restaurar solo modifica el borrador; publicar es una acción separada.':'Latest 20 versions. Restore changes only the draft; publishing is a separate action.'}</p>
 {error?<p role="alert" className="text-sm text-breaking">{es?'No disponible. Actualice la página.':'Unavailable. Refresh the page.'}</p>:!state?<p className="text-sm">{es?'Cargando…':'Loading…'}</p>:!state.history.length?<p className="text-sm">{es?'No hay versiones registradas.':'No recorded versions yet.'}</p>:<ul className="max-h-72 space-y-2 overflow-auto">{state.history.map(h=><li key={h.revision} className="rounded border border-border p-2 text-xs"><p className="font-semibold">{h.baseline?(es?'Diseño inicial capturado':'Captured initial layout'):(es?'Versión ':'Version ')+h.revision}</p><p>{new Date(h.publishedAt).toLocaleString(locale,{timeZone:'America/Bogota'})} · Bogotá · {h.slotCount}</p><button type="button" disabled={busy||state.legacyBlocked||error} onClick={()=>void restore(h.revision)} className="mt-1 text-primary underline disabled:opacity-50">{es?'Restaurar como borrador':'Restore as draft'}</button></li>)}</ul>}
 </div>;
}
