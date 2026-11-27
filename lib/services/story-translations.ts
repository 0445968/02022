import 'server-only';
import {cache} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/db/supabase-server';
import {createDataClient,isDevAuthBypass} from '@/lib/db/supabase-data';
import {reviewedPublicationEnabled} from '@/lib/services/reviewed-publication';
import {DRAFT_UUID} from '@/lib/permissions/assigned-draft-contract';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {parseTranslationState,parsePublicTranslationPairs,type TranslationCommand,type PublicTranslationPair} from '@/lib/permissions/translation-workflow-contract';
export function storyTranslationsEnabled(){return !isDevAuthBypass()&&process.env.CT_STAFF_ACCESS_V2_ENABLED==='true'&&process.env.CT_STORY_TRANSLATIONS_ENABLED==='true'&&reviewedPublicationEnabled();}
async function staffClient(){if(!storyTranslationsEnabled())throw new DraftHttpError(404);const db=createClient() as unknown as SupabaseClient;const {data:{user},error}=await db.auth.getUser();if(error||!user||user.is_anonymous||!user.email_confirmed_at)throw new DraftHttpError(403);return db;}
function fail(code:string|undefined):never{throw new DraftHttpError(code==='42501'?403:code==='40001'||code==='23505'||code==='40P01'?409:code==='22023'?422:503);}
export async function readStoryTranslation(id:string){if(!DRAFT_UUID.test(id))throw new DraftHttpError(422);const db=await staffClient(),{data,error}=await db.rpc('staff_read_story_translation',{p_story:id});if(error)fail(error.code);try{return parseTranslationState(data,id);}catch{throw new DraftHttpError(503);}}
export async function changeStoryTranslation(id:string,c:TranslationCommand){
 if(id!==c.sourceId||!DRAFT_UUID.test(id))throw new DraftHttpError(422);const db=await staffClient(),base={p_source:id,p_expected:c.sourceFingerprint,p_request:c.requestId,p_reason:c.reason};
 const {data,error}=c.action==='create'?await db.rpc('staff_create_story_translation',{...base,p_headline:c.headline}):await db.rpc('staff_refresh_story_translation',{...base,p_revision:c.revision,p_target_updated:c.targetUpdatedAt});if(error)fail(error.code);
 try{const state=parseTranslationState(data,id);if(!state.linked)throw Error();return state;}catch{throw new DraftHttpError(503);}
}
export async function getPublicTranslationPairs(ids:readonly string[]):Promise<PublicTranslationPair[]>{
 if(!storyTranslationsEnabled()||!ids.length)return [];
 const unique=[...new Set(ids)];if(unique.length>100||unique.some(id=>!DRAFT_UUID.test(id)))return [];
 try{const db=createDataClient() as unknown as SupabaseClient;const {data,error}=await db.rpc('public_story_translation_pairs',{p_ids:unique});if(error)return [];return parsePublicTranslationPairs(data,unique);}catch{return [];}
}
export const getPublicStoryTranslation=cache(async(id:string)=>(await getPublicTranslationPairs([id]))[0]??null);
