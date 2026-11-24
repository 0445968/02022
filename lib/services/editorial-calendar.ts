import 'server-only';
import {cache} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/db/supabase-server';
import {isDevAuthBypass} from '@/lib/db/supabase-data';
import {resolveGlobalStaffPermissionsOnServer} from '@/lib/permissions/server';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {parseStoryQueuePage,validQueueIds,type StoryQueuePage} from '@/lib/permissions/story-publication-queue';
import {parseCalendarPage,parseCalendarQuery,type CalendarQuery} from '@/lib/permissions/editorial-calendar-contract';
export function editorialCalendarEnabled(){return !isDevAuthBypass()&&process.env.CT_STAFF_ACCESS_V2_ENABLED==='true'&&process.env.CT_EDITORIAL_CALENDAR_ENABLED==='true';}
async function client(){
 if(!editorialCalendarEnabled())throw new DraftHttpError(404);
 const db=createClient() as unknown as SupabaseClient;
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user||!(await resolveGlobalStaffPermissionsOnServer(['newsroom.access'])).has('newsroom.access'))throw new DraftHttpError(403);
 const {data:{user:fresh},error:freshError}=await db.auth.getUser();
 if(freshError||fresh?.id!==user.id)throw new DraftHttpError(403);
 return db;
}
export const canEnterEditorialCalendar=cache(async()=>{
 try{const db=await client();const {data,error}=await db.rpc('staff_can_read_editorial_calendar');return !error&&data===true;}catch{return false;}
});
export async function readEditorialCalendar(raw:CalendarQuery){
 let q;try{q=parseCalendarQuery(raw);}catch{throw new DraftHttpError(422);}
 const db=await client();
 const {data,error}=await db.rpc('staff_read_editorial_calendar',{p_start:q.start,p_end:q.end,p_mode:q.mode,p_filter:q.filter,p_page:q.page});
 if(error)throw new DraftHttpError(error.code==='42501'?403:error.code==='22023'?422:503);
 try{return parseCalendarPage(data);}catch{throw new DraftHttpError(503);}
}

/** A single session-scoped RPC for only the already-paginated story IDs. */
export async function readStoryPublicationQueue(ids:string[]):Promise<StoryQueuePage>{
 if(!validQueueIds(ids))throw new DraftHttpError(422);
 const db=await client();
 const {data,error}=await db.rpc('staff_read_story_publication_queue',{p_story_ids:ids});
 if(error)throw new DraftHttpError(error.code==='42501'?403:error.code==='22023'?422:503);
 try{return parseStoryQueuePage(data,ids);}catch{throw new DraftHttpError(503);}
}
