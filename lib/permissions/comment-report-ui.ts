import type {ReportFilter,ReportItem,ReportTarget} from './comment-report-contract';
export function availableReportTargets(item:Pick<ReportItem,'canResolve'|'status'|'actionEventId'>):ReportTarget[]{
 if(!item.canResolve||!['open','reviewed'].includes(item.status))return [];
 const targets:ReportTarget[]=item.status==='open'?['reviewed','dismissed']:['dismissed'];
 if(item.actionEventId)targets.push('actioned');
 return targets;
}
export function reportQueueHref(status:ReportFilter,storyId:string|null,page=0,reportId?:string){
 const q=new URLSearchParams({status,page:String(page)});
 if(storyId)q.set('storyId',storyId);
 if(reportId)q.set('reportId',reportId);
 return '/newsroom/reports?'+q.toString();
}
export function reportedVersionState(item:Pick<ReportItem,'reportedRevision'|'commentRevision'>){
 return item.reportedRevision===null?'unknown':item.reportedRevision===item.commentRevision?'same':'changed';
}
