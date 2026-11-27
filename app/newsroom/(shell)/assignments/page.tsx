import {notFound} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth/session';
import {newsroomLocale} from '@/lib/services/newsroom-workspace';
import {workAssignmentModes,readWorkAssignments,workAssignmentsEnabled,workOverviewEnabled,workSearchEnabled} from '@/lib/services/work-assignments';
import {WorkAssignmentsWorkspace} from '@/components/editorial/work-assignments-workspace';
export const dynamic='force-dynamic';
export default async function WorkAssignmentsPage({searchParams}:{searchParams:Promise<{mode?:string;id?:string}>}){
 if(!workAssignmentsEnabled())notFound();
 const modes=await workAssignmentModes();
 if(!modes.team&&!modes.personal)notFound();
 const locale=await newsroomLocale(await getCurrentUser());
 const q=await searchParams,mode=q.mode==='personal'&&modes.personal?'personal':modes.team?'team':'personal';
 const initial=await readWorkAssignments(mode);
 let detail=null; if(q.id){try{detail=await readWorkAssignments(mode,0,q.id);}catch{notFound();}}
 return <WorkAssignmentsWorkspace locale={locale} initial={initial} detail={detail} personalAllowed={modes.personal} lookupEnabled={workOverviewEnabled()} searchEnabled={workSearchEnabled()}/>;
}
