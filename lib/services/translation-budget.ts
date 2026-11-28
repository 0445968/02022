import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/db/supabase-server';
import {isDevAuthBypass} from '@/lib/db/supabase-data';
import {parseTranslationBudget} from '@/lib/permissions/translation-budget-contract';
export function translationUsageEnabled(){return !isDevAuthBypass()&&process.env.CT_STAFF_ACCESS_V2_ENABLED==='true'&&process.env.CT_TRANSLATION_USAGE_ENABLED==='true';}
export async function readTranslationBudget(){
 if(!translationUsageEnabled())return null;
 try{
  const db=createClient() as unknown as SupabaseClient;
  const {data:{user},error:authError}=await db.auth.getUser();if(authError||!user||user.is_anonymous||!user.email_confirmed_at)return null;
  const {data,error}=await db.rpc('staff_read_translation_budget');if(error)return null;
  return parseTranslationBudget(data);
 }catch{return null;}
}
