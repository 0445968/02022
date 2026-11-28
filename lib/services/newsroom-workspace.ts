import 'server-only';
import {cache} from 'react';
import {redirect} from 'next/navigation';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/db/supabase-server';
import {isDevAuthBypass} from '@/lib/db/supabase-data';
import {resolveStaffPermissionOnServer,resolveGlobalStaffPermissionsOnServer,resolveStoryStaffPermissionsOnServer} from '@/lib/permissions/server';
import {buildWorkspaceAccess,WORKSPACE_CAPABILITIES,type WorkspaceAccess} from '@/lib/permissions/workspace-policy';
import {canEnterWorkAssignments} from '@/lib/services/work-assignments';
import {canEnterPolls} from '@/lib/services/polls';
import {canEnterEditorialCalendar} from '@/lib/services/editorial-calendar';
import {canEnterReportManagement} from '@/lib/services/comment-reports';
import {canEnterCommentModeration} from '@/lib/services/comment-moderation';
import {canStartWriterDraft} from '@/lib/services/writer-drafts';
import {privateDraftMediaEnabled} from '@/lib/permissions/private-draft-media';
import {staffOnboardingEnabled,readStaffOnboarding} from '@/lib/services/staff-onboarding';
import type {CurrentUser,Locale} from '@/types';
import type {StaffOnboardingState} from '@/lib/permissions/staff-onboarding-types';

export function scopedNewsroomEnabled(){return process.env.CT_STAFF_ACCESS_V2_ENABLED==='true';}
/** React request-local memoization only; no cross-request auth cache. */
export const getWorkspaceAccess=cache(async():Promise<WorkspaceAccess>=>{
  const options={privateMedia:privateDraftMediaEnabled(),onboarding:staffOnboardingEnabled()};
  if(!scopedNewsroomEnabled()||isDevAuthBypass())return buildWorkspaceAccess(new Set(),options);
  const grants=await resolveGlobalStaffPermissionsOnServer(WORKSPACE_CAPABILITIES);
  const access=buildWorkspaceAccess(grants,options);
  if(access.allowed&&!access.createStory&&await canStartWriterDraft())access.nav.push('contributorNew');
  if(access.allowed&&await canEnterCommentModeration())access.nav.push('comments');
  if(access.allowed&&await canEnterReportManagement())access.nav.push('reports');
  if(access.allowed&&await canEnterEditorialCalendar())access.nav.push('schedule');
  if(access.allowed&&await canEnterPolls())access.nav.push('polls');
  if(access.allowed&&await canEnterWorkAssignments())access.nav.push('workAssignments');
  return access;
});
export async function requireWorkspacePage(key: keyof Pick<WorkspaceAccess,'viewStories'|'fullEditor'|'createStory'|'fullMedia'|'manageBylines'|'fullHomepage'|'viewTeam'>){
  if(!scopedNewsroomEnabled())return;
  const access=await getWorkspaceAccess();
  if(!access.allowed||!access[key])redirect('/newsroom/denied');
}
export const readWorkspaceOnboarding=cache(async():Promise<StaffOnboardingState|null>=>{
  if(!staffOnboardingEnabled())return null;
  try{return await readStaffOnboarding();}catch{return null;}
});
export async function newsroomLocale(user:CurrentUser|null):Promise<Locale>{
  return (await readWorkspaceOnboarding())?.profile?.locale??user?.profile?.preferredLocale??'en';
}
export async function mayViewWorkspaceStory(storyId:string):Promise<boolean>{
  if(!scopedNewsroomEnabled()||isDevAuthBypass())return false;
  const access=await getWorkspaceAccess();
  if(!access.allowed)return false;
  const grants=await resolveStoryStaffPermissionsOnServer(storyId,['story.view_all','story.view_assigned']);
  return grants.has('story.view_all')||grants.has('story.view_assigned');
}
export type AssignedWorkspaceStory={id:string;headline:string;status:string;language:string;dueAt:string|null;assignmentTypes:string[];canPreview:boolean;canEditDraft:boolean;canEditRevision:boolean};
/** Only own active assignments, verified principal and per-story capability.
 * Never use the public stories list or unscoped counts as contributor work.
 * Fetch bounded rows, then individually verify story access before reading title.
 */
export async function readAssignedWorkspace(page:number):Promise<{items:AssignedWorkspaceStory[];hasMore:boolean;unavailable:boolean}>{
  const unavailable={items:[],hasMore:false,unavailable:true};
  if(!scopedNewsroomEnabled()||isDevAuthBypass()||!Number.isInteger(page)||page<0||page>100)return unavailable;
  try{
    const access=await getWorkspaceAccess();
    if(!access.allowed)return unavailable;
    const db=createClient() as unknown as SupabaseClient;
    const {data:{user},error:authError}=await db.auth.getUser();
    if(authError||!user)return unavailable;
    const {data:member,error:memberError}=await db.from('staff_memberships').select('id,auth_user_id,status,expires_at')
      .eq('auth_user_id',user.id).maybeSingle();
    if(memberError||!member||member.auth_user_id!==user.id||member.status!=='active'||
      (member.expires_at!==null&&(!Number.isFinite(Date.parse(member.expires_at))||Date.parse(member.expires_at)<=Date.now())))return unavailable;
    const {data:assignments,error}=await db.from('staff_story_assignments')
      .select('story_id,assignment_type,due_at').eq('membership_id',member.id).eq('status','active')
      .order('story_id').order('assignment_type').range(page*25,page*25+25);
    if(error||!assignments)return unavailable;
    const grouped=new Map<string,{types:string[];dueAt:string|null}>();
    for(const row of assignments.slice(0,25)){
      const existing=grouped.get(row.story_id)??{types:[],dueAt:null};
      existing.types.push(row.assignment_type);
      if(row.due_at&&(!existing.dueAt||row.due_at<existing.dueAt))existing.dueAt=row.due_at;
      grouped.set(row.story_id,existing);
    }
    const visible=await Promise.all([...grouped].map(async([id,a])=>{
      // A current assignment alone does not imply story access.
      if(!(await resolveStaffPermissionOnServer('story.view_assigned',{kind:'story',storyId:id})).allowed&&
        !(access.viewStories&&(await resolveStoryStaffPermissionsOnServer(id,['story.view_all'])).has('story.view_all')))return null;
      const {data:story,error:storyError}=await db.from('stories').select('id,headline,status,language').eq('id',id).maybeSingle();
      if(storyError||!story)return null;
      const canEditDraft=process.env.CT_ASSIGNED_DRAFT_EDITOR_ENABLED==='true'&&story.status==='draft'&&
        (await resolveStaffPermissionOnServer('story.edit_assigned',{kind:'story',storyId:id})).allowed;
      const revisionKeys=['story.edit_assigned','revision.view','revision.edit_assigned'];
      const revisionGrants=story.status==='published'&&process.env.CT_ASSIGNED_DRAFT_EDITOR_ENABLED==='true'&&process.env.CT_ASSIGNED_REVISION_EDITOR_ENABLED==='true'?await resolveStoryStaffPermissionsOnServer(id,revisionKeys):new Set<string>();
      const canEditRevision=revisionKeys.every(k=>revisionGrants.has(k));
      return {id:story.id,headline:story.headline,status:story.status,language:story.language,
        dueAt:a.dueAt,assignmentTypes:a.types,canPreview:true,canEditDraft,canEditRevision} as AssignedWorkspaceStory;
    }));
    return {items:visible.filter((r):r is AssignedWorkspaceStory=>r!==null),hasMore:assignments.length>25&&page<100,unavailable:false};
  }catch{return unavailable;}
}

/** A scoped deny can invalidate a globally granted capability on this exact story.
 * Do not mount the legacy editor unless every control it exposes is permitted. */
export async function mayMountFullStoryEditor(storyId:string):Promise<boolean>{
  const access=await getWorkspaceAccess();
  if(!access.allowed||!access.fullEditor)return false;
  const keys=['story.view_all','story.edit_all','story.assign','story.publish','story.schedule','story.archive_delete',
    'story.submit_review','story.review','revision.view','revision.publish','revision.discard'];
  const grants=await resolveStoryStaffPermissionsOnServer(storyId,keys);
  return keys.every(key=>grants.has(key));
}
