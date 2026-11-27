import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/db/supabase-server';
import {isDevAuthBypass} from '@/lib/db/supabase-data';
import {reviewedPublicationEnabled,canPublishReviewed} from '@/lib/services/reviewed-publication';
import {staffOnboardingEnabled} from '@/lib/services/staff-onboarding';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {DRAFT_UUID} from '@/lib/permissions/assigned-draft-contract';
import {parseSelfBylineOptions,type SelfPublicationCommand,type SelfBylineCommand} from '@/lib/permissions/editorial-privilege-contract';
import type {ReviewKind} from '@/lib/permissions/story-review-contract';
export function editorialPrivilegesEnabled(){return process.env.CT_EDITORIAL_PRIVILEGES_ENABLED==='true'&&process.env.CT_STAFF_ACCESS_V2_ENABLED==='true'&&!isDevAuthBypass();}
async function client(){if(!editorialPrivilegesEnabled())throw new DraftHttpError(404);const db=createClient() as unknown as SupabaseClient;const {data:{user},error}=await db.auth.getUser();if(error||!user||user.is_anonymous||!user.email_confirmed_at)throw new DraftHttpError(403);return db;}
function fail(code:string|undefined):never{throw new DraftHttpError(code==='42501'?403:code==='40001'||code==='23505'||code==='40P01'?409:code==='22023'?422:503);}
export async function canSelfPublish(id:string,kind:ReviewKind){if(!editorialPrivilegesEnabled()||!reviewedPublicationEnabled()||!DRAFT_UUID.test(id))return false;try{const db=await client();if(!await canPublishReviewed(id,kind))return false;const {data,error}=await db.rpc('staff_can_self_publish',{p_story:id,p_kind:kind});return !error&&data===true;}catch{return false;}}
export async function publishOwnStory(id:string,cmd:SelfPublicationCommand){
 if(!reviewedPublicationEnabled()||!editorialPrivilegesEnabled())throw new DraftHttpError(404);
 if(!DRAFT_UUID.test(id)||!await canPublishReviewed(id,cmd.kind))throw new DraftHttpError(403);
 const db=await client();const {data,error}=await db.rpc('staff_publish_own_story',{p_story:id,p_kind:cmd.kind,p_request:cmd.requestId,p_fingerprint:cmd.fingerprint,p_reason:cmd.reason});
 if(error)fail(error.code);
 if(!data||data.storyId!==id||data.kind!==cmd.kind||data.requestId!==cmd.requestId||data.status!=='published'||data.method!=='self_publication')throw new DraftHttpError(503);
 return {storyId:id,kind:cmd.kind,requestId:cmd.requestId,status:'published',method:'self_publication'};
}
export async function readSelfBylineOptions(){if(!staffOnboardingEnabled()||!editorialPrivilegesEnabled())return null;try{const db=await client();const {data,error}=await db.rpc('staff_read_self_byline');if(error)return null;return parseSelfBylineOptions(data);}catch{return null;}}
export async function linkSelfByline(cmd:SelfBylineCommand){if(!staffOnboardingEnabled())throw new DraftHttpError(404);const db=await client();const {data,error}=await db.rpc('staff_link_self_byline',{p_byline:cmd.bylineId,p_profile:cmd.profileRevision,p_review:cmd.reviewRevision,p_reason:cmd.reason,p_request:cmd.requestId});if(error)fail(error.code);if(data!==cmd.reviewRevision+1)throw new DraftHttpError(503);return {revision:data};}
