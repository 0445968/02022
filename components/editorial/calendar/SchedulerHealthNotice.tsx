import 'server-only';
import type {Locale} from '@/types';
import {readSchedulerHealth} from '@/lib/services/editorial-calendar';
import type {SchedulerHealth} from '@/lib/permissions/scheduler-health-contract';
export async function SchedulerHealthNotice({locale,compact=false}:{locale:Locale;compact?:boolean}){
 const es=locale==='es';
 let health:SchedulerHealth|null=null;
 try{health=await readSchedulerHealth();}catch{/* Explicit unavailable state, no false assurance. */}
 const labels={paused:es?'Ejecución automática en pausa':'Automatic execution paused',awaiting_first_run:es?'Sin ejecución confirmada desde la habilitación':'No confirmed run since enabling',heartbeat_stale:es?'Última ejecución hace más de cinco minutos':'Last completed run more than five minutes ago',recent_run:es?'Ejecución reciente confirmada':'Recent completed run confirmed'};
 return <aside className={compact?"flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border bg-white px-3 py-1.5 text-xs text-muted-foreground":"rounded-[6px] border border-border bg-white p-3 text-xs text-muted-foreground"}>
  <p className="font-semibold text-deep">{health?labels[health.state]:(es?'No se pudo verificar el programador':'Scheduler status unavailable')}</p>
  {health?.lastRunAt&&<p className="mt-1">{es?'Última ejecución confirmada':'Last completed run'}: {new Intl.DateTimeFormat(locale,{timeZone:'UTC',dateStyle:'medium',timeStyle:'short'}).format(new Date(health.lastRunAt))} UTC</p>}
  <p className="mt-1">{es?'Esto no confirma la instalación ni la ejecución futura de un trabajo automático.':'This does not confirm that an automated job is installed or will run in the future.'}</p>
 </aside>;
}
