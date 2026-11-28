import {splitEditorialSentences,planIncrementalTranslation,type EditorialLocale,type SentencePair} from './incremental-translation-contract.ts';
import {previewIncrementalCost} from './translation-alignment-contract.ts';
export type VerifiedStoredPair=SentencePair&{sourceSeparator:string;targetSeparator:string};
/** Inputs must be selected by a trusted scoped reader from the same baseline. */
export function planVerifiedPlainBlock(blockId:string,previousSource:string,previousTarget:string,currentSource:string,sourceLocale:EditorialLocale,targetLocale:EditorialLocale,stored:VerifiedStoredPair[],remaining:number){
 if(sourceLocale===targetLocale||!Array.isArray(stored)||stored.length<1||stored.length>2500)throw Error('Unverified stored alignment');
 const a=splitEditorialSentences(previousSource,sourceLocale),b=splitEditorialSentences(previousTarget,targetLocale);
 if(a.length!==b.length||a.length!==stored.length)throw Error('Manual alignment required');
 const sentences=stored.map((p,i)=>{
  if(!p||Object.keys(p).length!==6||p.source!==a[i].source||p.translation!==b[i].source||p.sourceSeparator!==a[i].separator||p.targetSeparator!==b[i].separator||p.reviewed!==true||typeof p.manuallyEdited!=='boolean')throw Error('Stored alignment does not match baseline');
  return {source:p.source,translation:p.translation,reviewed:true,manuallyEdited:p.manuallyEdited};
 });
 const plan=planIncrementalTranslation([{id:blockId,text:currentSource}],[{id:blockId,sentences}],sourceLocale);
 return {plan,estimate:previewIncrementalCost(plan.items,remaining)};
}
