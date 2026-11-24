import {canAccessStoryReview} from '@/lib/services/story-review';
import {canPickAssignedMedia} from '@/lib/services/assigned-media';
import {notFound,redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth/session';
import {getDictionary} from '@/lib/i18n/dictionaries';
import {newsroomLocale} from '@/lib/services/newsroom-workspace';
import {assignedDraftEnabled,readAssignedDraft} from '@/lib/services/assigned-drafts';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {AssignedDraftEditor} from '@/components/editorial/story-editor/AssignedDraftEditor';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false}};
export default async function AssignedDraftPage({params}:{params:{id:string}}){
 if(!assignedDraftEnabled())notFound();
 const user=await getCurrentUser();
 if(!user)redirect('/en/auth/sign-in?next=%2Fnewsroom%2Fcontributor');
 const locale=await newsroomLocale(user);
 let state;
 try{state=await readAssignedDraft(params.id);}
 catch(e){if(e instanceof DraftHttpError&&(e.status===403||e.status===404||e.status===409))notFound();
   return <p role="alert" className="p-6 text-sm text-muted-foreground">{locale==='es'?'No se pudo cargar el borrador. Actualice la página.':'Unable to load the draft. Refresh this page.'}</p>;}
 return <AssignedDraftEditor key={state.id} initial={state} reviewEnabled={await canAccessStoryReview(state.id,'draft')} approvedMedia={state.status==='draft'&&await canPickAssignedMedia(state.id,false)} dict={getDictionary(locale)} locale={locale} userId={user.id}/>;
}
