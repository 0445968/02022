import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/db/supabase-server';
import {storyTranslationsEnabled} from '@/lib/services/story-translations';
import {buildScopePreview} from '@/lib/permissions/translation-scope-preview';
import type {TranslationLinked,TranslationUnlinked} from '@/lib/permissions/translation-workflow-contract';
export function translationPreviewEnabled(){return storyTranslationsEnabled()&&process.env.CT_TRANSLATION_PREVIEW_ENABLED==='true';}
export async function readTranslationScopePreview(state:TranslationLinked|TranslationUnlinked){
 if(!translationPreviewEnabled()||(!state.linked&&!state.canCreate)||(state.linked&&!state.canRefresh))return null;
 try{const db=createClient() as unknown as SupabaseClient;const {data:{user},error:authError}=await db.auth.getUser();if(authError||!user||user.is_anonymous||!user.email_confirmed_at)return null;
 const {data,error}=await db.rpc('staff_read_translation_preview',{p_source:state.sourceId,p_expected:state.sourceFingerprint});
 if(error||!data||data.sourceFingerprint!==state.sourceFingerprint||data.sourceLocale!==state.sourceLanguage)return null;
 return buildScopePreview(data.copy,state.sourceLanguage,state.sourceFingerprint);
 }catch{return null;}
}
