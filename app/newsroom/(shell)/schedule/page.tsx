import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth/session';
import {newsroomLocale} from '@/lib/services/newsroom-workspace';
import {canEnterEditorialCalendar,readEditorialCalendar} from '@/lib/services/editorial-calendar';
import {reviewedSchedulingEnabled} from '@/lib/services/reviewed-schedule';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import type {CalendarItem,CalendarFilter,CalendarMode,CalendarPage} from '@/lib/permissions/editorial-calendar-contract';
import {CALENDAR_ZONES,calendarZone,calendarMonth,localDay,monthCells,monthRange,shiftMonth} from '@/lib/permissions/calendar-view';
import {CancelCalendarSchedule} from '@/components/editorial/calendar/CancelCalendarSchedule';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function SchedulePage({searchParams}:{searchParams:{month?:string;zone?:string;mode?:string;filter?:string;view?:string;page?:string}}){
 const user=await getCurrentUser();
 if(!user)redirect('/en/auth/sign-in?next=%2Fnewsroom%2Fschedule');
 if(!await canEnterEditorialCalendar())notFound();
 const locale=await newsroomLocale(user),es=locale==='es';
 const zone=searchParams.zone??'America/Bogota';if(!calendarZone(zone))notFound();
 const month=searchParams.month??localDay(new Date(),zone).slice(0,7);
 const mode=searchParams.mode??'range',filter=searchParams.filter??'all',view=searchParams.view??'month',raw=searchParams.page??'0';
 if(!calendarMonth(month)||(mode!=='range'&&mode!=='attention')||(filter!=='all'&&filter!=='assignments'&&filter!=='publications')||(view!=='month'&&view!=='agenda')||typeof raw!=='string'||!/^\d{1,3}$/.test(raw)||Number(raw)>100)notFound();
 const page=Number(raw);
 let data:CalendarPage;
 try{data=await readEditorialCalendar({...monthRange(month,zone),mode:mode as CalendarMode,filter:filter as CalendarFilter,page});}
 catch(e){if(e instanceof DraftHttpError&&[403,404].includes(e.status))notFound();return <p role="alert" className="p-6 text-sm text-muted-foreground">{es?'No se pudo cargar el calendario. Actualice la página.':'Unable to load the calendar. Refresh the page.'}</p>;}
 const href=(changes:Record<string,string>={})=>'/newsroom/schedule?'+new URLSearchParams({month,zone,mode,filter,view,page:'0',...changes}).toString();
 const fmt=new Intl.DateTimeFormat(locale,{timeZone:zone,dateStyle:'medium',timeStyle:'short'});
 const title=new Intl.DateTimeFormat(locale,{timeZone:'UTC',month:'long',year:'numeric'}).format(new Date(month+'-01T00:00:00Z'));
 const previous=shiftMonth(month,-1),next=shiftMonth(month,1),scheduling=reviewedSchedulingEnabled();
 const dayItems=new Map<string,CalendarItem[]>();
 for(const item of data.items){if(item.dueAt){const key=localDay(item.dueAt,zone);dayItems.set(key,[...(dayItems.get(key)??[]),item]);}}
 const label=(i:CalendarItem)=>{
  if(i.kind==='legacy')return es?'Programación anterior sin verificar':'Unverified legacy schedule';
  if(i.kind==='assignment'){
   const roles={author:es?'Autor':'Author',editor:es?'Editor':'Editor',reviewer:es?'Revisor':'Reviewer',copy:es?'Corrección':'Copy',visual:es?'Visual':'Visual'};
   return (i.assignmentType?roles[i.assignmentType]:'')+' · '+(es?'Entrega':'Deadline');
  }
  return i.state==='blocked'?(es?'Publicación bloqueada':'Publication blocked'):i.snapshotCurrent===false?(es?'Revisión desactualizada':'Review out of date'):(es?'En cola de publicación':'Queued for publication');
 };
 const time=(i:CalendarItem)=>i.dueAt?fmt.format(new Date(i.dueAt)):(es?'Sin fecha':'No date');
 const overdue=(i:CalendarItem)=>i.dueAt!==null&&Date.parse(i.dueAt)<=Date.parse(data.asOf);
 const card=(i:CalendarItem,compact=false)=><article key={i.kind+':'+i.id} className={'space-y-1 rounded-[6px] border border-border bg-white '+(compact?'p-2':'p-3')}>
  <p className="text-xs font-semibold text-muted-foreground">{label(i)}{overdue(i)?' · '+(es?'Vencido':'Due / overdue'):''}</p>
  <Link prefetch={false} className="block break-words text-sm font-semibold text-deep hover:underline" href={'/newsroom/stories/'+i.storyId+'/preview'}>{i.headline}</Link>
  <p className="text-xs text-muted-foreground">{time(i)}</p>
  {i.kind==='assignment'&&(i.mine||i.assignee)&&<p className="break-words text-xs">{i.mine?(es?'Mi asignación':'My assignment'):i.assignee}</p>}
  {i.kind==='publication'&&<p className="text-xs">{i.source==='revision'?(es?'Cambios de artículo publicado':'Published story changes'):(es?'Borrador':'Draft')}{i.snapshotCurrent===false?' · '+(es?'Contenido ya no coincide':'Content no longer matches'):''}</p>}
  {i.kind==='publication'&&i.canCancel&&scheduling&&<CancelCalendarSchedule item={i} locale={locale}/>}
 </article>;
 const control="rounded-[6px] border border-border bg-white px-3 py-2 text-sm hover:bg-surface-muted";
 return <section className="space-y-4 p-4 md:p-6">
  <header><h1 className="text-2xl font-bold text-deep">{es?'Calendario editorial':'Editorial calendar'}</h1><p className="mt-1 text-sm text-muted-foreground">{es?'Entregas y publicaciones dentro de su acceso. Estar en cola no garantiza la ejecución automática.':'Deadlines and publication queues within your access. A queued item does not guarantee automatic execution.'}</p></header>
  <form method="get" action="/newsroom/schedule" className="flex flex-wrap items-end gap-3 rounded-[6px] border border-border bg-white p-3">
   <label className="text-sm">{es?'Mes':'Month'}<input className={'mt-1 block '+control} type="month" name="month" min="2000-01" max="2100-12" defaultValue={month} required/></label>
   <label className="text-sm">{es?'Zona horaria':'Time zone'}<select className={'mt-1 block '+control} name="zone" defaultValue={zone}>{CALENDAR_ZONES.map(z=><option key={z} value={z}>{z}</option>)}</select></label>
   <label className="text-sm">{es?'Tipo':'Type'}<select className={'mt-1 block '+control} name="filter" defaultValue={filter}><option value="all">{es?'Todo':'All'}</option><option value="assignments">{es?'Asignaciones':'Assignments'}</option><option value="publications">{es?'Publicaciones':'Publications'}</option></select></label>
   <label className="text-sm">{es?'Modo':'Mode'}<select className={'mt-1 block '+control} name="mode" defaultValue={mode}><option value="range">{es?'Mes elegido':'Selected month'}</option><option value="attention">{es?'Requiere atención (todas las fechas)':'Needs attention (all dates)'}</option></select></label>
   <label className="text-sm">{es?'Vista':'View'}<select className={'mt-1 block '+control} name="view" defaultValue={view}><option value="month">{es?'Calendario':'Calendar'}</option><option value="agenda">{es?'Agenda':'Agenda'}</option></select></label>
   <button className="rounded-[6px] bg-deep px-4 py-2 text-sm font-semibold text-white" type="submit">{es?'Aplicar':'Apply'}</button>
  </form>
  <div className="flex flex-wrap items-center gap-3">
   {mode==='range'&&calendarMonth(previous)&&<Link prefetch={false} className={control} href={href({month:previous})}>{es?'Anterior':'Previous month'}</Link>}
   <h2 className="text-lg font-semibold text-deep capitalize">{mode==='range'?title:(es?'Requiere atención':'Needs attention')}</h2>
   {mode==='range'&&calendarMonth(next)&&<Link prefetch={false} className={control} href={href({month:next})}>{es?'Siguiente':'Next month'}</Link>}
   <Link prefetch={false} className={control} href={href({page:String(page)})}>{es?'Actualizar':'Refresh'}</Link>
  </div>
  <p className="text-xs text-muted-foreground">{zone} · {es?'Datos al':'As of'} {fmt.format(new Date(data.asOf))}. {es?'Página':'Page'} {page+1}{data.hasMore?(es?' · Hay más resultados':' · More results available'):''}. {es?'Solo se muestran los elementos de esta página.':'Only items on this page are displayed.'}</p>
  {data.items.length===0&&<p className="rounded-[6px] border border-border p-4 text-sm text-muted-foreground">{es?'No hay elementos en esta página.':'No items on this page.'}</p>}
  {mode==='range'&&view==='month'&&<div className="overflow-x-auto"><div className="grid min-w-[900px] grid-cols-7 gap-px rounded-[6px] border border-border bg-border">
    {Array.from({length:7},(_,d)=>new Intl.DateTimeFormat(locale,{weekday:'short',timeZone:'UTC'}).format(new Date(Date.UTC(2026,0,5+d)))).map(d=><div key={d} className="bg-surface-muted p-2 text-xs font-semibold">{d}</div>)}
    {monthCells(month).map((day,index)=><div key={day??'empty-'+index} className="min-h-[96px] space-y-1 bg-white p-1.5">{day&&<><p className="px-1 text-xs font-semibold text-muted-foreground">{Number(day.slice(-2))}</p>{(dayItems.get(day)??[]).map(i=>card(i,true))}</>}</div>)}
   </div></div>}
  {(mode==='attention'||view==='agenda')&&<div className="grid gap-2 md:grid-cols-2">{data.items.map(i=>card(i))}</div>}
  <nav aria-label={es?'Páginas del calendario':'Calendar pages'} className="flex gap-3">{page>0&&<Link prefetch={false} className={control} href={href({page:String(page-1)})}>{es?'Página anterior':'Previous page'}</Link>}{data.hasMore&&<Link prefetch={false} className={control} href={href({page:String(page+1)})}>{es?'Página siguiente':'Next page'}</Link>}</nav>
 </section>;
}
