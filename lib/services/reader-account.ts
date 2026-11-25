import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/db/supabase-server';
import {isDevAuthBypass} from '@/lib/db/supabase-data';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {parseReaderAccount,parsePrivacyQueue,type AccountCommand,type PrivacyReview} from '@/lib/permissions/reader-account-contract';
import {DRAFT_UUID} from '@/lib/permissions/assigned-draft-contract';
export function readerAccountEnabled(){return process.env.CT_READER_ACCOUNT_ENABLED==='true'&&!isDevAuthBypass();}
export async function readerClient(){
 if(!readerAccountEnabled())throw new DraftHttpError(404);
 const db=createClient() as unknown as SupabaseClient;
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user||user.is_anonymous||!user.email||!user.email_confirmed_at||!DRAFT_UUID.test(user.id))throw new DraftHttpError(403);
 return {db,user};
}
function checked(data:unknown,error:{code?:string}|null){
 if(error)throw new DraftHttpError(error.code==='42501'?403:error.code==='40001'||error.code==='23505'?409:error.code==='22023'?422:503);
 return data;
}
export async function readReaderAccount(){const {db}=await readerClient();const {data,error}=await db.rpc('reader_read_account');return parseReaderAccount(checked(data,error));}
export async function changeReaderAccount(c:AccountCommand){
 const {db}=await readerClient();
 const result=c.action==='profile'?await db.rpc('reader_save_account',{p_expected:c.expectedUpdatedAt,p_name:c.displayName,p_locale:c.locale,p_avatar:c.avatar}):
 await db.rpc('reader_change_privacy',{p_action:c.action,p_kind:c.action==='request'?c.kind:null,p_id:c.action==='cancel'?c.id:null,p_confirmation:c.confirmation});
 return parseReaderAccount(checked(result.data,result.error));
}
export async function readerExport(){const {db}=await readerClient();const {data,error}=await db.rpc('reader_export_snapshot');const value=checked(data,error) as Record<string,unknown>|null;if(!value||value.scope!=='reader_snapshot_v1')throw new DraftHttpError(503);return value;}
export async function privacyQueue(page:number){if(!Number.isInteger(page)||page<0||page>100)throw new DraftHttpError(422);const {db}=await readerClient();const {data,error}=await db.rpc('staff_read_privacy_queue',{p_page:page});return parsePrivacyQueue(checked(data,error));}
export async function reviewPrivacyRequest(c:PrivacyReview){const {db}=await readerClient();const {data,error}=await db.rpc('staff_review_privacy_request',{p_id:c.id,p_expected:c.expectedUpdatedAt,p_action:c.action,p_resolution:c.resolution});return checked(data,error);}
export async function mediaReferenceReview(id:string){
 if(process.env.CT_STAFF_ACCESS_V2_ENABLED!=='true'||!DRAFT_UUID.test(id))throw new DraftHttpError(404);
 const {db}=await readerClient();const {data,error}=await db.rpc('staff_media_reference_review',{p_id:id});const v=checked(data,error) as Record<string,unknown>|null;
 if(!v||v.id!==id||v.deletionAllowed!==false||!['stories','revisions','versions','bylines','usage','promotions','replacement'].every(k=>typeof v[k]==='boolean'))throw new DraftHttpError(503);
 return v;
}
