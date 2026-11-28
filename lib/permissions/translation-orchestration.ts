/**
 * Offline orchestration core. No live adapter, environment, route or persistence.
 * Ports must be trusted server-side implementations, never supplied by a browser.
 * Produces a proposed copy only; no draft writes or publication.
 */
import {prepareTranslation,applyTranslationResult,type TranslationCopy,type TranslationLocale,type TranslationRequest} from './story-translation-contract.ts';
import {preparePollTranslation,applyPollTranslationResult,planTranslation,parseProviderResults,type ProviderBatch} from './translation-provider-contract.ts';
import type {PollTranslationCopy} from './poll-translation-contract.ts';
type Kind='story'|'poll';
export type TranslationJob={requestId:string;kind:Kind;resourceId:string;sourceFingerprint:string;targetVersion:string};
type Common={resourceId:string;sourceFingerprint:string;targetVersion:string;sourceLocale:TranslationLocale};
export type SavedTranslationSource=Common&({kind:'story';copy:TranslationCopy}|{kind:'poll';copy:PollTranslationCopy});
export type TranslationProposal={kind:'story';copy:TranslationCopy}|{kind:'poll';copy:PollTranslationCopy};
export type TranslationPorts={
 // Must authenticate current actor and check source/target permissions and
 // eligibility, including explicit human intent, at every invocation.
 loadCurrent:(job:TranslationJob)=>Promise<SavedTranslationSource>;
 // Must reserve the complete amount atomically and bind request, actor, source
 // fingerprint and target version. A replay cannot authorize another send.
 reserve:(job:TranslationJob,characters:number)=>Promise<'reserved'|'duplicate'|'denied'>;
 // Must be a fixed provider/region, bounded timeout, no redirects or retries,
 // no sensitive payload logging. This core deliberately has no real transport.
 translateBatch:(batch:Pick<ProviderBatch,'body'>,from:TranslationLocale,to:TranslationLocale)=>Promise<unknown>;
};
export type TranslationOutcome={status:'ready';proposal:TranslationProposal;reservedCharacters:number}|{status:'invalid'|'unavailable'|'duplicate'|'budget_denied'|'stale'|'provider_failed';reservedCharacters:number};
const uuid=(x:unknown)=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(x);
const fingerprint=(x:unknown)=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const matches=(s:SavedTranslationSource,j:TranslationJob)=>s.kind===j.kind&&s.resourceId===j.resourceId&&s.sourceFingerprint===j.sourceFingerprint&&s.targetVersion===j.targetVersion;
function prepare(s:SavedTranslationSource):TranslationRequest{return s.kind==='story'?prepareTranslation(s.copy,s.sourceLocale,s.sourceFingerprint):preparePollTranslation(s.copy,s.sourceLocale,s.sourceFingerprint);}
export async function prepareTranslationProposal(job:TranslationJob,ports:TranslationPorts,maxCharacters:number):Promise<TranslationOutcome>{
 const fail=(status:Exclude<TranslationOutcome['status'],'ready'>,reservedCharacters=0):TranslationOutcome=>({status,reservedCharacters});
 if(!job||!uuid(job.requestId)||!uuid(job.resourceId)||(job.kind!=='story'&&job.kind!=='poll')||!fingerprint(job.sourceFingerprint)||typeof job.targetVersion!=='string'||!job.targetVersion.length||job.targetVersion.length>128||!Number.isSafeInteger(maxCharacters)||maxCharacters<1||maxCharacters>50000)return fail('invalid');
 let source:SavedTranslationSource;
 try{source=await ports.loadCurrent(job);}catch{return fail('unavailable');}
 if(!matches(source,job))return fail('stale');
 let request:TranslationRequest,plan:ReturnType<typeof planTranslation>;
 try{request=prepare(source);plan=planTranslation(request,maxCharacters);}catch{return fail('invalid');}
 let reservation:Awaited<ReturnType<TranslationPorts['reserve']>>;
 try{reservation=await ports.reserve(job,plan.characters);}catch{return fail('unavailable');}
 if(reservation==='duplicate')return fail('duplicate');
 if(reservation!=='reserved')return fail('budget_denied');
 const reserved=plan.characters;
 // Re-read before sending any content, and before each subsequent batch.
 // Never refund or retry an uncertain reservation or partial provider result.
 async function stillCurrent(){
  try{const current=await ports.loadCurrent(job);return matches(current,job)&&JSON.stringify(prepare(current))===JSON.stringify(request);}catch{return false;}
 }
 const results:unknown[]=[];
 for(const batch of plan.batches){
  if(!await stillCurrent())return fail('stale',reserved);
  try{results.push(await ports.translateBatch({body:batch.body},plan.sourceLocale,plan.targetLocale));}catch{return fail('provider_failed',reserved);}
 }
 if(!await stillCurrent())return fail('stale',reserved);
 try{
  const result=parseProviderResults(request,maxCharacters,results);
  const proposal:TranslationProposal=source.kind==='story'?{kind:'story',copy:applyTranslationResult(source.copy,request,result)}:{kind:'poll',copy:applyPollTranslationResult(source.copy,request,result)};
  return {status:'ready',proposal,reservedCharacters:reserved};
 }catch{return fail('provider_failed',reserved);}
}
