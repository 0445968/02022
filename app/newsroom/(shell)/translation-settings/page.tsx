import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth/session';
import {newsroomLocale} from '@/lib/services/newsroom-workspace';
import {terminologyEnabled,readTerminology} from '@/lib/services/translation-terminology';
import {TerminologyEditor} from '@/components/editorial/dashboard/TerminologyEditor';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function TranslationSettingsPage(){if(!terminologyEnabled())notFound();const user=await getCurrentUser();if(!user)notFound();const [locale,state]=await Promise.all([newsroomLocale(user),readTerminology().catch(()=>null)]);if(!state)notFound();return <section className="space-y-4 p-4 md:p-6"><Link href="/newsroom" className="text-sm text-primary underline">{locale==='es'?'Volver al panel':'Back to dashboard'}</Link><h1 className="font-headline text-2xl font-bold text-deep">{locale==='es'?'Configuración de traducción':'Translation settings'}</h1><TerminologyEditor initial={state} locale={locale}/></section>;}
