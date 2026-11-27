import Link from 'next/link';
import type {Locale} from '@/types';
import {getWorkspaceAccess} from '@/lib/services/newsroom-workspace';
import {readDashboardActivity} from '@/lib/services/newsroom-dashboard';
import type {InboxPage,InboxMode} from '@/lib/permissions/review-inbox-contract';
import {reviewInboxEnabled} from '@/lib/services/review-inbox';
import {getDictionary} from '@/lib/i18n/dictionaries';
const panel='space-y-2 rounded-lg border border-border bg-white p-3';
export async function DashboardActivity({locale,includeAssignments}:{locale:Locale;includeAssignments:boolean}){
 const es=locale==='es',dict=getDictionary(locale),access=await getWorkspaceAccess();
 if(!access.allowed)return null;
 const data=await readDashboardActivity(includeAssignments);if(!data)return null;
 const links=[
  {key:'stories',href:'/newsroom/stories',label:dict.newsroom.stories},
  {key:'newStory',href:access.createStory?'/newsroom/stories/new':'/newsroom/contributor/new',label:dict.newsroom.newStory},
  {key:'media',href:'/newsroom/media',label:dict.newsroom.media},
  {key:'authors',href:'/newsroom/authors',label:dict.newsroom.authors},
  {key:'pageEditor',href:'/newsroom/page-editor',label:dict.newsroom.pageEditor},
  {key:'team',href:'/newsroom/team',label:dict.newsroom.team},
  {key:'profile',href:'/newsroom/profile',label:es?'Perfil':'Profile'},
  {key:'comments',href:'/newsroom/comments',label:dict.newsroom.comments},
  {key:'reports',href:'/newsroom/reports',label:es?'Denuncias':'Reports'},
  {key:'schedule',href:'/newsroom/schedule',label:dict.newsroom.schedule},
  {key:'polls',href:'/newsroom/polls',label:dict.newsroom.polls}
 ].filter(l=>access.nav.some(k=>k===l.key));
 const date=(v:string)=>new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short',timeZone:'America/Bogota'}).format(new Date(v));
 const decisions:Record<string,string>=es?{approved:'Aprobada',changes_requested:'Cambios solicitados',rejected:'Rechazada'}:{approved:'Approved',changes_requested:'Changes requested',rejected:'Rejected'};
 function reviews(mode:InboxMode,result:{data:InboxPage|null;unavailable:boolean}|null,label:string){
  if(!result)return null;
  return <section className={panel}><div className="flex flex-wrap justify-between gap-2"><h2 className="font-headline text-lg font-semibold text-deep">{label}</h2><Link className="text-sm text-primary underline" href={'/newsroom/reviews?mode='+mode}>{es?'Ver bandeja':'Open inbox'}</Link></div>
   {result.unavailable?<p role="alert" className="text-sm text-muted-foreground">{es?'No disponible. Actualice esta página.':'Unavailable. Refresh this page.'}</p>:!result.data?.items.length?<p className="text-sm text-muted-foreground">{es?'No hay elementos accesibles.':'No accessible items.'}</p>:<><ul className="divide-y divide-border">{result.data.items.slice(0,3).map(item=><li key={item.id} className="py-2"><Link className="break-words text-sm font-semibold text-deep underline" href={'/newsroom/stories/'+item.storyId+'/review?kind='+item.kind}>{item.headline}</Link><p className="text-xs text-muted-foreground">{item.decision?decisions[item.decision]+(!item.readAt?(es?' · No leído':' · Unread'):''):(es?'Pendiente':'Pending')} · {date(item.at)}</p></li>)}</ul>{(result.data.items.length>5||result.data.hasMore)&&<p className="text-xs text-muted-foreground">{es?'Vista parcial; consulte la bandeja.':'Partial view; open the inbox for more.'}</p>}</>}
  </section>;
 }
 return <div className="mt-3 grid min-w-0 gap-3 xl:grid-cols-2">
  {includeAssignments&&<section className={panel}><h2 className="font-headline text-lg font-semibold text-deep">{es?'Herramientas autorizadas':'Authorized tools'}</h2><div className="flex flex-wrap gap-2">{links.map(l=><Link className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-surface-muted" key={l.key} href={l.href}>{l.label}</Link>)}{reviewInboxEnabled()&&<Link className="rounded-md border border-border px-3 py-2 text-sm font-medium" href="/newsroom/reviews">{es?'Bandeja editorial':'Review inbox'}</Link>}</div></section>}
  {data.assigned&&<section className={panel}><h2 className="font-headline text-lg font-semibold text-deep">{es?'Mis asignaciones activas':'My active assignments'}</h2>
   {data.assigned.unavailable?<p role="alert" className="text-sm text-muted-foreground">{es?'No se pudieron cargar las asignaciones.':'Unable to load assignments.'}</p>:!data.assigned.items.length?<p className="text-sm text-muted-foreground">{es?'No hay asignaciones accesibles en esta página.':'No accessible assignments on this page.'}</p>:<ul className="divide-y divide-border">{data.assigned.items.slice(0,5).map(s=><li key={s.id} className="py-2"><Link className="break-words text-sm font-semibold text-deep underline" href={'/newsroom/stories/'+s.id+'/preview'}>{s.headline}</Link>{s.dueAt&&<p className="text-xs text-muted-foreground">{es?'Vence':'Due'} {date(s.dueAt)} · Bogotá</p>}</li>)}</ul>}
   <Link href="/newsroom/contributor" className="text-sm text-primary underline">{es?'Ver mis asignaciones':'See my assignments'}</Link>
  </section>}
  <div className="grid min-w-0 gap-3 lg:grid-cols-2 xl:col-span-2">{reviews('pending',data.pending,es?'Solicitudes pendientes':'Pending reviews')}{reviews('feedback',data.feedback,es?'Mis decisiones recientes':'My recent review feedback')}</div>
 </div>;
}
