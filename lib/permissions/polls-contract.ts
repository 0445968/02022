import {DRAFT_UUID,isDraftTimestamp} from './assigned-draft-contract';
export const POLL_ACTIONS=['create','save','submit','withdraw','approve','return','publish','close','retire','release_results'] as const;
export type PollAction=typeof POLL_ACTIONS[number];
export type PollCopy={language:'en'|'es';question:string;options:string[];opensAt:string;closesAt:string;cap:number};
export type PollStatus='draft'|'in_review'|'approved'|'published'|'retired';
export type StaffPoll=PollCopy&{id:string;status:PollStatus;version:number;closedAt:string|null;resultsReleased:boolean;canApprove:boolean;counts:number[]|null};
export type StaffPollPage={items:StaffPoll[];hasMore:boolean;canEdit:boolean;canPublish:boolean;canManageResults:boolean};
export type PublicPoll={id:string;question:string;options:string[];closesAt:string;open:boolean;ownChoice:number|null;counts:number[]|null};
export type PublicPollPage={enabled:boolean;verified:boolean;hasMore:boolean;items:PublicPoll[]};
export type PollCommand={action:PollAction;id:string|null;version:number|null;copy:PollCopy|null};
const record=(v:unknown,keys:string[]):Record<string,unknown>=>{
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==keys.length||!keys.every(k=>Object.prototype.hasOwnProperty.call(v,k)))throw Error('Invalid poll fields');
 return v as Record<string,unknown>;
};
const uuid=(v:unknown):v is string=>typeof v==='string'&&DRAFT_UUID.test(v);
const integer=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const text=(v:unknown,min:number,max:number):v is string=>typeof v==='string'&&v.trim().length>=min&&v.trim().length<=max&&!/[\u0000-\u001f\u007f]/.test(v);
const options=(v:unknown):v is string[]=>Array.isArray(v)&&v.length>=2&&v.length<=8&&v.every(x=>text(x,1,120))&&new Set(v.map(x=>x.trim().toLowerCase())).size===v.length;
const counts=(v:unknown,n:number)=>v===null||Array.isArray(v)&&v.length===n&&v.every(x=>integer(x,0,100000));
const utc=(v:unknown):v is string=>isDraftTimestamp(v)&&v.endsWith('Z');
function copy(raw:unknown):PollCopy{
 const r=record(raw,['language','question','options','opensAt','closesAt','cap']);
 if((r.language!=='en'&&r.language!=='es')||!text(r.question,3,240)||!options(r.options)||!isDraftTimestamp(r.opensAt)||!isDraftTimestamp(r.closesAt)||Date.parse(r.closesAt)<=Date.parse(r.opensAt)||Date.parse(r.closesAt)-Date.parse(r.opensAt)>365*86400000||!integer(r.cap,5,100000))throw Error('Invalid poll copy');
 return r as PollCopy;
}
export function parsePollCommand(raw:unknown):PollCommand{
 const r=record(raw,['action','id','version','copy']);
 if(typeof r.action!=='string'||!POLL_ACTIONS.some(x=>x===r.action))throw Error('Invalid action');
 if(r.action==='create'?(r.id!==null||r.version!==null):(!uuid(r.id)||!integer(r.version,1,2147483647)))throw Error('Invalid version');
 if(r.action==='create'||r.action==='save'){
  const c=copy(r.copy);if(!utc(c.opensAt)||!utc(c.closesAt))throw Error('Use UTC');
 }else if(r.copy!==null)throw Error('Unexpected copy');
 return r as PollCommand;
}
export function parseStaffPoll(raw:unknown):StaffPoll{
 const r=record(raw,['id','language','question','options','opensAt','closesAt','cap','status','version','closedAt','resultsReleased','canApprove','counts']);
 const c=copy({language:r.language,question:r.question,options:r.options,opensAt:r.opensAt,closesAt:r.closesAt,cap:r.cap});
 if(!uuid(r.id)||!['draft','in_review','approved','published','retired'].includes(String(r.status))||!integer(r.version,1,2147483647)||(r.closedAt!==null&&!isDraftTimestamp(r.closedAt))||typeof r.resultsReleased!=='boolean'||typeof r.canApprove!=='boolean'||!counts(r.counts,c.options.length))throw Error('Invalid staff poll');
 return r as StaffPoll;
}
export function parseStaffPollPage(raw:unknown):StaffPollPage{
 const r=record(raw,['items','hasMore','canEdit','canPublish','canManageResults']);
 if(!Array.isArray(r.items)||r.items.length>20||typeof r.hasMore!=='boolean'||typeof r.canEdit!=='boolean'||typeof r.canPublish!=='boolean'||typeof r.canManageResults!=='boolean')throw Error('Invalid poll page');
 const items=r.items.map(parseStaffPoll);
 if(!r.canManageResults&&items.some(i=>i.counts!==null))throw Error('Unexpected results');
 return {...r,items} as StaffPollPage;
}
export function parsePublicPollPage(raw:unknown):PublicPollPage{
 const r=record(raw,['enabled','verified','hasMore','items']);
 if(typeof r.enabled!=='boolean'||typeof r.verified!=='boolean'||typeof r.hasMore!=='boolean'||!Array.isArray(r.items)||r.items.length>20||(!r.enabled&&(r.items.length||r.verified||r.hasMore)))throw Error('Invalid public page');
 const items=r.items.map(raw=>{
  const x=record(raw,['id','question','options','closesAt','open','ownChoice','counts']);
  if(!uuid(x.id)||!text(x.question,3,240)||!options(x.options)||!isDraftTimestamp(x.closesAt)||typeof x.open!=='boolean'||(x.ownChoice!==null&&(!r.verified||!integer(x.ownChoice,0,x.options.length-1)))||!counts(x.counts,x.options.length)||(x.open&&x.counts!==null))throw Error('Invalid public poll');
  return x as PublicPoll;
 });
 return {...r,items} as PublicPollPage;
}
export function parseVoteCommand(raw:unknown):{choice:number}{
 const r=record(raw,['choice']);if(!integer(r.choice,0,7))throw Error('Invalid vote');return {choice:r.choice};
}
export function parseVoteReceipt(raw:unknown,id:string,choice:number){
 const r=record(raw,['pollId','choice','alreadyVoted']);if(r.pollId!==id||r.choice!==choice||typeof r.alreadyVoted!=='boolean')throw Error('Invalid receipt');return {pollId:id,choice,alreadyVoted:r.alreadyVoted};
}
