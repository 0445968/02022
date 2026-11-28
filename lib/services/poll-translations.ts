import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/db/supabase-server';
import {canEnterPolls,staffPollsEnabled} from '@/lib/services/polls';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {DRAFT_UUID} from '@/lib/permissions/assigned-draft-contract';
import {parsePollTranslationState,type PollTranslationCommand} from '@/lib/permissions/poll-translation-contract';
export function pollTranslationsEnabled(){return staffPollsEnabled()&&process.env.CT_POLL_TRANSLATIONS_ENABLED==='true';}
async function client(id:string){if(!pollTranslationsEnabled())throw new DraftHttpError(404);if(!DRAFT_UUID.test(id))throw new DraftHttpError(422);if(!await canEnterPolls())throw new DraftHttpError(403);const db=createClient() as unknown as SupabaseClient;const {data:{user},error}=await db.auth.getUser();if(error||!user||user.is_anonymous||!user.email_confirmed_at)throw new DraftHttpError(403);return db;}
function checked(data:unknown,error:{code?:string}|null,id:string){if(error)throw new DraftHttpError(error.code==='42501'?403:error.code==='40001'||error.code==='23505'||error.code==='40P01'?409:error.code==='22023'?422:503);try{return parsePollTranslationState(data,id);}catch{throw new DraftHttpError(503);}}
export async function readPollTranslation(id:string){const db=await client(id),{data,error}=await db.rpc('staff_read_poll_translation',{p_id:id});return checked(data,error,id);}
export async function changePollTranslation(id:string,c:PollTranslationCommand){const db=await client(id),{data,error}=await db.rpc('staff_change_poll_translation',{p_id:id,p_expected:c.expectedRevision,p_fingerprint:c.sourceFingerprint,p_action:c.action,p_copy:c.copy,p_reason:c.reason});const state=checked(data,error,id);if(state.revision!==c.expectedRevision+1)throw new DraftHttpError(503);return state;}
