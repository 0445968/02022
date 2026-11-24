'use client';
import {useState,useRef} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import type {Locale} from '@/types';
import {parseFeedbackReceipt,type InboxPage,type InboxMode} from '@/lib/permissions/review-inbox-contract';
const btn='rounded-md border border-border bg-white px-3 py-2 text-sm font-medium hover:bg-surface-muted disabled:opacity-50';
export function ReviewInbox({state,mode,page,locale}:{state:InboxPage;mode:InboxMode;page:number;locale:Locale}){
 const es=locale==='es',router=useRouter();
 const [busy,setBusy]=useState<string|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const inFlight=useRef(false);
 const href=(m:InboxMode,p=0)=>'/newsroom/reviews?mode='+m+'&page='+p;
 const labels:Record<InboxMode,string>=es?{pending:'Pendientes',feedback:'Mis comentarios',unread:'No leídos'}:{pending:'Pending reviews',feedback:'My feedback',unread:'Unread feedback'};
 const decisions:Record<string,string>=es?{approved:'Aprobado',changes_requested:'Cambios solicitados',rejected:'Rechazado'}:{approved:'Approved',changes_requested:'Changes requested',rejected:'Rejected'};
 async function acknowledge(id:string){
  if(inFlight.current)return;
  inFlight.current=true;setBusy(id);setError('');setNotice('');
  try{
   const r=await fetch('/api/newsroom/reviews',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:id})});
   if(!r.ok)throw Error();
   parseFeedbackReceipt(await r.json(),id);
   setNotice(es?'Marcado como leído.':'Marked as read.');router.refresh();
  }catch{setError(es?'No se pudo confirmar. Actualice antes de reintentar.':'Unable to confirm. Refresh before retrying.');}
  finally{inFlight.current=false;setBusy(null);}
 }
 return <div className="mx-auto max-w-5xl space-y-5 px-6 py-8">
  <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4"><div>
   <h1 className="font-headline text-2xl font-bold text-deep">{es?'Bandeja editorial':'Review inbox'}</h1>
   <p className="mt-1 text-sm text-muted-foreground">{es?'Solicitudes vigentes y decisiones sobre sus propias solicitudes, según sus permisos actuales.':'Current review requests and decisions on your own requests, subject to your current permissions.'}</p></div>
   <button type="button" className={btn} disabled={!!busy} onClick={()=>router.refresh()}>{es?'Actualizar':'Refresh'}</button>
  </header>
  <nav className="flex flex-wrap gap-2" aria-label={es?'Filtros de revisión':'Review filters'}>
   {(['pending','feedback','unread'] as const).map(m=><Link key={m} href={href(m)} prefetch={false} aria-current={mode===m?'page':undefined} className={mode===m?'rounded-md bg-deep px-3 py-2 text-sm font-semibold text-white':btn}>{labels[m]}</Link>)}
  </nav>
  {error&&<p role="alert" className="text-sm text-breaking">{error}</p>}{notice&&<p role="status" className="text-sm">{notice}</p>}
  <section className="space-y-3 rounded-lg border border-border bg-white p-4">
   <h2 className="font-semibold">{labels[mode]}</h2>
   {mode!=='pending'&&<p className="text-xs text-muted-foreground">{es?'Los comentarios solo se muestran mientras tenga acceso a la copia de trabajo. El historial editorial se conserva.':'Feedback appears while you retain access to the working copy. Editorial history is retained.'}</p>}
   {!state.items.length&&<p className="py-4 text-sm text-muted-foreground">{mode==='pending'?(es?'No hay solicitudes vigentes que pueda revisar.':'No current requests you are eligible to review.'):(es?'No hay comentarios accesibles en esta página.':'No accessible feedback on this page.')}</p>}
   {state.items.map(item=><article key={item.id} className="space-y-2 border-t border-border py-3">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0">
     <h3 className="break-words text-sm font-semibold text-deep">{item.headline}</h3>
     <p className="text-xs text-muted-foreground">{item.kind==='revision'?(es?'Revisión no publicada':'Unpublished revision'):(es?'Borrador':'Draft')} · {new Date(item.at).toLocaleString(es?'es':'en')}</p></div>
     {item.decision&&<span className="rounded-md bg-surface-muted px-2 py-1 text-xs font-semibold">{decisions[item.decision]}{!item.readAt&&(es?' · No leído':' · Unread')}</span>}
    </div>
    <p className="break-words text-sm">{item.note}</p>
    <div className="flex flex-wrap gap-2"><Link href={'/newsroom/stories/'+item.storyId+'/review?kind='+item.kind} prefetch={false} className={btn}>{mode==='pending'?(es?'Abrir revisión':'Open review'):(es?'Ver historial':'View history')}</Link>
     {item.decision&&!item.readAt&&<button type="button" disabled={!!busy} className={btn} onClick={()=>void acknowledge(item.id)}>{busy===item.id?(es?'Guardando…':'Saving…'):(es?'Marcar como leído':'Mark as read')}</button>}</div>
   </article>)}
   <div className="flex items-center justify-between gap-3 text-sm">
    {page>0?<Link className={btn} href={href(mode,page-1)} prefetch={false}>{es?'Anterior':'Previous'}</Link>:<span/>}
    <span className="text-xs text-muted-foreground">{es?'Página':'Page'} {page+1}</span>
    {state.hasMore?<Link className={btn} href={href(mode,page+1)} prefetch={false}>{es?'Siguiente':'Next'}</Link>:<span/>}
   </div>
  </section>
 </div>;
}
