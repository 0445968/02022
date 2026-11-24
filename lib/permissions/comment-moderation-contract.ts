import {DRAFT_UUID,isDraftTimestamp} from './assigned-draft-contract';
export const COMMENT_STATUSES=['pending','published','hidden','deleted'] as const;
export type ModerationStatus=typeof COMMENT_STATUSES[number];
export type ModerationFilter=ModerationStatus|'all'|'reported';
export type ModerationAction='approve'|'hide'|'restore'|'remove';
export type ModerationCommand={commentId:string;revision:number;action:ModerationAction;reason:string;commandId:string};
export type ModerationItem={id:string;storyId:string;headline:string;parentId:string|null;author:string;body:string;status:ModerationStatus;revision:number;createdAt:string;updatedAt:string;canModerate:boolean;openReports:number|null};
export type ModerationEvent={id:string;action:ModerationAction;fromStatus:ModerationStatus;toStatus:ModerationStatus;revision:number;reason:string;at:string;byMe:boolean};
export type ModerationDetail={comment:ModerationItem;history:ModerationEvent[]};
export type ModerationPage={items:ModerationItem[];hasMore:boolean};
const uuid=(v:unknown):v is string=>typeof v==='string'&&DRAFT_UUID.test(v);
const status=(v:unknown):v is ModerationStatus=>typeof v==='string'&&(COMMENT_STATUSES as readonly string[]).includes(v);
const action=(v:unknown):v is ModerationAction=>typeof v==='string'&&['approve','hide','restore','remove'].includes(v);
const rev=(v:unknown):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>0&&v<=2147483647;
const obj=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid moderation');return v as Record<string,unknown>;};
export const moderationFilter=(v:unknown):v is ModerationFilter=>status(v)||v==='all'||v==='reported';
export function parseModerationCommand(raw:unknown):ModerationCommand{
 const r=obj(raw);
 if(Object.keys(r).length!==5||!uuid(r.commentId)||!rev(r.revision)||!action(r.action)||!uuid(r.commandId)||typeof r.reason!=='string'||r.reason.trim().length<12||r.reason.trim().length>1000||/[\u0000-\u001f\u007f]/.test(r.reason))throw Error('Invalid command');
 return {commentId:r.commentId,revision:r.revision,action:r.action,reason:r.reason.trim(),commandId:r.commandId};
}
function parseItem(raw:unknown):ModerationItem{
 const r=obj(raw);
 if(Object.keys(r).length!==12||!uuid(r.id)||!uuid(r.storyId)||(r.parentId!==null&&!uuid(r.parentId))||typeof r.headline!=='string'||typeof r.author!=='string'||typeof r.body!=='string'||!status(r.status)||!rev(r.revision)||!isDraftTimestamp(r.createdAt)||!isDraftTimestamp(r.updatedAt)||typeof r.canModerate!=='boolean'||(r.openReports!==null&&!(typeof r.openReports==='number'&&Number.isSafeInteger(r.openReports)&&r.openReports>=0)))throw Error('Invalid comment');
 return r as unknown as ModerationItem;
}
export function parseModerationPage(raw:unknown):ModerationPage{
 const r=obj(raw);
 if(Object.keys(r).length!==2||!Array.isArray(r.items)||r.items.length>20||typeof r.hasMore!=='boolean')throw Error('Invalid queue');
 return {items:r.items.map(parseItem),hasMore:r.hasMore};
}
export function parseModerationDetail(raw:unknown,id:string):ModerationDetail{
 const r=obj(raw),comment=parseItem(r.comment);
 if(Object.keys(r).length!==2||comment.id!==id||!Array.isArray(r.history)||r.history.length>20)throw Error('Invalid detail');
 for(const rawEvent of r.history){
  const e=obj(rawEvent);
  if(Object.keys(e).length!==8||!uuid(e.id)||!action(e.action)||!status(e.fromStatus)||!status(e.toStatus)||!rev(e.revision)||typeof e.reason!=='string'||!isDraftTimestamp(e.at)||typeof e.byMe!=='boolean')throw Error('Invalid history');
 }
 return {comment,history:r.history as ModerationEvent[]};
}
