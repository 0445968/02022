import {notFound,redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth/session';
import {newsroomLocale} from '@/lib/services/newsroom-workspace';
import {canStartWriterDraft,writerCreationEnabled} from '@/lib/services/writer-drafts';
import {WriterDraftForm} from '@/components/forms/writer-draft-form';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false}};
export default async function WriterDraftPage(){
 if(!writerCreationEnabled())notFound();
 const user=await getCurrentUser();
 if(!user)redirect('/en/auth/sign-in?next=%2Fnewsroom%2Fcontributor%2Fnew');
 if(!(await canStartWriterDraft()))redirect('/newsroom/denied');
 return <WriterDraftForm locale={await newsroomLocale(user)}/>;
}
