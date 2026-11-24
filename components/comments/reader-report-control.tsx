'use client';
import {useRef,useState} from 'react';
import Link from 'next/link';
import {Flag} from 'lucide-react';
import type {Locale} from '@/types';
import {parseReaderReportCommand,parseReaderReportReceipt,type ReaderReportReceipt} from '@/lib/permissions/reader-report-contract';
const btn='inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-interface text-xs font-bold text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50';
export function ReaderReportControl({storyId,commentId,updatedAt,locale,isAuthenticated,signInHref}:{storyId:string;commentId:string;updatedAt:string;locale:Locale;isAuthenticated:boolean;signInHref:string}){
 const es=locale==='es';
 const [open,setOpen]=useState(false),[reason,setReason]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[blocked,setBlocked]=useState(false),[receipt,setReceipt]=useState<ReaderReportReceipt|null>(null);
 const inFlight=useRef(false);
 const valid=reason.trim().length>=3&&reason.trim().length<=1000&&!/[\u0000-\u001f\u007f]/.test(reason);
 async function submit(){
  if(inFlight.current||busy||blocked||!confirmed||!valid||receipt)return;
  let command;
  try{command=parseReaderReportCommand({commentId,updatedAt,reason});}catch{setError(es?'Revise el motivo.':'Check your reason.');return;}
  inFlight.current=true;setBusy(true);setError('');
  try{
   const r=await fetch('/api/stories/'+encodeURIComponent(storyId)+'/reports',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(command)});
   if(r.status===401){window.location.assign(signInHref);return;}
   if(!r.ok){setBlocked(r.status!==422);setError(r.status===409?(es?'El comentario cambió. Actualice el artículo.':'The comment changed. Refresh the article.'):(es?'No se pudo confirmar. Compruebe Mis denuncias antes de reintentar.':'Unable to confirm. Check My reports before retrying.'));return;}
   setReceipt(parseReaderReportReceipt(await r.json(),commentId));setReason('');setConfirmed(false);
  }catch{setBlocked(true);setError(es?'Resultado incierto. Consulte Mis denuncias.':'Uncertain result. Check My reports.');}
  finally{inFlight.current=false;setBusy(false);}
 }
 const label=es?'Denunciar':'Report';
 if(!isAuthenticated)return <Link href={signInHref} className={btn}><Flag className="h-3.5 w-3.5" aria-hidden/>{label}</Link>;
 if(!open)return <button type="button" className={btn} onClick={()=>setOpen(true)}><Flag className="h-3.5 w-3.5" aria-hidden/>{label}</button>;
 return <div className="w-full space-y-3 rounded-lg border border-border bg-surface-muted p-3 font-interface text-sm">
  <div className="flex items-center justify-between"><strong>{es?'Denunciar comentario':'Report comment'}</strong><button type="button" className={btn} disabled={busy} onClick={()=>setOpen(false)}>{es?'Cerrar':'Close'}</button></div>
  {receipt?<p role="status">{receipt.alreadyReported?(es?'Ya denunció este comentario.':'You have already reported this comment.'):(es?'Denuncia recibida.':'Report received.')}</p>:<>
   <p className="text-xs text-muted-foreground">{es?'El equipo revisará la denuncia. Evite incluir datos personales. Una denuncia no elimina automáticamente un comentario.':'Staff will review the report. Avoid including personal information. Reporting does not automatically remove a comment.'}</p>
   <label className="block">{es?'Motivo (3–1000 caracteres)':'Reason (3–1000 characters)'}<input value={reason} maxLength={1000} disabled={busy||blocked} onChange={e=>setReason(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2"/></label>
   <label className="flex gap-2 items-start"><input type="checkbox" checked={confirmed} disabled={busy||blocked} onChange={e=>setConfirmed(e.target.checked)}/>{es?'Confirmo que denuncio el comentario mostrado.':'I confirm I am reporting the displayed comment.'}</label>
   <button type="button" disabled={!valid||!confirmed||busy||blocked} className="rounded-md bg-deep px-3 py-2 text-xs font-bold text-white disabled:opacity-50" onClick={()=>void submit()}>{busy?(es?'Enviando…':'Submitting…'):(es?'Enviar denuncia':'Submit report')}</button>
  </>}
  {error&&<p role="alert" className="text-breaking">{error}</p>}
  <Link href="/account/reports" prefetch={false} className="text-primary underline">{es?'Mis denuncias':'My reports'}</Link>
 </div>;
}
