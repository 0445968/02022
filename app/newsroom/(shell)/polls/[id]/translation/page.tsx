import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth/session';
import {newsroomLocale} from '@/lib/services/newsroom-workspace';
import {pollTranslationsEnabled,readPollTranslation} from '@/lib/services/poll-translations';
import {PollTranslationPanel} from '@/components/editorial/polls/PollTranslationPanel';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function PollTranslationPage(props:{params:Promise<{id:string}>}){if(!pollTranslationsEnabled())notFound();const [params,user]=await Promise.all([props.params,getCurrentUser()]);if(!user)notFound();const [locale,state]=await Promise.all([newsroomLocale(user),readPollTranslation(params.id).catch(()=>null)]);if(!state)notFound();return <section className="space-y-4 p-4 md:p-6"><Link href="/newsroom/polls" className="text-sm text-primary underline">{locale==='es'?'Volver a encuestas':'Back to polls'}</Link><h1 className="font-headline text-2xl font-bold text-deep">{locale==='es'?'Traducción de encuesta':'Poll translation'}</h1><PollTranslationPanel initial={state} locale={locale}/></section>;}
