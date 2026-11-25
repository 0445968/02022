import {redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth/session';
import {getServerLocale} from '@/lib/i18n/server-locale';
import {readerAccountEnabled,readReaderAccount} from '@/lib/services/reader-account';
import {ReaderProfileForm} from '@/components/account/ReaderProfileForm';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function ProfilePage(){const user=await getCurrentUser();if(!user)redirect('/en/auth/sign-in?next=%2Faccount%2Fprofile');const locale=getServerLocale(user.profile?.preferredLocale);
 if(!readerAccountEnabled())redirect('/'+locale+'/account');
 let state;try{state=await readReaderAccount();}catch{return <p className="p-6 text-sm" role="alert">{locale==='es'?'Perfil no disponible. Verifique su correo e inicie sesión.':'Profile unavailable. Verify your email and sign in again.'}</p>;}
 return <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6"><h1 className="font-headline text-3xl font-bold text-deep">{state.locale==='es'?'Mi perfil':'My profile'}</h1><ReaderProfileForm initial={state}/></div>;
}
