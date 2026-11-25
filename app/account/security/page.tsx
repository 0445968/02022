import {redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth/session';
import {getServerLocale} from '@/lib/i18n/server-locale';
import {readerAccountEnabled,readReaderAccount} from '@/lib/services/reader-account';
import {ReaderSecurityForm} from '@/components/account/ReaderSecurityForm';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function SecurityPage({searchParams}:{searchParams?:{recovery?:string}}){const user=await getCurrentUser();if(!user)redirect('/en/auth/sign-in?next=%2Faccount%2Fsecurity');const es=getServerLocale(user.profile?.preferredLocale)==='es';
 if(!readerAccountEnabled())return <p className="p-6 text-sm">{es?'La seguridad de la cuenta aún no está habilitada.':'Account security is not enabled yet.'}</p>;
 let state;try{state=await readReaderAccount();}catch{return <p className="p-6 text-sm" role="alert">{es?'Verifique su correo e inicie sesión de nuevo.':'Verify your email and sign in again.'}</p>;}
 return <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6"><h1 className="font-headline text-3xl font-bold text-deep">{state.locale==='es'?'Seguridad y privacidad':'Security and privacy'}</h1><ReaderSecurityForm initial={state} userId={user.id} recovery={searchParams?.recovery==='1'}/></div>;
}
