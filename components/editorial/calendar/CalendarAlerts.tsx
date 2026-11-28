import 'server-only';
import Link from 'next/link';
import {SchedulerHealthNotice} from './SchedulerHealthNotice';
import type {Locale} from '@/types';
import type {CalendarItem,CalendarPage} from '@/lib/permissions/editorial-calendar-contract';
import {canEnterEditorialCalendar,readEditorialCalendar} from '@/lib/services/editorial-calendar';
import {CALENDAR_SOON_MS,calendarAlertPreview,calendarItemReasons} from '@/lib/permissions/calendar-alerts';

const ZONE='America/Bogota';
// Server request time, not client render state.
async function requestClock(){return Date.now();}
export async function CalendarAlerts({locale}:{locale:Locale}){
 if(!await canEnterEditorialCalendar())return null;
 const es=locale==='es',now=await requestClock(),start=new Date(now).toISOString(),end=new Date(now+CALENDAR_SOON_MS).toISOString();
 const result=await Promise.allSettled([
  readEditorialCalendar({start,end,mode:'attention',filter:'all',page:0}),
  readEditorialCalendar({start,end,mode:'range',filter:'all',page:0})
 ]);
 const fmt=new Intl.DateTimeFormat(locale,{timeZone:ZONE,dateStyle:'medium',timeStyle:'short'});
 const names={conflict:es?'Posible conflicto de entrega':'Potential deadline conflict',overdue:es?'Vence / vencido':'Due / overdue',soon:es?'Próximo':'Upcoming',blocked:es?'Bloqueado':'Blocked',stale:es?'Contenido desactualizado':'Content out of date',legacy:es?'Programación anterior sin verificar':'Unverified legacy schedule'};
 const itemLabel=(item:CalendarItem)=>item.kind==='assignment'?(es?'Entrega':'Assignment deadline'):item.kind==='legacy'?names.legacy:item.source==='revision'?(es?'Publicación de cambios':'Revision publication'):(es?'Publicación en cola':'Queued publication');
 const group=(title:string,page:CalendarPage|null,href:string)=>{
  const preview=page?calendarAlertPreview(page):null;
  return <div className="space-y-2">
   <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-deep">{title}</h3><Link prefetch={false} href={href} className="text-xs font-medium text-primary underline">{es?'Ver calendario':'View calendar'}</Link></div>
   {!preview?<p role="alert" className="text-sm text-muted-foreground">{es?'No se pudieron verificar los elementos. Actualice esta página.':'Unable to verify items. Refresh this page.'}</p>:<>
    {preview.items.length===0?<p className="text-xs text-muted-foreground">{es?'No se devolvieron elementos en esta consulta.':'No items returned by this query.'}</p>:<ul className="divide-y divide-border">
      {preview.items.map(i=><li className="py-2" key={i.kind+':'+i.id}>
       <Link prefetch={false} className="block break-words text-sm font-medium text-deep hover:underline" href={'/newsroom/stories/'+i.storyId+'/preview'}>{i.headline}</Link>
       <p className="mt-1 text-xs text-muted-foreground">{itemLabel(i)}{i.dueAt?' · '+fmt.format(new Date(i.dueAt)):''}</p>
       {calendarItemReasons(i,preview.asOf).filter(reason=>reason!=='legacy'||i.kind!=='legacy').map(reason=><span key={reason} className="mr-2 text-xs font-medium text-deep">{names[reason]}</span>)}
      </li>)}
    </ul>}
    {preview.more&&<p className="text-xs text-muted-foreground">{es?'Vista parcial; hay más elementos.':'Partial preview; more items available.'}</p>}
    <p className="text-xs text-muted-foreground">{es?'Datos al':'As of'} {fmt.format(new Date(preview.asOf))}</p>
   </>}
  </div>;
 };
 return <section className="mt-3 space-y-2 rounded-xl border border-border bg-white p-3">
  <h2 className="font-headline text-lg font-semibold text-deep">{es?'Alertas editoriales':'Editorial alerts'}</h2>
  <p className="text-xs text-muted-foreground">{es?'Vista previa de elementos autorizados (hasta cinco por grupo). Las colas no garantizan la publicación automática.':'Preview of authorized items (up to five per group). Queues do not guarantee automatic publication.'} · {ZONE}</p>
  <SchedulerHealthNotice locale={locale}/>
  <div className="grid gap-3 md:grid-cols-2">
   {group(es?'Requiere atención':'Needs attention',result[0].status==='fulfilled'?result[0].value:null,'/newsroom/schedule?mode=attention&view=agenda')}
   {group(es?'Próximas 48 horas':'Next 48 hours',result[1].status==='fulfilled'?result[1].value:null,'/newsroom/schedule?view=agenda')}
  </div>
 </section>;
}
