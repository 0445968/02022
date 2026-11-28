import 'server-only';
import {cache} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createDataClient,isDevAuthBypass} from '@/lib/db/supabase-data';
import {defaultHomeVisibility,parseHomeVisibility} from '@/lib/permissions/homepage-visibility';
export const readPublicHomepageVisibility=cache(async()=>{
 if(process.env.CT_HOMEPAGE_VISIBILITY_ENABLED!=='true'||process.env.CT_HOMEPAGE_HISTORY_ENABLED!=='true'||process.env.CT_STAFF_ACCESS_V2_ENABLED!=='true'||isDevAuthBypass())return defaultHomeVisibility();
 try{const db=createDataClient() as unknown as SupabaseClient;const {data,error}=await db.rpc('read_public_homepage_visibility');if(error)throw Error('Unavailable');return parseHomeVisibility(data);}catch{console.error('Published homepage visibility unavailable');return defaultHomeVisibility(false);}
});
