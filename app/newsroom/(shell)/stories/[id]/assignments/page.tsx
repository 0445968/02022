import {notFound,redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth/session';
import {newsroomLocale} from '@/lib/services/newsroom-workspace';
import {assignmentManagementEnabled,readStoryAssignments} from '@/lib/services/story-assignments';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {StoryAssignmentManager} from '@/components/editorial/story-editor/StoryAssignmentManager';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false}};
export default async function StoryAssignmentPage({params}:{params:{id:string}}){
 if(!assignmentManagementEnabled())notFound();
 const user=await getCurrentUser();
 if(!user)redirect('/en/auth/sign-in?next=%2Fnewsroom%2Fstories');
 const locale=await newsroomLocale(user);
 let state;
 try{state=await readStoryAssignments(params.id);}
 catch(e){if(e instanceof DraftHttpError&&[403,404].includes(e.status))notFound();
  return <p role="alert" className="p-6 text-sm text-muted-foreground">{locale==='es'?'No se pudieron cargar las asignaciones. Actualice la página.':'Unable to load assignments. Refresh the page.'}</p>;}
 return <StoryAssignmentManager key={state.storyId} initial={state} locale={locale}/>;
}
