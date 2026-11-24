import {DRAFT_UUID,isDraftTimestamp} from './assigned-draft-contract';
export const ASSIGNMENT_TYPES=['author','editor','reviewer','copy','visual'] as const;
export type AssignmentType=typeof ASSIGNMENT_TYPES[number];
export type AssignmentStatus='active'|'completed'|'revoked';
export type AssignmentAction='create'|'reschedule'|'complete'|'revoke'|'reopen';
export type AssignmentCommand={membershipId:string;type:AssignmentType;action:AssignmentAction;expectedRevision:number;dueAt:string|null;reason:string;requestId:string};
export type AssignmentRow={id:string;membershipId:string;name:string;type:AssignmentType;status:AssignmentStatus;dueAt:string|null;revision:number;self:boolean;eligible:boolean};
export type AssignmentCandidate={id:string;name:string;types:AssignmentType[]};
export type AssignmentHistory={id:string;at:string;actor:string;member:string;type:string;previousStatus:string|null;status:string|null;previousDueAt:string|null;dueAt:string|null;reason:string|null};
export type AssignmentPage={storyId:string;headline:string;storyStatus:string;assignments:AssignmentRow[];hasMoreAssignments:boolean;candidates:AssignmentCandidate[];hasMoreCandidates:boolean;history:AssignmentHistory[]};
const uuid=(v:unknown):v is string=>typeof v==='string'&&DRAFT_UUID.test(v);
const kind=(v:unknown):v is AssignmentType=>typeof v==='string'&&(ASSIGNMENT_TYPES as readonly string[]).includes(v);
const status=(v:unknown):v is AssignmentStatus=>v==='active'||v==='completed'||v==='revoked';
const due=(v:unknown):v is string|null=>v===null||isDraftTimestamp(v);
const obj=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid assignment');return v as Record<string,unknown>;};
export function validateAssignmentCommand(raw:unknown):AssignmentCommand{
 const r=obj(raw);
 if(Object.keys(r).length!==7||!['membershipId','type','action','expectedRevision','dueAt','reason','requestId'].every(k=>Object.prototype.hasOwnProperty.call(r,k))
 ||!uuid(r.membershipId)||!uuid(r.requestId)||!kind(r.type)||typeof r.action!=='string'||!['create','reschedule','complete','revoke','reopen'].includes(r.action)
 ||typeof r.expectedRevision!=='number'||!Number.isSafeInteger(r.expectedRevision)||r.expectedRevision<0||r.expectedRevision>2147483646
 ||(r.action==='create'?r.expectedRevision!==0:r.expectedRevision===0)||!due(r.dueAt)
 ||(['complete','revoke'].includes(r.action)&&r.dueAt!==null)
 ||typeof r.reason!=='string'||r.reason.trim().length<12||r.reason.trim().length>500||/[\u0000-\u001f\u007f]/.test(r.reason))throw Error('Invalid assignment command');
 return {membershipId:r.membershipId,type:r.type,action:r.action as AssignmentAction,expectedRevision:r.expectedRevision,dueAt:r.dueAt,reason:r.reason.trim(),requestId:r.requestId};
}
export function parseAssignmentPage(raw:unknown,id:string):AssignmentPage{
 const r=obj(raw);
 if(r.storyId!==id||typeof r.headline!=='string'||typeof r.storyStatus!=='string'||typeof r.hasMoreAssignments!=='boolean'||typeof r.hasMoreCandidates!=='boolean'
 ||!Array.isArray(r.assignments)||r.assignments.length>25||!Array.isArray(r.candidates)||r.candidates.length>25||!Array.isArray(r.history)||r.history.length>15)throw Error('Invalid assignment page');
 for(const item of r.assignments){const a=obj(item);if(!uuid(a.id)||!uuid(a.membershipId)||typeof a.name!=='string'||!kind(a.type)||!status(a.status)||!due(a.dueAt)
 ||typeof a.revision!=='number'||!Number.isSafeInteger(a.revision)||a.revision<1||typeof a.self!=='boolean'||typeof a.eligible!=='boolean')throw Error('Invalid assignment');}
 for(const item of r.candidates){const a=obj(item);if(!uuid(a.id)||typeof a.name!=='string'||!Array.isArray(a.types)||!a.types.length||a.types.length>5||!a.types.every(kind))throw Error('Invalid candidate');}
 for(const item of r.history){const a=obj(item);if(!uuid(a.id)||!isDraftTimestamp(a.at)||typeof a.actor!=='string'||typeof a.member!=='string'||!kind(a.type)
 ||(a.previousStatus!==null&&!status(a.previousStatus))||(a.status!==null&&!status(a.status))||!due(a.previousDueAt)||!due(a.dueAt)||(a.reason!==null&&typeof a.reason!=='string'))throw Error('Invalid history');}
 return r as unknown as AssignmentPage;
}
