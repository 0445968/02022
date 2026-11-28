import {splitEditorialSentences} from './incremental-translation-contract.ts';
import type {VerifiedStoredPair} from './translation-memory-reuse-contract.ts';
const blocks=['headline','shortTitle','subheadline','summary','seoTitle','seoDescription','imageCaption','body'] as const;
type Block=typeof blocks[number];
const hash=(x:unknown):x is string=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const uuid=(x:unknown):x is string=>typeof x==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(x);
const block=(x:unknown):x is Block=>typeof x==='string'&&(blocks as readonly string[]).includes(x);
const rev=(x:unknown):x is number=>typeof x==='number'&&Number.isSafeInteger(x)&&x>0&&x<2147483647;
const obj=(x:unknown):Record<string,unknown>=>{if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Invalid alignment');return x as Record<string,unknown>;};
const exact=(x:Record<string,unknown>,keys:string[])=>Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
export type AlignmentCandidate={blockId:Block;source:string;target:string;approved:boolean;pairs:VerifiedStoredPair[]|null};
export type AlignmentReview={sourceId:string;sourceFingerprint:string;targetFingerprint:string;revision:number;sourceLocale:'en'|'es';rows:AlignmentCandidate[]};
export type AlignmentApproval={sourceFingerprint:string;targetFingerprint:string;revision:number;blockId:Block;confirmed:true};
export function parseAlignmentReview(raw:unknown,id:string,expected:string):AlignmentReview{
 const r=obj(raw);
 if(!exact(r,['sourceId','sourceFingerprint','targetFingerprint','revision','sourceLocale','rows'])||!uuid(r.sourceId)||r.sourceId!==id||!hash(r.sourceFingerprint)||r.sourceFingerprint!==expected||!hash(r.targetFingerprint)||!rev(r.revision)||(r.sourceLocale!=='en'&&r.sourceLocale!=='es')||!Array.isArray(r.rows)||r.rows.length>8)throw Error('Invalid alignment review');
 const sourceLocale=r.sourceLocale,seen=new Set<string>();
 const rows=r.rows.map((v:unknown):AlignmentCandidate=>{
  const x=obj(v);if(!exact(x,['blockId','source','target','approved'])||!block(x.blockId)||seen.has(x.blockId)||typeof x.source!=='string'||!x.source.trim()||x.source.length>40000||typeof x.target!=='string'||!x.target.trim()||x.target.length>40000||typeof x.approved!=='boolean')throw Error('Invalid alignment candidate');
  seen.add(x.blockId);let pairs:VerifiedStoredPair[]|null=null;
  try{const a=splitEditorialSentences(x.source,sourceLocale==='es'?'es-CO':'en'),b=splitEditorialSentences(x.target,sourceLocale==='es'?'en':'es-CO');if(a.length===b.length&&a.length<=100)pairs=a.map((s,i)=>({source:s.source,translation:b[i].source,sourceSeparator:s.separator,targetSeparator:b[i].separator,reviewed:true,manuallyEdited:true}));}catch{/* not eligible */}
  return {blockId:x.blockId,source:x.source,target:x.target,approved:x.approved,pairs};
 });
 return {sourceId:r.sourceId,sourceFingerprint:r.sourceFingerprint,targetFingerprint:r.targetFingerprint,revision:r.revision,sourceLocale,rows};
}
export function parseAlignmentApproval(raw:unknown):AlignmentApproval{const r=obj(raw);if(!exact(r,['sourceFingerprint','targetFingerprint','revision','blockId','confirmed'])||!hash(r.sourceFingerprint)||!hash(r.targetFingerprint)||!rev(r.revision)||!block(r.blockId)||r.confirmed!==true)throw Error('Invalid confirmation');return {sourceFingerprint:r.sourceFingerprint,targetFingerprint:r.targetFingerprint,revision:r.revision,blockId:r.blockId,confirmed:true};}
