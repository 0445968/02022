import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/db/supabase-server';
import {isDevAuthBypass} from '@/lib/db/supabase-data';
import {getWorkspaceAccess,readAssignedWorkspace} from '@/lib/services/newsroom-workspace';
import {resolveGlobalStaffPermissionsOnServer,resolveStoryStaffPermissionsOnServer} from '@/lib/permissions/server';
import {readReviewInbox,reviewInboxEnabled} from '@/lib/services/review-inbox';
import {DASHBOARD_STORY_LIMIT,dashboardStorySummary,type DashboardStory} from '@/lib/permissions/staff-profile-contract';
import type {InboxMode,InboxPage} from '@/lib/permissions/review-inbox-contract';
export async function readDashboardStorySample(){
 const unavailable={items:[] as DashboardStory[],summary:null,partial:false,unavailable:true};
 if(isDevAuthBypass())return unavailable;
 try{
  const access=await getWorkspaceAccess();
  if(!access.allowed||!access.viewStories)return unavailable;
  const db=createClient() as unknown as SupabaseClient;
  const {data:{user},error:authError}=await db.auth.getUser();
  if(authError||!user)return unavailable;
  const grants=await resolveGlobalStaffPermissionsOnServer(['newsroom.access','story.view_all']);
  if(!grants.has('newsroom.access')||!grants.has('story.view_all'))return unavailable;
  const {data:rows,error}=await db.from('stories').select('id,headline,status,updated_at').order('updated_at',{ascending:false}).order('id').limit(DASHBOARD_STORY_LIMIT+1);
  if(error||!rows)return unavailable;
  // Public story RLS is not editorial permission: exact resource checks precede every displayed item.
  const checked=await Promise.all(rows.slice(0,DASHBOARD_STORY_LIMIT).map(async row=>{
   const actual=await resolveStoryStaffPermissionsOnServer(row.id,['story.view_all']);
   if(!actual.has('story.view_all'))return null;
   if(typeof row.headline!=='string'||typeof row.status!=='string'||!Number.isFinite(Date.parse(row.updated_at)))throw Error('Invalid story');
   return {id:row.id,headline:row.headline,status:row.status,updatedAt:row.updated_at} as DashboardStory;
  }));
  const {data:{user:fresh},error:freshError}=await db.auth.getUser();
  if(freshError||fresh?.id!==user.id)return unavailable;
  const items=checked.filter((x):x is DashboardStory=>x!==null);
  return {items,summary:dashboardStorySummary(items),partial:rows.length>DASHBOARD_STORY_LIMIT,unavailable:false};
 }catch{return unavailable;}
}
async function inbox(mode:InboxMode):Promise<{data:InboxPage|null;unavailable:boolean}>{
 try{return {data:await readReviewInbox(mode,0),unavailable:false};}catch{return {data:null,unavailable:true};}
}
export async function readDashboardActivity(includeAssignments:boolean){
 const access=await getWorkspaceAccess();
 if(!access.allowed)return null;
 const [assigned,pending,feedback]=await Promise.all([
  includeAssignments?readAssignedWorkspace(0):Promise.resolve(null),
  reviewInboxEnabled()?inbox('pending'):Promise.resolve(null),
  reviewInboxEnabled()?inbox('feedback'):Promise.resolve(null)
 ]);
 return {assigned,pending,feedback};
}

export type OwnerDashboardMode='team'|'personal';
export async function readOwnerDashboard(mode:OwnerDashboardMode){
 if(isDevAuthBypass())return null;
 try{
  const access=await getWorkspaceAccess();if(!access.allowed||!access.viewStories)return null;
  const db=createClient() as unknown as SupabaseClient;
  const {data:{user},error:authError}=await db.auth.getUser();if(authError||!user)return null;
  const {data,error}=await db.rpc('staff_read_owner_dashboard',{p_mode:mode});
  if(error||!data||data.mode!==mode||!data.summary||!Array.isArray(data.items)||data.items.length>5)return null;
  const summary=data.summary;
  for(const k of ['total','drafts','inReview','published','assignments'])if(!Number.isSafeInteger(summary[k])||summary[k]<0)return null;
  if(summary.drafts+summary.inReview+summary.published>summary.total||data.items.length>summary.total)return null;
  const items:DashboardStory[]=data.items.map((row:Record<string,unknown>)=>{
   if(typeof row.id!=='string'||typeof row.headline!=='string'||typeof row.status!=='string'||typeof row.updatedAt!=='string'||!Number.isFinite(Date.parse(row.updatedAt)))throw Error('Invalid dashboard row');
   return {id:row.id,headline:row.headline,status:row.status,updatedAt:row.updatedAt};
  });
  const {data:{user:fresh},error:freshError}=await db.auth.getUser();if(freshError||fresh?.id!==user.id)return null;
  return {summary:{total:summary.total as number,drafts:summary.drafts as number,inReview:summary.inReview as number,published:summary.published as number,assignments:summary.assignments as number},items};
 }catch{return null;}
}
