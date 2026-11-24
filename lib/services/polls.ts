import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/db/supabase-server';
import {isDevAuthBypass} from '@/lib/db/supabase-data';
import {resolveGlobalStaffPermissionsOnServer} from '@/lib/permissions/server';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {DRAFT_UUID} from '@/lib/permissions/assigned-draft-contract';
import {parseStaffPollPage,parseStaffPoll,parsePublicPollPage,parseVoteReceipt,type PollCommand} from '@/lib/permissions/polls-contract';
export function staffPollsEnabled(){return !isDevAuthBypass()&&process.env.CT_STAFF_ACCESS_V2_ENABLED==='true'&&process.env.CT_POLLS_ENABLED==='true';}
export function publicPollsEnabled(){return staffPollsEnabled()&&process.env.CT_PUBLIC_POLLS_ENABLED==='true';}
export async function canEnterPolls(){
 if(!staffPollsEnabled())return false;
 try{const p=await resolveGlobalStaffPermissionsOnServer(['newsroom.access','poll.view_manage']);return p.has('newsroom.access')&&p.has('poll.view_manage');}catch{return false;}
}
const db=()=>createClient() as unknown as SupabaseClient;
function fail(code:string|undefined):never{throw new DraftHttpError(code==='42501'?403:code==='40001'||code==='23505'||code==='40P01'?409:code==='22023'?422:code==='54000'?429:503);}
async function staffClient(){
 if(!staffPollsEnabled())throw new DraftHttpError(404);
 const client=db(),{data:{user},error}=await client.auth.getUser();
 if(error||!user||!await canEnterPolls())throw new DraftHttpError(403);
 const {data:{user:fresh},error:freshError}=await client.auth.getUser();
 if(freshError||fresh?.id!==user.id)throw new DraftHttpError(403);
 return client;
}
export async function listStaffPolls(page:number){
 if(!Number.isInteger(page)||page<0||page>100)throw new DraftHttpError(422);
 const client=await staffClient(),{data,error}=await client.rpc('staff_list_polls',{p_page:page});
 if(error)fail(error.code);try{return parseStaffPollPage(data);}catch{throw new DraftHttpError(503);}
}
export async function changePoll(c:PollCommand){
 const client=await staffClient(),{data,error}=await client.rpc('staff_change_poll',{p_action:c.action,p_id:c.id,p_version:c.version,p_copy:c.copy});
 if(error)fail(error.code);try{const p=parseStaffPoll(data);if(c.id&&p.id!==c.id)throw Error();return p;}catch{throw new DraftHttpError(503);}
}
export async function listPublicPolls(language:'en'|'es',page:number){
 if(!publicPollsEnabled())throw new DraftHttpError(404);
 if(!Number.isInteger(page)||page<0||page>100)throw new DraftHttpError(422);
 const {data,error}=await db().rpc('public_list_polls',{p_language:language,p_page:page});
 if(error)fail(error.code);try{return parsePublicPollPage(data);}catch{throw new DraftHttpError(503);}
}
export async function votePoll(id:string,choice:number){
 if(!publicPollsEnabled())throw new DraftHttpError(404);
 if(!DRAFT_UUID.test(id))throw new DraftHttpError(422);
 const client=db(),{data:{user},error:authError}=await client.auth.getUser();
 if(authError||!user)throw new DraftHttpError(401);
 if(user.is_anonymous||!user.email||!user.email_confirmed_at)throw new DraftHttpError(403);
 const {data,error}=await client.rpc('reader_vote_poll',{p_id:id,p_choice:choice});
 if(error)fail(error.code);try{return parseVoteReceipt(data,id,choice);}catch{throw new DraftHttpError(503);}
}
