import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/db/supabase-server';
import {isDevAuthBypass} from '@/lib/db/supabase-data';
import {resolveStoryStaffPermissionsOnServer} from '@/lib/permissions/server';
import {DRAFT_UUID} from '@/lib/permissions/assigned-draft-contract';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {parseAssignmentPage,type AssignmentCommand} from '@/lib/permissions/story-assignment-contract';
export function assignmentManagementEnabled(){
 return process.env.CT_STAFF_ACCESS_V2_ENABLED==='true'&&process.env.CT_STORY_ASSIGNMENTS_ENABLED==='true'&&!isDevAuthBypass();
}
export async function canManageStoryAssignments(id:string){
 if(!assignmentManagementEnabled()||!DRAFT_UUID.test(id))return false;
 const keys=['newsroom.access','story.view_all','story.assign'];
 const grants=await resolveStoryStaffPermissionsOnServer(id,keys);
 return keys.every(k=>grants.has(k));
}
async function client(id:string){
 if(!assignmentManagementEnabled())throw new DraftHttpError(404);
 const db=createClient() as unknown as SupabaseClient;
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user)throw new DraftHttpError(403);
 if(!await canManageStoryAssignments(id))throw new DraftHttpError(404);
 const {data:{user:fresh},error:freshError}=await db.auth.getUser();
 if(freshError||fresh?.id!==user.id)throw new DraftHttpError(403);
 return db;
}
function fail(code:string|undefined):never{
 throw new DraftHttpError(code==='42501'?403:code==='40001'||code==='23505'||code==='40P01'?409:code==='22023'?422:code==='P0002'?404:503);
}
export async function readStoryAssignments(id:string,page=0,candidatePage=0){
 if(![page,candidatePage].every(n=>Number.isInteger(n)&&n>=0&&n<=100))throw new DraftHttpError(422);
 const db=await client(id);
 const {data,error}=await db.rpc('staff_read_story_assignments',{p_story:id,p_page:page,p_candidate_page:candidatePage});
 if(error)fail(error.code);
 try{return parseAssignmentPage(data,id);}catch{throw new DraftHttpError(503);}
}
export async function changeStoryAssignment(id:string,command:AssignmentCommand){
 const db=await client(id);
 const {data,error}=await db.rpc('staff_change_story_assignment',{p_story:id,p_member:command.membershipId,p_type:command.type,p_action:command.action,
 p_expected:command.expectedRevision,p_due:command.dueAt,p_reason:command.reason,p_request:command.requestId});
 if(error)fail(error.code);
 if(!data||typeof data.id!=='string'||!DRAFT_UUID.test(data.id)||!Number.isSafeInteger(data.revision)||data.revision!==command.expectedRevision+1
 ||!['active','completed','revoked'].includes(data.status))throw new DraftHttpError(503);
 return {id:data.id,revision:data.revision,status:data.status};
}
