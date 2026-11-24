/** CT-05b.1 narrow copy-only contract; no status or publication/ownership fields from browser. */
export const DRAFT_BODY_LIMIT=512*1024;
export const DRAFT_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type DraftCopy={headline:string;subheadline:string|null;summary:string|null;body:Record<string,unknown>};
export type DraftCommand={action:'save'|'submit';expectedUpdatedAt:string;copy:DraftCopy};
export type DraftState=DraftCopy&{id:string;language:'en'|'es';status:'draft'|'in_review';updatedAt:string;canSubmit:boolean};
function record(v:unknown):Record<string,unknown>{
  if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid object');
  return v as Record<string,unknown>;
}
function exact(v:Record<string,unknown>,keys:string[]){
  if(Object.keys(v).length!==keys.length||!keys.every(k=>Object.prototype.hasOwnProperty.call(v,k)))throw Error('Invalid fields');
}
const timestamp=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;
export function isDraftTimestamp(v:unknown):v is string{
  return typeof v==='string'&&timestamp.test(v)&&Number.isFinite(Date.parse(v));
}
const nodes=new Set(['doc','paragraph','heading','text','bulletList','orderedList','listItem','blockquote','codeBlock','horizontalRule','hardBreak','image']);
const marks=new Set(['bold','italic','strike','underline','code','link','textStyle','highlight','subscript','superscript']);
const color=/^(?:#[0-9a-f]{3,8}|rgba?\([\d., %]+\)|[a-z]{1,20})$/i;
function attributes(raw:unknown,allowed:Record<string,(v:unknown)=>boolean>){
  if(raw===undefined)return;
  for(const [k,v] of Object.entries(record(raw)))if(!Object.prototype.hasOwnProperty.call(allowed,k)||!allowed[k](v))throw Error('Unsupported attributes');
}
const align=(v:unknown)=>v===null||['left','right','center','justify'].includes(String(v));
const nullableText=(v:unknown)=>v===null||typeof v==='string'&&v.length<=4096;
const nullableColor=(v:unknown)=>v===null||typeof v==='string'&&color.test(v);
const safeLink=(v:unknown)=>typeof v==='string'&&v.length<=2048&&!/[\u0000-\u0020\u007f\\]/.test(v)&&/^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(v);
export function validateDraftBody(raw:unknown):Record<string,unknown>{
  let count=0;
  function visit(value:unknown,depth:number){
    if(++count>12000||depth>40)throw Error('Body too complex');
    const n=record(value);
    if(typeof n.type!=='string'||!nodes.has(n.type)||Object.keys(n).some(k=>!['type','attrs','content','marks','text'].includes(k)))throw Error('Unsupported node');
    if(depth===0?n.type!=='doc':n.type==='doc')throw Error('Invalid document');
    if(n.type==='text'){
      if(typeof n.text!=='string'||n.text.length===0||n.content!==undefined)throw Error('Invalid text');
    }else if(n.text!==undefined)throw Error('Invalid text node');
    if(n.type==='image'){
      // Existing inline media is compared to stored nodes separately. No new image URL.
      attributes(n.attrs,{src:nullableText,alt:nullableText,title:nullableText,mediaAssetId:nullableText,description:nullableText,credit:nullableText,approvedAttachment:v=>v===null||v===true});
      if(n.content!==undefined||n.marks!==undefined)throw Error('Invalid image');
    }else if(n.type==='heading')attributes(n.attrs,{level:v=>v===2||v===3,textAlign:align});
    else if(n.type==='paragraph')attributes(n.attrs,{textAlign:align});
    else if(n.type==='orderedList')attributes(n.attrs,{start:v=>typeof v==='number'&&Number.isInteger(v)&&v>=1&&v<=100000});
    else if(n.type==='codeBlock')attributes(n.attrs,{language:nullableText});
    else attributes(n.attrs,{});
    if(n.marks!==undefined){
      if(n.type!=='text'||!Array.isArray(n.marks)||n.marks.length>12)throw Error('Invalid marks');
      for(const rawMark of n.marks){
        const m=record(rawMark);
        if(typeof m.type!=='string'||!marks.has(m.type)||Object.keys(m).some(k=>!['type','attrs'].includes(k)))throw Error('Unsupported mark');
        if(m.type==='link'){attributes(m.attrs,{href:safeLink,target:v=>v===null||v==='_blank'||v==='_self',rel:nullableText,class:nullableText});
          if(!safeLink(record(m.attrs).href))throw Error('Invalid link');}
        else if(m.type==='textStyle'||m.type==='highlight')attributes(m.attrs,{color:nullableColor});
        else attributes(m.attrs,{});
      }
    }
    if(n.content!==undefined){
      if(!Array.isArray(n.content))throw Error('Invalid children');
      for(const child of n.content)visit(child,depth+1);
    }
  }
  visit(raw,0);
  return record(raw);
}
function canonical(v:unknown):unknown{
  if(Array.isArray(v))return v.map(canonical);
  if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).filter(([,value])=>value!==null).sort(([a],[b])=>a.localeCompare(b)).map(([k,value])=>[k,canonical(value)]));
  return v;
}
function images(v:unknown):string[]{
  if(!v||typeof v!=='object'||Array.isArray(v))return [];
  const n=v as Record<string,unknown>;
  if(n.type==='image')return [JSON.stringify(canonical(n))];
  return Array.isArray(n.content)?n.content.flatMap(images):[];
}
export function existingImagesOnly(previous:unknown,next:unknown):boolean{
  const old=new Set(images(previous));
  return images(next).every(node=>old.has(node));
}
function optional(v:unknown,limit:number):string|null{
  if(v===null)return null;
  if(typeof v!=='string'||v.length>limit)throw Error('Invalid copy');
  return v.trim()||null;
}
export function validateDraftCommand(raw:unknown):DraftCommand{
  const r=record(raw);exact(r,['action','expectedUpdatedAt','copy']);
  if((r.action!=='save'&&r.action!=='submit')||!isDraftTimestamp(r.expectedUpdatedAt))throw Error('Invalid command');
  const c=record(r.copy);exact(c,['headline','subheadline','summary','body']);
  if(typeof c.headline!=='string'||!c.headline.trim()||c.headline.length>300)throw Error('Invalid headline');
  const body=validateDraftBody(c.body);
  if(new TextEncoder().encode(JSON.stringify(body)).byteLength>DRAFT_BODY_LIMIT)throw Error('Body too large');
  return {action:r.action,expectedUpdatedAt:r.expectedUpdatedAt,copy:{headline:c.headline.trim(),subheadline:optional(c.subheadline,600),summary:optional(c.summary,3000),body}};
}
