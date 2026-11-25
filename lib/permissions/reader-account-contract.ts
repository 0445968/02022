import {DRAFT_UUID,isDraftTimestamp} from './assigned-draft-contract';
export type ReaderLocale='en'|'es';
export type AvatarChoice='keep'|'initials'|'ocean'|'sun'|'island';
export type PrivacyKind='export'|'delete';
export type PrivacyStatus='pending'|'reviewing'|'cancelled'|'fulfilled'|'declined';
export type PrivacyReceipt={id:string;kind:PrivacyKind;status:PrivacyStatus;createdAt:string;updatedAt:string};
export type ReaderAccount={displayName:string;locale:ReaderLocale;image:string|null;email:string;emailVerified:boolean;updatedAt:string;requests:PrivacyReceipt[]};
export type AccountCommand={action:'profile';expectedUpdatedAt:string;displayName:string;locale:ReaderLocale;avatar:AvatarChoice}|{action:'request';kind:PrivacyKind;confirmation:'DELETE'|'EXPORT'}|{action:'cancel';id:string;confirmation:'CANCEL'};
export type PrivacyQueueItem=PrivacyReceipt&{accountId:string|null;email:string|null;canReview:boolean};
export type PrivacyQueue={items:PrivacyQueueItem[];hasMore:boolean};
export type PrivacyReview={id:string;expectedUpdatedAt:string;action:'review'|'fulfill'|'decline';resolution:null|'completed_externally'|'retention_required'|'identity_not_verified'};
const obj=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid object');return v as Record<string,unknown>;};
const exact=(v:Record<string,unknown>,keys:string[])=>Object.keys(v).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(v,k));
const id=(v:unknown):v is string=>typeof v==='string'&&DRAFT_UUID.test(v);
const kind=(v:unknown)=>v==='export'||v==='delete';
const statuses=['pending','reviewing','cancelled','fulfilled','declined'];
const name=(v:unknown):v is string=>typeof v==='string'&&v.trim().length>=1&&Array.from(v.trim()).length<=80&&!/[\x00-\x1f\x7f]/.test(v);
const locale=(v:unknown):v is ReaderLocale=>v==='en'||v==='es';
const avatar=(v:unknown):v is AvatarChoice=>typeof v==='string'&&['keep','initials','ocean','sun','island'].includes(v);
export function safeAvatar(v:unknown){return typeof v==='string'&&/^\/avatars\/reader-(ocean|sun|island)\.svg$/.test(v)?v:null;}
export function parseAccountCommand(v:unknown):AccountCommand{
 const x=obj(v);
 if(x.action==='profile'&&exact(x,['action','expectedUpdatedAt','displayName','locale','avatar'])&&isDraftTimestamp(x.expectedUpdatedAt)&&name(x.displayName)&&locale(x.locale)&&avatar(x.avatar))return {action:'profile',expectedUpdatedAt:x.expectedUpdatedAt,displayName:x.displayName.trim(),locale:x.locale,avatar:x.avatar};
 if(x.action==='request'&&exact(x,['action','kind','confirmation'])&&kind(x.kind)&&x.confirmation===(x.kind==='delete'?'DELETE':'EXPORT'))return x as AccountCommand;
 if(x.action==='cancel'&&exact(x,['action','id','confirmation'])&&id(x.id)&&x.confirmation==='CANCEL')return x as AccountCommand;
 throw Error('Invalid command');
}
function receipt(v:unknown):PrivacyReceipt{
 const x=obj(v);if(!id(x.id)||!kind(x.kind)||!statuses.includes(String(x.status))||!isDraftTimestamp(x.createdAt)||!isDraftTimestamp(x.updatedAt))throw Error('Invalid privacy receipt');
 return {id:x.id,kind:x.kind as PrivacyKind,status:x.status as PrivacyStatus,createdAt:x.createdAt,updatedAt:x.updatedAt};
}
export function parseReaderAccount(v:unknown):ReaderAccount{
 const x=obj(v);if(!exact(x,['displayName','locale','image','email','emailVerified','updatedAt','requests'])||typeof x.displayName!=='string'||!locale(x.locale)||(x.image!==null&&typeof x.image!=='string')||typeof x.email!=='string'||typeof x.emailVerified!=='boolean'||!isDraftTimestamp(x.updatedAt)||!Array.isArray(x.requests)||x.requests.length>20)throw Error('Invalid account');
 return {...x,image:safeAvatar(x.image),requests:x.requests.map(receipt)} as ReaderAccount;
}
export function parsePrivacyReview(v:unknown):PrivacyReview{
 const x=obj(v);if(!exact(x,['id','expectedUpdatedAt','action','resolution'])||!id(x.id)||!isDraftTimestamp(x.expectedUpdatedAt))throw Error('Invalid review');
 if(!(x.action==='review'&&x.resolution===null||x.action==='fulfill'&&x.resolution==='completed_externally'||x.action==='decline'&&['retention_required','identity_not_verified'].includes(String(x.resolution))))throw Error('Invalid decision');
 return x as PrivacyReview;
}
export function parsePrivacyQueue(v:unknown):PrivacyQueue{
 const x=obj(v);if(!exact(x,['items','hasMore'])||!Array.isArray(x.items)||x.items.length>20||typeof x.hasMore!=='boolean')throw Error('Invalid queue');
 return {hasMore:x.hasMore,items:x.items.map(v=>{const i=obj(v),p=receipt(i);if((i.accountId!==null&&!id(i.accountId))||(i.email!==null&&typeof i.email!=='string')||typeof i.canReview!=='boolean'||!['pending','reviewing'].includes(p.status))throw Error('Invalid request');return {...p,accountId:i.accountId as string|null,email:i.email as string|null,canReview:i.canReview};})};
}
export const validNewPassword=(v:unknown):v is string=>typeof v==='string'&&v.length>=12&&v.length<=128;
export const validAccountEmail=(v:unknown):v is string=>typeof v==='string'&&v.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
