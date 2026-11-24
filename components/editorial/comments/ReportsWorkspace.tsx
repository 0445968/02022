'use client';
import {useRef,useState} from 'react';
import Link from 'next/link';
import {Flag,RefreshCw,History,X} from 'lucide-react';
import type {Locale} from '@/types';
import {parseReportCommand,parseReportDetail,type ReportDetail,type ReportPage,type ReportFilter,type ReportTarget} from '@/lib/permissions/comment-report-contract';
import {availableReportTargets,reportQueueHref,reportedVersionState} from '@/lib/permissions/comment-report-ui';
const btn='inline-flex items-center justify-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium hover:bg-surface-muted disabled:opacity-50';
const filters:ReportFilter[]=['open','reviewed','dismissed','actioned','all'];
export function ReportsWorkspace({data,detail,status,storyId,page,locale,commentHref,canOpenComments}:{data:ReportPage;detail:ReportDetail|null;status:ReportFilter;storyId:string|null;page:number;locale:Locale;commentHref:string|null;canOpenComments:boolean}){
 const es=locale==='es';
 const [target,setTarget]=useState<ReportTarget|null>(null),[reason,setReason]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[blocked,setBlocked]=useState(false),[error,setError]=useState('');
 const inFlight=useRef(false);
 const labels:Record<ReportFilter,string>=es?{open:'Abiertas',reviewed:'Revisadas',dismissed:'Desestimadas',actioned:'Con medidas',all:'Todas'}:{open:'Open',reviewed:'Reviewed',dismissed:'Dismissed',actioned:'Actioned',all:'All'};
 const actions:Record<ReportTarget,string>=es?{reviewed:'Marcar como revisada',dismissed:'Desestimar',actioned:'Registrar medida aplicada'}:{reviewed:'Mark reviewed',dismissed:'Dismiss',actioned:'Record action taken'};
 const commentLabels=es?{pending:'Pendiente',published:'Publicado',hidden:'Oculto',deleted:'Eliminado'}:{pending:'Pending',published:'Published',hidden:'Hidden',deleted:'Removed'};
 const date=(v:string)=>new Date(v).toLocaleString(es?'es':'en');
 const report=detail?.report;
 const version=report?reportedVersionState(report):null;
 const targets=report?availableReportTargets(report):[];
 const valid=reason.trim().length>=12&&reason.trim().length<=1000&&!/[\u0000-\u001f\u007f]/.test(reason);
 function guard(e:React.MouseEvent<HTMLAnchorElement>){if(inFlight.current)e.preventDefault();}
 async function submit(){
  if(inFlight.current||busy||blocked||!report||!target||!confirmed||!valid||!targets.includes(target))return;
  let command;
  try{command=parseReportCommand({reportId:report.id,revision:report.revision,commentRevision:report.commentRevision,target,reason,actionEventId:target==='actioned'?report.actionEventId:null,commandId:crypto.randomUUID()});}
  catch{setError(es?'Revise el motivo y la decisión.':'Check the reason and decision.');return;}
  inFlight.current=true;setBusy(true);setError('');
  try{
   const r=await fetch('/api/newsroom/comments/reports',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(command)});
   if(!r.ok){setBlocked(r.status!==422);setError(r.status===409?(es?'La denuncia o el comentario cambió. Actualice antes de decidir.':'The report or comment changed. Refresh before deciding.'):(es?'No se pudo confirmar la decisión. Actualice antes de reintentar.':'Unable to confirm the decision. Refresh before retrying.'));return;}
   const result=parseReportDetail(await r.json(),report.id);
   if(result.report.status!==target||result.report.revision!==report.revision+1)throw Error();
   setBlocked(true);window.location.reload();
  }catch{setBlocked(true);setError(es?'Resultado incierto. Actualice antes de reintentar.':'Uncertain result. Refresh before retrying.');}
  finally{inFlight.current=false;setBusy(false);}
 }
 return <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
  <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
   <div><h1 className="font-headline text-2xl font-bold text-deep">{es?'Denuncias':'Reports'}</h1><p className="mt-1 text-sm text-muted-foreground">{es?'Investigue denuncias y registre decisiones sin cambiar automáticamente el comentario.':'Investigate reports and record decisions without automatically changing the comment.'}</p></div>
   <div className="flex flex-wrap gap-2">{canOpenComments&&<Link onClick={guard} prefetch={false} href="/newsroom/comments" className={btn}>{es?'Comentarios':'Comments'}</Link>}<button type="button" className={btn} disabled={busy} onClick={()=>window.location.reload()}><RefreshCw className="h-4 w-4" aria-hidden/>{es?'Actualizar':'Refresh'}</button></div>
  </header>
  <nav className="flex flex-wrap gap-2" aria-label={es?'Estados de denuncias':'Report statuses'}>
   {filters.map(f=><Link key={f} onClick={guard} prefetch={false} href={reportQueueHref(f,storyId)} aria-current={status===f?'page':undefined} className={status===f?'rounded-md bg-deep px-3 py-2 text-sm font-semibold text-white':btn}>{labels[f]}</Link>)}
  </nav>
  {storyId&&<Link onClick={guard} prefetch={false} className="text-sm text-primary underline" href={reportQueueHref(status,null)}>{es?'Quitar filtro de artículo':'Clear story filter'}</Link>}
  {error&&<p role="alert" className="text-sm text-breaking">{error}</p>}
  <div className={report?'grid gap-4 lg:grid-cols-2':'grid gap-4'}>
   <section className="min-w-0 rounded-lg border border-border bg-white p-4">
    <h2 className="mb-3 font-semibold">{labels[status]}</h2>
    {!data.items.length&&<div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground"><Flag className="h-6 w-6" aria-hidden/>{es?'No hay denuncias accesibles con estos filtros.':'No accessible reports match these filters.'}</div>}
    {data.items.map(item=><article key={item.id} className="space-y-2 border-t border-border py-4">
     <div className="flex flex-wrap justify-between gap-2"><strong className="break-words text-sm">{es?'Denuncia de lector':'Reader report'}</strong><span className="rounded bg-surface-muted px-2 py-1 text-xs font-semibold">{labels[item.status]}</span></div>
     <p className="text-xs text-muted-foreground">{date(item.createdAt)} · {es?'Comentario':'Comment'}: {commentLabels[item.commentStatus]}</p>
     <Link onClick={guard} prefetch={false} href={reportQueueHref(status,item.storyId)} className="break-words text-xs font-medium text-primary underline">{item.headline}</Link>
     <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm">{item.reason}</p>
     <Link onClick={guard} prefetch={false} className={btn} href={reportQueueHref(status,storyId,page,item.id)} aria-current={report?.id===item.id?'true':undefined}>{es?'Investigar':'Investigate'}</Link>
    </article>)}
    <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
     {page>0?<Link onClick={guard} prefetch={false} className={btn} href={reportQueueHref(status,storyId,page-1)}>{es?'Anterior':'Previous'}</Link>:<span/>}<span className="text-xs text-muted-foreground">{es?'Página':'Page'} {page+1}</span>{data.hasMore?<Link onClick={guard} prefetch={false} className={btn} href={reportQueueHref(status,storyId,page+1)}>{es?'Siguiente':'Next'}</Link>:<span/>}
    </div>
   </section>
   {report&&detail&&<section className="min-w-0 self-start space-y-4 rounded-lg border border-border bg-white p-4">
    <header className="flex items-center justify-between gap-2"><h2 className="font-semibold">{es?'Detalle de denuncia':'Report details'} · {labels[report.status]}</h2><Link onClick={guard} prefetch={false} href={reportQueueHref(status,storyId,page)} className={btn} aria-label={es?'Cerrar':'Close'}><X className="h-4 w-4" aria-hidden/></Link></header>
    <div className="space-y-1"><h3 className="text-sm font-semibold">{es?'Motivo del lector':'Reader’s reason'}</h3><p className="whitespace-pre-wrap break-words text-sm">{report.reason}</p><p className="text-xs text-muted-foreground">{date(report.createdAt)}</p></div>
    <div className="space-y-2 border-t border-border pt-3"><h3 className="text-sm font-semibold">{es?'Comentario actual':'Current comment'}</h3><p className="break-words text-xs text-muted-foreground">{report.author} · {commentLabels[report.commentStatus]}</p><p className="whitespace-pre-wrap break-words text-sm">{report.body}</p>
     <p className="text-xs text-muted-foreground">{es?'Versión denunciada':'Reported revision'}: {report.reportedRevision??(es?'Desconocida':'Unknown')} · {es?'Versión actual':'Current revision'}: {report.commentRevision}</p>
     {version!=='same'&&<p role="status" className="text-sm text-breaking">{version==='unknown'?(es?'No se registró la versión original. No se puede verificar el texto denunciado.':'The original revision was not recorded. The reported text cannot be verified.'):(es?'El comentario cambió. El texto mostrado no es una copia histórica.':'The comment changed. The displayed text is not a historical copy.')}</p>}
     {commentHref&&<Link onClick={guard} prefetch={false} className={btn} href={commentHref}>{es?'Abrir moderación del comentario':'Open comment moderation'}</Link>}
    </div>
    {targets.length>0&&<div className="space-y-3 border-t border-border pt-3"><h3 className="font-semibold">{es?'Decisión':'Decision'}</h3>
     {report.actionEventId?<p className="text-sm text-muted-foreground">{es?'Existe una medida de moderación auditada que corresponde a esta denuncia.':'A matching audited moderation action is available.'}</p>:<p className="text-sm text-muted-foreground">{es?'Registrar una medida requiere ocultación o eliminación auditada de la versión denunciada.':'Recording an action requires an audited hide or removal of the reported revision.'}</p>}
     <div className="flex flex-wrap gap-2">{targets.map(t=><button type="button" key={t} disabled={busy||blocked} aria-pressed={target===t} className={btn+(target===t?' ring-2 ring-primary':'')} onClick={()=>{setTarget(t);setReason('');setConfirmed(false);}}>{actions[t]}</button>)}</div>
     {target&&targets.includes(target)&&<div className="space-y-3 rounded-md border border-border p-3"><p className="text-sm">{target==='reviewed'?(es?'La denuncia sigue disponible para resolución.':'The report remains available for resolution.'):(es?'Esta decisión cierra la denuncia y no cambia el comentario.':'This decision closes the report and does not change the comment.')}</p>
      <label className="block text-sm">{es?'Motivo (12–1000 caracteres)':'Reason (12–1000 characters)'}<input className="mt-1 w-full rounded-md border border-border px-3 py-2" value={reason} maxLength={1000} disabled={busy||blocked} onChange={e=>setReason(e.target.value)}/></label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={busy||blocked} onChange={e=>setConfirmed(e.target.checked)}/>{es?'Confirmo esta decisión sobre las versiones actuales.':'I confirm this decision on the current revisions.'}</label>
      <button type="button" disabled={busy||blocked||!valid||!confirmed} className="rounded-md bg-deep px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={()=>void submit()}>{busy?(es?'Guardando…':'Saving…'):(es?'Registrar decisión':'Record decision')}</button>
     </div>}
    </div>}
    {!targets.length&&['open','reviewed'].includes(report.status)&&<p className="text-sm text-muted-foreground">{es?'Se requiere un revisor independiente autorizado.':'An authorized independent reviewer is required.'}</p>}
    <div className="space-y-3 border-t border-border pt-3"><h3 className="flex items-center gap-2 font-semibold"><History className="h-4 w-4" aria-hidden/>{es?'Historial de decisiones':'Decision history'}</h3>
     {!detail.history.length&&<p className="text-sm text-muted-foreground">{es?'No hay decisiones registradas.':'No recorded decisions.'}</p>}
     {detail.history.map(e=><article key={e.id} className="space-y-1 border-t border-border py-2"><p className="text-sm font-semibold">{labels[e.fromStatus]} → {labels[e.toStatus]}</p><p className="text-xs text-muted-foreground">{date(e.at)}{e.byMe&&(es?' · Por usted':' · By you')} · {es?'Versión del comentario':'Comment revision'} {e.commentRevision}</p><p className="break-words text-sm">{e.reason}</p>{e.actionEventId&&<p className="text-xs text-muted-foreground">{es?'Medida auditada vinculada':'Linked audited moderation action'}</p>}</article>)}
    </div>
   </section>}
  </div>
 </div>;
}
