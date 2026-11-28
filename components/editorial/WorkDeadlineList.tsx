import Link from 'next/link';
import {ASSIGNMENT_ACTIVITIES,ASSIGNMENT_WORK_STATUSES,type WorkOverviewRow} from '@/lib/permissions/standalone-assignment-contract';
export function WorkDeadlineList({rows,locale,mode,zone}:{rows:WorkOverviewRow[];locale:'en'|'es';mode:'team'|'personal';zone:string}){
 const es=locale==='es',fmt=new Intl.DateTimeFormat(locale,{timeZone:zone,dateStyle:'medium',timeStyle:'short'});
 if(!rows.length)return <p className="mt-2 text-xs text-muted-foreground">{es?'Sin entregas en este intervalo.':'No deadlines in this interval.'}</p>;
 return <ul className="mt-2 divide-y divide-border">{rows.map(row=><li key={row.id} className="flex flex-wrap items-center justify-between gap-1 py-2"><div className="min-w-0"><Link prefetch={false} className="break-words text-sm font-semibold text-primary hover:underline" href={'/newsroom/assignments?mode='+mode+'&id='+row.id}>{row.title}</Link><p className="text-xs text-muted-foreground">{ASSIGNMENT_ACTIVITIES.find(a=>a[0]===row.activity)?.[es?2:1]} · {ASSIGNMENT_WORK_STATUSES.find(a=>a[0]===row.status)?.[es?2:1]}</p></div><time className="text-xs text-muted-foreground" dateTime={row.dueAt}>{fmt.format(new Date(row.dueAt))}</time></li>)}</ul>;
}
