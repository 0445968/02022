import {DRAFT_UUID} from './assigned-draft-contract';
export type ApprovedImageNode={type:'image';attrs:{src:string;alt:string;mediaAssetId:string;approvedAttachment:true;description?:string;credit?:string}};
export type ApprovedMediaPage={items:ApprovedImageNode[];hasMore:boolean};
export function parseApprovedMediaPage(raw:unknown):ApprovedMediaPage{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid media page');
 const r=raw as ApprovedMediaPage;
 if(typeof r.hasMore!=='boolean'||!Array.isArray(r.items)||r.items.length>24)throw Error('Invalid media page');
 for(const node of r.items){
  const a=node?.attrs;
  if(node?.type!=='image'||!a||a.approvedAttachment!==true||typeof a.mediaAssetId!=='string'||!DRAFT_UUID.test(a.mediaAssetId)
   ||typeof a.src!=='string'||!/^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/media\/[A-Za-z0-9_./%+-]+$/.test(a.src)
   ||typeof a.alt!=='string'||[a.src,a.alt,a.description,a.credit].some(v=>v!==undefined&&(typeof v!=='string'||v.length>4096))
   ||Object.keys(a).some(k=>!['src','alt','mediaAssetId','approvedAttachment','description','credit'].includes(k))
   ||Object.keys(node).some(k=>!['type','attrs'].includes(k)))throw Error('Invalid approved image');
 }
 return r;
}
