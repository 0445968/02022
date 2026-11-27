/**
 * CT16 R3c: provider-neutral translation boundary.
 * No network calls, credentials, or fake translations.
 * Only selected text segments leave the trusted editorial pipeline; link URLs,
 * embedded media identifiers, credit strings, and formatting stay in the copy.
 */
export type TranslationLocale='en'|'es';
export type TranslationCopy={
 headline:string;shortTitle:string|null;subheadline:string|null;summary:string|null;
 seoTitle:string|null;seoDescription:string|null;imageCaption:string|null;body:Record<string,unknown>;
};
export type TranslationSegment={id:string;text:string};
export type TranslationRequest={sourceLocale:TranslationLocale;targetLocale:TranslationLocale;sourceFingerprint:string;segments:TranslationSegment[]};
export type TranslationResult={sourceFingerprint:string;targetLocale:TranslationLocale;segments:TranslationSegment[]};
type Path=(string|number)[];
const fields=['headline','shortTitle','subheadline','summary','seoTitle','seoDescription','imageCaption'] as const;
const limits={headline:300,shortTitle:300,subheadline:600,summary:3000,seoTitle:300,seoDescription:3000,imageCaption:3000};
const nodes=new Set(['doc','paragraph','heading','text','bulletList','orderedList','listItem','blockquote','codeBlock','horizontalRule','hardBreak','image']);
const allowedMarks=new Set(['bold','italic','strike','underline','code','link','textStyle','highlight','subscript','superscript']);
const maxSegments=12000,maxBytes=512*1024;
const object=(raw:unknown):Record<string,unknown>=>{if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid translation object');return raw as Record<string,unknown>;};
const exact=(x:Record<string,unknown>,keys:readonly string[])=>Object.keys(x).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(x,k));
const safeText=(x:unknown,max:number):x is string=>typeof x==='string'&&x.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(x);
const locale=(x:unknown):x is TranslationLocale=>x==='en'||x==='es';
const fingerprint=(x:unknown):x is string=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
function size(x:unknown){return new TextEncoder().encode(JSON.stringify(x)).byteLength;}
function walk(copy:TranslationCopy){
 const paths:Path[]=[],segments:TranslationSegment[]=[],caps:number[]=[];let count=0;
 function add(text:unknown,path:Path,max:number){if(!safeText(text,max))throw Error('Unsupported text');if(!text.trim())return;if(segments.length>=maxSegments)throw Error('Too many segments');paths.push(path);caps.push(max);segments.push({id:String(segments.length),text});}
 const root=object(copy);
 if(!exact(root,[...fields,'body'])||typeof copy.headline!=='string'||!copy.headline.trim()||size(copy)>maxBytes)throw Error('Invalid source copy');
 for(const key of fields)if(copy[key]!==null)add(copy[key],[key],limits[key]);
 function visit(raw:unknown,path:Path,depth:number,skip:boolean){
  if(++count>12000||depth>40)throw Error('Document too complex');const n=object(raw);
  if(typeof n.type!=='string'||!nodes.has(n.type)||Object.keys(n).some(k=>!['type','attrs','text','content','marks'].includes(k))||(depth===0?n.type!=='doc':n.type==='doc'))throw Error('Unsupported node');
  if(n.marks!==undefined){if(n.type!=='text'||!Array.isArray(n.marks)||n.marks.length>12)throw Error('Unsupported marks');for(const rawMark of n.marks){const mark=object(rawMark);if(typeof mark.type!=='string'||!allowedMarks.has(mark.type)||Object.keys(mark).some(k=>!['type','attrs'].includes(k)))throw Error('Unsupported mark');}}
  const preserve=skip||n.type==='codeBlock'||(Array.isArray(n.marks)&&n.marks.some(m=>object(m).type==='code'));
  if(n.type==='text'){
   if(typeof n.text!=='string'||!n.text.length||n.content!==undefined)throw Error('Invalid text node');
   if(!preserve)add(n.text,[...path,'text'],maxBytes);
  }else if(n.text!==undefined)throw Error('Unexpected text field');
  if(n.type==='image'&&n.attrs!==undefined){const attrs=object(n.attrs);for(const k of ['alt','title','description'])if(attrs[k]!=null)add(attrs[k],[...path,'attrs',k],4096);}
  if(n.content!==undefined){if(!Array.isArray(n.content)||n.type==='image')throw Error('Unsupported children');n.content.forEach((child,i)=>visit(child,[...path,'content',i],depth+1,preserve));}
 }
 visit(copy.body,['body'],0,false);
 return {segments,paths,caps};
}
export function prepareTranslation(copy:TranslationCopy,sourceLocale:TranslationLocale,sourceFingerprint:string):TranslationRequest{
 if(!locale(sourceLocale)||!fingerprint(sourceFingerprint))throw Error('Invalid translation source');
 const {segments}=walk(copy);
 if(segments.length===0||size(segments)>maxBytes)throw Error('Translation input too large');
 return {sourceLocale,targetLocale:sourceLocale==='en'?'es':'en',sourceFingerprint,segments};
}
export function applyTranslationResult(copy:TranslationCopy,request:TranslationRequest,raw:unknown):TranslationCopy{
 const response=object(raw);
 if(!exact(response,['sourceFingerprint','targetLocale','segments'])||!locale(request.sourceLocale)||request.targetLocale===(request.sourceLocale)||!locale(request.targetLocale)||!fingerprint(request.sourceFingerprint)||response.sourceFingerprint!==request.sourceFingerprint||response.targetLocale!==request.targetLocale||!Array.isArray(response.segments)||size(response)>maxBytes)throw Error('Invalid translation response');
 const {segments,paths,caps}=walk(copy);
 if(JSON.stringify(segments)!==JSON.stringify(request.segments)||response.segments.length!==segments.length)throw Error('Source copy changed or incomplete result');
 const result=JSON.parse(JSON.stringify(copy)) as TranslationCopy;
 const translated=new Map<string,string>();
 for(const rawSegment of response.segments){const s=object(rawSegment);if(!exact(s,['id','text'])||typeof s.id!=='string'||translated.has(s.id)||!segments.some(seg=>seg.id===s.id)||!safeText(s.text,maxBytes)||!s.text.trim())throw Error('Invalid translation segment');translated.set(s.id,s.text);}
 for(let i=0;i<paths.length;i++){
  const translatedText=translated.get(segments[i].id);if(!safeText(translatedText,caps[i])||!translatedText.trim())throw Error('Invalid translated text length');
  let parent:Record<string|number,unknown>=result as unknown as Record<string|number,unknown>;
  for(const key of paths[i].slice(0,-1)){parent=parent[key] as Record<string|number,unknown>;}
  parent[paths[i][paths[i].length-1]]=translatedText;
 }
 if(size(result)>maxBytes)throw Error('Translated copy too large');
 return result;
}
