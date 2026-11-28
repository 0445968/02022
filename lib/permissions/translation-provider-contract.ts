/**
 * Offline Azure Translator v3 wire preparation and validation.
 * Intentionally no network, environment, credentials, persistence or API route.
 * Only a future authorized server workflow may invoke a transport, after
 * reserving the entire request's conservative character budget atomically.
 */
import type {TranslationRequest,TranslationResult,TranslationLocale,TranslationSegment} from './story-translation-contract';
import type {PollTranslationCopy} from './poll-translation-contract';
const MAX_TOTAL=50000, MAX_BATCH=5000, MAX_ITEMS=25, MAX_BATCHES=100, MAX_SEGMENTS=2500, MAX_OUTPUT=512*1024;
const lang=(x:unknown):x is TranslationLocale=>x==='en'||x==='es';
const hash=(x:unknown):x is string=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const text=(x:unknown,max:number):x is string=>typeof x==='string'&&x.trim().length>0&&x.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(x);
const object=(x:unknown):Record<string,unknown>=>{if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Invalid translation object');return x as Record<string,unknown>;};
const exact=(x:Record<string,unknown>,keys:string[])=>Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
export type ProviderBatch={ids:string[];body:{Text:string}[];characters:number};
export type ProviderPlan={sourceFingerprint:string;sourceLocale:TranslationLocale;targetLocale:TranslationLocale;characters:number;batches:ProviderBatch[]};
export function planTranslation(request:TranslationRequest,maxCharacters:number):ProviderPlan{
 if(!Number.isSafeInteger(maxCharacters)||maxCharacters<1||maxCharacters>MAX_TOTAL||!lang(request.sourceLocale)||!lang(request.targetLocale)||request.sourceLocale===request.targetLocale||!hash(request.sourceFingerprint)||!Array.isArray(request.segments)||request.segments.length<1||request.segments.length>MAX_SEGMENTS)throw Error('Translation request exceeds local limits');
 const batches:ProviderBatch[]=[];const seen=new Set<string>();let total=0;
 for(const entry of request.segments){
  const seg=object(entry);if(!exact(seg,['id','text'])||typeof seg.id!=='string'||!/^[0-9]{1,5}$/.test(seg.id)||seen.has(seg.id)||!text(seg.text,MAX_BATCH))throw Error('Invalid or oversize text segment');
  seen.add(seg.id);
  // UTF-16 code units conservatively overcount supplementary Unicode characters.
  total+=seg.text.length;if(total>maxCharacters)throw Error('Character budget exceeded');
  let batch=batches[batches.length-1];
  if(!batch||batch.body.length>=MAX_ITEMS||batch.characters+seg.text.length>MAX_BATCH){batch={ids:[],body:[],characters:0};batches.push(batch);}
  batch.ids.push(seg.id);batch.body.push({Text:seg.text});batch.characters+=seg.text.length;
  if(batches.length>MAX_BATCHES)throw Error('Too many translation batches');
 }
 return {sourceFingerprint:request.sourceFingerprint,sourceLocale:request.sourceLocale,targetLocale:request.targetLocale,characters:total,batches};
}
/** Azure returns one ordered result per input. No client IDs or fingerprints are transmitted. */
export function parseProviderResults(request:TranslationRequest,maxCharacters:number,raw:unknown):TranslationResult{
 const plan=planTranslation(request,maxCharacters);
 if(!Array.isArray(raw)||raw.length!==plan.batches.length)throw Error('Incomplete provider result');
 const segments:TranslationSegment[]=[];let outputBytes=0;
 for(let i=0;i<plan.batches.length;i++){
  const batch=plan.batches[i],rows=raw[i];if(!Array.isArray(rows)||rows.length!==batch.ids.length)throw Error('Incomplete provider batch');
  for(let j=0;j<rows.length;j++){
   const row=object(rows[j]);if(!exact(row,['translations'])||!Array.isArray(row.translations)||row.translations.length!==1)throw Error('Invalid provider result');
   const tr=object(row.translations[0]);if(!exact(tr,['text','to'])||tr.to!==plan.targetLocale||!text(tr.text,MAX_OUTPUT))throw Error('Invalid target translation');
   outputBytes+=new TextEncoder().encode(tr.text).byteLength;if(outputBytes>MAX_OUTPUT)throw Error('Translation output too large');
   segments.push({id:batch.ids[j],text:tr.text});
  }
 }
 return {sourceFingerprint:plan.sourceFingerprint,targetLocale:plan.targetLocale,segments};
}
function pollCopy(copy:PollTranslationCopy){
 if(!text(copy.question,240)||copy.question.trim().length<3||!Array.isArray(copy.options)||copy.options.length<2||copy.options.length>8||!copy.options.every(s=>text(s,120))||new Set(copy.options.map(s=>s.trim().toLowerCase())).size!==copy.options.length)throw Error('Invalid poll labels');
 return copy;
}
export function preparePollTranslation(copy:PollTranslationCopy,sourceLocale:TranslationLocale,sourceFingerprint:string):TranslationRequest{
 pollCopy(copy);if(!lang(sourceLocale)||!hash(sourceFingerprint))throw Error('Invalid poll source');
 return {sourceLocale,targetLocale:sourceLocale==='en'?'es':'en',sourceFingerprint,segments:[copy.question,...copy.options].map((text,i)=>({id:String(i),text}))};
}
export function applyPollTranslationResult(copy:PollTranslationCopy,request:TranslationRequest,result:TranslationResult):PollTranslationCopy{
 const fresh=preparePollTranslation(copy,request.sourceLocale,request.sourceFingerprint);
 if(fresh.targetLocale!==request.targetLocale||JSON.stringify(fresh.segments)!==JSON.stringify(request.segments)||result.sourceFingerprint!==request.sourceFingerprint||result.targetLocale!==request.targetLocale||!Array.isArray(result.segments)||result.segments.length!==fresh.segments.length)throw Error('Stale or incomplete poll translation');
 const map=new Map<string,string>();
 for(const s of result.segments){if(!s||typeof s.id!=='string'||map.has(s.id)||!fresh.segments.some(x=>x.id===s.id)||typeof s.text!=='string')throw Error('Unexpected poll translation segment');map.set(s.id,s.text);}
 return pollCopy({question:map.get('0')??'',options:copy.options.map((_,i)=>map.get(String(i+1))??'')});
}
