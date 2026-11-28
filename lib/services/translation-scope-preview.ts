import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/db/supabase-server';
import {storyTranslationsEnabled} from '@/lib/services/story-translations';
import {buildScopePreview} from '@/lib/permissions/translation-scope-preview';
import {buildChangedPreview} from '@/lib/permissions/translation-memory-preview-contract';
import type {TranslationLinked,TranslationUnlinked} from '@/lib/permissions/translation-workflow-contract';
export function translationPreviewEnabled(){return storyTranslationsEnabled()&&process.env.CT_TRANSLATION_PREVIEW_ENABLED==='true';}
export async function readTranslationScopePreview(state:TranslationLinked|TranslationUnlinked){
 if(!translationPreviewEnabled()||(!state.linked&&!state.canCreate)||(state.linked&&!state.canRefresh&&state.targetStatus!=='published'))return null;
 try{const db=createClient() as unknown as SupabaseClient;const {data:{user},error:authError}=await db.auth.getUser();if(authError||!user||user.is_anonymous||!user.email_confirmed_at)return null;
 const {data,error}=await db.rpc('staff_read_translation_preview',{p_source:state.sourceId,p_expected:state.sourceFingerprint});
 if(error||!data||data.sourceFingerprint!==state.sourceFingerprint||data.sourceLocale!==state.sourceLanguage)return null;
 const preview=buildScopePreview(data.copy,state.sourceLanguage,state.sourceFingerprint);
 if(state.linked&&state.targetStatus==='published'){
  const memory=await db.rpc('staff_read_translation_memory_preview',{p_source:state.sourceId,p_expected:state.sourceFingerprint});
  if(!memory.error)preview.changed=buildChangedPreview(data.copy,state.sourceLanguage,state.sourceFingerprint,preview.fullCharacters,memory.data);
 }
 return preview;
 }catch{return null;}
}
