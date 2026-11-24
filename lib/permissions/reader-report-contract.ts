import {DRAFT_UUID,isDraftTimestamp} from './assigned-draft-contract';
export type ReaderReportStatus='open'|'reviewed'|'dismissed'|'actioned';
export type ReaderReport={id:string;commentId:string;reason:string;status:ReaderReportStatus;createdAt:string;reviewedAt:string|null};
export type ReaderReportPage={items:ReaderReport[];hasMore:boolean};
export type ReaderReportReceipt={report:ReaderReport;alreadyReported:boolean};
export type ReaderReportCommand={commentId:string;updatedAt:string;reason:string};
const uuid=(v:unknown):v is string=>typeof v==='string'&&DRAFT_UUID.test(v);
const obj=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid report');return v as Record<string,unknown>;};
export function parseReaderReportCommand(raw:unknown):ReaderReportCommand{
 const r=obj(raw);
 if(Object.keys(r).length!==3||!uuid(r.commentId)||typeof r.updatedAt!=='string'||!isDraftTimestamp(r.updatedAt)||typeof r.reason!=='string'||r.reason.trim().length<3||r.reason.trim().length>1000||/[\u0000-\u001f\u007f]/.test(r.reason))throw Error('Invalid report');
 return {commentId:r.commentId,updatedAt:r.updatedAt,reason:r.reason.trim()};
}
function parseItem(raw:unknown):ReaderReport{
 const r=obj(raw);
 if(Object.keys(r).length!==6||!uuid(r.id)||!uuid(r.commentId)||typeof r.reason!=='string'||!['open','reviewed','dismissed','actioned'].includes(String(r.status))||!isDraftTimestamp(r.createdAt)||(r.reviewedAt!==null&&!isDraftTimestamp(r.reviewedAt)))throw Error('Invalid report status');
 return r as unknown as ReaderReport;
}
export function parseReaderReportReceipt(raw:unknown,commentId:string):ReaderReportReceipt{
 const r=obj(raw),report=parseItem(r.report);
 if(Object.keys(r).length!==2||report.commentId!==commentId||typeof r.alreadyReported!=='boolean')throw Error('Invalid receipt');
 return {report,alreadyReported:r.alreadyReported};
}
export function parseReaderReportPage(raw:unknown):ReaderReportPage{
 const r=obj(raw);
 if(Object.keys(r).length!==2||!Array.isArray(r.items)||r.items.length>20||typeof r.hasMore!=='boolean')throw Error('Invalid history');
 return {items:r.items.map(parseItem),hasMore:r.hasMore};
}
