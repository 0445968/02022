import {notFound,redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth/session';
import {newsroomLocale} from '@/lib/services/newsroom-workspace';
import {canEnterReportManagement} from '@/lib/services/comment-reports';
import {canEnterCommentModeration,commentModerationEnabled,readCommentQueue,readCommentDetail} from '@/lib/services/comment-moderation';
import {DRAFT_UUID} from '@/lib/permissions/assigned-draft-contract';
import {moderationFilter} from '@/lib/permissions/comment-moderation-contract';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {CommentsWorkspace} from '@/components/editorial/comments/CommentsWorkspace';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function CommentsPage({searchParams}:{searchParams:{status?:string;storyId?:string;q?:string;page?:string;commentId?:string}}){
 if(!commentModerationEnabled())notFound();
 const user=await getCurrentUser();
 if(!user)redirect('/en/auth/sign-in?next=%2Fnewsroom%2Fcomments');
 if(!await canEnterCommentModeration())notFound();
 const locale=await newsroomLocale(user),status=searchParams.status??'pending',raw=searchParams.page??'0';
 const storyId=searchParams.storyId??null,q=searchParams.q??'';
 if(!moderationFilter(status)||typeof raw!=='string'||!/^\d{1,3}$/.test(raw)||Number(raw)>100
 ||(storyId!==null&&(typeof storyId!=='string'||!DRAFT_UUID.test(storyId)))||typeof q!=='string'||q.length>120)notFound();
 const id=searchParams.commentId;
 if(id!==undefined&&(typeof id!=='string'||!DRAFT_UUID.test(id)))notFound();
 const page=Number(raw);
 let data,detail=null;
 try{data=await readCommentQueue(status,storyId,q,page);if(id)detail=await readCommentDetail(id);}
 catch(e){if(e instanceof DraftHttpError&&[403,404].includes(e.status))notFound();
  return <p role="alert" className="p-6 text-sm text-muted-foreground">{locale==='es'?'No se pudieron cargar los comentarios. Actualice la página.':'Unable to load comments. Refresh the page.'}</p>;}
 if(detail&&storyId&&detail.comment.storyId!==storyId)notFound();
 return <CommentsWorkspace key={JSON.stringify([status,storyId,q,page,id])} initial={data} initialDetail={detail} canOpenReports={await canEnterReportManagement()} status={status} storyId={storyId} query={q} page={page} locale={locale}/>;
}
