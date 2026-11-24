import {DRAFT_UUID,isDraftTimestamp} from './assigned-draft-contract';
export type InboxMode='pending'|'feedback'|'unread';
export type InboxItem={id:string;storyId:string;kind:'draft'|'revision';headline:string;at:string;note:string;decision:'approved'|'changes_requested'|'rejected'|null;readAt:string|null};
export type InboxPage={items:InboxItem[];hasMore:boolean};
const uuid=(v:unknown):v is string=>typeof v==='string'&&DRAFT_UUID.test(v);
const obj=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid inbox');return v as Record<string,unknown>;};
export const inboxMode=(v:unknown):v is InboxMode=>v==='pending'||v==='feedback'||v==='unread';
export function parseInboxPage(raw:unknown,mode:InboxMode):InboxPage{
 const r=obj(raw);
 if(Object.keys(r).length!==2||!Array.isArray(r.items)||r.items.length>25||typeof r.hasMore!=='boolean')throw Error('Invalid inbox page');
 for(const value of r.items){
  const x=obj(value);
  if(Object.keys(x).length!==8||!uuid(x.id)||!uuid(x.storyId)||(x.kind!=='draft'&&x.kind!=='revision')||
   typeof x.headline!=='string'||!isDraftTimestamp(x.at)||typeof x.note!=='string'||x.note.length>1000||
   (mode==='pending'?(x.decision!==null||x.readAt!==null):(!['approved','changes_requested','rejected'].includes(String(x.decision))||
    (x.readAt!==null&&!isDraftTimestamp(x.readAt))||(mode==='unread'&&x.readAt!==null))))throw Error('Invalid inbox item');
 }
 return r as unknown as InboxPage;
}
export function parseFeedbackAck(raw:unknown){
 const r=obj(raw);
 if(Object.keys(r).length!==1||!uuid(r.requestId))throw Error('Invalid acknowledgement');
 return r.requestId;
}
export function parseFeedbackReceipt(raw:unknown,id:string){
 const r=obj(raw);
 if(Object.keys(r).length!==2||r.id!==id||!isDraftTimestamp(r.readAt))throw Error('Invalid receipt');
 return {id,readAt:r.readAt as string};
}
