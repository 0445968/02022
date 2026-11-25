import {redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth/session';
import {getServerLocale} from '@/lib/i18n/server-locale';
import {communicationsEnabled,readNotices} from '@/lib/services/reader-communications';

import {ReaderNotifications} from '@/components/account/ReaderNotifications';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function Page(){const user=await getCurrentUser();if(!user)redirect('/en/auth/sign-in?next=%2Faccount%2Fnotifications');const locale=getServerLocale(user.profile?.preferredLocale),es=locale==='es';
 if(!communicationsEnabled())return <div className="p-6"><h1 className="font-headline text-2xl font-bold text-deep">{es?'Notificaciones':'Notifications'}</h1><p className="mt-2 text-sm text-muted-foreground">{es?'Aún no está habilitado.':'Not enabled yet.'}</p></div>;
 let state;try{state=await readNotices(0);}catch{return <p className="p-6 text-sm" role="alert">{es?'No disponible. Verifique su correo y sesión.':'Unavailable. Verify your email and session.'}</p>;}
 return <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6"><h1 className="font-headline text-3xl font-bold text-deep">{es?'Notificaciones':'Notifications'}</h1><ReaderNotifications initial={state} locale={locale}/></div>;
}
