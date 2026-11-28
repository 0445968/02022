import {notFound,redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth/session';
import {newsroomLocale} from '@/lib/services/newsroom-workspace';
import {reviewInboxEnabled,readReviewInbox} from '@/lib/services/review-inbox';
import {inboxMode} from '@/lib/permissions/review-inbox-contract';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {ReviewInbox} from '@/components/editorial/story-editor/ReviewInbox';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function ReviewInboxPage(props:{searchParams: Promise<{mode?:string;page?:string}>}) {
 const searchParams = await props.searchParams;
 if(!reviewInboxEnabled())notFound();
 const user=await getCurrentUser();
 if(!user)redirect('/en/auth/sign-in?next=%2Fnewsroom%2Freviews');
 const locale=await newsroomLocale(user),mode=searchParams.mode??'pending',raw=searchParams.page??'0';
 if(!inboxMode(mode)||typeof raw!=='string'||!/^\d{1,3}$/.test(raw)||Number(raw)>100)notFound();
 const page=Number(raw);
 let state;
 try{state=await readReviewInbox(mode,page);}
 catch(e){if(e instanceof DraftHttpError&&[403,404].includes(e.status))notFound();
  return <p role="alert" className="p-6 text-sm text-muted-foreground">{locale==='es'?'No se pudo cargar la bandeja. Actualice la página.':'Unable to load the inbox. Refresh the page.'}</p>;}
 return <ReviewInbox key={mode+page} state={state} mode={mode} page={page} locale={locale}/>;
}
