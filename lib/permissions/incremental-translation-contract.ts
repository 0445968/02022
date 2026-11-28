/**
 * Offline sentence planning. A trusted persistence layer must supply stable
 * block identities and approved, aligned sentence pairs from the same article.
 * No cross-story memory, heuristic rich-text reconstruction, or automatic save.
 */
export type EditorialLocale='en'|'es-CO';
export type SentencePair={source:string;translation:string;reviewed:boolean;manuallyEdited:boolean};
export type TranslationBlock={id:string;text:string};
export type PriorBlock={id:string;sentences:SentencePair[]};
export type SentencePlanItem={blockId:string;index:number;source:string;separator:string;mode:'reuse'|'translate'|'review';translation:string|null};
export type IncrementalPlan={items:SentencePlanItem[];characters:number;reused:number;reviewRequired:number;removedBlocks:string[];removedSentences:number};
const MAX=50000,MAX_BLOCKS=1000,MAX_SENTENCES=2500;
const id=(x:unknown)=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(x);
const validText=(x:unknown)=>typeof x==='string'&&x.length>0&&x.length<=MAX&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(x);
export function splitEditorialSentences(text:string,locale:EditorialLocale){
 if(!validText(text)||(locale!=='en'&&locale!=='es-CO'))throw Error('Invalid sentence input');
 const output:{source:string;separator:string}[]=[];
 for(const s of new Intl.Segmenter(locale,{granularity:'sentence'}).segment(text)){
  const match=s.segment.match(/^(.*?)(\s*)$/su);
  if(!match||!match[1].trim()){if(output.length)output[output.length-1].separator+=s.segment;else throw Error('Unsupported empty block');continue;}
  output.push({source:match[1],separator:match[2]});
 }
 if(!output.length||output.length>MAX_SENTENCES||output.map(x=>x.source+x.separator).join('')!==text)throw Error('Sentence split incomplete');
 return output;
}
export function planIncrementalTranslation(current:TranslationBlock[],previous:PriorBlock[],locale:EditorialLocale):IncrementalPlan{
 if(!Array.isArray(current)||!Array.isArray(previous)||current.length>MAX_BLOCKS||previous.length>MAX_BLOCKS)throw Error('Invalid block list');
 const prior=new Map<string,PriorBlock>(),seen=new Set<string>();let priorSize=0,priorCount=0,currentSize=0;
 for(const b of previous){
  if(!id(b.id)||prior.has(b.id)||!Array.isArray(b.sentences)||b.sentences.length>MAX_SENTENCES)throw Error('Invalid aligned history');
  for(const s of b.sentences){if(!validText(s.source)||!validText(s.translation)||typeof s.reviewed!=='boolean'||typeof s.manuallyEdited!=='boolean')throw Error('Invalid prior sentence');priorSize+=s.source.length+s.translation.length;priorCount++;}
  if(priorSize>MAX*4||priorCount>MAX_SENTENCES)throw Error('Aligned history exceeds limit');prior.set(b.id,b);
 }
 const result:IncrementalPlan={items:[],characters:0,reused:0,reviewRequired:0,removedBlocks:[],removedSentences:0};
 for(const b of current){
  if(!id(b.id)||seen.has(b.id)||!validText(b.text))throw Error('Invalid source block');
  seen.add(b.id);currentSize+=b.text.length;if(currentSize>MAX)throw Error('Source exceeds limit');
  const sentences=splitEditorialSentences(b.text,locale),old=prior.get(b.id)?.sentences??[];
  const byText=new Map<string,SentencePair[]>(),counts=new Map<string,number>();
  for(const s of old)byText.set(s.source,[...(byText.get(s.source)??[]),s]);
  for(const s of sentences)counts.set(s.source,(counts.get(s.source)??0)+1);
  // Reuse only unique exact matches. Duplicate or unreviewed matches must
  // not silently pick one of several human-edited translations.
  const matched=new Set<SentencePair>();const choices=sentences.map(s=>{
   const candidates=byText.get(s.source)??[];
   const exact=candidates.length===1&&counts.get(s.source)===1?candidates[0]:null;
   if(exact)matched.add(exact);return {s,candidates,exact};
  });
  const unmatchedManual=old.some(s=>!matched.has(s)&&s.manuallyEdited);
  result.removedSentences+=old.filter(s=>!matched.has(s)).length;
  for(let index=0;index<choices.length;index++){
   const {s,candidates,exact}=choices[index];let mode:SentencePlanItem['mode']='translate',translation:string|null=null;
   if(exact?.reviewed){mode='reuse';translation=exact.translation;result.reused++;}
   else if(candidates.length||unmatchedManual){mode='review';translation=exact?.translation??null;result.reviewRequired++;}
   else result.characters+=s.source.length;
   result.items.push({blockId:b.id,index,source:s.source,separator:s.separator,mode,translation});
   if(result.items.length>MAX_SENTENCES)throw Error('Too many sentences');
  }
 }
 for(const [blockId,b] of prior)if(!seen.has(blockId)){result.removedBlocks.push(blockId);result.removedSentences+=b.sentences.length;}
 return result;
}
