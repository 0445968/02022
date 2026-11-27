'use client';
import Link from 'next/link';
import type {PlacementKind} from '@/lib/permissions/poll-placement-contract';
import {useState,useRef,useEffect} from 'react';
import type {Locale} from '@/types';
import type {StaffPoll,StaffPollPage,PollCopy,PollAction,PollCommand} from '@/lib/permissions/polls-contract';
const input='mt-1 block w-full rounded-[6px] border border-border bg-white px-3 py-2 text-sm';
const button='rounded-[6px] border border-border bg-white px-3 py-2 text-sm font-medium hover:bg-surface-muted disabled:opacity-50';
const labels={draft:['Draft','Borrador'],in_review:['In review','En revisión'],approved:['Approved','Aprobada'],published:['Published','Publicada'],retired:['Retired','Retirada']};
function PollForm({poll,locale,disabled,send}:{poll?:StaffPoll;locale:Locale;disabled:boolean;send:(c:PollCommand)=>Promise<void>}){
 const es=locale==='es';
 const [question,setQuestion]=useState(poll?.question??''),[language,setLanguage]=useState<'en'|'es'>(poll?.language??locale);
 const [options,setOptions]=useState(poll?.options??['','']),[start,setStart]=useState(poll?.opensAt.slice(0,16)??''),[end,setEnd]=useState(poll?.closesAt.slice(0,16)??''),[cap,setCap]=useState(poll?.cap??1000);
 const [error,setError]=useState('');
 function submit(){
  const opens=new Date(start+':00Z'),closes=new Date(end+':00Z');
  if(!Number.isFinite(opens.getTime())||!Number.isFinite(closes.getTime())||opens.toISOString().slice(0,16)!==start||closes.toISOString().slice(0,16)!==end||closes<=opens||closes.getTime()<=Date.now()||options.some(o=>!o.trim())||new Set(options.map(o=>o.trim().toLowerCase())).size!==options.length){setError(es?'Revise las fechas UTC y las opciones únicas.':'Check UTC dates and unique options.');return;}
  const copy:PollCopy={language,question,options:options.map(o=>o.trim()),opensAt:opens.toISOString(),closesAt:closes.toISOString(),cap};
  setError('');void send({action:poll?'save':'create',id:poll?.id??null,version:poll?.version??null,copy});
 }
 return <form className="space-y-3" onSubmit={e=>{e.preventDefault();submit();}}>
  <label className="block text-sm">{es?'Pregunta':'Question'}<input className={input} value={question} minLength={3} maxLength={240} required disabled={disabled} onChange={e=>setQuestion(e.target.value)}/></label>
  <label className="block text-sm">{es?'Idioma del contenido':'Content language'}<select className={input} value={language} disabled={disabled} onChange={e=>setLanguage(e.target.value==='es'?'es':'en')}><option value="en">English</option><option value="es">Español</option></select></label>
  <fieldset className="space-y-2"><legend className="text-sm">{es?'Opciones (2–8)':'Options (2–8)'}</legend>{options.map((o,i)=><div key={i} className="flex gap-2"><input aria-label={(es?'Opción ':'Option ')+(i+1)} className={input} value={o} maxLength={120} required disabled={disabled} onChange={e=>setOptions(v=>v.map((x,n)=>n===i?e.target.value:x))}/>{options.length>2&&<button type="button" className={button} disabled={disabled} onClick={()=>setOptions(v=>v.filter((_,n)=>n!==i))}>{es?'Quitar':'Remove'}</button>}</div>)}
  {options.length<8&&<button type="button" className={button} disabled={disabled} onClick={()=>setOptions(v=>[...v,''])}>{es?'Añadir opción':'Add option'}</button>}</fieldset>
  <div className="grid gap-3 md:grid-cols-2"><label className="text-sm">{es?'Apertura UTC':'Opens UTC'}<input className={input} type="datetime-local" required value={start} disabled={disabled} onChange={e=>setStart(e.target.value)}/></label><label className="text-sm">{es?'Cierre UTC':'Closes UTC'}<input className={input} type="datetime-local" required value={end} disabled={disabled} onChange={e=>setEnd(e.target.value)}/></label></div>
  <label className="block text-sm">{es?'Límite de respuestas':'Response cap'}<input type="number" className={input} min={5} max={100000} required value={cap} disabled={disabled} onChange={e=>setCap(Number(e.target.value))}/></label>
  {error&&<p role="alert" className="text-sm text-breaking">{error}</p>}
  <button type="submit" disabled={disabled} className={button}>{poll?(es?'Guardar borrador':'Save draft'):(es?'Crear borrador':'Create draft')}</button>
 </form>;
}
export function PollManager({data,locale,initialNow,placementsEnabled=false,placementContext=null}:{data:StaffPollPage;locale:Locale;initialNow:number;placementsEnabled?:boolean;placementContext?:{kind:PlacementKind;target:string}|null}){
 const es=locale==='es',lang=es?1:0;
 const [busy,setBusy]=useState(false),[locked,setLocked]=useState(false),[error,setError]=useState(''),[editing,setEditing]=useState<string|null>(null),[creating,setCreating]=useState(false);
 const inFlight=useRef(false);
 async function send(c:PollCommand){
  if(inFlight.current||locked)return;
  if(['publish','close','retire','release_results'].includes(c.action)&&!window.confirm(es?'¿Confirmar esta acción editorial?':'Confirm this editorial action?'))return;
  inFlight.current=true;setBusy(true);setError('');
  try{
   const response=await fetch('/api/newsroom/polls',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(c)});
   if(!response.ok){setLocked(response.status!==422);setError(response.status===422?(es?'Datos o resultados insuficientes.':'Invalid data or insufficient responses.'):(es?'No se confirmó el cambio. Actualice antes de continuar.':'Change not confirmed. Refresh before continuing.'));return;}
   const result=await response.json();if(!result||typeof result.id!=='string'||c.id&&result.id!==c.id)throw Error();
   window.location.reload();
  }catch{setLocked(true);setError(es?'Resultado incierto. Actualice la página.':'Uncertain result. Refresh the page.');}
  finally{inFlight.current=false;setBusy(false);}
 }
 const [now,setNow]=useState(initialNow);
 useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer);},[]);
 const disabled=busy||locked;
 const act=(p:StaffPoll,action:PollAction,label:string)=><button type="button" className={button} disabled={disabled} onClick={()=>void send({action,id:p.id,version:p.version,copy:null})}>{label}</button>;
 return <div className="space-y-4">
  {error&&<p role="alert" className="text-sm text-breaking">{error}</p>}
  {data.canEdit&&<button type="button" disabled={disabled} className={button} onClick={()=>setCreating(x=>!x)}>{es?'Nueva encuesta':'New poll'}</button>}
  {creating&&<section className="rounded-[6px] border border-border bg-white p-4"><PollForm locale={locale} disabled={disabled} send={send}/></section>}
  {!data.items.length&&<p className="text-sm text-muted-foreground">{es?'No hay encuestas en esta página.':'No polls on this page.'}</p>}
  {data.items.map(p=><article key={p.id} className="space-y-3 rounded-[6px] border border-border bg-white p-4">
   <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-headline text-lg font-semibold text-deep break-words">{p.question}</h2><span className="text-xs text-muted-foreground">{labels[p.status][lang]} · {p.language.toUpperCase()} · v{p.version}</span></div>
   <p className="text-xs text-muted-foreground">UTC: {new Date(p.opensAt).toISOString()} — {new Date(p.closesAt).toISOString()} · {es?'Límite':'Cap'} {p.cap}{p.closedAt?' · '+(es?'Cerrada':'Closed'):''}</p>
   <ol className="space-y-1 text-sm">{p.options.map((o,i)=><li key={i} className="flex justify-between gap-3"><span>{i+1}. {o}</span>{p.counts&&<span>{p.counts[i]} {es?'votos':'votes'}</span>}</li>)}</ol>
   {p.resultsReleased&&<p className="text-xs text-muted-foreground">{es?'Resultados autorizados para publicación (mínimo cinco respuestas).':'Results authorized for public release (minimum five responses).'}</p>}
   <div className="flex flex-wrap gap-2">
    {placementsEnabled&&<Link className={button} href={'/newsroom/polls/'+p.id+'/placements'+(placementContext?'?'+new URLSearchParams(placementContext).toString():'')}>{es?'Ubicaciones':'Placements'}</Link>}
    {data.canEdit&&p.status==='draft'&&<><button type="button" className={button} disabled={disabled} onClick={()=>setEditing(editing===p.id?null:p.id)}>{es?'Editar':'Edit'}</button>{act(p,'submit',es?'Enviar a revisión':'Submit for review')}</>}
    {data.canEdit&&['in_review','approved'].includes(p.status)&&act(p,'withdraw',es?'Volver a borrador':'Withdraw to draft')}
    {data.canPublish&&p.status==='in_review'&&<>{p.canApprove&&act(p,'approve',es?'Aprobar':'Approve')}{act(p,'return',es?'Devolver':'Return to draft')}</>}
    {data.canPublish&&p.status==='approved'&&act(p,'publish',es?'Publicar':'Publish')}
    {data.canPublish&&p.status==='published'&&<>{!p.closedAt&&Date.parse(p.closesAt)>now&&act(p,'close',es?'Cerrar votación':'Close voting')}{act(p,'retire',es?'Retirar':'Retire')}</>}
    {data.canManageResults&&p.status==='published'&&!p.resultsReleased&&(p.closedAt||Date.parse(p.closesAt)<=now)&&act(p,'release_results',es?'Publicar resultados':'Release results')}
   </div>
   {editing===p.id&&data.canEdit&&p.status==='draft'&&<PollForm poll={p} locale={locale} disabled={disabled} send={send}/>}
  </article>)}
 </div>;
}
