import {notFound,redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth/session';
import {newsroomLocale} from '@/lib/services/newsroom-workspace';
import {canEnterReportManagement,readReportQueue,readReportDetail} from '@/lib/services/comment-reports';
import {canEnterCommentModeration} from '@/lib/services/comment-moderation';
import {resolveStoryStaffPermissionsOnServer} from '@/lib/permissions/server';
import {DRAFT_UUID} from '@/lib/permissions/assigned-draft-contract';
import {reportFilter} from '@/lib/permissions/comment-report-contract';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {ReportsWorkspace} from '@/components/editorial/comments/ReportsWorkspace';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function ReportsPage({searchParams}:{searchParams:{status?:string;storyId?:string;page?:string;reportId?:string}}){
 const user=await getCurrentUser();
 if(!user)redirect('/en/auth/sign-in?next=%2Fnewsroom%2Freports');
 if(!await canEnterReportManagement())notFound();
 const locale=await newsroomLocale(user),status=searchParams.status??'open',raw=searchParams.page??'0';
 const storyId=searchParams.storyId??null,id=searchParams.reportId;
 if(!reportFilter(status)||typeof raw!=='string'||!/^\d{1,3}$/.test(raw)||Number(raw)>100
 ||(storyId!==null&&(typeof storyId!=='string'||!DRAFT_UUID.test(storyId)))||(id!==undefined&&(typeof id!=='string'||!DRAFT_UUID.test(id))))notFound();
 const page=Number(raw);
 let data,detail=null;
 try{data=await readReportQueue(status,storyId,page);if(id)detail=await readReportDetail(id);}
 catch(e){if(e instanceof DraftHttpError&&[403,404].includes(e.status))notFound();
  return <p role="alert" className="p-6 text-sm text-muted-foreground">{locale==='es'?'No se pudieron cargar las denuncias. Actualice la página.':'Unable to load reports. Refresh the page.'}</p>;}
 if(detail&&storyId&&detail.report.storyId!==storyId)notFound();
 const canOpenComments=await canEnterCommentModeration();
 const grants=detail&&canOpenComments?await resolveStoryStaffPermissionsOnServer(detail.report.storyId,['comment.view_queue','comment.moderate']):new Set<string>();
 const commentHref=detail&&(grants.has('comment.view_queue')||grants.has('comment.moderate'))?'/newsroom/comments?'+new URLSearchParams({status:'all',storyId:detail.report.storyId,commentId:detail.report.commentId}).toString():null;
 return <ReportsWorkspace key={JSON.stringify([status,storyId,page,id])} data={data} detail={detail} status={status} storyId={storyId} page={page} locale={locale} commentHref={commentHref} canOpenComments={canOpenComments}/>;
}
