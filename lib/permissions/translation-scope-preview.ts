import {prepareTranslation,type TranslationCopy,type TranslationLocale} from './story-translation-contract.ts';
import {splitEditorialSentences} from './incremental-translation-contract.ts';
export type PreviewBlock={id:string;label:string;characters:number;sentences:{id:string;label:string;characters:number}[]};
export type ScopePreview={fullCharacters:number;fullSupported:boolean;blocks:PreviewBlock[]};
const plain=(v:unknown):v is {type:'paragraph';content:[{type:'text';text:string}]}=>{
 if(!v||typeof v!=='object'||Array.isArray(v))return false;
 const x=v as Record<string,unknown>;
 if(x.type!=='paragraph'||Object.keys(x).some(k=>k!=='type'&&k!=='content')||!Array.isArray(x.content)||x.content.length!==1)return false;
 const n=x.content[0];return !!n&&typeof n==='object'&&!Array.isArray(n)&&n.type==='text'&&typeof n.text==='string'&&Object.keys(n).every(k=>k==='type'||k==='text')&&!!n.text.trim();
};
const label=(s:string)=>s.length>90?s.slice(0,90)+'…':s;
export function buildScopePreview(copy:TranslationCopy,locale:TranslationLocale,fingerprint:string):ScopePreview{
 const request=prepareTranslation(copy,locale,fingerprint),fullCharacters=request.segments.reduce((n,s)=>n+s.text.length,0);
 const blocks:PreviewBlock[]=[];
 const content=copy.body.content;
 if(Array.isArray(content))for(let i=0;i<content.length&&blocks.length<100;i++){
  const b=content[i];if(!plain(b))continue;const text=b.content[0].text;
  if(text.length>50000)continue;
  try{const sentences=splitEditorialSentences(text,locale==='es'?'es-CO':'en');if(sentences.length>100)continue;
   blocks.push({id:String(i),label:label(text),characters:text.length,sentences:sentences.map((s,j)=>({id:String(j),label:label(s.source),characters:s.source.length}))});
  }catch{/* complex blocks remain in whole article estimate only */}
 }
 return {fullCharacters,fullSupported:fullCharacters<=50000&&request.segments.length<=2500&&request.segments.every(s=>s.text.length<=5000),blocks};
}
