'use client';
import {useCallback,useEffect,useState,type FormEvent} from 'react';
import {PenLine,RefreshCw} from 'lucide-react';
import type {Locale} from '@/types';
import type {BylineRequest,BylineCandidate,BylinePage} from '@/lib/permissions/staff-byline-types';
const endpoint='/api/newsroom/team/bylines';
const field='w-full rounded-md border border-border bg-white px-3 py-2 text-sm';
const button='rounded-md border border-border bg-white px-3 py-2 text-sm font-medium hover:bg-surface-muted disabled:opacity-50';
const copy={
 en:{title:'Staff byline requests',desc:'Review private associations to existing editorial profiles. Public author records and published stories are not changed.',
 pending:'Pending',approved:'Approved association',rejected:'Rejected',unlinked:'Unlinked',withdrawn:'Withdrawn',conflict:'Legacy link conflict',refresh:'Refresh',empty:'No requests on this page.',previous:'Previous',next:'Next',approve:'Approve association',reject:'Reject request',unlink:'Unlink private association',choose:'Choose eligible editorial profile',none:'No eligible profiles on this page. Do not reassign an existing author account; create a separately reviewed profile in the Authors workflow.',
 reason:'Audit reason (12–500 characters)',confirm:'I reviewed this exact identity and understand this does not change public attribution or grant access.',cancel:'Cancel',saved:'Decision recorded.',failed:'Unable to complete review. Refresh and review current state before retrying.',ineligible:'Membership is not eligible for a new approval.',requested:'Request active',notRequested:'Request not active',page:'Page',candidatePage:'Profile page',working:'Saving…'},
 es:{title:'Solicitudes de firma del equipo',desc:'Revise asociaciones privadas con perfiles editoriales existentes. No se modifican perfiles públicos ni artículos publicados.',
 pending:'Pendiente',approved:'Asociación aprobada',rejected:'Rechazada',unlinked:'Desvinculada',withdrawn:'Retirada',conflict:'Conflicto de vínculo anterior',refresh:'Actualizar',empty:'No hay solicitudes en esta página.',previous:'Anterior',next:'Siguiente',approve:'Aprobar asociación',reject:'Rechazar solicitud',unlink:'Desvincular asociación privada',choose:'Seleccione un perfil editorial elegible',none:'No hay perfiles elegibles en esta página. No reasigne una cuenta de autor existente; cree un perfil revisado por separado en Autores.',
 reason:'Motivo de auditoría (12–500 caracteres)',confirm:'Revisé esta identidad exacta y entiendo que no cambia la atribución pública ni concede acceso.',cancel:'Cancelar',saved:'Decisión registrada.',failed:'No se pudo completar la revisión. Actualice y revise el estado antes de reintentar.',ineligible:'La membresía no es elegible para una nueva aprobación.',requested:'Solicitud activa',notRequested:'Solicitud no activa',page:'Página',candidatePage:'Página de perfiles',working:'Guardando…'}
} as const;
export function StaffBylineReviewManager({locale}:{locale:Locale}){
  const t=copy[locale==='es'?'es':'en'];
  const [page,setPage]=useState(0),[data,setData]=useState<BylinePage<BylineRequest>|null>(null);
  const [target,setTarget]=useState<BylineRequest|null>(null);
  const [action,setAction]=useState<'approve'|'reject'|'unlink'>('approve');
  const [candidatePage,setCandidatePage]=useState(0),[candidates,setCandidates]=useState<BylinePage<BylineCandidate>|null>(null);
  const [bylineId,setBylineId]=useState(''),[reason,setReason]=useState(''),[confirmed,setConfirmed]=useState(false);
  const [error,setError]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false);
  const refresh=useCallback(async(signal?:AbortSignal)=>{
    if(signal?.aborted)return;
    setLoading(true);
    try{const res=await fetch(endpoint+'?page='+page,{cache:'no-store',signal});if(!res.ok)throw Error();const next=await res.json();if(!signal?.aborted)setData(next);}
    catch{if(!signal?.aborted){setData(null);setError(t.failed);}}finally{if(!signal?.aborted)setLoading(false);}
  },[page,t.failed]);
  useEffect(()=>{const controller=new AbortController();const timer=setTimeout(()=>void refresh(controller.signal),0);return()=>{clearTimeout(timer);controller.abort();};},[refresh]);
  useEffect(()=>{
    const controller=new AbortController();
    if(target&&action==='approve')void (async()=>{
      try{const res=await fetch(endpoint+'?member='+encodeURIComponent(target.membership_id)+'&page='+candidatePage,{cache:'no-store',signal:controller.signal});
        if(!res.ok)throw Error();const result=await res.json() as BylinePage<BylineCandidate>;if(!controller.signal.aborted)setCandidates(result);}
      catch{if(!controller.signal.aborted)setError(t.failed);}
    })();
    return()=>controller.abort();
  },[target,action,candidatePage,t.failed]);
  function pick(row:BylineRequest,next:'approve'|'reject'|'unlink'){
    setCandidates(null);setTarget(row);setAction(next);setCandidatePage(0);setReason('');setConfirmed(false);setBylineId('');setError('');setStatus('');
  }
  const valid=!!target&&confirmed&&reason.trim().length>=12&&reason.length<=500&&(action!=='approve'||candidates?.items.some(c=>c.id===bylineId));
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(!valid||!target||busy)return;
    setBusy(true);setError('');setStatus('');
    try{
      const res=await fetch(endpoint,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        membershipId:target.membership_id,profileRevision:target.profile_revision,reviewRevision:target.review_revision,
        action,bylineId:action==='approve'?bylineId:null,reason:reason.trim(),confirmed:true})});
      const result=await res.json() as {ok?:boolean};
      if(!res.ok||!result.ok)throw Error();
      setTarget(null);setReason('');setConfirmed(false);setStatus(t.saved);await refresh();
    }catch{setError(t.failed);setConfirmed(false);}finally{setBusy(false);}
  }
  return <section className="space-y-4 rounded-lg border border-border bg-white p-4" aria-label={t.title}>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-base font-semibold text-deep"><PenLine className="h-4 w-4 text-primary"/>{t.title}</h2><p className="mt-1 text-sm text-muted-foreground">{t.desc}</p></div><button className={button} disabled={busy||loading} type="button" onClick={()=>{setTarget(null);setError('');void refresh();}}><RefreshCw className="mr-2 inline h-4 w-4"/>{t.refresh}</button></div>
    {error&&<p role="alert" className="text-sm text-breaking">{error}</p>}{status&&<p role="status" className="text-sm">{status}</p>}
    {data?.items.length===0&&<p className="text-sm text-muted-foreground">{t.empty}</p>}
    <ul className="space-y-2">{data?.items.map(row=><li key={row.membership_id} className="flex flex-wrap justify-between gap-3 rounded-md border border-border p-3">
      <div className="min-w-0"><p className="break-words text-sm font-semibold">{row.display_name} · {t[row.review_status]}</p><p className="text-xs text-muted-foreground">{row.requested?t.requested:t.notRequested}{row.byline_name?' · '+row.byline_name:''}</p>{!row.eligible&&<p className="text-xs">{t.ineligible}</p>}</div>
      <div className="flex flex-wrap gap-2">{row.review_status==='pending'&&row.eligible&&<><button className={button} disabled={busy} type="button" onClick={()=>pick(row,'approve')}>{t.approve}</button><button className={button} disabled={busy} type="button" onClick={()=>pick(row,'reject')}>{t.reject}</button></>}{['approved','conflict'].includes(row.review_status)&&<button className={button} disabled={busy} type="button" onClick={()=>pick(row,'unlink')}>{t.unlink}</button>}</div>
    </li>)}</ul>
    <div className="flex items-center gap-2"><button className={button} type="button" disabled={busy||loading||page===0} onClick={()=>{setTarget(null);setPage(p=>p-1);}}>{t.previous}</button><span className="text-xs">{t.page} {page+1}</span><button className={button} type="button" disabled={busy||loading||!data?.hasMore} onClick={()=>{setTarget(null);setPage(p=>p+1);}}>{t.next}</button></div>
    {target&&<form onSubmit={e=>void submit(e)} className="space-y-3 border-t border-border pt-4">
      <h3 className="text-sm font-semibold">{t[action]} · {target.display_name}</h3>
      {action==='approve'&&<><label className="block text-sm">{t.choose}<select className={field} value={bylineId} disabled={busy} onChange={e=>{setBylineId(e.target.value);setConfirmed(false);}}><option value="">{t.choose}</option>{candidates?.items.map(c=><option key={c.id} value={c.id}>{c.byline_name} · {c.slug} · {c.byline_status}</option>)}</select></label>
      {candidates?.items.length===0&&<p className="text-sm text-muted-foreground">{t.none}</p>}
      <div className="flex gap-2 items-center"><button className={button} disabled={busy||candidatePage===0} type="button" onClick={()=>{setCandidates(null);setBylineId('');setConfirmed(false);setCandidatePage(p=>p-1);}}>{t.previous}</button><span className="text-xs">{t.candidatePage} {candidatePage+1}</span><button className={button} disabled={busy||!candidates?.hasMore} type="button" onClick={()=>{setCandidates(null);setBylineId('');setConfirmed(false);setCandidatePage(p=>p+1);}}>{t.next}</button></div></>}
      <label className="block text-sm">{t.reason}<textarea className={field} required minLength={12} maxLength={500} value={reason} disabled={busy} onChange={e=>{setReason(e.target.value);setConfirmed(false);}}/></label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/>{t.confirm}</label>
      <div className="flex gap-2"><button className={button} disabled={!valid||busy} type="submit">{busy?t.working:t[action]}</button><button className={button} type="button" disabled={busy} onClick={()=>setTarget(null)}>{t.cancel}</button></div>
    </form>}
  </section>;
}
