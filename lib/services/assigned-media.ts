import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/db/supabase-server';
import {isDevAuthBypass} from '@/lib/db/supabase-data';
import {resolveGlobalStaffPermissionsOnServer,resolveStoryStaffPermissionsOnServer} from '@/lib/permissions/server';
import {DRAFT_UUID} from '@/lib/permissions/assigned-draft-contract';
import {parseApprovedMediaPage} from '@/lib/permissions/assigned-media-contract';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
export function assignedApprovedMediaEnabled(revision=false){
 return process.env.CT_STAFF_ACCESS_V2_ENABLED==='true'&&process.env.CT_ASSIGNED_DRAFT_EDITOR_ENABLED==='true'
 &&process.env.CT_ASSIGNED_APPROVED_MEDIA_ENABLED==='true'&&!isDevAuthBypass()
 &&(!revision||process.env.CT_ASSIGNED_REVISION_EDITOR_ENABLED==='true');
}
export async function canPickAssignedMedia(storyId:string,revision:boolean){
 if(!assignedApprovedMediaEnabled(revision)||!DRAFT_UUID.test(storyId))return false;
 const keys=['newsroom.access','story.view_assigned','story.edit_assigned',...(revision?['revision.view','revision.edit_assigned']:[])];
 const [scoped,global]=await Promise.all([resolveStoryStaffPermissionsOnServer(storyId,keys),resolveGlobalStaffPermissionsOnServer(['media.upload'])]);
 return keys.every(k=>scoped.has(k))&&global.has('media.upload');
}
export async function readAssignedApprovedMedia(storyId:string,revision:boolean,page:number){
 if(!assignedApprovedMediaEnabled(revision))throw new DraftHttpError(404);
 if(!Number.isInteger(page)||page<0||page>100)throw new DraftHttpError(422);
 const db=createClient() as unknown as SupabaseClient;
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user)throw new DraftHttpError(403);
 if(!await canPickAssignedMedia(storyId,revision))throw new DraftHttpError(404);
 const {data:{user:fresh},error:freshError}=await db.auth.getUser();
 if(freshError||fresh?.id!==user.id)throw new DraftHttpError(403);
 const {data,error:rpcError}=await db.rpc('staff_list_assigned_approved_media',{p_story:storyId,p_revision:revision,p_page:page});
 if(rpcError)throw new DraftHttpError(rpcError.code==='42501'?403:rpcError.code==='22023'?422:503);
 try{return parseApprovedMediaPage(data);}catch{throw new DraftHttpError(503);}
}
