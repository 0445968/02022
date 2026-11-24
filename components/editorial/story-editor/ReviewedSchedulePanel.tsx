'use client';
import {useState,useRef,useMemo} from 'react';
import type {Locale} from '@/types';
import {CALENDAR_ZONES,calendarZone,schedulingInstants,type CalendarZone} from '@/lib/permissions/calendar-view';
import type {ReviewState} from '@/lib/permissions/story-review-contract';
import type {ReviewedSchedule,ScheduleCommand} from '@/lib/permissions/reviewed-schedule-contract';
const button='rounded-md border border-border bg-white px-3 py-2 text-sm font-medium hover:bg-surface-muted disabled:opacity-50';
export function ReviewedSchedulePanel({state,schedule,canManage,locale}:{state:ReviewState;schedule:ReviewedSchedule|null;canManage:boolean;locale:Locale}){
 const es=locale==='es';
 const [due,setDue]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[blocked,setBlocked]=useState(false);
 const [zone,setZone]=useState<CalendarZone>('America/Bogota'),[choice,setChoice]=useState('');
 const instants=useMemo(()=>schedulingInstants(due,zone),[due,zone]);
 const selected=instants.length===1?instants[0]:instants.includes(choice)?choice:'';
 const inFlight=useRef(false);
 if(!schedule&&(!canManage||!state.current||state.decision!=='approved'||!state.requestId))return null;
 async function submit(){
  if(inFlight.current||busy||blocked)return;
  let c:ScheduleCommand;
  if(schedule){
   if(!schedule.canCancel||!window.confirm(es?'¿Cancelar esta publicación programada?':'Cancel this queued publication?'))return;
   c={action:'cancel',kind:state.kind,scheduleId:schedule.id};
  }else{
   if(!canManage||!state.current||state.decision!=='approved'||!state.requestId||!due)return;
   if(!selected){setError(es?'Seleccione una hora válida y una opción UTC.':'Choose a valid time and UTC occurrence.');return;}
   const time=new Date(selected);
   if(!Number.isFinite(time.getTime())||time.getTime()<=Date.now()){setError(es?'Seleccione una fecha futura.':'Select a future date.');return;}
   if(!window.confirm((es?'Confirmar fecha UTC: ':'Confirm UTC publication time: ')+time.toISOString()+' ('+due+' '+zone+')'))return;
   c={action:'schedule',kind:state.kind,requestId:state.requestId,fingerprint:state.fingerprint,dueAt:time.toISOString()};
  }
  inFlight.current=true;setBusy(true);setError('');
  try{
   const response=await fetch('/api/newsroom/stories/'+state.storyId+'/schedule-reviewed',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(c)});
   if(!response.ok){setBlocked(response.status!==422);setError(response.status===422?(es?'Revise la fecha y los medios.':'Check the date and media eligibility.'):(es?'No se pudo confirmar. Actualice antes de reintentar.':'Unable to confirm. Refresh before retrying.'));return;}
   const result=await response.json();
   if(!result||typeof result.id!=='string'||result.state!==(c.action==='cancel'?'cancelled':'pending'))throw Error();
   window.location.reload();
  }catch{setBlocked(true);setError(es?'Resultado incierto. Actualice la página.':'Uncertain result. Refresh the page.');}
  finally{inFlight.current=false;setBusy(false);}
 }
 return <section className="space-y-3 rounded-lg border border-border bg-white p-4">
  <h2 className="font-semibold">{es?'Publicación programada':'Scheduled publication'}</h2>
  <label className="block text-sm">{es?'Zona horaria':'Time zone'}<select value={zone} disabled={busy||blocked} onChange={e=>{if(calendarZone(e.target.value)){setZone(e.target.value);setChoice('');setError('');}}} className="mt-1 w-full rounded-md border border-border px-3 py-2">{CALENDAR_ZONES.map(z=><option key={z} value={z}>{z}</option>)}</select></label>
  {schedule?<><p className="text-sm">{new Intl.DateTimeFormat(locale,{timeZone:zone,dateStyle:'medium',timeStyle:'short'}).format(new Date(schedule.dueAt))+' · '+zone} · {schedule.state==='blocked'?(es?'Bloqueada':'Blocked'):(es?'En cola':'Queued')}</p>
   <p className="text-xs text-muted-foreground">{new Date(schedule.dueAt).toISOString()}</p>
   {!schedule.current&&<p role="alert" className="text-sm text-breaking">{es?'La aprobación ya no corresponde a la copia actual. Cancele y solicite otra revisión.':'Approval no longer matches the current copy. Cancel and obtain fresh review.'}</p>}
   {schedule.state==='blocked'&&<p className="text-sm text-muted-foreground">{es?'La ejecución fue bloqueada. Revise los permisos y medios antes de volver a programar.':'Execution was blocked. Check permissions and media before cancelling and rescheduling.'}</p>}
   {schedule.canCancel&&<button type="button" className={button} disabled={busy||blocked} onClick={()=>void submit()}>{es?'Cancelar programación':'Cancel schedule'}</button>}
  </>:<>
   <p className="text-sm text-muted-foreground">{es?'Se pondrá en cola esta versión aprobada. La ejecución automática requiere un programador activo.':'Queue this approved version. Automatic execution requires an active scheduler.'}</p>
   <label className="block text-sm">{es?'Fecha y hora en la zona elegida':'Date and time in selected zone'}<input type="datetime-local" min="2000-01-01T00:00" max="2100-12-31T23:59" value={due} disabled={busy||blocked} onChange={e=>{setDue(e.target.value);setChoice('');setError('');}} className="mt-1 w-full rounded-md border border-border px-3 py-2"/></label>
   {due&&instants.length===0&&<p role="alert" className="text-sm text-breaking">{es?'Hora inválida o inexistente por cambio de horario.':'Invalid or nonexistent civil time (daylight-saving gap).'}</p>}
   {instants.length>1&&<fieldset className="space-y-2"><legend className="text-sm font-medium">{es?'La hora ocurre dos veces. Elija el instante UTC.':'This time occurs twice. Choose the UTC occurrence.'}</legend>{instants.map((instant,index)=><label key={instant} className="flex gap-2 text-sm"><input type="radio" name={'occurrence-'+state.storyId+'-'+state.kind} checked={choice===instant} disabled={busy||blocked} onChange={()=>{setChoice(instant);setError('');}}/>{index===0?(es?'Primera':'First'):(es?'Segunda':'Second')} · {instant}</label>)}</fieldset>}
   {selected&&<p className="text-xs text-muted-foreground">UTC: {selected}</p>}
   <button type="button" className={button} disabled={!selected||busy||blocked} onClick={()=>void submit()}>{es?'Programar versión aprobada':'Schedule approved version'}</button>
  </>}
  {error&&<p role="alert" className="text-sm text-breaking">{error}</p>}
 </section>;
}
