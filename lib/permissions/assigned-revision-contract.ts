import {DRAFT_UUID,isDraftTimestamp,validateDraftCommand,type DraftCommand,type DraftState} from './assigned-draft-contract';
export type RevisionState=DraftState&{liveUpdatedAt:string;revisionId:string|null};
export type RevisionCommand=DraftCommand&{liveUpdatedAt:string;revisionId:string|null};
export function validateRevisionCommand(raw:unknown):RevisionCommand{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid revision');
 const r=raw as Record<string,unknown>;
 if(Object.keys(r).length!==5||!['action','copy','expectedUpdatedAt','liveUpdatedAt','revisionId'].every(k=>Object.prototype.hasOwnProperty.call(r,k))
   ||!isDraftTimestamp(r.liveUpdatedAt)||(r.revisionId!==null&&(typeof r.revisionId!=='string'||!DRAFT_UUID.test(r.revisionId))))throw Error('Invalid revision token');
 const command=validateDraftCommand({action:r.action,copy:r.copy,expectedUpdatedAt:r.expectedUpdatedAt});
 if(r.revisionId===null&&r.liveUpdatedAt!==command.expectedUpdatedAt)throw Error('Invalid initial baseline');
 return {...command,liveUpdatedAt:r.liveUpdatedAt,revisionId:r.revisionId as string|null};
}
