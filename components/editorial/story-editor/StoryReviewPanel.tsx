'use client';
import {useRef,useState} from 'react';
import Link from 'next/link';
import type {Locale} from '@/types';
import {parseReviewState,type ReviewState,type ReviewAction} from '@/lib/permissions/story-review-contract';
const btn='rounded-md border border-border bg-white px-3 py-2 text-sm font-medium hover:bg-surface-muted disabled:opacity-50';
export function StoryReviewPanel({initial,locale,editHref}:{initial:ReviewState;locale:Locale;editHref:string}){
 const es=locale==='es';
 const [state,setState]=useState(initial),[note,setNote]=useState(''),[action,setAction]=useState<ReviewAction>('approve');
 const [confirmed,setConfirmed]=useState(false),[opened,setOpened]=useState(false),[busy,setBusy]=useState(false),[blocked,setBlocked]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const inFlight=useRef(false);
 const url='/api/newsroom/stories/'+state.storyId+'/review';
 const preview='/newsroom/stories/'+state.storyId+'/preview?'+(state.kind==='revision'?'revision=1&':'')+'reviewFingerprint='+state.fingerprint;
 const label=(d:string|null)=>d==='approved'?(es?'Aprobado':'Approved'):d==='changes_requested'?(es?'Cambios solicitados':'Changes requested'):d==='rejected'?(es?'Rechazado':'Rejected'):(es?'Pendiente':'Pending');
 const headline=state.current?(state.decision?label(state.decision):(es?'Solicitud pendiente':'Review pending')):state.status==='in_review'?(es?'Sin solicitud vigente':'No current request'):state.status==='draft'?(es?'Borrador':'Draft'):state.status;
 const valid=note.trim().length>=12&&note.trim().length<=1000&&!/[\u0000-\u001f\u007f]/.test(note);
 function reset(){setNote('');setConfirmed(false);setOpened(false);setAction('approve');}
 async function refresh(){
  if(inFlight.current)return;
  inFlight.current=true;setBusy(true);setError('');setNotice('');
  try{const r=await fetch(url+'?kind='+state.kind,{cache:'no-store'});if(!r.ok)throw Error();
   setState(parseReviewState(await r.json(),state.storyId,state.kind));setBlocked(false);reset();
  }catch{setBlocked(true);setError(es?'No se pudo actualizar la revisión.':'Unable to refresh review.');}
  finally{inFlight.current=false;setBusy(false);}
 }
 async function submit(next:ReviewAction){
  if(inFlight.current||busy||blocked||!valid||(next==='request'?!state.canRequest:!state.canDecide||!opened||!confirmed))return;
  inFlight.current=true;setBusy(true);setError('');setNotice('');
  try{
   const res=await fetch(url,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    kind:state.kind,action:next,fingerprint:state.fingerprint,requestId:next==='request'?null:state.requestId,note,commandId:crypto.randomUUID()
   })});
   if(!res.ok){
    setBlocked(res.status!==422);
    setError(res.status===409?(es?'El artículo cambió. Actualice y revise la copia actual.':'The copy changed. Refresh and review the current copy.'):res.status===422?(es?'Revise la nota o las imágenes adjuntas.':'Check the note or attached images.'):(es?'No se pudo confirmar el resultado. Actualice antes de reintentar.':'Unable to confirm the result. Refresh before retrying.'));
    return;
   }
   setState(parseReviewState(await res.json(),state.storyId,state.kind));reset();
   setNotice(next==='request'?(es?'Solicitud registrada.':'Review request registered.'):(es?'Decisión registrada.':'Decision recorded.'));
  }catch{setBlocked(true);setError(es?'Resultado incierto. Actualice antes de reintentar.':'Uncertain result. Refresh before retrying.');}
  finally{inFlight.current=false;setBusy(false);}
 }
 const date=(v:string|null)=>v?new Date(v).toLocaleString(es?'es':'en'):'—';
 return <div className="mx-auto max-w-4xl space-y-5 px-6 py-8">
  <header className="flex flex-wrap justify-between gap-3 border-b border-border pb-4">
   <div><Link href={editHref} className="text-sm text-primary underline">{es?'Volver al editor':'Back to editor'}</Link>
    <h1 className="mt-2 font-headline text-2xl font-bold text-deep">{es?'Revisión editorial':'Editorial review'}</h1>
    <p className="mt-1 break-words text-sm text-muted-foreground">{state.headline}</p></div>
   <button type="button" className={btn} disabled={busy} onClick={()=>void refresh()}>{es?'Actualizar':'Refresh'}</button>
  </header>
  {error&&<p role="alert" className="text-sm text-breaking">{error}</p>}{notice&&<p role="status" className="text-sm">{notice}</p>}
  <section className="space-y-3 rounded-lg border border-border bg-white p-4">
   <h2 className="font-semibold">{headline}</h2>
   <p className="text-sm text-muted-foreground">{state.kind==='revision'?(es?'Revisión no publicada. El artículo publicado no cambia.':'Unpublished revision. The live article remains unchanged.'):(es?'Copia del artículo sin publicar.':'Unpublished article copy.')}</p>
   {!state.current&&state.requestId&&<p className="text-sm text-muted-foreground">{es?'La solicitud anterior ya no corresponde a la copia actual. Consulte el historial.':'The previous request no longer applies to the current copy. See history.'}</p>}
   <div className="flex flex-wrap items-center gap-3"><Link href={preview} target="_blank" rel="noopener noreferrer" className={btn} onClick={()=>setOpened(true)}>{es?'Vista previa de esta versión':'Preview this version'}</Link><span className="font-mono text-xs text-muted-foreground">{state.fingerprint.slice(0,12)}</span></div>
  </section>
  {(state.canRequest||state.canDecide)&&<section className="space-y-3 rounded-lg border border-border bg-white p-4">
   <h2 className="font-semibold">{state.canRequest?(es?'Solicitar revisión':'Request review'):(es?'Decisión editorial':'Editorial decision')}</h2>
   {state.canRequest?<p className="text-sm text-muted-foreground">{es?'Se solicitará la revisión de la copia guardada. Los cambios posteriores invalidarán la solicitud.':'Review will be requested for the saved copy. Later changes will invalidate the request.'}</p>:
    <><label className="block text-sm">{es?'Decisión':'Decision'}<select value={action} onChange={e=>{setAction(e.target.value as ReviewAction);setConfirmed(false);}} disabled={busy||blocked} className="mt-1 w-full rounded-md border border-border px-3 py-2">
     <option value="approve">{es?'Aprobar':'Approve'}</option><option value="request_changes">{es?'Solicitar cambios':'Request changes'}</option><option value="reject">{es?'Rechazar':'Reject'}</option>
    </select></label><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={!opened||busy||blocked} onChange={e=>setConfirmed(e.target.checked)}/>{es?'He revisado la vista previa de esta versión guardada.':'I reviewed the preview of this saved version.'}</label></>}
   <label className="block text-sm">{es?'Nota (12–1000 caracteres)':'Note (12–1000 characters)'}<input type="text" className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" value={note} maxLength={1000} disabled={busy||blocked} onChange={e=>setNote(e.target.value)}/></label>
   <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy||blocked||!valid||(!state.canRequest&&(!opened||!confirmed))} onClick={()=>void submit(state.canRequest?'request':action)}>{busy?(es?'Guardando…':'Saving…'):state.canRequest?(es?'Enviar solicitud':'Send request'):(es?'Registrar decisión':'Record decision')}</button>
   {!state.canRequest&&<p className="text-xs text-muted-foreground">{es?'La aprobación no publica el artículo. Solicitar cambios o rechazar devuelve la copia a borrador.':'Approval does not publish the article. Requested changes or rejection returns the copy to draft.'}</p>}
  </section>}
  {state.status==='in_review'&&!state.canRequest&&!state.canDecide&&!state.decision&&<p className="text-sm text-muted-foreground">{es?'La decisión debe ser de un revisor autorizado e independiente.':'A decision requires an authorized independent reviewer.'}</p>}
  <section className="space-y-3 rounded-lg border border-border bg-white p-4">
   <h2 className="font-semibold">{es?'Historial de revisión':'Review history'}</h2>
   {!state.history.length&&<p className="text-sm text-muted-foreground">{es?'No hay solicitudes registradas.':'No requests recorded.'}</p>}
   {state.history.map(h=><article key={h.id} className="space-y-1 border-t border-border py-3 text-sm">
    <div className="flex flex-wrap justify-between gap-2"><strong>{label(h.decision)}</strong><span className="text-xs text-muted-foreground">{h.current?(es?'Vigente':'Current'):(es?'Anterior':'Previous')}</span></div>
    <p className="text-xs text-muted-foreground">{es?'Solicitado':'Requested'} · {date(h.requestedAt)}{h.requestedByMe&&(es?' · Por usted':' · By you')}</p>
    <p className="break-words">{h.requestNote}</p>
    {h.decision&&<><p className="mt-2 text-xs text-muted-foreground">{es?'Decisión':'Decision'} · {date(h.decidedAt)}{h.decidedByMe&&(es?' · Por usted':' · By you')}</p><p className="break-words">{h.decisionNote}</p></>}
   </article>)}
  </section>
 </div>;
}
