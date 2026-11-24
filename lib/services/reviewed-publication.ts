import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/db/supabase-server';
import {resolveStoryStaffPermissionsOnServer} from '@/lib/permissions/server';
import {storyReviewEnabled} from '@/lib/services/story-review';
import {DRAFT_UUID} from '@/lib/permissions/assigned-draft-contract';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import type {ReviewKind} from '@/lib/permissions/story-review-contract';
export function reviewedPublicationEnabled(){return storyReviewEnabled()&&process.env.CT_REVIEWED_PUBLICATION_ENABLED==='true';}
export async function canPublishReviewed(id:string,kind:ReviewKind){
 if(!reviewedPublicationEnabled()||!DRAFT_UUID.test(id))return false;
 const keys=['newsroom.access','story.view_all','story.view_assigned','story.edit_all','story.edit_assigned','story.publish','revision.view','revision.publish'];
 const g=await resolveStoryStaffPermissionsOnServer(id,keys);
 return g.has('newsroom.access')&&(g.has('story.view_all')||g.has('story.view_assigned'))&&(g.has('story.edit_all')||g.has('story.edit_assigned'))
 &&g.has('story.publish')&&(kind==='draft'||g.has('revision.view')&&g.has('revision.publish'));
}
export async function publishReviewed(id:string,kind:ReviewKind,requestId:string,fingerprint:string){
 if(!reviewedPublicationEnabled())throw new DraftHttpError(404);
 const db=createClient() as unknown as SupabaseClient;
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user||!await canPublishReviewed(id,kind))throw new DraftHttpError(403);
 const {data:{user:fresh},error:freshError}=await db.auth.getUser();
 if(freshError||fresh?.id!==user.id)throw new DraftHttpError(403);
 const {data,error:rpcError}=await db.rpc('staff_publish_reviewed_story',{p_story:id,p_kind:kind,p_request:requestId,p_fingerprint:fingerprint});
 if(rpcError)throw new DraftHttpError(rpcError.code==='42501'?403:rpcError.code==='40001'||rpcError.code==='40P01'?409:rpcError.code==='22023'?422:503);
 if(!data||data.storyId!==id||data.kind!==kind||data.requestId!==requestId||data.status!=='published')throw new DraftHttpError(503);
 return {storyId:id,kind,requestId,status:'published'};
}
