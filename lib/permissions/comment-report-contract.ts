import {DRAFT_UUID,isDraftTimestamp} from './assigned-draft-contract';
export type ReportStatus='open'|'reviewed'|'dismissed'|'actioned';
export type ReportFilter=ReportStatus|'all';
export type ReportTarget=Exclude<ReportStatus,'open'>;
export type ReportItem={id:string;commentId:string;storyId:string;headline:string;author:string;body:string;commentStatus:'pending'|'published'|'hidden'|'deleted';commentRevision:number;reportedRevision:number|null;reason:string;status:ReportStatus;revision:number;createdAt:string;reviewedAt:string|null;actionEventId:string|null;canResolve:boolean};
export type ReportEvent={id:string;fromStatus:ReportStatus;toStatus:ReportTarget;revision:number;commentRevision:number;reason:string;at:string;actionEventId:string|null;byMe:boolean};
export type ReportDetail={report:ReportItem;history:ReportEvent[]};
export type ReportPage={items:ReportItem[];hasMore:boolean};
export type ReportCommand={reportId:string;revision:number;commentRevision:number;target:ReportTarget;reason:string;actionEventId:string|null;commandId:string};
const uuid=(v:unknown):v is string=>typeof v==='string'&&DRAFT_UUID.test(v);
const status=(v:unknown):v is ReportStatus=>v==='open'||v==='reviewed'||v==='dismissed'||v==='actioned';
const target=(v:unknown):v is ReportTarget=>status(v)&&v!=='open';
const rev=(v:unknown):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>0&&v<=2147483647;
const obj=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid report');return v as Record<string,unknown>;};
export const reportFilter=(v:unknown):v is ReportFilter=>v==='all'||status(v);
export function parseReportCommand(raw:unknown):ReportCommand{
 const r=obj(raw);
 if(Object.keys(r).length!==7||!uuid(r.reportId)||!rev(r.revision)||!rev(r.commentRevision)||!target(r.target)||!uuid(r.commandId)||
 typeof r.reason!=='string'||r.reason.trim().length<12||r.reason.trim().length>1000||/[\u0000-\u001f\u007f]/.test(r.reason)||
 (r.target==='actioned'?!uuid(r.actionEventId):r.actionEventId!==null))throw Error('Invalid report command');
 return {reportId:r.reportId,revision:r.revision,commentRevision:r.commentRevision,target:r.target,reason:r.reason.trim(),actionEventId:r.actionEventId as string|null,commandId:r.commandId};
}
function parseItem(raw:unknown):ReportItem{
 const r=obj(raw);
 if(Object.keys(r).length!==16||!uuid(r.id)||!uuid(r.commentId)||!uuid(r.storyId)||typeof r.headline!=='string'||typeof r.author!=='string'||typeof r.body!=='string'||!['pending','published','hidden','deleted'].includes(String(r.commentStatus))||!rev(r.commentRevision)||(r.reportedRevision!==null&&!rev(r.reportedRevision))||typeof r.reason!=='string'||!status(r.status)||!rev(r.revision)||!isDraftTimestamp(r.createdAt)||(r.reviewedAt!==null&&!isDraftTimestamp(r.reviewedAt))||(r.actionEventId!==null&&!uuid(r.actionEventId))||typeof r.canResolve!=='boolean')throw Error('Invalid report projection');
 return r as unknown as ReportItem;
}
export function parseReportPage(raw:unknown):ReportPage{
 const r=obj(raw);if(Object.keys(r).length!==2||!Array.isArray(r.items)||r.items.length>20||typeof r.hasMore!=='boolean')throw Error('Invalid queue');
 return {items:r.items.map(parseItem),hasMore:r.hasMore};
}
export function parseReportDetail(raw:unknown,id:string):ReportDetail{
 const r=obj(raw),report=parseItem(r.report);
 if(Object.keys(r).length!==2||report.id!==id||!Array.isArray(r.history)||r.history.length>20)throw Error('Invalid history');
 for(const entry of r.history){
  const e=obj(entry);
  if(Object.keys(e).length!==9||!uuid(e.id)||!status(e.fromStatus)||!target(e.toStatus)||!rev(e.revision)||!rev(e.commentRevision)||typeof e.reason!=='string'||!isDraftTimestamp(e.at)||(e.toStatus==='actioned'?!uuid(e.actionEventId):e.actionEventId!==null)||typeof e.byMe!=='boolean')throw Error('Invalid event');
 }
 return {report,history:r.history as ReportEvent[]};
}
