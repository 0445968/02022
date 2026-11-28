import {splitEditorialSentences,type EditorialLocale,type SentencePair} from './incremental-translation-contract.ts';
/** Strict plain-text baseline verification only. No inferred rich-text mapping. */
export function verifyPlainTextAlignment(source:string,target:string,sourceLocale:EditorialLocale,targetLocale:EditorialLocale,pairs:SentencePair[]):SentencePair[]{
 if(sourceLocale===targetLocale||!Array.isArray(pairs)||pairs.length<1||pairs.length>2500)throw Error('Invalid alignment');
 const a=splitEditorialSentences(source,sourceLocale),b=splitEditorialSentences(target,targetLocale);
 if(a.length!==b.length||a.length!==pairs.length)throw Error('Manual alignment required');
 return pairs.map((p,i)=>{if(!p||Object.keys(p).length!==4||p.source!==a[i].source||p.translation!==b[i].source||p.reviewed!==true||typeof p.manuallyEdited!=='boolean')throw Error('Unverified alignment');return {source:p.source,translation:p.translation,reviewed:true,manuallyEdited:p.manuallyEdited};});
}
export function previewIncrementalCost(items:readonly {source:string;mode:'reuse'|'translate'|'review'}[],remaining:number){
 if(!Number.isSafeInteger(remaining)||remaining<0||items.length>2500)throw Error('Invalid budget preview');let characters=0,fullCharacters=0,review=0,reused=0;
 for(const i of items){if(typeof i.source!=='string'||!i.source.trim()||!['reuse','translate','review'].includes(i.mode))throw Error('Invalid preview item');fullCharacters+=i.source.length;if(fullCharacters>50000)throw Error('Preview exceeds limit');if(i.mode==='translate')characters+=i.source.length;else if(i.mode==='review')review++;else reused++;}
 return {characters,fullCharacters,review,reused,withinBudget:characters<=remaining,canProceed:review===0&&characters<=remaining};
}
