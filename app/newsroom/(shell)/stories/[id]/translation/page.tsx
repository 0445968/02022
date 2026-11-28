import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth/session';
import {newsroomLocale} from '@/lib/services/newsroom-workspace';
import {storyTranslationsEnabled,readStoryTranslation} from '@/lib/services/story-translations';
import {readTranslationScopePreview} from '@/lib/services/translation-scope-preview';
import {TranslationScopePreview} from '@/components/editorial/story-editor/TranslationScopePreview';
import {alignmentReviewEnabled,readAlignmentReview} from '@/lib/services/translation-alignment-review';
import {TranslationAlignmentReview} from '@/components/editorial/story-editor/TranslationAlignmentReview';
import {StoryTranslationPanel} from '@/components/editorial/story-editor/StoryTranslationPanel';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function StoryTranslationPage(props:{params:Promise<{id:string}>}){
 if(!storyTranslationsEnabled())notFound();const [params,user]=await Promise.all([props.params,getCurrentUser()]);if(!user)notFound();
 const [locale,state]=await Promise.all([newsroomLocale(user),readStoryTranslation(params.id).catch(()=>null)]);if(!state)notFound();
 const [preview,alignment]=await Promise.all([readTranslationScopePreview(state),alignmentReviewEnabled()&&state.linked&&state.targetStatus==='published'?readAlignmentReview(state.sourceId,state.sourceFingerprint).catch(()=>null):Promise.resolve(null)]);
 return <section className="space-y-4 p-4 md:p-6"><Link href={'/newsroom/stories/'+params.id+'/edit'} className="text-sm text-primary underline">{locale==='es'?'Volver al artículo':'Back to story'}</Link><h1 className="font-headline text-2xl font-bold text-deep">{locale==='es'?'Traducciones vinculadas':'Linked translations'}</h1><StoryTranslationPanel initial={state} locale={locale}/>{preview&&<TranslationScopePreview preview={preview} locale={locale}/>} {alignment&&<TranslationAlignmentReview initial={alignment} locale={locale}/>}</section>;
}
