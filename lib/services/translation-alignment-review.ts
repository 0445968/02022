import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/db/supabase-server';
import {storyTranslationsEnabled} from '@/lib/services/story-translations';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {DRAFT_UUID} from '@/lib/permissions/assigned-draft-contract';
import {parseAlignmentReview,type AlignmentApproval} from '@/lib/permissions/translation-alignment-review-contract';
export function alignmentReviewEnabled(){return storyTranslationsEnabled()&&process.env.CT_TRANSLATION_ALIGNMENT_ENABLED==='true';}
async function client(){if(!alignmentReviewEnabled())throw new DraftHttpError(404);const db=createClient() as unknown as SupabaseClient;const {data:{user},error}=await db.auth.getUser();if(error||!user||user.is_anonymous||!user.email_confirmed_at)throw new DraftHttpError(403);return db;}
function fail(code:string|undefined):never{throw new DraftHttpError(code==='42501'?403:code==='40001'||code==='23505'||code==='40P01'?409:code==='22023'?422:503);}
async function read(db:SupabaseClient,id:string,fingerprint:string){if(!DRAFT_UUID.test(id)||!/^[a-f0-9]{64}$/.test(fingerprint))throw new DraftHttpError(422);const {data,error}=await db.rpc('staff_read_alignment_candidates',{p_source:id,p_expected:fingerprint});if(error)fail(error.code);try{return parseAlignmentReview(data,id,fingerprint);}catch{throw new DraftHttpError(503);}}
export async function readAlignmentReview(id:string,fingerprint:string){return read(await client(),id,fingerprint);}
export async function confirmAlignment(id:string,c:AlignmentApproval){const db=await client(),state=await read(db,id,c.sourceFingerprint);if(state.targetFingerprint!==c.targetFingerprint||state.revision!==c.revision)throw new DraftHttpError(409);const row=state.rows.find(r=>r.blockId===c.blockId);if(!row?.pairs)throw new DraftHttpError(422);if(row.approved)return {approved:true};const {data,error}=await db.rpc('staff_confirm_alignment_candidate',{p_source:id,p_expected:c.sourceFingerprint,p_target:c.targetFingerprint,p_revision:c.revision,p_block:c.blockId,p_pairs:row.pairs});if(error)fail(error.code);if(typeof data!=='boolean')throw new DraftHttpError(503);return {approved:true};}
