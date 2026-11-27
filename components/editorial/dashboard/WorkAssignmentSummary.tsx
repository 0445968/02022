import Link from 'next/link';
import {readWorkOverview,workOverviewEnabled,workAssignmentModes} from '@/lib/services/work-assignments';
import type {WorkOverview} from '@/lib/permissions/standalone-assignment-contract';
import {WorkDeadlineList} from '@/components/editorial/WorkDeadlineList';
export async function WorkAssignmentSummary({locale,mode}:{locale:'en'|'es';mode?:'team'|'personal'}){
 if(!workOverviewEnabled())return null;
 const modes=await workAssignmentModes(),chosen=mode??(modes.team?'team':'personal');
 if(!modes[chosen])return null;
 const es=locale==='es';
 let data:WorkOverview;try{data=await readWorkOverview(chosen,null,true);}catch{return <p role="alert" className="mt-3 text-xs text-muted-foreground">{es?'Resumen de asignaciones no disponible.':'Assignment summary unavailable.'}</p>;}
 return <section className="mt-3 rounded-xl border border-border bg-white p-3">
 <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-headline text-lg font-semibold text-deep">{es?'Asignaciones de trabajo':'Work assignments'} · {chosen==='team'?(es?'Equipo':'Team'):(es?'Personal':'Personal')}</h2><Link className="text-sm text-primary underline" href={'/newsroom/assignments?mode='+chosen}>{es?'Ver asignaciones':'View assignments'}</Link></div>
 <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{([[es?'Activas':'Active',data.counts.active],[es?'Bloqueadas':'Blocked',data.counts.blocked],[es?'Vencidas':'Overdue',data.counts.overdue],[es?'En 48 horas':'Due in 48 hours',data.counts.dueSoon]] as const).map(([label,value])=><div key={label} className="rounded-lg bg-surface-muted p-2"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-lg font-semibold text-deep">{value}</dd></div>)}</dl>
 <WorkDeadlineList locale={locale} rows={data.items.slice(0,5)} mode={chosen} zone="America/Bogota"/><p className="mt-2 text-xs text-muted-foreground">{es?'Totales de todas las asignaciones autorizadas; hasta cinco próximas o vencidas.':'Totals across authorized work; up to five upcoming or overdue deadlines.'}</p>
 </section>;
}
