import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/db/supabase-server';
import {isDevAuthBypass} from '@/lib/db/supabase-data';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {parseTerminologyState,type TerminologyCommand} from '@/lib/permissions/translation-terminology-contract';
export function terminologyEnabled(){return !isDevAuthBypass()&&process.env.CT_STAFF_ACCESS_V2_ENABLED==='true'&&process.env.CT_TRANSLATION_TERMINOLOGY_ENABLED==='true';}
async function client(){if(!terminologyEnabled())throw new DraftHttpError(404);const db=createClient() as unknown as SupabaseClient;const {data:{user},error}=await db.auth.getUser();if(error||!user||user.is_anonymous||!user.email_confirmed_at)throw new DraftHttpError(403);return db;}
const fail=(code:string|undefined):never=>{throw new DraftHttpError(code==='42501'?403:code==='40001'?409:code==='22023'?422:503);};
export async function readTerminology(){const db=await client();const {data,error}=await db.rpc('staff_read_translation_terminology');if(error)fail(error.code);return parseTerminologyState(data);}
export async function saveTerminology(c:TerminologyCommand){const db=await client();const {data,error}=await db.rpc('staff_save_translation_terminology',{p_expected:c.expectedRevision,p_entries:c.entries,p_reason:c.reason});if(error)fail(error.code);const state=parseTerminologyState(data);if(state.revision!==c.expectedRevision+1)throw new DraftHttpError(503);return state;}
