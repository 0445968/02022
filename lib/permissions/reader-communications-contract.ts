import {DRAFT_UUID,isDraftTimestamp} from './assigned-draft-contract';
export const topics=['latest','san_andres','old_providence'] as const;
export type Topic=typeof topics[number];
export type NoticePreferences={stories:boolean;replies:boolean;privacy:boolean;revision:number};
export type Notice={id:string;kind:'story'|'reply'|'privacy';slug:string|null;headline:string|null;requestStatus:string|null;createdAt:string;read:boolean};
export type NoticePage={preferences:NoticePreferences;items:Notice[];hasMore:boolean;unread:number};
export type NoticeCommand={action:'preferences';expectedRevision:number;stories:boolean;replies:boolean;privacy:boolean;page:number}|{action:'read'|'unread';id:string;page:number}|{action:'read_all';page:number};
export type NewsletterState={email:string;deliveryEnabled:boolean;topics:{topic:Topic;status:'pending'|'active'|'unsubscribed'|'suppressed'|'expired'|'address_changed';updatedAt:string|null}[]};
const obj=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid object');return v as Record<string,unknown>;};
const exact=(v:Record<string,unknown>,keys:string[])=>Object.keys(v).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(v,k));
const int=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
export const isTopic=(v:unknown):v is Topic=>typeof v==='string'&&(topics as readonly string[]).includes(v);
const uuid=(v:unknown):v is string=>typeof v==='string'&&DRAFT_UUID.test(v);
const page=(v:unknown):v is number=>int(v)&&v<=100;
export function parseNoticeCommand(v:unknown):NoticeCommand{
 const x=obj(v);if(!page(x.page))throw Error('Invalid page');
 if(x.action==='preferences'&&exact(x,['action','expectedRevision','stories','replies','privacy','page'])&&int(x.expectedRevision)&&x.expectedRevision<2147483647&&['stories','replies','privacy'].every(k=>typeof x[k]==='boolean'))return x as NoticeCommand;
 if((x.action==='read'||x.action==='unread')&&exact(x,['action','id','page'])&&uuid(x.id))return x as NoticeCommand;
 if(x.action==='read_all'&&exact(x,['action','page']))return x as NoticeCommand;
 throw Error('Invalid notice command');
}
export function parseNoticePage(v:unknown):NoticePage{
 const x=obj(v),p=obj(x.preferences);
 if(!exact(x,['preferences','items','hasMore','unread'])||!exact(p,['stories','replies','privacy','revision'])||!int(p.revision)||!['stories','replies','privacy'].every(k=>typeof p[k]==='boolean')||!int(x.unread)||typeof x.hasMore!=='boolean'||!Array.isArray(x.items)||x.items.length>20)throw Error('Invalid notices');
 for(const raw of x.items){const n=obj(raw);if(!exact(n,['id','kind','slug','headline','requestStatus','createdAt','read'])||!uuid(n.id)||!['story','reply','privacy'].includes(String(n.kind))||!isDraftTimestamp(n.createdAt)||typeof n.read!=='boolean')throw Error('Invalid notice');
 if(n.kind==='privacy'?(n.slug!==null||n.headline!==null||!['reviewing','cancelled','fulfilled','declined'].includes(String(n.requestStatus))):(typeof n.slug!=='string'||typeof n.headline!=='string'||n.requestStatus!==null))throw Error('Invalid notice projection');}
 return x as unknown as NoticePage;
}
export function parseNewsletterState(v:unknown):NewsletterState{
 const x=obj(v);if(!exact(x,['email','deliveryEnabled','topics'])||typeof x.email!=='string'||typeof x.deliveryEnabled!=='boolean'||!Array.isArray(x.topics)||x.topics.length!==3)throw Error('Invalid newsletter state');
 const seen=new Set<string>();for(const raw of x.topics){const t=obj(raw);if(!exact(t,['topic','status','updatedAt'])||!isTopic(t.topic)||seen.has(t.topic)||!['pending','active','unsubscribed','suppressed','expired','address_changed'].includes(String(t.status))||(t.updatedAt!==null&&!isDraftTimestamp(t.updatedAt)))throw Error('Invalid topic');seen.add(t.topic);}
 return x as NewsletterState;
}
export function parseNewsletterCommand(v:unknown){const x=obj(v);if(!exact(x,['action','topic'])||!isTopic(x.topic)||(x.action!=='subscribe'&&x.action!=='unsubscribe'))throw Error('Invalid command');return {action:x.action,topic:x.topic};}
export function readerCanOpen(level:unknown,verified:boolean){return level==='public'||level==='registered'&&verified;}
