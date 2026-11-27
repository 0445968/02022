import 'server-only';
import {cache} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/db/supabase-server';
import {isDevAuthBypass} from '@/lib/db/supabase-data';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {DRAFT_UUID} from '@/lib/permissions/assigned-draft-contract';
import {parseWorkAssignmentPage,ASSIGNMENT_WORK_STATUSES,type StandaloneAssignmentCommand} from '@/lib/permissions/standalone-assignment-contract';
export function workAssignmentsEnabled(){return process.env.CT_WORK_ASSIGNMENTS_ENABLED==='true'&&process.env.CT_STAFF_ACCESS_V2_ENABLED==='true'&&!isDevAuthBypass();}
async function client(){
 if(!workAssignmentsEnabled())throw new DraftHttpError(404);
 const db=createClient() as unknown as SupabaseClient;
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user||user.is_anonymous||!user.email_confirmed_at)throw new DraftHttpError(403);
 return db;
}
function fail(code:string|undefined):never{throw new DraftHttpError(code==='42501'?403:code==='40001'||code==='23505'||code==='40P01'?409:code==='22023'?422:503);}
export async function readWorkAssignments(mode:'team'|'personal',page=0,id:string|null=null){
 if(!['team','personal'].includes(mode)||!Number.isInteger(page)||page<0||page>100||(id!==null&&(!DRAFT_UUID.test(id)||page!==0)))throw new DraftHttpError(422);
 const db=await client();
 const {data,error}=await db.rpc('staff_read_work_assignments',{p_mode:mode,p_page:page,p_id:id});
 if(error)fail(error.code);
 try{return parseWorkAssignmentPage(data,mode);}catch{throw new DraftHttpError(503);}
}
export const workAssignmentModes=cache(async()=>{
 if(!workAssignmentsEnabled())return {team:false,personal:false};
 const probes=await Promise.allSettled([readWorkAssignments('team'),readWorkAssignments('personal')]);
 return {team:probes[0].status==='fulfilled',personal:probes[1].status==='fulfilled'};
});
export async function canEnterWorkAssignments(){const m=await workAssignmentModes();return m.team||m.personal;}
export async function changeWorkAssignment(command:StandaloneAssignmentCommand){
 const db=await client();const {data,error}=await db.rpc('staff_change_work_assignment',{p_command:command});
 if(error)fail(error.code);
 if(!data||typeof data.id!=='string'||!DRAFT_UUID.test(data.id)||data.revision!==command.expectedRevision+1||!ASSIGNMENT_WORK_STATUSES.some(([key])=>key===data.status))throw new DraftHttpError(503);
 return {id:data.id,revision:data.revision,status:data.status};
}
