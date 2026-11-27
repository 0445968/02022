import {notFound} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth/session';
import {newsroomLocale} from '@/lib/services/newsroom-workspace';
import {workAssignmentModes,readWorkAssignments,workAssignmentsEnabled} from '@/lib/services/work-assignments';
import {WorkAssignmentsWorkspace} from '@/components/editorial/work-assignments-workspace';
export const dynamic='force-dynamic';
export default async function WorkAssignmentsPage(){
 if(!workAssignmentsEnabled())notFound();
 const modes=await workAssignmentModes();
 if(!modes.team&&!modes.personal)notFound();
 const locale=await newsroomLocale(await getCurrentUser());
 const initial=await readWorkAssignments(modes.team?'team':'personal');
 return <WorkAssignmentsWorkspace locale={locale} initial={initial} personalAllowed={modes.personal}/>;
}
