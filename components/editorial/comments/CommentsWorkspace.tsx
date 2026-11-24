'use client';
import {useState,useRef,useEffect} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {Search,RefreshCw,MessageSquare,Check,EyeOff,RotateCcw,Trash2,History,X} from 'lucide-react';
import type {Locale} from '@/types';
import {parseModerationDetail,parseModerationCommand,type ModerationAction,type ModerationFilter,type ModerationPage,type ModerationDetail} from '@/lib/permissions/comment-moderation-contract';
import {availableCommentActions,commentQueueHref} from '@/lib/permissions/comment-moderation-ui';
const btn='inline-flex items-center justify-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium hover:bg-surface-muted disabled:opacity-50';
const filters:ModerationFilter[]=['pending','reported','published','hidden','deleted','all'];
const icons={approve:Check,hide:EyeOff,restore:RotateCcw,remove:Trash2};
export function CommentsWorkspace({initial,status,storyId,query,page,locale}:{initial:ModerationPage;status:ModerationFilter;storyId:string|null;query:string;page:number;locale:Locale}){
 const es=locale==='es',router=useRouter();
 const [search,setSearch]=useState(query),[detail,setDetail]=useState<ModerationDetail|null>(null);
 const [selected,setSelected]=useState<string|null>(null),[action,setAction]=useState<ModerationAction|null>(null);
 const [reason,setReason]=useState(''),[confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[blocked,setBlocked]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const request=useRef<AbortController|null>(null),inFlight=useRef(false);
 useEffect(()=>()=>request.current?.abort(),[]);
 const labels:Record<ModerationFilter,string>=es?{pending:'Pendientes',reported:'Denunciados',published:'Publicados',hidden:'Ocultos',deleted:'Eliminados',all:'Todos'}:{pending:'Pending',reported:'Reported',published:'Published',hidden:'Hidden',deleted:'Removed',all:'All'};
 const decisions:Record<ModerationAction,string>=es?{approve:'Aprobar',hide:'Ocultar',restore:'Restaurar',remove:'Eliminar'}:{approve:'Approve',hide:'Hide',restore:'Restore',remove:'Remove'};
 const explanations:Record<ModerationAction,string>=es?{approve:'El comentario será visible públicamente.',hide:'Se ocultará el comentario sin borrar su texto.',restore:'Volverá a pendientes y necesitará otra aprobación.',remove:'El texto se borrará permanentemente. Se conservarán el registro y las respuestas.'}:{approve:'The comment will become publicly visible.',hide:'Hide the comment while keeping its text.',restore:'Return to pending for fresh approval.',remove:'Permanently redact the text. Its record and replies remain.'};
 function clearAction(){setAction(null);setReason('');setConfirm(false);}
 async function open(id:string){
  if(inFlight.current)return;
  request.current?.abort();
  const controller=new AbortController();request.current=controller;
  setSelected(id);setDetail(null);clearAction();setBlocked(false);setError('');setNotice('');
  try{
   const r=await fetch('/api/newsroom/comments?commentId='+encodeURIComponent(id),{cache:'no-store',signal:controller.signal});
   if(!r.ok)throw Error();
   const parsed=parseModerationDetail(await r.json(),id);
   if(!controller.signal.aborted)setDetail(parsed);
  }catch{if(!controller.signal.aborted)setError(es?'No se pudo cargar el comentario. Actualice o seleccione otro.':'Unable to load comment. Refresh or select another.');}
 }
 function close(){if(inFlight.current)return;request.current?.abort();setSelected(null);setDetail(null);clearAction();setError('');setBlocked(false);}
 function refresh(){if(inFlight.current)return;router.refresh();if(selected)void open(selected);}
 async function submit(){
  if(inFlight.current||busy||blocked||!detail||!action||!confirm||!availableCommentActions(detail.comment).includes(action))return;
  let command;
  try{command=parseModerationCommand({commentId:detail.comment.id,revision:detail.comment.revision,action,reason,commandId:crypto.randomUUID()});}
  catch{setError(es?'Introduzca un motivo válido de 12 a 1000 caracteres.':'Enter a valid reason of 12 to 1000 characters.');return;}
  inFlight.current=true;setBusy(true);setError('');setNotice('');
  try{
   const response=await fetch('/api/newsroom/comments',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(command)});
   if(!response.ok){
    setBlocked(response.status!==422);
    setError(response.status===409?(es?'El comentario cambió. Actualice antes de decidir.':'The comment changed. Refresh before deciding.'):(es?'No se pudo confirmar la decisión. Actualice antes de reintentar.':'Unable to confirm decision. Refresh before retrying.'));
    return;
   }
   setDetail(parseModerationDetail(await response.json(),command.commentId));clearAction();
   setNotice(es?'Decisión registrada.':'Decision recorded.');router.refresh();
  }catch{setBlocked(true);setError(es?'Resultado incierto. Actualice antes de reintentar.':'Uncertain result. Refresh before retrying.');}
  finally{inFlight.current=false;setBusy(false);}
 }
 const valid=reason.trim().length>=12&&reason.trim().length<=1000&&!/[\u0000-\u001f\u007f]/.test(reason);
 const date=(s:string)=>new Date(s).toLocaleString(es?'es':'en');
 return <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
  <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
   <div><h1 className="font-headline text-2xl font-bold text-deep">{es?'Comentarios':'Comments'}</h1>
   <p className="mt-1 text-sm text-muted-foreground">{es?'Modere comentarios de lectores según sus permisos vigentes.':'Manage reader comments within your current permissions.'}</p></div>
   <button type="button" disabled={busy} className={btn} onClick={refresh}><RefreshCw className="h-4 w-4" aria-hidden/>{es?'Actualizar':'Refresh'}</button>
  </header>
  <nav className="flex flex-wrap gap-2" aria-label={es?'Estados de comentarios':'Comment statuses'}>
   {filters.map(f=><Link prefetch={false} key={f} href={commentQueueHref(f,storyId,query)} aria-current={status===f?'page':undefined} className={status===f?'rounded-md bg-deep px-3 py-2 text-sm font-semibold text-white':btn}>{labels[f]}</Link>)}
  </nav>
  <form className="flex flex-wrap items-center gap-2" onSubmit={e=>{e.preventDefault();router.push(commentQueueHref(status,storyId,search.trim()));}}>
   <label className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-white px-3 py-2"><Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden/>
    <input aria-label={es?'Buscar comentarios':'Search comments'} placeholder={es?'Buscar texto, lector o artículo':'Search text, reader or story'} value={search} maxLength={120} onChange={e=>setSearch(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></label>
   <button type="submit" className={btn}>{es?'Buscar':'Search'}</button>
   {(query||storyId)&&<Link prefetch={false} className={btn} href={commentQueueHref(status,null,'')}>{es?'Borrar filtros':'Clear filters'}</Link>}
  </form>
  {storyId&&<p className="text-sm text-muted-foreground">{es?'Filtro de artículo activo':'Story filter active'} · <Link className="underline" href={commentQueueHref(status,null,query)} prefetch={false}>{es?'Todos los artículos':'All stories'}</Link></p>}
  {error&&<p role="alert" className="text-sm text-breaking">{error}</p>}{notice&&<p role="status" className="text-sm">{notice}</p>}
  <div className={selected?'grid gap-4 lg:grid-cols-2':'grid gap-4'}>
   <section className="min-w-0 rounded-lg border border-border bg-white p-4">
    <h2 className="mb-3 font-semibold">{labels[status]}</h2>
    {!initial.items.length&&<div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground"><MessageSquare className="h-6 w-6" aria-hidden/>{es?'No hay comentarios accesibles con estos filtros.':'No accessible comments match these filters.'}</div>}
    {initial.items.map(item=>{
     const current=detail?.comment.id===item.id?detail.comment:item;
     return <article key={item.id} className="space-y-2 border-t border-border py-4">
      <div className="flex flex-wrap justify-between gap-2"><strong className="break-words text-sm">{current.author}</strong><span className="rounded bg-surface-muted px-2 py-1 text-xs font-semibold">{labels[current.status]}</span></div>
      <p className="text-xs text-muted-foreground">{date(current.createdAt)}{current.parentId&&(es?' · Respuesta':' · Reply')}{current.openReports!==null&&current.openReports>0&&(es?' · Denuncias abiertas: ':' · Open reports: ')+current.openReports}</p>
      <Link prefetch={false} className="break-words text-xs font-medium text-primary underline" href={commentQueueHref(status,current.storyId,query)}>{current.headline}</Link>
      <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm">{current.body}</p>
      <button type="button" className={btn} disabled={busy} aria-pressed={selected===item.id} onClick={()=>void open(item.id)}>{es?'Ver detalles':'View details'}</button>
     </article>;
    })}
    <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
     {page>0?<Link prefetch={false} className={btn} href={commentQueueHref(status,storyId,query,page-1)}>{es?'Anterior':'Previous'}</Link>:<span/>}
     <span className="text-xs text-muted-foreground">{es?'Página':'Page'} {page+1}</span>
     {initial.hasMore?<Link prefetch={false} className={btn} href={commentQueueHref(status,storyId,query,page+1)}>{es?'Siguiente':'Next'}</Link>:<span/>}
    </div>
   </section>
   {selected&&<section className="min-w-0 space-y-4 self-start rounded-lg border border-border bg-white p-4">
    <header className="flex items-center justify-between"><h2 className="font-semibold">{es?'Detalle del comentario':'Comment details'}</h2><button type="button" className={btn} disabled={busy} onClick={close} aria-label={es?'Cerrar':'Close'}><X className="h-4 w-4" aria-hidden/></button></header>
    {!detail?<p className="text-sm text-muted-foreground">{es?'Cargando o no disponible…':'Loading or unavailable…'}</p>:<>
     <div className="space-y-2"><p className="break-words text-sm font-semibold">{detail.comment.author} · {labels[detail.comment.status]}</p><p className="break-words text-xs text-muted-foreground">{detail.comment.headline} · {date(detail.comment.updatedAt)}</p><p className="whitespace-pre-wrap break-words text-sm">{detail.comment.body}</p></div>
     {availableCommentActions(detail.comment).length>0&&<div className="flex flex-wrap gap-2 border-t border-border pt-3">
      {availableCommentActions(detail.comment).map(a=>{const Icon=icons[a];return <button key={a} type="button" disabled={busy||blocked} aria-pressed={action===a} className={btn+(action===a?' ring-2 ring-primary':'')+(a==='remove'?' text-breaking':'')} onClick={()=>{setAction(a);setReason('');setConfirm(false);}}><Icon className="h-4 w-4" aria-hidden/>{decisions[a]}</button>;})}
     </div>}
     {action&&availableCommentActions(detail.comment).includes(action)&&<div className="space-y-3 rounded-md border border-border p-3">
      <h3 className="font-semibold">{decisions[action]}</h3><p className={'text-sm '+(action==='remove'?'text-breaking':'text-muted-foreground')}>{explanations[action]}</p>
      <label className="block text-sm">{es?'Motivo (12–1000 caracteres)':'Reason (12–1000 characters)'}<input className="mt-1 w-full rounded-md border border-border px-3 py-2" value={reason} maxLength={1000} disabled={busy||blocked} onChange={e=>setReason(e.target.value)}/></label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirm} disabled={busy||blocked} onChange={e=>setConfirm(e.target.checked)}/>{action==='remove'?(es?'Entiendo que no se podrá recuperar el texto.':'I understand the text cannot be recovered.'):(es?'Confirmo esta decisión sobre la versión actual.':'I confirm this decision on the current version.')}</label>
      <button type="button" disabled={busy||blocked||!valid||!confirm} className="rounded-md bg-deep px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={()=>void submit()}>{busy?(es?'Guardando…':'Saving…'):(es?'Registrar decisión':'Record decision')}</button>
     </div>}
     <div className="space-y-3 border-t border-border pt-3"><h3 className="flex items-center gap-2 font-semibold"><History className="h-4 w-4" aria-hidden/>{es?'Historial de moderación':'Moderation history'}</h3>
      {!detail.history.length&&<p className="text-sm text-muted-foreground">{es?'No hay decisiones registradas.':'No recorded decisions.'}</p>}
      {detail.history.map(event=><article key={event.id} className="space-y-1 border-t border-border py-2"><p className="text-sm font-semibold">{decisions[event.action]} · {labels[event.fromStatus]} → {labels[event.toStatus]}</p><p className="text-xs text-muted-foreground">{date(event.at)}{event.byMe&&(es?' · Por usted':' · By you')}</p><p className="break-words text-sm">{event.reason}</p></article>)}
     </div>
    </>}
   </section>}
  </div>
 </div>;
}
