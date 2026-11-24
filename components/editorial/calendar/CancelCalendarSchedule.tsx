'use client';
import {useState,useRef} from 'react';
import {useRouter} from 'next/navigation';
import type {CalendarItem} from '@/lib/permissions/editorial-calendar-contract';
import type {Locale} from '@/types';
export function CancelCalendarSchedule({item,locale}:{item:CalendarItem;locale:Locale}){
 const es=locale==='es',router=useRouter(),inFlight=useRef(false);
 const [confirm,setConfirm]=useState(false),[state,setState]=useState<'idle'|'saving'|'refresh'>('idle'),[message,setMessage]=useState('');
 async function cancel(){
  if(inFlight.current||state!=='idle'||!confirm||item.kind!=='publication'||!item.canCancel||!item.source)return;
  inFlight.current=true;setState('saving');
  try{
   const res=await fetch('/api/newsroom/stories/'+item.storyId+'/schedule-reviewed',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'cancel',kind:item.source,scheduleId:item.id})});
   const data=await res.json();
   if(!res.ok||data.id!==item.id||data.state!=='cancelled')throw Error();
   setMessage(es?'Programación cancelada. Actualizando…':'Schedule cancelled. Refreshing…');setState('refresh');router.refresh();
  }catch{setMessage(es?'No se pudo confirmar el resultado. Recargue antes de reintentar.':'Result could not be confirmed. Reload before retrying.');setState('refresh');}
  finally{inFlight.current=false;}
 }
 return <div className="mt-2 space-y-1 text-xs">
 {state==='idle'&&!confirm&&<button type="button" className="text-primary underline" onClick={()=>setConfirm(true)}>{es?'Cancelar programación':'Cancel schedule'}</button>}
 {confirm&&state==='idle'&&<div className="space-y-1"><p>{es?'¿Cancelar esta publicación programada? No se publicará automáticamente.':'Cancel this scheduled publication? It will not publish automatically.'}</p><div className="flex flex-wrap gap-3"><button type="button" className="font-semibold text-primary underline" onClick={cancel}>{es?'Confirmar cancelación':'Confirm cancellation'}</button><button type="button" className="underline" onClick={()=>setConfirm(false)}>{es?'Volver':'Back'}</button></div></div>}
 {state==='saving'&&<p role="status">{es?'Cancelando…':'Cancelling…'}</p>}
 {state==='refresh'&&<div role="status">{message} <button type="button" className="underline" onClick={()=>window.location.reload()}>{es?'Recargar':'Reload'}</button></div>}
 </div>;
}
