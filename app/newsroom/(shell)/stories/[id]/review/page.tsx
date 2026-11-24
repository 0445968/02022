import {notFound,redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth/session';
import {newsroomLocale,mayMountFullStoryEditor} from '@/lib/services/newsroom-workspace';
import {readStoryReview,storyReviewEnabled} from '@/lib/services/story-review';
import {reviewKind} from '@/lib/permissions/story-review-contract';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {StoryReviewPanel} from '@/components/editorial/story-editor/StoryReviewPanel';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function StoryReviewPage({params,searchParams}:{params:{id:string};searchParams:{kind?:string}}){
 if(!storyReviewEnabled()||!reviewKind(searchParams.kind))notFound();
 const user=await getCurrentUser();
 if(!user)redirect('/en/auth/sign-in?next=%2Fnewsroom%2Fstories');
 const locale=await newsroomLocale(user);
 let state;
 try{state=await readStoryReview(params.id,searchParams.kind);}
 catch(e){
  if(e instanceof DraftHttpError&&[403,404].includes(e.status))notFound();
  return <p role="alert" className="p-6 text-sm text-muted-foreground">{locale==='es'?'No se pudo cargar la revisión. Actualice la página.':'Unable to load the review. Refresh this page.'}</p>;
 }
 const full=await mayMountFullStoryEditor(params.id);
 const editHref=full?'/newsroom/stories/'+params.id+'/edit':'/newsroom/contributor/stories/'+params.id+(state.kind==='revision'?'/revision':'');
 return <StoryReviewPanel key={state.storyId+state.kind} initial={state} locale={locale} editHref={editHref}/>;
}
