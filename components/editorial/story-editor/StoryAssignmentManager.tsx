'use client';
import {useRef,useState} from 'react';
import Link from 'next/link';
import type {Locale} from '@/types';
import {parseAssignmentPage,type AssignmentPage,type AssignmentType,type AssignmentAction,type AssignmentRow} from '@/lib/permissions/story-assignment-contract';
const btn='rounded-md border border-border bg-white px-3 py-2 text-sm font-medium hover:bg-surface-muted disabled:opacity-50';
const field='mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm';
function localValue(value:string|null){
 if(!value)return '';
 const d=new Date(value);if(!Number.isFinite(d.getTime()))return '';
 const pad=(n:number)=>String(n).padStart(2,'0');
 return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());
}
export function StoryAssignmentManager({initial,locale}:{initial:AssignmentPage;locale:Locale}){
 const es=locale==='es';
 const [data,setData]=useState(initial),[page,setPage]=useState(0),[candidatePage,setCandidatePage]=useState(0);
 const [member,setMember]=useState(''),[type,setType]=useState<AssignmentType>('author'),[action,setAction]=useState<AssignmentAction>('create');
 const [row,setRow]=useState<AssignmentRow|null>(null),[deadline,setDeadline]=useState(''),[reason,setReason]=useState('');
 const [busy,setBusy]=useState(false),[problem,setProblem]=useState(''),[notice,setNotice]=useState(''),[blocked,setBlocked]=useState(false);
 const inFlight=useRef(false);
 const names:Record<AssignmentType,string>=es?{author:'Redactor',editor:'Editor',reviewer:'Revisor',copy:'Corrector',visual:'Visual'}:{author:'Writer',editor:'Editor',reviewer:'Reviewer',copy:'Copy editor',visual:'Visual'};
 const statusName=(s:string|null)=>s==='active'?(es?'Activa':'Active'):s==='completed'?(es?'Completada':'Completed'):s==='revoked'?(es?'Revocada':'Revoked'):'—';
 const actionName=(a:AssignmentAction)=>({create:es?'Asignar':'Assign',reschedule:es?'Cambiar plazo':'Change deadline',complete:es?'Completar':'Complete',revoke:es?'Revocar':'Revoke',reopen:es?'Reactivar':'Reactivate'})[a];
 const displayDate=(v:string|null)=>v?new Date(v).toLocaleString(es?'es':'en'): '—';
 const chosen=data.candidates.find(c=>c.id===member);
 const target=row?.membershipId??member;
 const canSave=!!target&&reason.trim().length>=12&&reason.trim().length<=500&&!blocked&&!busy&&
   (action!=='create'||(data.storyStatus!=='archived'&&!!chosen?.types.includes(type)));
 const url='/api/newsroom/stories/'+data.storyId+'/assignments';
 function reset(){setRow(null);setAction('create');setMember('');setType('author');setDeadline('');setReason('');}
 async function fetchPage(p:number,c:number){
   const response=await fetch(url+'?page='+p+'&candidatePage='+c,{cache:'no-store'});
   if(!response.ok)throw Error();
   return parseAssignmentPage(await response.json(),data.storyId);
 }
 async function reload(p=page,c=candidatePage){
   if(inFlight.current)return;
   inFlight.current=true;setBusy(true);setProblem('');setNotice('');
   try{setData(await fetchPage(p,c));setPage(p);setCandidatePage(c);setBlocked(false);reset();}
   catch{setBlocked(true);setProblem(es?'No se pudieron confirmar las asignaciones.':'Unable to refresh assignments.');}
   finally{inFlight.current=false;setBusy(false);}
 }
 function selectRow(a:AssignmentRow,next:AssignmentAction){
   setRow(a);setAction(next);setDeadline(localValue(a.dueAt));setReason('');setNotice('');setProblem('');
 }
 async function submit(){
   if(!canSave||inFlight.current)return;
   let dueAt:string|null=null;
   if(deadline&&action!=='complete'&&action!=='revoke'){
     const d=new Date(deadline);if(!Number.isFinite(d.getTime())){setProblem(es?'Plazo inválido.':'Invalid deadline.');return;}dueAt=d.toISOString();
   }
   if((action==='revoke'||action==='complete')&&!window.confirm(es?'Cerrar esta asignación puede quitar acceso al artículo. ¿Continuar?':'Closing this assignment may remove access to the article. Continue?'))return;
   inFlight.current=true;setBusy(true);setProblem('');setNotice('');
   try{
     const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({
       membershipId:target,type:row?.type??type,action,expectedRevision:row?.revision??0,dueAt,reason,requestId:crypto.randomUUID()})});
     if(!response.ok){
       setBlocked(response.status!==422);
       setProblem(response.status===409?(es?'La asignación cambió. Actualice antes de continuar.':'Assignment changed. Refresh before continuing.'):
        response.status===422?(es?'Revise el plazo y el motivo.':'Check the deadline and reason.'):(es?'No se pudo confirmar el cambio. Actualice antes de reintentar.':'Change could not be confirmed. Refresh before retrying.'));
       return;
     }
     setData(await fetchPage(page,candidatePage));reset();setNotice(es?'Asignación guardada.':'Assignment saved.');
   }catch{setBlocked(true);setProblem(es?'Resultado incierto. Actualice antes de reintentar.':'Uncertain result. Refresh before retrying.');}
   finally{inFlight.current=false;setBusy(false);}
 }
 return <div className="mx-auto max-w-5xl space-y-5 px-6 py-8">
  <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
   <div><Link href={'/newsroom/stories/'+data.storyId+'/preview'} className="text-sm text-primary underline">{es?'Volver al artículo':'Back to story'}</Link>
   <h1 className="mt-2 font-headline text-2xl font-bold text-deep">{es?'Asignaciones editoriales':'Editorial assignments'}</h1><p className="mt-1 text-sm text-muted-foreground">{data.headline}</p></div>
   <button type="button" className={btn} disabled={busy} onClick={()=>void reload()}>{es?'Actualizar':'Refresh'}</button>
  </header>
  <p className="text-sm text-muted-foreground">{es?'Las asignaciones internas no cambian los permisos base ni la firma pública. Una asignación activa puede habilitar permisos ya concedidos para este artículo.':'Internal assignments do not change base role grants or public bylines. An active assignment can enable previously granted story-scoped permissions.'}</p>
  {problem&&<p role="alert" className="text-sm text-breaking">{problem}</p>}{notice&&<p role="status" className="text-sm">{notice}</p>}
  <section className="space-y-3 rounded-lg border border-border bg-white p-4">
   <h2 className="font-semibold">{es?'Asignaciones':'Assignments'}</h2>
   {data.assignments.length===0&&<p className="text-sm text-muted-foreground">{es?'Sin asignaciones en esta página.':'No assignments on this page.'}</p>}
   {data.assignments.map(a=><div key={a.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-3">
    <div className="min-w-0"><p className="break-words text-sm font-semibold">{a.name} · {names[a.type]}</p>
    <p className="text-xs text-muted-foreground">{statusName(a.status)} · {es?'Plazo':'Due'}: {displayDate(a.dueAt)}{!a.eligible&&(es?' · No elegible':' · Ineligible')}</p></div>
    {!a.self&&<div className="flex flex-wrap gap-2">{a.status==='active'?<>
      {a.eligible&&data.storyStatus!=='archived'&&<button type="button" className={btn} disabled={busy||blocked} onClick={()=>selectRow(a,'reschedule')}>{actionName('reschedule')}</button>}
      <button type="button" className={btn} disabled={busy||blocked} onClick={()=>selectRow(a,'complete')}>{actionName('complete')}</button>
      <button type="button" className={btn} disabled={busy||blocked} onClick={()=>selectRow(a,'revoke')}>{actionName('revoke')}</button>
     </>:a.eligible&&data.storyStatus!=='archived'&&<button type="button" className={btn} disabled={busy||blocked} onClick={()=>selectRow(a,'reopen')}>{actionName('reopen')}</button>}</div>}
   </div>)}
   <div className="flex items-center justify-between gap-2"><button type="button" className={btn} disabled={busy||page===0} onClick={()=>void reload(page-1,candidatePage)}>{es?'Anterior':'Previous'}</button><span className="text-xs">{page+1}</span><button type="button" className={btn} disabled={busy||!data.hasMoreAssignments} onClick={()=>void reload(page+1,candidatePage)}>{es?'Siguiente':'Next'}</button></div>
  </section>
  {(row||data.storyStatus!=='archived')&&<section className="space-y-3 rounded-lg border border-border bg-white p-4">
   <h2 className="font-semibold">{row?actionName(action)+' · '+row.name:(es?'Nueva asignación':'New assignment')}</h2>
   {!row&&<>
    <div className="grid gap-3 sm:grid-cols-2">
     <label className="text-sm">{es?'Miembro':'Staff member'}<select className={field} value={member} disabled={busy||blocked} onChange={e=>{const c=data.candidates.find(x=>x.id===e.target.value);setMember(e.target.value);setType(c?.types[0]??'author');}}><option value="">{es?'Seleccionar':'Select'}</option>{data.candidates.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
     <label className="text-sm">{es?'Función':'Assignment type'}<select className={field} value={type} disabled={busy||blocked||!chosen} onChange={e=>setType(e.target.value as AssignmentType)}>{(chosen?.types??[]).map(t=><option key={t} value={t}>{names[t]}</option>)}</select></label>
    </div>
    <div className="flex items-center justify-between gap-2"><button type="button" className={btn} disabled={busy||candidatePage===0} onClick={()=>void reload(page,candidatePage-1)}>{es?'Anteriores':'Previous staff'}</button><span className="text-xs">{candidatePage+1}</span><button type="button" className={btn} disabled={busy||!data.hasMoreCandidates} onClick={()=>void reload(page,candidatePage+1)}>{es?'Más miembros':'More staff'}</button></div>
   </>}
   {action!=='complete'&&action!=='revoke'&&<label className="block text-sm">{es?'Plazo opcional (hora local)':'Optional deadline (local time)'}<input type="datetime-local" className={field} value={deadline} disabled={busy||blocked} onChange={e=>setDeadline(e.target.value)}/></label>}
   <label className="block text-sm">{es?'Motivo (12–500 caracteres)':'Reason (12–500 characters)'}<textarea className={field} rows={3} value={reason} maxLength={500} disabled={busy||blocked} onChange={e=>setReason(e.target.value)}/></label>
   <div className="flex flex-wrap gap-2"><button type="button" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={!canSave} onClick={()=>void submit()}>{busy?(es?'Guardando…':'Saving…'):actionName(action)}</button>{row&&<button type="button" className={btn} disabled={busy} onClick={reset}>{es?'Cancelar':'Cancel'}</button>}</div>
  </section>}
  <section className="space-y-2 rounded-lg border border-border bg-white p-4"><h2 className="font-semibold">{es?'Historial reciente':'Recent assignment history'}</h2>
   {data.history.length===0&&<p className="text-sm text-muted-foreground">{es?'Sin cambios registrados.':'No recorded changes.'}</p>}
   {data.history.map(h=><div key={h.id} className="border-t border-border py-2 text-sm"><p className="font-medium">{h.member} · {names[h.type as AssignmentType]??h.type} · {statusName(h.previousStatus)} → {statusName(h.status)}</p>
    {h.previousDueAt!==h.dueAt&&<p className="text-xs">{es?'Plazo':'Due'}: {displayDate(h.previousDueAt)} → {displayDate(h.dueAt)}</p>}
    <p className="text-xs text-muted-foreground">{h.actor} · {displayDate(h.at)}</p><p className="break-words">{h.reason}</p></div>)}
  </section>
 </div>;
}
