const DRAFT_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
import type {ReviewKind} from './story-review-contract';
const reviewKind=(v:unknown):v is ReviewKind=>v==='draft'||v==='revision';
export type SelfPublicationCommand={kind:ReviewKind;requestId:string;fingerprint:string;reason:string};
export type SelfBylineCommand={bylineId:string;profileRevision:number;reviewRevision:number;reason:string;requestId:string};
export type SelfBylineOptions={profileRevision:number;reviewRevision:number;approved:boolean;items:{id:string;name:string}[]};
const obj=(raw:unknown):Record<string,unknown>=>{if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid editorial privilege request');return raw as Record<string,unknown>;};
const uuid=(v:unknown):v is string=>typeof v==='string'&&DRAFT_UUID.test(v);
const revision=(v:unknown,min:number):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<2147483647;
const reason=(v:unknown,max:number):v is string=>typeof v==='string'&&v.trim().length>=12&&v.length<=max&&!/[\u0000-\u001f\u007f]/.test(v);
export function validateSelfPublication(raw:unknown):SelfPublicationCommand{
 const c=obj(raw);if(Object.keys(c).length!==4||!reviewKind(c.kind)||!uuid(c.requestId)||typeof c.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(c.fingerprint)||!reason(c.reason,1000))throw Error('Invalid self publication');
 return {kind:c.kind,requestId:c.requestId,fingerprint:c.fingerprint,reason:c.reason.trim()};
}
export function validateSelfByline(raw:unknown):SelfBylineCommand{
 const c=obj(raw);if(Object.keys(c).length!==5||!uuid(c.bylineId)||!uuid(c.requestId)||!revision(c.profileRevision,1)||!revision(c.reviewRevision,0)||!reason(c.reason,500))throw Error('Invalid byline link');
 return {bylineId:c.bylineId,requestId:c.requestId,profileRevision:c.profileRevision,reviewRevision:c.reviewRevision,reason:c.reason.trim()};
}
export function parseSelfBylineOptions(raw:unknown):SelfBylineOptions{
 const c=obj(raw);if(!revision(c.profileRevision,1)||!revision(c.reviewRevision,0)||typeof c.approved!=='boolean'||!Array.isArray(c.items)||c.items.length>100)throw Error('Invalid self byline options');
 for(const raw of c.items){const x=obj(raw);if(!uuid(x.id)||typeof x.name!=='string'||!x.name.trim()||x.name.length>300)throw Error('Invalid byline option');}
 return c as unknown as SelfBylineOptions;
}
