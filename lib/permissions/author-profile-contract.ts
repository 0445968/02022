import {DRAFT_UUID,isDraftTimestamp} from './assigned-draft-contract';
export function parseAuthorProfileUpdate(raw:unknown){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid profile');
 const r=raw as Record<string,unknown>,keys=['bylineName','editorialTitle','bio','bylineStatus','headshotMediaId','expectedUpdatedAt'];
 if(Object.keys(r).length!==keys.length||keys.some(k=>!Object.prototype.hasOwnProperty.call(r,k)))throw Error('Invalid fields');
 const field=(v:unknown,max:number,required=false)=>{
  if(typeof v!=='string'||v.trim().length>max||required&&!v.trim()||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v))throw Error('Invalid text');
  return v.trim();
 };
 if(r.bylineStatus!=='active'&&r.bylineStatus!=='former'&&r.bylineStatus!=='hidden')throw Error('Invalid status');
 if(r.headshotMediaId!==null&&(typeof r.headshotMediaId!=='string'||!DRAFT_UUID.test(r.headshotMediaId)))throw Error('Invalid headshot');
 if(!isDraftTimestamp(r.expectedUpdatedAt))throw Error('Invalid version');
 return {bylineName:field(r.bylineName,160,true),editorialTitle:field(r.editorialTitle,160)||null,bio:field(r.bio,10000)||null,
 bylineStatus:r.bylineStatus as 'active'|'former'|'hidden',headshotMediaId:r.headshotMediaId as string|null,expectedUpdatedAt:r.expectedUpdatedAt};
}
