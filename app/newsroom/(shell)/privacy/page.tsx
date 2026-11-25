import {redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth/session';
import {newsroomLocale} from '@/lib/services/newsroom-workspace';
import {privacyQueue} from '@/lib/services/reader-account';
import {PrivacyQueue} from '@/components/editorial/team/PrivacyQueue';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function PrivacyPage(){const user=await getCurrentUser();if(!user)redirect('/newsroom/denied');let state;try{state=await privacyQueue(0);}catch{redirect('/newsroom/denied');}const locale=await newsroomLocale(user);return <div className="mx-auto max-w-4xl space-y-5 px-6 py-8"><h1 className="font-headline text-2xl font-bold text-deep">{locale==='es'?'Solicitudes de privacidad':'Privacy requests'}</h1><PrivacyQueue locale={locale} initial={state}/></div>;}
