import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/db/supabase-server';
import {isDevAuthBypass} from '@/lib/db/supabase-data';
import {resolveGlobalStaffPermissionsOnServer} from '@/lib/permissions/server';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {parseVersionedLayout,type LayoutCommand} from '@/lib/permissions/homepage-history-contract';
export function homepageHistoryEnabled(){return process.env.CT_STAFF_ACCESS_V2_ENABLED==='true'&&process.env.CT_HOMEPAGE_HISTORY_ENABLED==='true'&&!isDevAuthBypass();}
async function client(publish=false){
 if(!homepageHistoryEnabled())throw new DraftHttpError(404);
 const db=createClient() as unknown as SupabaseClient;
 const {data:{user},error}=await db.auth.getUser();if(error||!user)throw new DraftHttpError(403);
 const keys=['newsroom.access','homepage.view_editor','homepage.edit',...(publish?['homepage.publish']:[])];
 const grants=await resolveGlobalStaffPermissionsOnServer(keys);
 if(!keys.every(k=>grants.has(k)))throw new DraftHttpError(403);
 return db;
}
function checked(data:unknown,error:{code?:string}|null){
 if(error)throw new DraftHttpError(error.code==='42501'?403:['40001','40P01','55P03'].includes(error.code??'')?409:error.code==='22023'?422:503);
 try{return parseVersionedLayout(data);}catch{throw new DraftHttpError(503);}
}
export async function readVersionedHomepage(){const db=await client();const {data,error}=await db.rpc('staff_read_homepage_versioned');return checked(data,error);}
export async function changeVersionedHomepage(command:LayoutCommand){
 const db=await client(command.action==='publish');
 const {data,error}=await db.rpc('staff_change_homepage_versioned',{p_action:command.action,p_expected:command.expectedRevision,p_copy:command.selections,p_restore:command.restoreRevision});
 const result=checked(data,error);if(result.revision!==command.expectedRevision+1)throw new DraftHttpError(503);return result;
}
