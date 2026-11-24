import {DRAFT_UUID,isDraftTimestamp} from './assigned-draft-contract';
import {reviewKind,type ReviewKind} from './story-review-contract';
export type ReviewedSchedule={id:string;kind:ReviewKind;dueAt:string;state:'pending'|'blocked';current:boolean;canCancel:boolean};
export type ScheduleCommand={action:'schedule';kind:ReviewKind;requestId:string;fingerprint:string;dueAt:string}|{action:'cancel';kind:ReviewKind;scheduleId:string};
const uuid=(v:unknown):v is string=>typeof v==='string'&&DRAFT_UUID.test(v);
const obj=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid schedule');return v as Record<string,unknown>;};
export function parseScheduleCommand(raw:unknown):ScheduleCommand{
 const r=obj(raw);
 if(!reviewKind(r.kind))throw Error('Invalid kind');
 if(r.action==='cancel'&&Object.keys(r).length===3&&uuid(r.scheduleId))return {action:'cancel',kind:r.kind,scheduleId:r.scheduleId};
 if(r.action==='schedule'&&Object.keys(r).length===5&&uuid(r.requestId)&&typeof r.fingerprint==='string'&&/^[a-f0-9]{64}$/.test(r.fingerprint)&&typeof r.dueAt==='string'&&isDraftTimestamp(r.dueAt))return {action:'schedule',kind:r.kind,requestId:r.requestId,fingerprint:r.fingerprint,dueAt:r.dueAt};
 throw Error('Invalid command');
}
export function parseReviewedSchedule(raw:unknown,kind:ReviewKind):ReviewedSchedule|null{
 if(raw===null)return null;
 const r=obj(raw);
 if(Object.keys(r).length!==6||!uuid(r.id)||r.kind!==kind||typeof r.dueAt!=='string'||!isDraftTimestamp(r.dueAt)||(r.state!=='pending'&&r.state!=='blocked')||typeof r.current!=='boolean'||typeof r.canCancel!=='boolean')throw Error('Invalid schedule');
 return {id:r.id,kind,dueAt:r.dueAt,state:r.state,current:r.current,canCancel:r.canCancel};
}
