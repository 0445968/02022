/** Reader content never renders arbitrary script/credential-bearing URLs. */
export function safeArticleLink(v:unknown):v is string{
 if(typeof v!=='string'||!v||v.length>4096||/[\x00-\x20\x7f\\]/.test(v))return false;
 if(v.startsWith('#')||(v.startsWith('/')&&!v.startsWith('//')))return true;
 if(/^(mailto:|tel:)/i.test(v))return true;
 try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}
}
export function safeImageUrl(v:unknown):v is string{
 return safeArticleLink(v)&&/^https?:\/\//i.test(v);
}
type Node=Record<string,unknown>;
const object=(v:unknown):v is Node=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function imageReferences(body:unknown):string[]{
 const found=new Set<string>();let count=0;
 function visit(n:unknown,depth:number){if(!object(n)||depth>64||++count>20000)return;
  if(n.type==='image'&&object(n.attrs)&&safeImageUrl(n.attrs.src)&&found.size<100)found.add(n.attrs.src);
  if(Array.isArray(n.content))n.content.forEach(c=>visit(c,depth+1));
 }
 visit(body,0);return [...found];
}
export function projectPublicBody(body:unknown,approved:ReadonlyMap<string,string>):Node{
 let count=0;
 function visit(n:unknown,depth:number):Node|null{
  if(!object(n)||depth>64||++count>20000)return null;
  if(n.type==='image'){
   const a=n.attrs;if(!object(a)||!safeImageUrl(a.src)||!approved.has(a.src)||(a.mediaAssetId!=null&&a.mediaAssetId!==approved.get(a.src)))return null;
   return {type:'image',attrs:{src:a.src,alt:typeof a.alt==='string'?a.alt:'',description:typeof a.description==='string'?a.description:null,credit:typeof a.credit==='string'?a.credit:null}};
  }
  const node={...n};
  if(Array.isArray(n.content))node.content=n.content.map(c=>visit(c,depth+1)).filter(Boolean);
  if(Array.isArray(n.marks))node.marks=n.marks.filter(m=>object(m)&&(m.type!=='link'||object(m.attrs)&&safeArticleLink(m.attrs.href)));
  return node;
 }
 return visit(body,0)??{type:'doc',content:[]};
}
