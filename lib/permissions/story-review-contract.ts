import {DRAFT_UUID,isDraftTimestamp} from './assigned-draft-contract';
export type ReviewKind='draft'|'revision';
export type ReviewAction='request'|'approve'|'request_changes'|'reject';
export type ReviewDecision='approved'|'changes_requested'|'rejected';
export type ReviewCommand={kind:ReviewKind;action:ReviewAction;fingerprint:string;requestId:string|null;note:string;commandId:string};
export type ReviewHistory={id:string;requestedAt:string;requestNote:string;requestedByMe:boolean;decision:ReviewDecision|null;decisionNote:string|null;decidedAt:string|null;decidedByMe:boolean;current:boolean};
export type ReviewState={storyId:string;kind:ReviewKind;revisionId:string|null;headline:string;status:string;fingerprint:string;requestId:string|null;decision:ReviewDecision|null;current:boolean;canRequest:boolean;canDecide:boolean;history:ReviewHistory[]};
const uuid=(v:unknown):v is string=>typeof v==='string'&&DRAFT_UUID.test(v);
export const reviewKind=(v:unknown):v is ReviewKind=>v==='draft'||v==='revision';
const hash=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const decision=(v:unknown)=>v===null||v==='approved'||v==='changes_requested'||v==='rejected';
const object=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid review');return v as Record<string,unknown>;};
export function validateReviewCommand(raw:unknown):ReviewCommand{
 const r=object(raw);
 if(Object.keys(r).length!==6||!['kind','action','fingerprint','requestId','note','commandId'].every(k=>Object.prototype.hasOwnProperty.call(r,k))
 ||!reviewKind(r.kind)||typeof r.action!=='string'||!['request','approve','request_changes','reject'].includes(r.action)
 ||!hash(r.fingerprint)||!uuid(r.commandId)||(r.action==='request'?r.requestId!==null:!uuid(r.requestId))
 ||typeof r.note!=='string'||r.note.trim().length<12||r.note.trim().length>1000||/[\u0000-\u001f\u007f]/.test(r.note))throw Error('Invalid review command');
 return {kind:r.kind,action:r.action as ReviewAction,fingerprint:r.fingerprint,requestId:r.requestId as string|null,note:r.note.trim(),commandId:r.commandId};
}
export function parseReviewState(raw:unknown,id:string,kind:ReviewKind):ReviewState{
 const r=object(raw);
 if(r.storyId!==id||r.kind!==kind||(kind==='draft'?r.revisionId!==null:!uuid(r.revisionId))||typeof r.headline!=='string'
 ||typeof r.status!=='string'||!hash(r.fingerprint)||(r.requestId!==null&&!uuid(r.requestId))||!decision(r.decision)
 ||typeof r.current!=='boolean'||typeof r.canRequest!=='boolean'||typeof r.canDecide!=='boolean'||!Array.isArray(r.history)||r.history.length>10
 ||Object.keys(r).some(k=>!['storyId','kind','revisionId','headline','status','fingerprint','requestId','decision','current','canRequest','canDecide','history'].includes(k)))throw Error('Invalid review state');
 for(const entry of r.history){
  const h=object(entry);
  if(!uuid(h.id)||!isDraftTimestamp(h.requestedAt)||typeof h.requestNote!=='string'||typeof h.requestedByMe!=='boolean'||!decision(h.decision)
    ||(h.decisionNote!==null&&typeof h.decisionNote!=='string')||(h.decidedAt!==null&&!isDraftTimestamp(h.decidedAt))
    ||typeof h.decidedByMe!=='boolean'||typeof h.current!=='boolean')throw Error('Invalid review history');
 }
 return r as unknown as ReviewState;
}
