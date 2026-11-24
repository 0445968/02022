import {canPickAssignedMedia} from '@/lib/services/assigned-media';
import {notFound,redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth/session';
import {getDictionary} from '@/lib/i18n/dictionaries';
import {newsroomLocale} from '@/lib/services/newsroom-workspace';
import {assignedRevisionEnabled,readAssignedRevision} from '@/lib/services/assigned-revisions';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {AssignedDraftEditor} from '@/components/editorial/story-editor/AssignedDraftEditor';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false}};
export default async function AssignedRevisionPage({params}:{params:{id:string}}){
 if(!assignedRevisionEnabled())notFound();
 const user=await getCurrentUser();
 if(!user)redirect('/en/auth/sign-in?next=%2Fnewsroom%2Fcontributor');
 const locale=await newsroomLocale(user);
 let state;
 try{state=await readAssignedRevision(params.id);}
 catch(e){if(e instanceof DraftHttpError&&[403,404,409].includes(e.status))notFound();
  return <p role="alert" className="p-6 text-sm text-muted-foreground">{locale==='es'?'No se pudo cargar la revisión. Actualice la página.':'Unable to load revision. Refresh this page.'}</p>;}
 return <AssignedDraftEditor key={state.id} initial={state} revisionMode approvedMedia={state.status==='draft'&&await canPickAssignedMedia(state.id,true)} dict={getDictionary(locale)} locale={locale} userId={user.id}/>;
}
