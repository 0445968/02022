import {planVerifiedPlainBlock,type VerifiedStoredPair} from './translation-memory-reuse-contract.ts';
import type {TranslationCopy,TranslationLocale} from './story-translation-contract.ts';
export type ChangedPreview={characters:number;coveredCharacters:number;unverifiedCharacters:number;reused:number;reviewRequired:number;complete:boolean};
const fields=['headline','shortTitle','subheadline','summary','seoTitle','seoDescription','imageCaption'] as const;
function currentAt(copy:TranslationCopy,path:unknown):string|null{
 if(!Array.isArray(path))return null;
 if(path.length===1&&fields.includes(path[0]))return copy[path[0] as typeof fields[number]];
 if(JSON.stringify(path)!=='["body","content",0,"content",0]')return null;
 const nodes=copy.body.content;if(!Array.isArray(nodes)||nodes.length!==1)return null;const n=nodes[0];
 if(!n||n.type!=='paragraph'||Object.keys(n).length!==2||!Array.isArray(n.content)||n.content.length!==1)return null;
 const t=n.content[0];return t&&t.type==='text'&&Object.keys(t).length===2&&typeof t.text==='string'?t.text:null;
}
/** Read-only estimate, never authorize sending or applying text. */
export function buildChangedPreview(copy:TranslationCopy,locale:TranslationLocale,fingerprint:string,fullCharacters:number,raw:unknown):ChangedPreview|null{
 if(!raw||typeof raw!=='object'||!Number.isSafeInteger(fullCharacters)||fullCharacters<0)return null;
 const x=raw as Record<string,unknown>;
 if(x.sourceFingerprint!==fingerprint||!Array.isArray(x.rows)||!x.rows.length||x.rows.length>100)return null;
 let characters=0,coveredCharacters=0,reused=0,reviewRequired=0;
 const seen=new Set<string>(),ids=new Set<string>(),sourceLocale=locale==='es'?'es-CO':'en',targetLocale=locale==='es'?'en':'es-CO';
 for(const row of x.rows){
  if(!row||typeof row!=='object'||typeof row.blockId!=='string'||typeof row.previousSource!=='string'||typeof row.previousTarget!=='string'||typeof row.currentSource!=='string'||!Array.isArray(row.pairs))return null;
  const path=JSON.stringify(row.path);
  if(seen.has(path)||ids.has(row.blockId)||currentAt(copy,row.path)!==row.currentSource)return null;
  seen.add(path);ids.add(row.blockId);
  try{
   const p=planVerifiedPlainBlock(row.blockId,row.previousSource,row.previousTarget,row.currentSource,sourceLocale,targetLocale,row.pairs as VerifiedStoredPair[],50000);
   characters+=p.estimate.characters;coveredCharacters+=row.currentSource.length;reused+=p.estimate.reused;reviewRequired+=p.estimate.review;
  }catch{return null;}
 }
 if(coveredCharacters>fullCharacters)return null;
 const unverifiedCharacters=fullCharacters-coveredCharacters;
 return {characters,coveredCharacters,unverifiedCharacters,reused,reviewRequired,complete:unverifiedCharacters===0&&reviewRequired===0};
}
